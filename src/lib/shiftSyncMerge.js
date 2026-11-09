const stableStringify = (value) => JSON.stringify(value, (_key, nestedValue) => {
  if (!nestedValue || typeof nestedValue !== 'object' || Array.isArray(nestedValue)) return nestedValue
  return Object.keys(nestedValue).sort().reduce((ordered, key) => {
    ordered[key] = nestedValue[key]
    return ordered
  }, {})
})

const sameValue = (first, second) => stableStringify(first) === stableStringify(second)
const shiftKey = (shift) => shift && `${shift.member || ''}-${shift.date || ''}`

const latestShiftMap = (shifts) => {
  const result = new Map()
  if (!Array.isArray(shifts)) return result
  shifts.forEach((shift) => {
    const key = shiftKey(shift)
    if (key && key !== '-') result.set(key, shift)
  })
  return result
}

const mergeShifts = (baseShifts, localShifts, remoteShifts) => {
  const base = latestShiftMap(baseShifts)
  const local = latestShiftMap(localShifts)
  const remote = latestShiftMap(remoteShifts)
  const keys = [...new Set([...base.keys(), ...local.keys(), ...remote.keys()])]
  const merged = []

  for (const key of keys) {
    const baseShift = base.get(key)
    const localShift = local.get(key)
    const remoteShift = remote.get(key)
    let nextShift

    if (sameValue(localShift, remoteShift)) nextShift = localShift
    else if (sameValue(localShift, baseShift)) nextShift = remoteShift
    else if (sameValue(remoteShift, baseShift)) nextShift = localShift
    else return null

    if (nextShift) merged.push(nextShift)
  }

  return merged
}

// 가족 구성원은 사람별로 합침. 같은 사람을 양쪽에서 바꿨으면 연차·반차(leaves)만 합쳐 봄
const mergeProfiles = (base = [], local = [], remote = []) => {
  if (![base, local, remote].every(Array.isArray)) return null
  const byId = (list) => new Map(list.map((p) => [p.id, p]))
  const b = byId(base), l = byId(local), r = byId(remote)
  const order = [...new Set([...remote.map((p) => p.id), ...local.map((p) => p.id)])]
  const out = []
  for (const id of order) {
    const bp = b.get(id), lp = l.get(id), rp = r.get(id)
    let next
    if (sameValue(lp, rp)) next = lp
    else if (sameValue(lp, bp)) next = rp
    else if (sameValue(rp, bp)) next = lp
    else {
      const strip = (p) => p && { ...p, regularWork: p.regularWork && { ...p.regularWork, leaves: undefined } }
      if (!lp || !rp || !sameValue(strip(lp), strip(rp))) return null
      const bl = bp?.regularWork?.leaves || {}, ll = lp.regularWork?.leaves || {}, rl = rp.regularWork?.leaves || {}
      const leaves = {}
      for (const day of new Set([...Object.keys(bl), ...Object.keys(ll), ...Object.keys(rl)])) {
        const v = ll[day] !== bl[day] ? ll[day] : rl[day] // 이 기기에서 바꾼 날은 이 기기 값, 아니면 서버 값
        if (v) leaves[day] = v
      }
      next = { ...lp, regularWork: { ...lp.regularWork, leaves } }
    }
    if (next) out.push(next)
  }
  return out
}

// 놀이 기록 같은 값은 둘 다 바뀌어도 충돌로 막지 않고 이 기기 값을 씀 (일정 저장이 막히지 않게)
const LENIENT = new Set(['gameScores', 'cleanProgress', 'activity', 'mergeProgress'])

export function mergeSharedShiftChanges(baseState, localState, remoteState) {
  if (!baseState || !localState || !remoteState
    || typeof baseState !== 'object' || typeof localState !== 'object' || typeof remoteState !== 'object') return null

  const keys = [...new Set([...Object.keys(baseState), ...Object.keys(localState), ...Object.keys(remoteState)])]
  const mergedState = {}

  for (const key of keys) {
    if (key === 'shifts') {
      const shifts = mergeShifts(baseState.shifts, localState.shifts, remoteState.shifts)
      if (!shifts) return null
      mergedState.shifts = shifts
      continue
    }

    if (key === 'profiles') {
      const profiles = mergeProfiles(baseState.profiles, localState.profiles, remoteState.profiles)
      if (!profiles) return null
      mergedState.profiles = profiles
      continue
    }

    const baseValue = baseState[key]
    const localValue = localState[key]
    const remoteValue = remoteState[key]
    if (sameValue(localValue, remoteValue)) mergedState[key] = localValue
    else if (sameValue(localValue, baseValue)) mergedState[key] = remoteValue
    else if (sameValue(remoteValue, baseValue)) mergedState[key] = localValue
    else if (LENIENT.has(key)) mergedState[key] = localValue
    else return null
  }

  return mergedState
}

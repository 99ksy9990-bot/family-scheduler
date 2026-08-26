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

    const baseValue = baseState[key]
    const localValue = localState[key]
    const remoteValue = remoteState[key]
    if (sameValue(localValue, remoteValue)) mergedState[key] = localValue
    else if (sameValue(localValue, baseValue)) mergedState[key] = remoteValue
    else if (sameValue(remoteValue, baseValue)) mergedState[key] = localValue
    else return null
  }

  return mergedState
}

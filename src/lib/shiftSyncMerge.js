const stableStringify = (value) => JSON.stringify(value, (_key, nestedValue) => {
  if (!nestedValue || typeof nestedValue !== 'object' || Array.isArray(nestedValue)) return nestedValue
  return Object.fromEntries(Object.keys(nestedValue).sort().map((key) => [key, nestedValue[key]]))
})

const sameValue = (first, second) => stableStringify(first) === stableStringify(second)
const CONFLICT = Symbol('conflict')

const mergeValue = (base, local, remote, prefer) => {
  if (sameValue(local, remote) || sameValue(remote, base)) return local
  if (sameValue(local, base)) return remote
  if (prefer === 'local') return local
  if (prefer === 'remote') return remote
  return CONFLICT
}

const mergeEntries = (base, local, remote, merge) => {
  const result = new Map()
  for (const key of new Set([...remote.keys(), ...local.keys()])) {
    const value = merge(base.get(key), local.get(key), remote.get(key))
    if (value === CONFLICT) return CONFLICT
    if (value !== undefined) result.set(key, value)
  }
  return result
}

// 연차·반차는 한 사람 안에서도 날짜마다 별도 항목이다.
const mergeProfile = (base, local, remote, prefer) => {
  const combined = mergeValue(base, local, remote)
  if (combined !== CONFLICT) return combined
  const withoutLeaves = (profile) => profile && {
    ...profile, regularWork: profile.regularWork && { ...profile.regularWork, leaves: undefined },
  }
  if (!local || !remote || !sameValue(withoutLeaves(local), withoutLeaves(remote))) {
    return mergeValue(base, local, remote, prefer)
  }
  const byDay = (profile) => new Map(Object.entries(profile?.regularWork?.leaves || {}))
  const leaves = mergeEntries(byDay(base), byDay(local), byDay(remote),
    (b, l, r) => mergeValue(b, l, r, prefer))
  return leaves === CONFLICT ? CONFLICT : { ...local, regularWork: { ...local.regularWork, leaves: Object.fromEntries(leaves) } }
}

const recordId = (record) => record?.id
const collectionKeys = {
  events: recordId, tasks: recordId, childSchedules: recordId, schedulePeriods: recordId,
  anniversaries: recordId, scheduleExceptions: recordId, profiles: recordId,
  childProfiles: (record) => record?.member,
  shifts: (record) => record?.member && record?.date && JSON.stringify([record.member, record.date]),
}

const mergeRecords = (key, base, local, remote, prefer) => {
  const keyOf = collectionKeys[key]
  const index = (list) => {
    if (!Array.isArray(list)) return null
    const rows = new Map()
    for (const record of list) {
      const id = keyOf(record)
      if (!id || (key !== 'shifts' && rows.has(id))) return null
      rows.set(id, record)
    }
    return rows
  }
  const b = index(base ?? [])
  const l = index(local)
  const r = index(remote)
  if (!b || !l || !r) return mergeValue(base, local, remote, prefer)
  const merge = key === 'profiles' ? mergeProfile : mergeValue
  const result = mergeEntries(b, l, r, (before, here, there) => merge(before, here, there, prefer))
  return result === CONFLICT ? CONFLICT : [...result.values()]
}

// 놀이·활동 기록의 기존 충돌 처리는 유지한다.
const LENIENT = new Set(['gameScores', 'cleanProgress', 'activity', 'mergeProgress'])

export function mergeSharedShiftChanges(baseState, localState, remoteState, prefer) {
  if (![baseState, localState, remoteState].every((state) => state && typeof state === 'object' && !Array.isArray(state))) return null

  const merged = {}
  for (const key of new Set([...Object.keys(baseState), ...Object.keys(localState), ...Object.keys(remoteState)])) {
    const base = baseState[key], local = localState[key], remote = remoteState[key]
    let value = mergeValue(base, local, remote)
    if (value === CONFLICT) {
      if (Object.hasOwn(collectionKeys, key)) value = mergeRecords(key, base, local, remote, prefer)
      else value = mergeValue(base, local, remote, LENIENT.has(key) ? 'local' : prefer)
    }
    if (value === CONFLICT) return null
    if (value !== undefined) merged[key] = value
  }
  return merged
}

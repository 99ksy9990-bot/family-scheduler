export const load = (key, fallback) => {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

export const hasLegacyLocalData = (keys) => keys.some((key) => localStorage.getItem(key))

export const loadWithoutLegacySeeds = (key, fallback, legacyIds) => (
  load(key, fallback).filter((item) => !legacyIds.has(item.id))
)

export const mergeUnique = (current, recovered, identity) => {
  const identities = new Set(current.map(identity))
  return [...current, ...recovered.filter((item) => !identities.has(identity(item)))]
}

export const loadRecoveredCollection = (key, fallback, recovered, identity, markerKey, recoveryVersion) => {
  const current = load(key, fallback)
  const marker = Number(localStorage.getItem(markerKey) || 0)
  if (marker >= recoveryVersion) return current
  const merged = mergeUnique(current, recovered, identity)
  localStorage.setItem(markerKey, String(recoveryVersion))
  return merged
}

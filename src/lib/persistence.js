export const load = (key, fallback, storage = localStorage) => {
  try {
    const stored = storage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

export const hasLegacyLocalData = (keys, storage = localStorage) => keys.some((key) => storage.getItem(key))

export const loadWithoutLegacySeeds = (key, fallback, legacyIds, storage = localStorage) => (
  load(key, fallback, storage).filter((item) => !legacyIds.has(item.id))
)

export const mergeUnique = (current, recovered, identity) => {
  const identities = new Set(current.map(identity))
  return [...current, ...recovered.filter((item) => !identities.has(identity(item)))]
}

export const loadRecoveredCollection = (key, fallback, recovered, identity, markerKey, recoveryVersion, storage = localStorage, persistRecovery = true) => {
  const current = load(key, fallback, storage)
  const marker = Number(storage.getItem(markerKey) || 0)
  if (marker >= recoveryVersion) return current
  const merged = mergeUnique(current, recovered, identity)
  if (persistRecovery) storage.setItem(markerKey, String(recoveryVersion))
  return merged
}

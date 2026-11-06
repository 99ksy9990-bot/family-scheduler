import { assignedMemberIds } from '../../lib/legacyState'

export function membersFor(item, profiles, pluralKey = 'members', singularKey = 'member') {
  const ids = assignedMemberIds(item, pluralKey, singularKey)
  return ids.includes('family') ? profiles.filter((profile) => profile.active !== false) : profiles.filter((profile) => ids.includes(profile.id))
}

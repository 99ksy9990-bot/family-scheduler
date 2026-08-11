// 색 = 사람
// 아이콘 = 분류
// 회색 = 나머지 전부
// 빨강 = 경고
// 구성원 색은 시스템 예약색인 빨강과 주황을 피하고 색상환에서 충분히 벌린다.
export const MEMBER_COLORS = [
  { id: 'blue', color: '#3B82F6', tone: '#EFF6FF' },
  { id: 'cyan', color: '#0891B2', tone: '#ECFEFF' },
  { id: 'green', color: '#10B981', tone: '#ECFDF5' },
  { id: 'lime', color: '#65A30D', tone: '#F7FEE7' },
  { id: 'violet', color: '#8B5CF6', tone: '#F5F3FF' },
  { id: 'pink', color: '#EC4899', tone: '#FDF2F8' },
]

export const SYSTEM_COLORS = {
  holiday: '#DC2626',
  anniversary: '#F59E0B',
  family: '#24657E',
  danger: '#DC2626',
}

const rgb = (hex) => {
  const value = String(hex || '').replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(value)) return [0, 0, 0]
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16))
}

const colorDistance = (first, second) => {
  const a = rgb(first)
  const b = rgb(second)
  return a.reduce((sum, channel, index) => sum + ((channel - b[index]) ** 2), 0)
}

export const migrateMemberProfiles = (profiles = []) => {
  const used = new Set()
  return profiles.map((profile) => {
    const available = MEMBER_COLORS.filter((entry) => !used.has(entry.id))
    const candidates = available.length ? available : MEMBER_COLORS
    const selected = [...candidates].sort((first, second) => (
      colorDistance(profile.color || MEMBER_COLORS[0].color, first.color)
      - colorDistance(profile.color || MEMBER_COLORS[0].color, second.color)
      || MEMBER_COLORS.findIndex((entry) => entry.id === first.id) - MEMBER_COLORS.findIndex((entry) => entry.id === second.id)
    ))[0]
    used.add(selected.id)
    return { ...profile, color: selected.color, tone: selected.tone }
  })
}

export const memberColorFor = (color) => MEMBER_COLORS.find((entry) => entry.color.toLowerCase() === String(color).toLowerCase())

import CharacterAvatar from './CharacterAvatar'
import { GroupedList, GroupedRow } from './GroupedList'
import { assignedMemberIds } from '../../lib/legacyState'

export default function ScheduleList({ rows, profiles, label = '시간순 일정' }) {
  if (!rows.length) return <div className="empty-state"><h3>아직 일정이 없어요</h3><p>오른쪽 + 버튼으로 가족 일정을 남겨 보세요.</p></div>
  return <GroupedList label={label}>{rows.map((row) => {
    const members = assignedMemberIds(row).map((id) => profiles.find((profile) => profile.id === id) || (id === 'family' ? { id, name: '가족 모두' } : null)).filter(Boolean)
    const primary = members[0] || { name: row.holiday ? '공휴일' : row.anniversary ? '기념일' : '가족' }
    return <GroupedRow key={row.id} icon={<CharacterAvatar profile={primary} size={32} />} title={<h3>{row.title}</h3>} subtitle={[members.map((profile) => profile.name).join(' · ') || primary.name, row.kind, row.location].filter(Boolean).join(' · ')} value={<time>{row.displayStart || '종일'}</time>} />
  })}</GroupedList>
}

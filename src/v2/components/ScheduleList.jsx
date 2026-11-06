import MemberAvatars from './MemberAvatars'
import TimeCell from './TimeCell'
import { groupShiftRows } from '../data/shiftGroups'
import { GroupedList, GroupedRow } from './GroupedList'
import { membersFor } from '../data/members'

export default function ScheduleList({ rows, profiles, label = '시간순 일정' }) {
  if (!rows.length) return <div className="empty-state"><h3>아직 일정이 없어요</h3><p>오른쪽 + 버튼으로 가족 일정을 남겨 보세요.</p></div>
  return <GroupedList label={label}>{groupShiftRows(rows).map((group) => {
    const row = group[0]
    const members = membersFor(row, profiles)
    const primary = members[0] || { name: row.holiday ? '공휴일' : row.anniversary ? '기념일' : '가족' }
    if (row.type === 'shift' && row.sourceDate) return <li key={row.id} className="schedule-shift-group"><MemberAvatars item={row} profiles={profiles} /><div>{group.map((shift) => <div className={`shift-line${shift.carryover ? ' is-carryover' : ''}`} key={shift.id}><span><h3>{shift.title}</h3><small>{members.map((profile) => profile.name).join(' · ')}</small></span><TimeCell row={shift} /></div>)}</div></li>
    return <GroupedRow key={row.id} icon={<MemberAvatars item={row} profiles={profiles} />} title={<h3>{row.title}</h3>} subtitle={[members.map((profile) => profile.name).join(' · ') || primary.name, row.kind, row.location].filter(Boolean).join(' · ')} value={<TimeCell row={row} />} />
  })}</GroupedList>
}

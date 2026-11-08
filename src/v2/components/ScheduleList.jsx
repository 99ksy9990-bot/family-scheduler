import { ChevronDown } from 'lucide-react'
import MemberAvatars from './MemberAvatars'
import TimeCell from './TimeCell'
import { groupShiftRows } from '../data/shiftGroups'
import { GroupedList, GroupedRow } from './GroupedList'
import { membersFor } from '../data/members'
import { endOf } from '../data/eventTime'
import { useCurrentTime } from '../../hooks/useCurrentTime'

const pad = (n) => String(n).padStart(2, '0')
// 지금 기준으로 끝난 일정인가 (지난 날짜, 또는 오늘 끝 시각이 지남)
const isPast = (row, now) => {
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  if (!row.date) return false
  if (row.date < today) return true
  const end = endOf(row)
  return row.date === today && !row.crossesMidnight && /^\d\d:\d\d$/.test(end) && end <= `${pad(now.getHours())}:${pad(now.getMinutes())}`
}

export default function ScheduleList({ rows, profiles, label = '시간순 일정', solo = false }) { // solo: 한 사람 묶음 안이라 얼굴·이름 생략
  const now = useCurrentTime()
  if (!rows.length) return <div className="empty-state"><h3>아직 일정이 없어요</h3><p>오른쪽 + 버튼으로 가족 일정을 남겨 보세요.</p></div>
  const item = (group) => {
    const row = group[0]
    const members = membersFor(row, profiles)
    const primary = members[0] || { name: row.holiday ? '공휴일' : row.anniversary ? row.anniversaryKind || '기념일' : '가족' }
    if (row.type === 'shift' && row.sourceDate) return <li key={row.id} className="schedule-shift-group">{!solo && <MemberAvatars item={row} profiles={profiles} />}<div>{group.map((shift) => <div className={`shift-line${shift.carryover ? ' is-carryover' : ''}${isPast(shift, now) ? ' is-past' : ''}`} key={shift.id}><span><h3>{shift.title}</h3>{!solo && <small>{members.map((profile) => profile.name).join(' · ')}</small>}</span><TimeCell row={shift} /></div>)}</div></li>
    return <GroupedRow key={row.id} className={isPast(row, now) ? 'is-past' : ''} icon={solo ? undefined : <MemberAvatars item={row} profiles={profiles} />} title={<h3>{row.title}</h3>} subtitle={[solo ? '' : members.map((profile) => profile.name).join(' · ') || primary.name, row.kind, row.location].filter(Boolean).join(' · ')} value={<TimeCell row={row} />} />
  }
  // 오늘 이미 끝난 일정은 아래에 접어 둠 (지난 날짜는 그대로 흐리게만)
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  // 근무 묶음은 줄마다 따로 판단 (어제부터 이어진 근무만 끝났을 수 있음)
  const all = groupShiftRows(rows).flatMap((group) => { const past = group.filter((row) => row.date === today && isPast(row, now)); return past.length && past.length < group.length ? [past, group.filter((row) => !past.includes(row))] : [group] })
  const done = all.filter((group) => group[0].date === today && group.every((row) => isPast(row, now)))
  const left = all.filter((group) => !done.includes(group))
  return <>
    {left.length > 0 && <GroupedList label={label}>{left.map(item)}</GroupedList>}
    {done.length > 0 && <details className="past-fold"><summary>지난 일정 {done.length}<ChevronDown size={16} aria-hidden="true" /></summary><GroupedList label={`${label} 지난 일정`}>{done.map(item)}</GroupedList></details>}
  </>
}

import { roleOf } from './CharacterAvatar'
import DayIcon from './DayIcon'
import { kindOf } from '../data/kinds'
import MemberAvatars from './MemberAvatars'
import { rainAt } from '../data/weather'
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

// 아빠·엄마 근무는 은행·병원 그림
const workIcon = (row, members) => { if (row.type !== 'shift' || row.title === 'OFF') return null; /* 쉬는 날(OFF)은 그대로 */ const k = { dad: 'bank', mom: 'hospital' }[roleOf(members[0] || {})]; return k ? <DayIcon kind={k} size={40} /> : null }
export default function ScheduleList({ rows, profiles, label = '시간순 일정', solo = false, onRow, nextId }) { // solo: 한 사람 묶음 안이라 얼굴·이름 생략
  const now = useCurrentTime()
  // 'auto': 이 목록에서 아직 안 지난 첫 시간 일정 (사람별 묶음마다 하나씩)
  const next = nextId !== 'auto' ? nextId : rows.find((row) => !row.carryover && !isPast(row, now) && /^\d/.test(row.displayStart || row.time || ''))?.id
  if (!rows.length) return <div className="empty-state"><img className="friends-pic" src="/friends/sleep.webp" alt="" width={120} height={120} /><h3>아직 일정이 없어요</h3><p>오른쪽 + 버튼으로 가족 일정을 남겨 보세요.</p></div>
  const item = (group) => {
    const row = group[0]
    const members = membersFor(row, profiles)
    const primary = members[0] || { name: row.holiday ? '공휴일' : row.anniversary ? row.anniversaryKind || '기념일' : '가족' }
    if (row.type === 'shift' && row.sourceDate && !solo) return <li key={row.id} className="schedule-shift-group">{workIcon(row, members) || (solo ? <DayIcon kind="shift" size={40} /> : <MemberAvatars item={row} profiles={profiles} />)}<div>{group.map((shift) => <div onClick={onRow ? () => onRow(shift) : undefined} role={onRow ? 'button' : undefined} tabIndex={onRow ? 0 : undefined} className={`shift-line${shift.carryover ? ' is-carryover' : ''}${isPast(shift, now) ? ' is-past' : ''}`} key={shift.id}><span><h3>{shift.title}</h3>{!solo && <small>{members.map((profile) => profile.name).join(' · ')}</small>}</span><TimeCell row={shift} /></div>)}</div></li>
    return <GroupedRow key={row.id} onClick={onRow && !row.holiday ? () => onRow(row) : undefined} className={`${isPast(row, now) ? 'is-past' : ''}${row.id === next ? ' next' : ''}${row.carryover ? ' is-carryover' : ''}`} icon={workIcon(row, members) || (solo ? <DayIcon kind={kindOf(row)} size={40} /> : <MemberAvatars item={row} profiles={profiles} />)} title={<h3 className="row-title-wx">{row.title}{row.type !== 'shift' && rainAt(row.date, row.displayStart) && <img className="row-umbrella" src="/icons/weather/rain.png" alt="비 예보" width={20} height={20} />}</h3>} subtitle={row.anniversary ? [(row.milestoneLabel || '').replace(/^다음 \S+에 /, ''), row.location].filter(Boolean).join(' · ') : [solo ? '' : members.map((profile) => profile.name).join(' · ') || primary.name, row.kind, row.location].filter(Boolean).join(' · ')} value={<TimeCell row={row} />} />
  }
  return <GroupedList label={label}>{(solo ? rows.map((row) => [row]) : groupShiftRows(rows)).map(item)}</GroupedList>
}

import { CalendarDays } from 'lucide-react'
import { Fragment } from 'react'
import CharacterAvatar from './CharacterAvatar'
import { assignedMemberIds } from '../../lib/legacyState'
import { eventPhase } from '../data/eventTime'
import { iso } from '../../lib/dates'

export function DataState({ loading, error, onRetry, children }) {
  if (loading) return <p className="data-message" role="status">가족 일정을 불러오고 있어요…</p>
  if (error) return <div className="data-message error" role="alert"><p>{error}</p><button onClick={onRetry}>다시 시도</button></div>
  return children
}

export default function Timeline({ rows, profiles, date, now, showNow = false }) {
  if (!rows.length) return <div className="empty-state"><CalendarDays aria-hidden="true" /><div><h3>아직 일정이 없어요</h3><p>오른쪽 + 버튼으로 가족 일정을 남겨 보세요.</p></div></div>
  const phases = rows.map((row) => eventPhase(row, date, now))
  const next = rows.findIndex((row, index) => row.displayStart && phases[index] !== 'past')
  const markerIndex = next < 0 ? rows.length : next
  const marker = showNow && iso(date) === iso(now) ? <li className="now-line" aria-label="현재 시간">지금 {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}</li> : null
  return <ol className="timeline" aria-label="시간순 일정">
    {rows.map((row, index) => {
      const members = assignedMemberIds(row).map((id) => profiles.find((profile) => profile.id === id) || (id === 'family' ? { id, name: '가족 모두' } : null)).filter(Boolean)
      const primary = members[0] || { name: row.anniversary ? '기념일' : row.holiday ? '공휴일' : '가족' }
      const expression = phases[index] === 'past' ? 'done' : phases[index] === 'active' ? 'busy' : 'basic'
      const kind = row.kind || (row.type === 'school' ? '학교' : '')
      return <Fragment key={row.id}>{markerIndex === index && marker}<li className={`timeline-row event-card${showNow && phases[index] === 'past' ? ' is-past' : ''}`} data-owner={primary.characterId || 'family'}>
        <div className="timeline-time"><time>{row.displayStart || '종일'}</time>{row.displayEnd && <small>{row.crossesMidnight ? '다음 날 ' : ''}{row.displayEnd}</small>}</div>
        <CharacterAvatar profile={primary} expression={expression} size={36} />
        <div className="timeline-body"><h3>{row.title}</h3><p className="event-detail">{[members.map((profile) => profile.name).join(' · '), kind, row.location].filter(Boolean).join(' · ') || primary.name}</p></div>
      </li></Fragment>
    })}
    {markerIndex === rows.length && marker}
  </ol>
}

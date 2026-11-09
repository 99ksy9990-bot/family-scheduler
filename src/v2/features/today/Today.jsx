import ArrowText from '../../components/ArrowText'
import { useState } from 'react'
import RowEditor from '../../components/RowEditor'
import { ByPerson } from '../calendar/Calendar'
import CharacterAvatar from '../../components/CharacterAvatar'
import { DataState } from '../../components/DataState'
import { membersFor } from '../../data/members'
import { houseStatus, remainingSchedule } from '../../data/house'
import { scheduleForDate } from '../../data/schedule'
import { addDays } from '../../../lib/dates'

export default function Today({ today, now, state, rows, loading, error, onRetry, onPerson, updateState, canEdit, onOpenToday }) {
  const [editing, setEditing] = useState(null) // 남은 일정에서 바로 수정
  const profiles = state.profiles.filter((profile) => profile.active !== false)
  const remaining = remainingSchedule(rows, today, now).filter((row) => !row.carryover && row.type !== 'leave') // 전날 밤 근무·연차(쉬는 날)는 빼기
  // 오늘 일정이 끝나면 내일 첫 시간 일정 미리보기 (근무·연차 제외)
  const tomorrow = remaining.length ? null : scheduleForDate(state, addDays(today, 1)).find((row) => !row.carryover && !['shift', 'leave'].includes(row.type) && /^\d/.test(row.displayStart || ''))
  return <div className="house-page">
    <section aria-labelledby="now-heading"><h2 id="now-heading" className="visually-hidden">지금</h2>
      <DataState loading={loading} error={error} onRetry={onRetry}><div className="house-grid">{profiles.map((profile) => {
        const status = houseStatus(profile, rows, state.tasks, today, now, state.shifts)
        return <button className="house-tile" data-character={profile.characterId || 'unknown'} key={profile.id} onClick={() => onPerson(profile.id)} aria-label={`${profile.name}의 오늘 일정, ${status.label}`}>
          {status.badge && <span className={`house-badge${status.badgeUpcoming ? ' upcoming' : ''}`}>{status.badgeKind && <img src={`/icons/kind/${status.badgeKind === '학원' ? 'academy' : 'school'}.png`} alt="" width={18} height={18} />}{status.badge}</span>}<CharacterAvatar profile={profile} expression={status.expression} size={66} glass /><strong>{profile.name}</strong><small>{<ArrowText text={status.detail} />}</small>
        </button>
      })}</div>{!profiles.length && <p className="data-message">가족 탭에서 구성원을 등록해 주세요.</p>}</DataState>
    </section>
    <section aria-labelledby="remaining-heading"><h2 id="remaining-heading" className="house-section-title">오늘 남은 일정<span className="visually-hidden" data-testid="today-count">{remaining.length}</span></h2>
      <DataState loading={loading} error={error} onRetry={onRetry}>{remaining.length ? <div className="today-remaining" aria-label="오늘 남은 일정"><ByPerson rows={remaining} profiles={state.profiles} onRow={canEdit ? setEditing : undefined} /></div> : <div className="empty-state"><h3>{rows.some((row) => row.type !== 'shift' && row.type !== 'leave') ? '오늘 일정 모두 끝! 수고했어요' : '오늘 남은 일정이 없어요'}</h3>{tomorrow ? <p className="tomorrow-peek">내일 <b>{tomorrow.displayStart}</b> {membersFor(tomorrow, state.profiles).map((p) => p.name).join('·') || '가족'} {tomorrow.title}</p> : <p>가족 타일을 누르면 사람별로 볼 수 있어요.</p>}</div>}</DataState>
      {onOpenToday && <button type="button" className="text-button past-link" onClick={onOpenToday}>오늘 지난 일정 보기 ›</button>}
    </section>

    {editing && <RowEditor row={editing} state={state} updateState={updateState} canEdit={canEdit} today={today} onChange={setEditing} />}
  </div>
}

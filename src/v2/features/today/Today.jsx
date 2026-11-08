import { ByPerson } from '../calendar/Calendar'
import CharacterAvatar from '../../components/CharacterAvatar'
import { DataState } from '../../components/DataState'
import { houseStatus, remainingSchedule } from '../../data/house'

export default function Today({ today, now, state, rows, loading, error, onRetry, onPerson }) {
  const profiles = state.profiles.filter((profile) => profile.active !== false)
  const remaining = remainingSchedule(rows, today, now)
  const nextTimed = remaining.find((row) => row.displayStart)
  return <div className="house-page">
    <section aria-labelledby="now-heading"><h2 id="now-heading" className="house-section-title">지금</h2>
      <DataState loading={loading} error={error} onRetry={onRetry}><div className="house-grid">{profiles.map((profile) => {
        const status = houseStatus(profile, rows, state.tasks, today, now, state.shifts)
        return <button className="house-tile" data-character={profile.characterId || 'unknown'} key={profile.id} onClick={() => onPerson(profile.id)} aria-label={`${profile.name}의 오늘 일정, ${status.label}`}>
          {status.badge && <span className={`house-badge${status.badgeUpcoming ? ' upcoming' : ''}`}>{status.badge}</span>}<CharacterAvatar profile={profile} expression={status.expression} size={66} glass /><strong>{profile.name}</strong><small>{status.detail}</small>
        </button>
      })}</div>{!profiles.length && <p className="data-message">가족 탭에서 구성원을 등록해 주세요.</p>}</DataState>
    </section>
    <section aria-labelledby="remaining-heading"><h2 id="remaining-heading" className="house-section-title">오늘 남은 일정<span className="visually-hidden" data-testid="today-count">{remaining.length}</span></h2>
      <DataState loading={loading} error={error} onRetry={onRetry}>{remaining.length ? <div className="today-remaining" aria-label="오늘 남은 일정"><ByPerson rows={remaining} profiles={state.profiles} nextId={nextTimed?.id} /></div> : <div className="empty-state"><h3>오늘 남은 일정이 없어요</h3><p>가족 타일을 누르면 지난 일정도 볼 수 있어요.</p></div>}</DataState>
    </section>

  </div>
}

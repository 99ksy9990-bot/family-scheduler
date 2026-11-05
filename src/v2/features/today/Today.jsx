import CharacterAvatar from '../../components/CharacterAvatar'
import { formatLongDate } from '../../../lib/dates'
import { memberStatus } from '../../data/schedule'
import Timeline, { DataState } from '../../components/Timeline'

export default function Today({ today, now, state, rows, loading, error, onRetry }) {
  return <div className="today-page">
    <section className="family-section" aria-labelledby="family-heading">
      <div className="section-heading"><h2 id="family-heading">우리 가족의 하루</h2><span className="quiet">함께라서 좋은 오늘</span></div>
      <DataState loading={loading} error={error} onRetry={onRetry}>
        <div className="family-strip">{state.profiles.filter((profile) => profile.active !== false).map((profile) => {
          const status = memberStatus(profile, rows, state.tasks, now)
          return <article className="family-person" key={profile.id} aria-label={`${profile.name} ${status.label}`}>
            <CharacterAvatar profile={profile} expression={status.expression} /><h3>{profile.name}</h3><p title={status.label}>{status.shortLabel || status.label}</p>
          </article>
        })}{!state.profiles.length && <p className="data-message">등록된 가족이 없어요. 가족 관리는 다음 단계에서 준비할게요.</p>}</div>
      </DataState>
    </section>
    <section className="schedule-section" aria-labelledby="today-heading">
      <div className="section-heading"><div><p className="quiet">{formatLongDate(today)}</p><h2 id="today-heading">오늘 일정 <span className="count" data-testid="today-count">{rows.length}</span></h2></div><span className="quiet">시간순으로 모았어요</span></div>
      <DataState loading={loading} error={error} onRetry={onRetry}><Timeline rows={rows} profiles={state.profiles} /></DataState>
    </section>
  </div>
}

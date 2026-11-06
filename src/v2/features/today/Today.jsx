import { useState } from 'react'
import CharacterAvatar from '../../components/CharacterAvatar'
import { DataState } from '../../components/DataState'
import ScheduleList from '../../components/ScheduleList'
import Sheet from '../../components/Sheet'
import { houseStatus, remainingSchedule, rowsForMember } from '../../data/house'
import { assignedMemberIds } from '../../../lib/legacyState'

export default function Today({ today, now, state, rows, loading, error, onRetry }) {
  const [selected, setSelected] = useState(null)
  const profiles = state.profiles.filter((profile) => profile.active !== false)
  const remaining = remainingSchedule(rows, today, now)
  const nextTimed = remaining.find((row) => row.displayStart)
  return <div className="house-page">
    <section aria-labelledby="now-heading"><h2 id="now-heading" className="house-section-title">지금</h2>
      <DataState loading={loading} error={error} onRetry={onRetry}><div className="house-grid">{profiles.map((profile) => {
        const status = houseStatus(profile, rows, state.tasks, today, now)
        return <button className="house-tile" data-character={profile.characterId || 'unknown'} key={profile.id} onClick={() => setSelected(profile)} aria-label={`${profile.name}의 오늘 일정, ${status.label}`}>
          {status.badge && <span className="house-badge">{status.badge}</span>}<CharacterAvatar profile={profile} expression={status.expression} size={66} glass /><strong>{profile.name}</strong><small>{status.detail}</small>
        </button>
      })}</div>{!profiles.length && <p className="data-message">설정에서 가족 구성원을 등록해 주세요.</p>}</DataState>
    </section>
    <section aria-labelledby="remaining-heading"><h2 id="remaining-heading" className="house-section-title">오늘 남은 일정<span className="visually-hidden" data-testid="today-count">{remaining.length}</span></h2>
      <DataState loading={loading} error={error} onRetry={onRetry}>{remaining.length ? <ol className="house-list" aria-label="오늘 남은 일정">{remaining.map((row) => {
        const members = assignedMemberIds(row).map((id) => state.profiles.find((profile) => profile.id === id) || (id === 'family' ? { name: '모두' } : null)).filter(Boolean)
        const profile = members[0] || { name: row.holiday ? '공휴일' : '기념일' }
        return <li key={row.id} className={`house-row${row.id === nextTimed?.id ? ' next' : ''}`}><CharacterAvatar profile={profile} size={32} /><div><h3>{row.title}</h3><small>{members.map((member) => member.name).join(' · ') || profile.name}</small></div><time>{row.displayStart || '종일'}</time></li>
      })}</ol> : <div className="empty-state"><h3>오늘 남은 일정이 없어요</h3><p>가족 타일을 누르면 지난 일정도 볼 수 있어요.</p></div>}</DataState>
    </section>
    {selected && <Sheet title={`${selected.name}의 오늘 일정`} onClose={() => setSelected(null)}><ScheduleList rows={rowsForMember(rows, selected.id)} profiles={state.profiles} /></Sheet>}
  </div>
}

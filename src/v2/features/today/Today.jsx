import ArrowText from '../../components/ArrowText'
import { useState } from 'react'
import RowEditor from '../../components/RowEditor'
import { ByPerson } from '../calendar/Calendar'
import CharacterAvatar from '../../components/CharacterAvatar'
import ScheduleList from '../../components/ScheduleList'
import { DataState } from '../../components/DataState'
import { membersFor } from '../../data/members'
import { offRows } from '../../data/personDay'
import { houseStatus, remainingSchedule } from '../../data/house'
import { scheduleForDate } from '../../data/schedule'
import { addDays } from '../../../lib/dates'

export default function Today({ today, now, state, rows, loading, error, onRetry, onPerson, updateState, canEdit, onOpenToday }) {
  const [editing, setEditing] = useState(null) // 남은 일정에서 바로 수정
  const profiles = state.profiles.filter((profile) => profile.active !== false)
  const remaining = remainingSchedule(rows, today, now).filter((row) => !row.carryover && row.type !== 'leave') // 전날 밤 근무·연차(쉬는 날)는 빼기
  // 내일: 구성원마다 한 줄. 쉬는 날(엄마 OFF·아빠 연차)은 '휴무', 아니면 첫 시간 일정
  const tmr = addDays(today, 1)
  const tomorrowAll = [...offRows(state, tmr).map((row) => ({ ...row, title: '휴무' })), ...scheduleForDate(state, tmr).filter((row) => !row.carryover).map((row) => row.type === 'leave' ? { ...row, title: '휴무', displayStart: '하루 종일' } : row)]
  const mine = (row, id) => membersFor(row, state.profiles).some((m) => m.id === id)
  const firstTomorrow = profiles.map((p) => { const off = tomorrowAll.find((row) => mine(row, p.id) && row.title === '휴무'); const first = tomorrowAll.find((row) => mine(row, p.id) && row.title !== '휴무' && /^\d/.test(row.displayStart || '')); return off && first ? { ...first, id: `${first.id}-off`, title: `휴무 · ${first.title}` } : off || first }).filter((row, i, all) => row && all.indexOf(row) === i).toSorted((a, b) => (/^\d/.test(a.displayStart) ? a.displayStart : '99').localeCompare(/^\d/.test(b.displayStart) ? b.displayStart : '99'))
  return <div className="house-page">
    <section aria-labelledby="now-heading"><h2 id="now-heading" className="visually-hidden">지금</h2>
      <DataState loading={loading} error={error} onRetry={onRetry}><div className="house-grid">{profiles.map((profile) => {
        const status = houseStatus(profile, rows, state.tasks, today, now, state.shifts)
        return <button className="house-tile" data-character={profile.characterId || 'unknown'} key={profile.id} onClick={() => onPerson(profile.id)} aria-label={`${profile.name}의 오늘 일정, ${status.label}`}>
          {status.badgeKind && <img className="house-badge-pic" src={`/icons/kind/${status.badgeKind === '학원' ? 'academy' : 'school'}.png`} alt="" width={34} height={34} />}{status.badge && <span className={`house-badge${status.badgeUpcoming ? ' upcoming' : ''}`}>{status.badge}</span>}<CharacterAvatar profile={profile} expression={status.expression} size={66} glass /><strong>{profile.name}</strong><small>{<ArrowText text={status.detail} />}</small>
        </button>
      })}</div>{!profiles.length && <p className="data-message">가족 탭에서 구성원을 등록해 주세요.</p>}</DataState>
    </section>
    <section aria-labelledby="remaining-heading"><h2 id="remaining-heading" className="house-section-title">오늘 남은 일정<span className="visually-hidden" data-testid="today-count">{remaining.length}</span></h2>
      <DataState loading={loading} error={error} onRetry={onRetry}>{remaining.length ? <div className="today-remaining" aria-label="오늘 남은 일정"><ByPerson rows={remaining} profiles={state.profiles} onRow={canEdit ? setEditing : undefined} /></div> : <div className="empty-state"><h3>{rows.some((row) => row.type !== 'shift' && row.type !== 'leave') ? '오늘 일정 모두 끝! 수고했어요' : '오늘은 여유로운 날이에요'}</h3><p>가족 타일을 누르면 사람별로 볼 수 있어요.</p></div>}</DataState>
      {onOpenToday && <button type="button" className="text-button past-link" onClick={onOpenToday}>오늘 지난 일정 보기 ›</button>}
      {firstTomorrow.length > 0 && <section className="tomorrow-section" aria-labelledby="tomorrow-heading"><h2 className="house-section-title" id="tomorrow-heading">내일 첫 일정</h2><ScheduleList rows={firstTomorrow} profiles={state.profiles} label="내일 첫 일정" /></section>}
    </section>

    {editing && <RowEditor row={editing} state={state} updateState={updateState} canEdit={canEdit} today={today} onChange={setEditing} />}
  </div>
}

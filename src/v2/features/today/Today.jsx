import MemberAvatars from '../../components/MemberAvatars'
import { nextAnniversaryOccurrence, anniversaryTitle } from '../../../lib/schedule'
import { GroupedList, GroupedRow } from '../../components/GroupedList'
import DayIcon from '../../components/DayIcon'
import ArrowText from '../../components/ArrowText'
import { useState } from 'react'
import RowEditor from '../../components/RowEditor'
import { ByPerson } from '../calendar/Calendar'
import CharacterAvatar from '../../components/CharacterAvatar'
import ScheduleList from '../../components/ScheduleList'
import { DataState } from '../../components/DataState'
import { membersFor } from '../../data/members'
import { offRows } from '../../data/personDay'
import { houseStatus, remainingSchedule, moodFor, isBirthdayToday, isCelebrationToday, softDetail } from '../../data/house'
import { scheduleForDate } from '../../data/schedule'
import { addDays } from '../../../lib/dates'
import { useWeather, weatherNote } from '../../data/weather'
const SKY_PIC = { sun: 'sun', cloud: 'cloud', rain: 'rain', snow: 'snow' }

// 챙길 것: 누구 · 어떤 일정 · 준비물
function BringList({ rows, profiles, label }) {
  return <ul className="bring-list" aria-label={label}>{rows.map((row) => <li key={row.id}><MemberAvatars item={row} profiles={profiles} /><span><small>{row.title} 챙길 것</small><strong>{row.bring}</strong></span></li>)}</ul>
}

export default function Today({ today, now, state, rows, loading, error, onRetry, onPerson, updateState, canEdit, onOpenToday }) {
  const [editing, setEditing] = useState(null) // 남은 일정에서 바로 수정
  const weather = weatherNote(useWeather(), now)
  const profiles = state.profiles.filter((profile) => profile.active !== false)
  const remaining = remainingSchedule(rows, today, now).filter((row) => !row.carryover && row.type !== 'leave') // 전날 밤 근무·연차(쉬는 날)는 빼기
  // 내일: 구성원마다 한 줄. 쉬는 날(엄마 OFF·아빠 연차)은 '휴무', 아니면 첫 시간 일정
  const tmr = addDays(today, 1)
  const tomorrowAll = [...offRows(state, tmr).map((row) => ({ ...row, title: '휴무', displayStart: ' ' })), ...scheduleForDate(state, tmr).filter((row) => !row.carryover).map((row) => row.type === 'leave' ? { ...row, title: '휴무', displayStart: ' ' } : row)]
  const todayBring = remaining.filter((row) => row.bring) // 아직 시작 안 한 오늘 일정의 준비물
  const bring = scheduleForDate(state, tmr).filter((row) => row.bring && !row.carryover) // 내일 챙길 것
  const mine = (row, id) => membersFor(row, state.profiles).some((m) => m.id === id)
  const firstTomorrow = profiles.map((p) => { const off = tomorrowAll.find((row) => mine(row, p.id) && row.title === '휴무'); const first = tomorrowAll.find((row) => mine(row, p.id) && row.title !== '휴무' && /^\d/.test(row.displayStart || '')); return off && first ? { ...first, id: `${first.id}-off`, title: `휴무 · ${first.title}` } : off || first }).filter((row, i, all) => row && all.indexOf(row) === i) // 가족 순서(아빠·엄마·아이들) 그대로
  // 생일·기념일: 열흘 안에 오면 D-day
  const soon = (state.anniversaries || []).map((a) => ({ a, at: nextAnniversaryOccurrence(a, new Date(today.getFullYear(), today.getMonth(), today.getDate())) })).filter((x) => x.at).map((x) => ({ ...x, d: Math.round((x.at - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000) })).filter((x) => x.d <= 10).toSorted((x, y) => x.d - y.d) // 홈은 D-10부터, 가까운 날 위로
  const isBirthday = (profile) => isBirthdayToday(state.anniversaries, profile, today)
  const allDone = !remaining.length && rows.some((row) => row.type !== 'shift' && row.type !== 'leave') // 오늘 일정 다 끝남: 제목 옆 한 줄만
  return <div className="house-page">
    {weather && <p className="weather-line" aria-label={`광양읍 ${weather.temp}도, ${weather.tip}`}><img className="weather-pic" src={`/icons/weather/${weather.dusty ? 'dust' : weather.mood === 'windy' ? 'wind' : SKY_PIC[weather.sky]}.png`} alt="" width={28} height={28} /><strong>{weather.temp}°</strong><span>{weather.tip}</span></p>}
    <section aria-labelledby="now-heading"><h2 id="now-heading" className="visually-hidden">지금</h2>
      <DataState loading={loading} error={error} onRetry={onRetry}><div className="house-grid">{profiles.map((profile) => {
        const status = houseStatus(profile, rows, state.tasks, today, now, state.shifts)
        return <button className="house-tile" data-character={profile.characterId || 'unknown'} key={profile.id} onClick={() => onPerson(profile.id)} aria-label={`${profile.name}의 오늘 일정, ${status.label}`}>
          {status.badgeKind && <img className="house-badge-pic" src={`/icons/kind/${status.badgeKind === '학원' ? 'academy' : 'school'}.png`} alt="" width={34} height={34} />}{status.badge && <span className={`house-badge${status.badgeUpcoming ? ' upcoming' : ''}`}>{status.badge}</span>}<CharacterAvatar profile={profile} expression={moodFor(profile, status, { rows, tasks: state.tasks, now, birthday: isCelebrationToday(state.anniversaries, profile, today), weather })} size={66} glass />{isBirthday(profile) && <img className="tile-cake" src="/icons/kind/birthday.png" alt="오늘 생일" width={30} height={30} />}<strong>{profile.name}</strong><small>{isBirthday(profile) && status.expression !== 'busy' ? '오늘 생일' : <ArrowText text={softDetail(status.detail, profile, today)} />}</small>
        </button>
      })}</div>{!profiles.length && <p className="data-message">가족 탭에서 구성원을 등록해 주세요.</p>}</DataState>
    </section>
    {soon.length > 0 && <section aria-labelledby="dday-heading"><h2 className="house-section-title" id="dday-heading">생일·기념일</h2><GroupedList label="생일·기념일">{soon.map(({ a, d }) => <GroupedRow key={a.id} className={d ? undefined : 'dday-today'} icon={<DayIcon kind={a.kind} />} title={d ? anniversaryTitle(a) : `오늘은 ${anniversaryTitle(a)}!`} subtitle={d ? undefined : a.kind === '생일' ? '축하 인사 잊지 마세요' : '함께 기억해요'} value={<span className="dday-value">{(a.members?.length || a.member) ? <MemberAvatars item={d ? a : { ...a, anniversary: true, anniversaryKind: a.kind }} profiles={state.profiles} /> : null}<b className="dday">{d ? `D-${d}` : 'D-DAY'}</b></span>} />)}</GroupedList></section>}
    <section aria-labelledby="remaining-heading"><h2 id="remaining-heading" className="house-section-title">오늘 남은 일정{allDone && <small className="all-done">✓ 모두 끝</small>}<span className="visually-hidden" data-testid="today-count">{remaining.length}</span></h2>
      {todayBring.length > 0 && <BringList rows={todayBring} profiles={state.profiles} label="오늘 챙길 것" />}
      <DataState loading={loading} error={error} onRetry={onRetry}>{remaining.length ? <div className="today-remaining" aria-label="오늘 남은 일정"><ByPerson rows={remaining} profiles={state.profiles} moods={Object.fromEntries(profiles.map((p) => [p.id, moodFor(p, houseStatus(p, rows, state.tasks, today, now, state.shifts), { rows, tasks: state.tasks, now, birthday: isCelebrationToday(state.anniversaries, p, today), weather })]))} onRow={canEdit ? setEditing : undefined} /></div> : (allDone ? null : <div className="empty-state"><h3>오늘은 여유로운 날이에요</h3></div>)}</DataState>
      {onOpenToday && <button type="button" className="text-button past-link" onClick={onOpenToday}>오늘 지난 일정 보기 ›</button>}
      {(firstTomorrow.length > 0 || bring.length > 0) && <section className="tomorrow-section" aria-labelledby="tomorrow-heading"><h2 className="house-section-title" id="tomorrow-heading">내일 첫 일정</h2>{bring.length > 0 && <BringList rows={bring} profiles={state.profiles} label="내일 챙길 것" />}{firstTomorrow.length > 0 && <ScheduleList rows={firstTomorrow} profiles={state.profiles} label="내일 첫 일정" />}</section>}
    </section>

    {editing && <RowEditor row={editing} state={state} updateState={updateState} canEdit={canEdit} today={today} onChange={setEditing} />}
  </div>
}

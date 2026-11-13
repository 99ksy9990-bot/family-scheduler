import RowEditor from '../../components/RowEditor'
import { X } from 'lucide-react'
import { getClip, clearClip } from '../../data/clip'
import { useMemo, useRef, useState } from 'react'
import { addDays, iso } from '../../../lib/dates'
import { holidaysForYear } from '../../../lib/holidays'
import { LEAVES, scheduleForDate } from '../../data/schedule'
import { DEFAULT_SHIFT_TYPES } from '../../../lib/legacyState'
import ScheduleList from '../../components/ScheduleList'
import { DataState } from '../../components/DataState'
import CharacterAvatar from '../../components/CharacterAvatar'
import { membersFor } from '../../data/members'
import { offRows } from '../../data/personDay'
import { personColor } from '../../data/kinds'
import { anniversarySolarOccurrences } from '../../../lib/schedule'

// 그날 일정을 사람별로 묶음: 가족 전체(공휴일·기념일) → 함께 하는 일정 → 한 사람씩
export function ByPerson({ rows, profiles, onRow, moods = {} }) {
  if (!rows.length) return <ScheduleList rows={rows} profiles={profiles} />
  const groups = new Map()
  for (const row of rows) {
    const m = membersFor(row, profiles)
    const key = m.length === 1 ? m[0].id : 'all' // 2명 이상은 가족으로 묶기
    groups.set(key, [...groups.get(key) || [], row])
  }
  const order = [['all', '가족'], ...profiles.filter((p) => p.active !== false).map((p) => [p.id, p.name, p])]
  return order.filter(([key]) => groups.has(key)).map(([key, name, profile]) => <div className={`person-group${profile ? " solo" : ""}`} key={key} style={profile ? { '--pc': personColor(profile) } : undefined}>
    <h3 className="person-group-head">{profile ? <CharacterAvatar profile={profile} expression={moods[profile.id]} size={44} /> : null}{name}<small>{groups.get(key).length}</small></h3>
    <ScheduleList rows={groups.get(key)} profiles={profiles} onRow={onRow} nextId="auto" label={`${name} 일정`} solo={Boolean(profile)} />
  </div>)
}

const weekdays = ['일', '월', '화', '수', '목', '금', '토']
const HIDE_KEY = 'family-scheduler-hidden-work' // 이 폰에서만 숨길 근무자
const readHidden = () => { try { return JSON.parse(localStorage.getItem(HIDE_KEY) || '[]') } catch { return [] } }

export default function Calendar({ today, state, loading, error, onRetry, cursor, onMove, selectedDate, onSelectDate, onPaste, updateState, canEdit }) {
  const [editing, setEditing] = useState(null) // 달력에서 바로 누른 일정
  const [, setClipTick] = useState(0) // 복사 취소 후 다시 그리기
  const clip = onPaste ? getClip() : null
  const touch = useRef(null)
  const [hidden, setHidden] = useState(readHidden)
  const toggleWork = (id) => setHidden((list) => { const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id]; try { localStorage.setItem(HIDE_KEY, JSON.stringify(next)) } catch { /* 저장 못 하면 이번만 */ } return next })
  // 생일 날짜 칸에 그 사람의 생일 표정 그림
  const birthdays = useMemo(() => { const m = new Map(); for (const a of state.anniversaries || []) { if (a.kind !== '생일') continue; const who = state.profiles.find((p) => p.active !== false && (a.members?.includes(p.id) || a.member === p.id || a.name === p.name)); if (!who) continue; for (const y of [cursor.getFullYear() - 1, cursor.getFullYear(), cursor.getFullYear() + 1]) for (const d of anniversarySolarOccurrences(a, y)) m.set(iso(d), who) } return m }, [state.anniversaries, state.profiles, cursor])
  const workers = state.profiles.filter((p) => p.active !== false && ((state.workSettings?.enabled && state.workSettings.workerIds?.includes(p.id)) || p.regularWork))
  const selected = selectedDate ? new Date(`${selectedDate}T00:00:00`) : today
  // '이 날만 빼기'한 일정: 되살릴 수 있게 그날 아래에 보여줌
  const skippedHere = (state.scheduleExceptions || []).filter((x) => x.type === 'skip' && x.date === iso(selected)).map((x) => { const src = [...(state.childSchedules || []), ...(state.events || [])].find((s) => s.id === x.scheduleId); return { ...x, title: src?.title || '반복 일정', time: src?.time || '', who: src ? membersFor(src, state.profiles) : [] } }).sort((p, q) => state.profiles.indexOf(p.who[0]) - state.profiles.indexOf(q.who[0])) // 누구 것인지 얼굴·이름으로
  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const start = addDays(first, -first.getDay())
    const count = Math.ceil((first.getDay() + new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()) / 7) * 7
    return Array.from({ length: count }, (_, index) => addDays(start, index))
  }, [cursor])
  const rows = [...scheduleForDate(state, selected).filter((row) => !row.carryover), ...offRows(state, selected)].filter((row) => !(['shift', 'leave'].includes(row.type) && hidden.includes(row.member))) // 전날 밤 근무는 빼고 그날 근무(또는 OFF)만
  // 교대 근무자(엄마 등)의 근무만 날짜 칸에 이름표로 (사용자 요청 2026-11-06, 달력 A 방식)
  const shiftLabels = useMemo(() => {
    const ws = state.workSettings || {}
    const types = ws.shiftTypes?.length ? ws.shiftTypes : DEFAULT_SHIFT_TYPES
    const workers = new Set(ws.workerIds || [])
    const map = new Map()
    for (const s of ws.enabled ? state.shifts : []) {
      const t = types.find((x) => x.id === s.shift)
      if (!t || t.id === 'off' || !workers.has(s.member)) continue
      map.set(s.date, [...(map.get(s.date) || []).filter((x) => x.member !== s.member), { member: s.member, id: t.id, text: t.code }])
    }
    // 고정 근무자(아빠)의 연차·반차도 같은 이름표로
    for (const profile of state.profiles) for (const [date, kind] of Object.entries(profile.regularWork?.leaves || {})) {
      if (profile.active === false || !LEAVES[kind]) continue
      map.set(date, [...(map.get(date) || []), { member: profile.id, id: `leave-${kind}`, text: LEAVES[kind].label.replace(' 반차', '') }])
    }
    // OFF는 숨기고(일하는 날만), 빈 줄은 두지 않음
    return map
  }, [state.shifts, state.workSettings, state.profiles])
  const endSwipe = (event) => {
    if (!touch.current) return
    const dx = event.changedTouches[0].clientX - touch.current.x
    const dy = event.changedTouches[0].clientY - touch.current.y
    touch.current = null
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) onMove(dx < 0 ? 1 : -1)
  }
  return <div className="calendar-page">
    {workers.length > 0 && <div className="work-toggles" role="group" aria-label="근무 보기">{workers.map((p) => <button key={p.id} aria-pressed={!hidden.includes(p.id)} onClick={() => toggleWork(p.id)}><CharacterAvatar profile={p} size={18} />{p.name} 근무</button>)}</div>}
    <section className="month-card" aria-label="달력" onTouchStart={(event) => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY } }} onTouchEnd={endSwipe} onTouchCancel={() => { touch.current = null }}>
      <DataState loading={loading} error={error} onRetry={onRetry}><div className="month-grid" role="group" aria-label="월간 달력">
        {weekdays.map((day, index) => <span className={`weekday${index === 0 ? ' sunday' : ''}`} key={day}>{day}</span>)}
        {days.map((date) => {
          const key = iso(date)
          const holiday = holidaysForYear(date.getFullYear()).get(key)
          return <button key={key} className={`calendar-day${date.getMonth() !== cursor.getMonth() ? ' outside' : ''}${holiday ? ' holiday-day' : ''}${date.getDay() === 0 ? ' sunday' : ''}`} data-today={key === iso(today)} aria-current={key === iso(today) ? 'date' : undefined} aria-pressed={key === iso(selected)} aria-label={`${key}${holiday ? ` ${holiday.map((item) => item.name).join(' ')}` : ''}`} onClick={() => { onSelectDate(key); requestAnimationFrame(() => document.getElementById('selected-heading')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })) }}><span className="day-number">{date.getDate()}</span>{birthdays.get(key) && <span className="day-birthday" aria-label={`${birthdays.get(key).name} 생일`}><CharacterAvatar profile={birthdays.get(key)} expression="party" size={18} /></span>}<span className="shift-row">{(shiftLabels.get(key) || []).filter((l) => !hidden.includes(l.member)).map((l) => <span key={l.member} className="shift-label" data-shift={l.id}>{l.text}</span>)}</span></button>
        })}
      </div></DataState>
    </section>
    <section className="selected-schedule" aria-labelledby="selected-heading"><h2 className="house-section-title" id="selected-heading">{selected.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}<span className="visually-hidden" data-testid="selected-count">{rows.length}</span>{clip && <span className="paste-bar">{!rows.some((row) => row.title === clip.title && (row.displayStart || '') === (clip.time || '')) && <button type="button" className="paste-event" onClick={() => onPaste(iso(selected))}>‘{clip.title}’ 붙여넣기</button>}<button type="button" className="paste-done" aria-label="붙여넣기 끝내기" onClick={() => { clearClip(); setClipTick((n) => n + 1) }}><X size={16} /></button></span>}</h2><DataState loading={loading} error={error} onRetry={onRetry}><ByPerson rows={rows} profiles={state.profiles} onRow={canEdit ? setEditing : undefined} /></DataState>
      {skippedHere.length > 0 && <details className="skipped-list"><summary className="quiet">이 날 뺀 반복 일정 {skippedHere.length}</summary>{skippedHere.map((x) => <div key={x.id} className="skipped-row"><span className="skipped-who">{x.who.slice(0, 2).map((p) => <CharacterAvatar key={p.id} profile={p} size={30} />)}<span><b>{x.who.map((p) => p.name).join('·') || '가족'}</b> {x.title}{x.time && <small> {x.time}</small>}</span></span><button type="button" className="text-button" disabled={!canEdit} onClick={() => updateState((current) => ({ ...current, scheduleExceptions: (current.scheduleExceptions || []).filter((e) => e.id !== x.id) }))}>되살리기</button></div>)}</details>}</section>
    {editing && <RowEditor row={editing} state={state} updateState={updateState} canEdit={canEdit} today={today} onChange={setEditing} onSkip={() => setTimeout(() => document.querySelector('.skipped-list')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100)} />}
  </div>
}

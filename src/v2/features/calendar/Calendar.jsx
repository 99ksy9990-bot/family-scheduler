import { useMemo, useRef } from 'react'
import { addDays, iso } from '../../../lib/dates'
import { holidaysForYear } from '../../../lib/holidays'
import { LEAVES, scheduleForDate } from '../../data/schedule'
import { DEFAULT_SHIFT_TYPES } from '../../../lib/legacyState'
import ScheduleList from '../../components/ScheduleList'
import { DataState } from '../../components/DataState'

const weekdays = ['일', '월', '화', '수', '목', '금', '토']

export default function Calendar({ today, state, loading, error, onRetry, cursor, onMove, selectedDate, onSelectDate }) {
  const touch = useRef(null)
  const selected = selectedDate ? new Date(`${selectedDate}T00:00:00`) : today
  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const start = addDays(first, -first.getDay())
    const count = Math.ceil((first.getDay() + new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()) / 7) * 7
    return Array.from({ length: count }, (_, index) => addDays(start, index))
  }, [cursor])
  const rows = scheduleForDate(state, selected)
  // 교대 근무자(엄마 등)의 근무만 날짜 칸에 이름표로 (사용자 요청 2026-11-06, 달력 A 방식)
  const shiftLabels = useMemo(() => {
    const ws = state.workSettings || {}
    const types = ws.shiftTypes?.length ? ws.shiftTypes : DEFAULT_SHIFT_TYPES
    const workers = new Set(ws.workerIds || [])
    const map = new Map()
    for (const s of ws.enabled ? state.shifts : []) {
      const t = types.find((x) => x.id === s.shift)
      if (!t || !workers.has(s.member)) continue
      map.set(s.date, [...(map.get(s.date) || []).filter((x) => x.member !== s.member), { member: s.member, id: t.id, text: t.id === 'off' ? '휴무' : t.code }])
    }
    // 고정 근무자(아빠)의 연차·반차도 같은 이름표로
    for (const profile of state.profiles) for (const [date, kind] of Object.entries(profile.regularWork?.leaves || {})) {
      if (profile.active === false || !LEAVES[kind]) continue
      map.set(date, [...(map.get(date) || []), { member: profile.id, id: `leave-${kind}`, text: LEAVES[kind].label }])
    }
    // 교대 근무 이름표가 위, 상주 근무자(연차·반차)가 아래
    // 교대 근무자가 있으면 그 줄을 비워 두어 상주 근무자 이름표는 늘 아래 줄에
    const hasShiftWorkers = ws.enabled && workers.size > 0
    for (const [date, labels] of map) {
      const sorted = labels.toSorted((a, b) => a.id.startsWith('leave-') - b.id.startsWith('leave-'))
      map.set(date, hasShiftWorkers && !sorted.some((l) => !l.id.startsWith('leave-')) ? [{ member: '_blank', id: 'blank', text: '' }, ...sorted] : sorted)
    }
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
    <section className="month-card" aria-label="달력" onTouchStart={(event) => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY } }} onTouchEnd={endSwipe} onTouchCancel={() => { touch.current = null }}>
      <DataState loading={loading} error={error} onRetry={onRetry}><div className="month-grid" role="group" aria-label="월간 달력">
        {weekdays.map((day, index) => <span className={`weekday${index === 0 ? ' sunday' : ''}`} key={day}>{day}</span>)}
        {days.map((date) => {
          const key = iso(date)
          const holiday = holidaysForYear(date.getFullYear()).get(key)
          return <button key={key} className={`calendar-day${date.getMonth() !== cursor.getMonth() ? ' outside' : ''}${holiday ? ' holiday-day' : ''}${date.getDay() === 0 ? ' sunday' : ''}`} data-today={key === iso(today)} aria-current={key === iso(today) ? 'date' : undefined} aria-pressed={key === iso(selected)} aria-label={`${key}${holiday ? ` ${holiday.map((item) => item.name).join(' ')}` : ''}`} onClick={() => { onSelectDate(key); requestAnimationFrame(() => document.getElementById('selected-heading')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })) }}><span className="day-number">{date.getDate()}</span>{(shiftLabels.get(key) || []).map((l) => <span key={l.member} className="shift-label" data-shift={l.id}>{l.text}</span>)}</button>
        })}
      </div></DataState>
    </section>
    <section className="selected-schedule" aria-labelledby="selected-heading"><h2 className="house-section-title" id="selected-heading">{selected.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}<span className="visually-hidden" data-testid="selected-count">{rows.length}</span></h2><DataState loading={loading} error={error} onRetry={onRetry}><ScheduleList rows={rows} profiles={state.profiles} /></DataState></section>
  </div>
}

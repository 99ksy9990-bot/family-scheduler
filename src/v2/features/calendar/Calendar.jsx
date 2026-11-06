import { useMemo, useRef } from 'react'
import { addDays, iso } from '../../../lib/dates'
import { holidaysForYear } from '../../../lib/holidays'
import { scheduleForDate } from '../../data/schedule'
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
          return <button key={key} className={`calendar-day${date.getMonth() !== cursor.getMonth() ? ' outside' : ''}${holiday ? ' holiday-day' : ''}${date.getDay() === 0 ? ' sunday' : ''}`} data-today={key === iso(today)} aria-current={key === iso(today) ? 'date' : undefined} aria-pressed={key === iso(selected)} aria-label={`${key}${holiday ? ` ${holiday.map((item) => item.name).join(' ')}` : ''}`} onClick={() => onSelectDate(key)}><span className="day-number">{date.getDate()}</span></button>
        })}
      </div></DataState>
    </section>
    <section className="selected-schedule" aria-labelledby="selected-heading"><h2 className="house-section-title" id="selected-heading">{selected.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}<span className="visually-hidden" data-testid="selected-count">{rows.length}</span></h2><DataState loading={loading} error={error} onRetry={onRetry}><ScheduleList rows={rows} profiles={state.profiles} /></DataState></section>
  </div>
}

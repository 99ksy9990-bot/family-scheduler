import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, iso, formatLongDate } from '../../../lib/dates'
import { holidaysForYear } from '../../../lib/holidays'
import { scheduleForDate } from '../../data/schedule'
import Timeline, { DataState } from '../../components/Timeline'

const weekdays = ['일', '월', '화', '수', '목', '금', '토']

export default function Calendar({ today, now, state, loading, error, onRetry, selectedDate, onSelectDate }) {
  const [cursor, setCursor] = useState(() => selectedDate ? new Date(`${selectedDate}T00:00:00`) : today)
  const selected = useMemo(() => selectedDate ? new Date(`${selectedDate}T00:00:00`) : today, [selectedDate, today])
  const [mode, setMode] = useState('month')
  const days = useMemo(() => {
    const first = mode === 'month' ? new Date(cursor.getFullYear(), cursor.getMonth(), 1) : cursor
    const start = addDays(first, -first.getDay())
    const weeks = mode === 'month' ? Math.ceil((first.getDay() + new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()) / 7) : 1
    return Array.from({ length: weeks * 7 }, (_, index) => addDays(start, index))
  }, [cursor, mode])
  const rows = useMemo(() => scheduleForDate(state, selected), [state, selected])
  const move = (direction) => setCursor((current) => mode === 'month' ? new Date(current.getFullYear(), current.getMonth() + direction, 1) : addDays(current, direction * 7))
  return <div className="calendar-layout">
    <section className="calendar-panel" aria-labelledby="calendar-heading">
      <header className="calendar-toolbar"><h2 id="calendar-heading">{cursor.getFullYear()}년 {cursor.getMonth() + 1}월</h2><button className="icon-button" aria-label={mode === 'month' ? '이전 달' : '이전 주'} onClick={() => move(-1)}><ChevronLeft size={18} /></button><button className="icon-button" aria-label={mode === 'month' ? '다음 달' : '다음 주'} onClick={() => move(1)}><ChevronRight size={18} /></button><button className="calendar-mode" aria-label={mode === 'month' ? '주 보기' : '월 보기'} onClick={() => setMode(mode === 'month' ? 'week' : 'month')}>월 · 주</button><button onClick={() => { setCursor(today); onSelectDate(iso(today)) }}>오늘</button></header>
      <DataState loading={loading} error={error} onRetry={onRetry}>
        <div className={`calendar-grid ${mode}`} role="group" aria-label={mode === 'month' ? '월간 달력' : '주간 달력'}>
          {weekdays.map((day, index) => <span className={`weekday${index === 0 ? ' sunday' : ''}`} key={day}>{day}</span>)}
          {days.map((date) => {
            const key = iso(date)
            const holiday = holidaysForYear(date.getFullYear()).get(key)
            return <button key={key} className={`calendar-day ${date.getMonth() !== cursor.getMonth() ? 'outside' : ''} ${holiday ? 'holiday-day' : ''} ${date.getDay() === 0 ? 'sunday' : ''}`} data-today={key === iso(today)} aria-current={key === iso(today) ? 'date' : undefined} aria-pressed={key === iso(selected)} aria-label={`${key}${holiday ? ` ${holiday.map((item) => item.name).join(' ')}` : ''}`} onClick={() => onSelectDate(iso(date))}><span className="day-number">{date.getDate()}</span></button>
          })}
        </div>
      </DataState>
    </section>
    <section className="selected-schedule" aria-labelledby="selected-heading"><div className="section-heading"><h2 id="selected-heading">{formatLongDate(selected)}</h2><span className="quiet"><span data-testid="selected-count">{rows.length}</span>개</span></div><DataState loading={loading} error={error} onRetry={onRetry}><Timeline rows={rows} profiles={state.profiles} date={selected} now={now} /></DataState></section>
  </div>
}

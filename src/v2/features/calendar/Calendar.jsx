import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, iso, formatLongDate } from '../../../lib/dates'
import { holidaysForYear } from '../../../lib/holidays'
import { scheduleForDate } from '../../data/schedule'
import Timeline, { DataState } from '../../components/Timeline'
import Sheet from '../../components/Sheet'

const weekdays = ['일', '월', '화', '수', '목', '금', '토']

export default function Calendar({ today, state, loading, error, onRetry }) {
  const [cursor, setCursor] = useState(today)
  const [selected, setSelected] = useState(today)
  const [mode, setMode] = useState('month')
  const [sheetOpen, setSheetOpen] = useState(false)
  const days = useMemo(() => {
    const first = mode === 'month' ? new Date(cursor.getFullYear(), cursor.getMonth(), 1) : cursor
    const start = addDays(first, -first.getDay())
    return Array.from({ length: mode === 'month' ? 42 : 7 }, (_, index) => addDays(start, index))
  }, [cursor, mode])
  const rowsByDate = useMemo(() => new Map([...days, selected].map((date) => [iso(date), scheduleForDate(state, date)])), [days, selected, state])
  const selectedRows = rowsByDate.get(iso(selected)) || []
  const move = (direction) => setCursor((current) => mode === 'month'
    ? new Date(current.getFullYear(), current.getMonth() + direction, 1) : addDays(current, direction * 7))
  const select = (date) => { setSelected(date); setSheetOpen(true) }
  const goToday = () => { setCursor(today); setSelected(today) }
  return <div className="calendar-layout">
    <section className="calendar-panel" aria-labelledby="calendar-heading">
      <header className="calendar-toolbar"><h2 id="calendar-heading">{cursor.getFullYear()}년 {cursor.getMonth() + 1}월</h2><button onClick={goToday}>오늘</button></header>
      <div className="calendar-controls"><div className="segmented" aria-label="달력 보기"><button aria-pressed={mode === 'month'} onClick={() => setMode('month')}>월</button><button aria-pressed={mode === 'week'} onClick={() => setMode('week')}>주</button></div><div className="calendar-arrows"><button className="icon-button" aria-label={mode === 'month' ? '이전 달' : '이전 주'} onClick={() => move(-1)}><ChevronLeft /></button><button className="icon-button" aria-label={mode === 'month' ? '다음 달' : '다음 주'} onClick={() => move(1)}><ChevronRight /></button></div></div>
      <DataState loading={loading} error={error} onRetry={onRetry}>
        <div className={`calendar-grid ${mode}`} role="group" aria-label={mode === 'month' ? '월간 달력' : '주간 달력'}>
          {weekdays.map((day) => <span className="weekday" key={day}>{day}</span>)}
          {days.map((date) => {
            const key = iso(date)
            const rows = rowsByDate.get(key)
            const holiday = holidaysForYear(date.getFullYear()).get(key)
            return <button key={key} className={`calendar-day ${date.getMonth() !== cursor.getMonth() ? 'outside' : ''} ${holiday ? 'holiday-day' : ''}`}
              data-today={key === iso(today)} aria-current={key === iso(today) ? 'date' : undefined} aria-pressed={key === iso(selected)} aria-label={`${key} 일정 ${rows.length}개${holiday ? ` ${holiday.map((item) => item.name).join(' ')}` : ''}`} onClick={() => select(date)}>
              <span className="day-number">{date.getDate()}</span>{rows.length > 0 && <small>{rows.length}개</small>}
              <span className="day-preview">{rows[0]?.title || ''}</span>
            </button>
          })}
        </div>
        <p className="calendar-hint">날짜를 누르면 그날의 일정을 볼 수 있어요.</p>
      </DataState>
    </section>
    {sheetOpen && <Sheet title={formatLongDate(selected)} onClose={() => setSheetOpen(false)}><DataState loading={loading} error={error} onRetry={onRetry}><Timeline rows={selectedRows} profiles={state.profiles} /></DataState></Sheet>}
  </div>
}

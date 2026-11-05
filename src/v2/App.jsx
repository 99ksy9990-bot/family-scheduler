import { useMemo, useState } from 'react'
import { CalendarDays, CheckSquare, Home, Plus, Settings, Gamepad2 } from 'lucide-react'
import { iso } from '../lib/dates'
import { useToday } from '../hooks/useToday'
import { useCurrentTime } from '../hooks/useCurrentTime'
import { fromLegacy } from './data/migrate'
import { useScheduler } from './data/useScheduler'
import { scheduleForDate } from './data/schedule'
import Today from './features/today/Today'
import Calendar from './features/calendar/Calendar'
import EventForm from './components/EventForm'
import { DataState } from './components/Timeline'

const tabs = [['today', '오늘', Home], ['calendar', '달력', CalendarDays], ['tasks', '할 일', CheckSquare], ['play', '놀이', Gamepad2], ['settings', '설정', Settings]]
const emptyState = fromLegacy({ profiles: [], events: [], tasks: [], shifts: [], childSchedules: [], schedulePeriods: [], anniversaries: [], scheduleExceptions: [], workSettings: {} })

export default function App() {
  const [tab, setTab] = useState('today')
  const [formDate, setFormDate] = useState(null)
  const today = useToday()
  const now = useCurrentTime()
  const { state: loadedState, error, sync, canEdit, addEvent, retry } = useScheduler()
  const state = loadedState || emptyState
  const rows = useMemo(() => scheduleForDate(state, today), [state, today])
  const label = tabs.find(([id]) => id === tab)[1]
  const onAdd = (date = iso(today)) => setFormDate(typeof date === 'string' ? date : iso(today))
  const props = { today, state, loading: sync.syncStatus === 'connecting', error, onRetry: retry }
  return <div className="v2-app">
    <header className="app-heading"><a href="#main" className="skip-link">본문으로 이동</a><h1>{label}</h1><span className="storage-status" role="status">{sync.syncStatus === 'saving' ? '저장 중' : sync.family ? sync.syncStatus === 'readonly' ? '함께 보는 일정' : '가족과 연결됨' : '이 기기에 저장'}</span></header>
    <main id="main" tabIndex={-1}>
      {tab === 'today' ? <Today {...props} now={now} rows={rows} /> : tab === 'calendar' ? <Calendar {...props} />
        : <section className="placeholder"><DataState error={error} onRetry={retry}><h2>{label} 준비 중</h2><p>{tab === 'settings' ? '가족 관리·공유·알림·백업을 이곳에서 준비하고 있어요.' : tab === 'play' ? '가족과 함께할 작은 놀이를 준비하고 있어요.' : '조금만 기다려 주세요. 가족의 하루를 차근차근 준비하고 있어요.'}</p></DataState></section>}
    </main>
    {canEdit && <button className="add-button" onClick={() => onAdd()} aria-label="일정 추가"><Plus size={28} /></button>}
    <nav className="bottom-nav" aria-label="주 메뉴">{tabs.map(([id, name, Icon]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}><Icon size={23} aria-hidden="true" /><span>{name}</span></button>)}</nav>
    {formDate && <EventForm key={formDate} date={formDate} profiles={state.profiles} onSave={addEvent} onClose={() => setFormDate(null)} />}
  </div>
}

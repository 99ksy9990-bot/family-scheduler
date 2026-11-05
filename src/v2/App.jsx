import { lazy, Suspense, useMemo, useState } from 'react'
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

const SettingsScreen = lazy(() => import('./features/settings/Settings'))
const Tasks = lazy(() => import('./features/tasks/Tasks'))

const tabs = [['today', '오늘', Home], ['calendar', '달력', CalendarDays], ['tasks', '할 일', CheckSquare], ['play', '놀이', Gamepad2], ['settings', '설정', Settings]]
const emptyState = fromLegacy({ profiles: [], events: [], tasks: [], shifts: [], childSchedules: [], schedulePeriods: [], anniversaries: [], scheduleExceptions: [], workSettings: {} })

export default function App() {
  const [tab, setTab] = useState('today')
  const [formDate, setFormDate] = useState(null)
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const today = useToday()
  const now = useCurrentTime()
  const { state: loadedState, error, sync, canEdit, addEvent, updateState, retry } = useScheduler()
  const state = loadedState || emptyState
  const rows = useMemo(() => scheduleForDate(state, today), [state, today])
  const label = tabs.find(([id]) => id === tab)[1]
  const onAdd = (date = iso(today)) => setFormDate(typeof date === 'string' ? date : iso(today))
  const props = { today, state, loading: sync.syncStatus === 'connecting', error, onRetry: retry }
  return <div className="v2-app">
    <header className="app-heading"><a href="#main" className="skip-link">본문으로 이동</a><h1>{label}</h1><span className="storage-status" role="status">{sync.syncStatus === 'saving' ? '저장 중' : sync.family ? sync.syncStatus === 'readonly' ? '함께 보는 일정' : '가족과 연결됨' : '이 기기에 저장'}</span></header>
    <main id="main" tabIndex={-1}>
      {tab === 'today' ? <Today {...props} now={now} rows={rows} /> : tab === 'calendar' ? <Calendar {...props} />
        : <Suspense fallback={<p role="status">화면을 불러오고 있어요…</p>}>{tab === 'settings' ? <SettingsScreen state={state} updateState={updateState} canEdit={canEdit} sync={sync} /> : tab === 'tasks' ? <Tasks state={state} updateState={updateState} canEdit={canEdit} today={today} formOpen={taskFormOpen} onCloseForm={() => setTaskFormOpen(false)} /> : <section className="placeholder"><DataState error={error} onRetry={retry}><h2>놀이 준비 중</h2><p>가족과 함께할 작은 놀이를 준비하고 있어요.</p></DataState></section>}</Suspense>}

    </main>
    {canEdit && <button className="add-button" onClick={() => tab === 'tasks' ? setTaskFormOpen(true) : onAdd()} aria-label={tab === 'tasks' ? '할 일 추가' : '일정 추가'}><Plus size={28} /></button>}
    <nav className="bottom-nav" aria-label="주 메뉴">{tabs.map(([id, name, Icon]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}><Icon size={23} aria-hidden="true" /><span>{name}</span></button>)}</nav>
    {formDate && <EventForm key={formDate} date={formDate} profiles={state.profiles} onSave={addEvent} onClose={() => setFormDate(null)} />}
  </div>
}

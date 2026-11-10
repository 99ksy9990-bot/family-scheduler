import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { createPortal } from 'react-dom'
import Sheet from './components/Sheet'
import { iso, formatLongDate } from '../lib/dates'
import { useToday } from '../hooks/useToday'
import { useCurrentTime } from '../hooks/useCurrentTime'
import { useScheduler } from './data/useScheduler'
import { scheduleForDate } from './data/schedule'
import { createDemo } from './data/demo'
import { todayPlays } from './data/gameScores'
import Today from './features/today/Today'
import HeaderTools from './features/header/HeaderTools'

// 위에 붙는 제목 줄 높이를 CSS에 알려줌 (할 일 칩이 그 아래에 붙도록)
// 시간대별 인사 (로고 옆)
const greeting = (d) => { const h = d.getHours(); return h < 5 ? '좋은 밤 되세요' : h < 11 ? '좋은 아침이에요' : h < 14 ? '맛있는 점심 드세요' : h < 18 ? '오후도 힘내요' : h < 22 ? '편안한 저녁 보내요' : '좋은 밤 되세요' }
const watchHeading = (el) => {
  if (!el || typeof ResizeObserver === 'undefined') return
  const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--head-h', `${el.offsetHeight}px`))
  ro.observe(el)
  return () => ro.disconnect()
}
import Calendar from './features/calendar/Calendar'
import Play, { SoundToggles } from './features/play/Play'
import EventForm from './components/EventForm'
import { getClip, pasteAt } from './data/clip'
import TabIcon from './components/TabIcon'

const FamilyScreen = lazy(() => import('./features/settings/Settings'))
const Tasks = lazy(() => import('./features/tasks/Tasks'))
const PersonDay = lazy(() => import('./features/person/PersonDay'))
const TaskForm = lazy(() => import('./features/tasks/TaskForm'))
const tabs = [['today', '우리집'], ['calendar', '달력'], ['tasks', '할 일'], ['play', '놀이'], ['family', '가족']]

export default function App() {
  const scheduler = useScheduler()
  return <Workspace key={scheduler.sync.session?.user?.id || 'demo'} scheduler={scheduler} />
}

function Workspace({ scheduler }) {
  const today = useToday()
  const now = useCurrentTime()
  const { sync } = scheduler
  const isDemo = !sync.session
  const [demo, setDemo] = useState(() => createDemo(today))
  const state = isDemo ? demo : scheduler.state
  const canEdit = isDemo || scheduler.canEdit
  const updateState = (update) => {
    if (!isDemo) return scheduler.updateState(update)
    setDemo((current) => typeof update === 'function' ? update(current) : update)
    return true
  }
  const addEvent = (event) => isDemo ? updateState((current) => ({ ...current, events: [...current.events, { ...event, id: `demo-added-${crypto.randomUUID()}` }] })) : scheduler.addEvent(event)
  const [tab, setTab] = useState('today')
  const [editCats, setEditCats] = useState(false)
  const [scrolled, setScrolled] = useState(false) // 내리면 떠 있는 + 버튼을 동그랗게 줄임
  useEffect(() => { const on = () => setScrolled(window.scrollY > 40); on(); addEventListener("scroll", on, { passive: true }); return () => removeEventListener("scroll", on) }, [])
  const [formDate, setFormDate] = useState(null)
  const [calendarDate, setCalendarDate] = useState(null)
  const [cursor, setCursor] = useState(today)
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [person, setPerson] = useState(null)
  const [familyPanel, setFamilyPanel] = useState(null)
  const rows = useMemo(() => state ? scheduleForDate(state, today) : [], [state, today])
  const [reset, setReset] = useState(0) // 같은 탭 다시 누르면 처음 화면으로
  const [pickYear, setPickYear] = useState(null) // 달 고르기 창
  const move = (direction) => setCursor((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1))
  const profiles = state?.profiles || []
  const openTasks = (state?.tasks || []).filter((t) => !t.done && !t.recurrence && (!t.dueDate || t.dueDate <= iso(today))).length // 오늘까지 남은 할 일 (반복 제외)
  const title = tab === 'calendar' ? `${cursor.getMonth() + 1}월` : tabs.find(([id]) => id === tab)[1]
  const subtitle = tab === 'today' ? formatLongDate(today) : tab === 'calendar' ? `${cursor.getFullYear()}년` : tab === 'play' ? `오늘 ${todayPlays(state?.gameScores, today)}판` : tab === 'tasks' ? `남은 할 일 ${openTasks}개` : `${profiles.filter((profile) => profile.active !== false).length}명`
  const props = { today, now, state, loading: !isDemo && sync.syncStatus === 'connecting', error: isDemo ? '' : scheduler.error, onRetry: scheduler.retry }
  return <div className="v2-app" data-view={tab} data-scrolled={scrolled || undefined}>
    <div className="ios-edge-guard" aria-hidden="true" />
    {isDemo && <button className="demo-banner" onClick={() => { setTab('family'); setFamilyPanel('connection') }}>예시 화면이에요 · 가족 연결하면 우리 일정이 보여요</button>}
    <header className="app-heading" ref={watchHeading}><a href="#main" className="skip-link">본문으로 이동</a>{!['today', 'calendar', 'family'].includes(tab) && <p className="app-date">{subtitle}</p>}{tab === 'calendar' ? <button className="heading-line month-line" aria-label={`${cursor.getFullYear()}년 ${title}, 다른 달 고르기`} onClick={() => setPickYear(cursor.getFullYear())}><h1>{title}</h1><p className="app-date">{subtitle}</p><ChevronDown size={18} className="month-caret" /></button> : <div className="heading-line"><h1>{title}</h1>{tab === 'today' && <small className="greeting">{greeting(now)}</small>}{tab === 'play' && <SoundToggles />}{tab === 'tasks' && <button className="text-button heading-side" disabled={!canEdit} onClick={() => setEditCats(true)}>분류 편집</button>}</div>}
      {['today', 'calendar', 'family'].includes(tab) && state && <HeaderTools state={state} now={now} onToday={tab === 'calendar' ? () => { setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); setCalendarDate(iso(today)) } : undefined} todayNumber={today.getDate()} onGoTasks={() => { setTab('tasks'); window.scrollTo(0, 0) }} onGoDate={(date) => { setTab('calendar'); setCalendarDate(date); setCursor(new Date(`${date}T00:00:00`)) }} />}
    </header>
    <main id="main" tabIndex={-1}>
      {!state ? <div className="empty-state" role="alert">가족 정보를 읽지 못했어요.<button onClick={scheduler.retry}>다시 시도</button></div> : <Suspense fallback={<p className="data-message" role="status">화면을 불러오고 있어요…</p>}>
        {tab === 'today' ? <><Today {...props} onOpenToday={() => { setTab('calendar'); setCalendarDate(iso(today)); setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); setTimeout(() => document.getElementById('selected-heading')?.scrollIntoView({ block: 'start' }), 300) }} rows={rows} onPerson={setPerson} updateState={updateState} canEdit={canEdit} />{openTasks > 0 && <button type="button" className="task-summary" onClick={() => { setTab('tasks'); window.scrollTo(0, 0) }}><strong>할 일</strong><span>{openTasks}개 남음</span><ChevronRight size={18} aria-hidden="true" /></button>}</>
          : tab === 'calendar' ? <Calendar {...props} updateState={updateState} canEdit={canEdit} onPaste={canEdit ? (date) => { const clip = getClip(); if (clip) addEvent(pasteAt(clip, date)) } : null} cursor={cursor} onMove={move} selectedDate={calendarDate} onSelectDate={setCalendarDate} />
            : tab === 'tasks' ? <Tasks key={reset} editCategories={editCats} setEditCategories={setEditCats} state={state} updateState={updateState} canEdit={canEdit} today={today} />
            : tab === 'play' ? <Play state={state} updateState={updateState} /> : <FamilyScreen key={reset} state={state} updateState={updateState} canEdit={canEdit} sync={sync} selected={familyPanel} onSelect={setFamilyPanel} onPerson={setPerson} />}
      </Suspense>}
    </main>
    {canEdit && ['today', 'calendar', 'tasks'].includes(tab) && <button className="header-add" data-compact={scrolled || undefined} onClick={() => { if (tab === 'tasks') { setTaskFormOpen(true); return } setFormDate(tab === 'calendar' ? calendarDate || iso(today) : iso(today)) }} aria-label={tab === 'today' ? '추가' : tab === 'tasks' ? '할 일 추가' : '일정 추가'}><Plus size={24} /><span aria-hidden="true">{tab === 'today' ? '추가' : tab === 'tasks' ? '할 일' : '일정'}</span></button>}
    <nav className="bottom-nav" aria-label="주 메뉴">{tabs.map(([id, name]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => { if (tab === id) setReset((n) => n + 1); setTab(id); window.scrollTo(0, 0) }}><TabIcon name={id} /><span>{name}</span></button>)}</nav>

    {person && <Suspense fallback={<p role="status">하루를 불러오고 있어요…</p>}><PersonDay memberId={person} state={state} today={today} now={now} updateState={updateState} canEdit={canEdit} onClose={() => setPerson(null)} /></Suspense>}
    {taskFormOpen && <Suspense fallback={<p role="status">입력창을 불러오고 있어요…</p>}><TaskForm state={state} updateState={updateState} today={today} onClose={() => setTaskFormOpen(false)} onModeChange={() => { setTaskFormOpen(false); setFormDate(tab === 'calendar' ? calendarDate || iso(today) : iso(today)) }} /></Suspense>}
    {pickYear && createPortal(<Sheet title="달 고르기" onClose={() => setPickYear(null)}><div className="year-row"><button className="month-arrow" aria-label="이전 해" onClick={() => setPickYear(pickYear - 1)}><ChevronLeft size={22} /></button><b>{pickYear}년</b><button className="month-arrow" aria-label="다음 해" onClick={() => setPickYear(pickYear + 1)}><ChevronRight size={22} /></button></div><div className="month-pick">{Array.from({ length: 12 }, (_, m) => <button key={m} aria-pressed={pickYear === cursor.getFullYear() && m === cursor.getMonth()} data-now={pickYear === today.getFullYear() && m === today.getMonth()} onClick={() => { setCursor(new Date(pickYear, m, 1)); setPickYear(null) }}>{m + 1}월</button>)}</div></Sheet>, document.body)}
    {formDate && <EventForm key={formDate} date={formDate} profiles={profiles} onSave={addEvent} onClose={() => setFormDate(null)} onModeChange={() => { setFormDate(null); setTaskFormOpen(true) }} />}
  </div>
}

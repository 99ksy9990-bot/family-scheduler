import { useEffect, useMemo, useState } from 'react'
import {
  Bell, CalendarDays, Check, CheckSquare, ChevronLeft, ChevronRight,
  Clock3, GraduationCap, HeartPulse, Home, Moon, MoreHorizontal, Pencil, Plus,
  Search, Settings2, ShoppingBasket, Sparkles, Sun, Sunset, Trash2, X,
} from 'lucide-react'

const MEMBERS = [
  { id: 'emma', name: '엄마', role: '엄마', initials: '엄', color: '#ffaaa0', tone: '#fff0ed' },
  { id: 'david', name: '아빠', role: '아빠', initials: '아', color: '#a9c978', tone: '#f2f7e8' },
  { id: 'leo', name: '레오', role: '아들', initials: '레', color: '#7fc7e3', tone: '#ecf8fc' },
  { id: 'mia', name: '미아', role: '딸', initials: '미', color: '#c9df84', tone: '#f6fae9' },
]

const pad = (value) => String(value).padStart(2, '0')
const iso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const addDays = (base, amount) => {
  const date = new Date(base)
  date.setDate(date.getDate() + amount)
  return date
}
const today = new Date()
today.setHours(0, 0, 0, 0)

const defaultEvents = [
  { id: 1, title: '치과 예약', date: iso(today), time: '오전 9:00', end: '오전 10:00', member: 'emma', location: '스마일 치과', type: 'family' },
  { id: 2, title: '축구 연습', date: iso(today), time: '오후 4:00', end: '오후 5:30', member: 'leo', location: '강변 운동장', type: 'school' },
  { id: 3, title: '미술 수업', date: iso(today), time: '오후 3:30', end: '오후 5:00', member: 'mia', location: '커뮤니티 센터', type: 'school' },
  { id: 4, title: '가족 저녁 식사', date: iso(today), time: '오후 6:30', end: '오후 8:00', member: 'emma', location: '우리 집', type: 'family' },
  { id: 5, title: '피아노 레슨', date: iso(addDays(today, 2)), time: '오후 5:00', end: '오후 6:00', member: 'leo', location: '음악실', type: 'school' },
  { id: 6, title: '야간 근무', date: iso(addDays(today, 3)), time: '오후 4:00', end: '자정', member: 'david', location: '시립 병원', type: 'work' },
  { id: 7, title: '미아 생일', date: iso(addDays(today, 6)), time: '오후 2:00', end: '오후 5:00', member: 'mia', location: '우리 집', type: 'family' },
]

const defaultTasks = [
  { id: 1, title: '전기 요금 납부', category: '긴급', assignee: 'emma', done: false, meta: '오늘까지' },
  { id: 2, title: '싱크대 수리공 부르기', category: '긴급', assignee: 'david', done: false, meta: '주방 싱크대' },
  { id: 3, title: '거실과 계단 청소기 돌리기', category: '집안일', assignee: 'leo', done: false, meta: '오늘 저녁' },
  { id: 4, title: '식기세척기 비우기', category: '집안일', assignee: 'mia', done: true, meta: '완료됨' },
  { id: 5, title: '오트밀크 2팩', category: '장보기', assignee: 'david', done: false, meta: '마트' },
  { id: 6, title: '신선한 시금치', category: '장보기', assignee: 'emma', done: false, meta: '마트' },
  { id: 7, title: '사과', category: '장보기', assignee: 'leo', done: true, meta: '구매 완료' },
]

const defaultShifts = [
  { id: 1, date: iso(today), member: 'emma', shift: 'evening' },
  { id: 2, date: iso(addDays(today, 1)), member: 'emma', shift: 'evening' },
  { id: 3, date: iso(addDays(today, 2)), member: 'emma', shift: 'night' },
  { id: 4, date: iso(addDays(today, 3)), member: 'emma', shift: 'night' },
  { id: 5, date: iso(addDays(today, 4)), member: 'emma', shift: 'off' },
  { id: 6, date: iso(addDays(today, 5)), member: 'emma', shift: 'off' },
  { id: 7, date: iso(addDays(today, 6)), member: 'emma', shift: 'day' },
]

const load = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

const formatLongDate = (date) => new Intl.DateTimeFormat('ko-KR', {
  weekday: 'long', month: 'long', day: 'numeric',
}).format(date)

function Avatar({ memberId, small = false }) {
  const member = MEMBERS.find((person) => person.id === memberId) || MEMBERS[0]
  return (
    <span className={`avatar ${small ? 'avatar-small' : ''}`} style={{ '--member': member.color, '--member-tone': member.tone }} title={member.name}>
      {member.initials}
    </span>
  )
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  )
}

const NAV = [
  { id: 'home', label: '홈', icon: Home },
  { id: 'calendar', label: '캘린더', icon: CalendarDays },
  { id: 'tasks', label: '할 일', icon: CheckSquare },
  { id: 'schedules', label: '일정 관리', icon: Settings2 },
]

function Navigation({ active, onChange }) {
  return (
    <nav className="main-nav" aria-label="주요 메뉴">
      {NAV.map(({ id, label, icon: Icon }) => (
        <button key={id} className={active === id ? 'active' : ''} onClick={() => onChange(id)}>
          <Icon size={19} strokeWidth={active === id ? 2.5 : 2} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

function Header({ active, onChange, focusMode, setFocusMode }) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <button className="brand" onClick={() => onChange('home')} aria-label="홈으로 이동">
          <BrandMark />
          <span>Family Scheduler</span>
        </button>
        <Navigation active={active} onChange={onChange} />
        <button className={`icon-button ${focusMode ? 'selected' : ''}`} onClick={() => setFocusMode(!focusMode)} aria-label="집중 모드 전환" title="집중 모드">
          <Search size={21} />
        </button>
      </div>
    </header>
  )
}

function MemberLegend() {
  return (
    <div className="member-legend">
      {MEMBERS.map((member) => (
        <span key={member.id}><i style={{ background: member.color }} />{member.name}</span>
      ))}
    </div>
  )
}

function EventCard({ event, compact = false, onEdit, onDelete }) {
  const member = MEMBERS.find((item) => item.id === event.member) || MEMBERS[0]
  const hasActions = Boolean(onEdit || onDelete)
  return (
    <article className={`event-card ${compact ? 'compact' : ''} ${hasActions ? 'has-actions' : ''}`} style={{ '--event': member.color, '--event-bg': member.tone }}>
      <div className="event-time">{event.time}</div>
      <Avatar memberId={event.member} small />
      <div className="event-copy">
        <strong>{event.title}</strong>
        <div className="event-detail-row">
          <span>{event.location}</span>
          {hasActions && <div className="event-actions">
            <button onClick={onEdit} aria-label={`${event.title} 수정`} title="일정 수정"><Pencil /></button>
            <button className="delete" onClick={onDelete} aria-label={`${event.title} 삭제`} title="일정 삭제"><Trash2 /></button>
          </div>}
        </div>
      </div>
    </article>
  )
}

function HomeView({ events, setView, openModal }) {
  const todayEvents = events.filter((event) => event.date === iso(today))
  const childEvents = todayEvents.filter((event) => ['leo', 'mia'].includes(event.member))
  const next = todayEvents[0] || events[0]

  return (
    <div className="page home-page">
      <section className="hero-intro">
        <span className="eyebrow">{formatLongDate(today)}</span>
        <h1>좋은 아침이에요, 엄마.</h1>
        <p>우리 가족의 오늘 하루를 한눈에 확인하세요.</p>
      </section>

      <section className="overview-grid">
        <article className="status-card card">
          <div className="card-label"><span>현재 상태</span><span className="status-pill"><i /> 근무 중</span></div>
          <h2>{next ? '오후 근무' : '휴무'}</h2>
          <p className="large-detail"><Clock3 /> 오후 6:00 종료</p>
          <div className="support-note">
            <Sparkles size={20} />
            <span><strong>백업 지원</strong>오늘 오후 픽업은 아빠가 담당합니다.</span>
          </div>
        </article>

        <article className="children-card card">
          <div className="section-heading"><h2>자녀 일정</h2><GraduationCap /></div>
          <div className="children-list">
            {childEvents.length ? childEvents.map((event) => (
              <div key={event.id} className="child-row">
                <Avatar memberId={event.member} />
                <span><strong>{MEMBERS.find((member) => member.id === event.member)?.name}</strong>{event.title} · {event.time}</span>
              </div>
            )) : <p className="empty-copy">오늘은 수업이 없습니다.</p>}
          </div>
        </article>
      </section>

      <section className="today-card card">
        <div className="section-heading">
          <div><span className="eyebrow">오늘 한눈에 보기</span><h2>오늘의 일정</h2></div>
          <button className="text-button" onClick={() => setView('calendar')}>캘린더 보기 <ChevronRight size={16} /></button>
        </div>
        <div className="timeline">
          {todayEvents.slice(0, 4).map((event) => <EventCard key={event.id} event={event} />)}
          {!todayEvents.length && <p className="empty-copy">비어 있는 하루예요. 필요할 때 일정을 추가하세요.</p>}
        </div>
      </section>

      <button className="floating-add" onClick={() => openModal('event')} aria-label="일정 추가"><Plus /></button>
    </div>
  )
}

const SHIFT_OPTIONS = [
  { id: 'day', label: '주간 근무', shortLabel: '주간', time: '오전 7:00 – 오후 3:00', icon: Sun, color: 'sage' },
  { id: 'evening', label: '오후 근무', shortLabel: '오후', time: '오후 3:00 – 오후 11:00', icon: Sunset, color: 'blue' },
  { id: 'night', label: '야간 근무', shortLabel: '야간', time: '오후 11:00 – 오전 7:00', icon: Moon, color: 'navy' },
  { id: 'off', label: '휴무', shortLabel: '휴무', time: '근무 없음', icon: CalendarDays, color: 'lavender' },
]

function buildCalendarDays(cursor) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const previousMonthDays = new Date(year, month, 0).getDate()
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - first.getDay() + 1
    if (day < 1) return { day: previousMonthDays + day, date: new Date(year, month - 1, previousMonthDays + day), outside: true }
    if (day > daysInMonth) return { day: day - daysInMonth, date: new Date(year, month + 1, day - daysInMonth), outside: true }
    return { day, date: new Date(year, month, day), outside: false }
  })
}

function CalendarView({ events, shifts, setShifts, openModal, deleteEvent }) {
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(today)
  const [mode, setMode] = useState('일반')
  const monthDays = useMemo(() => buildCalendarDays(cursor), [cursor])
  const selectedEvents = events.filter((event) => event.date === iso(selected))
  const selectedShift = shifts.find((shift) => shift.date === iso(selected) && shift.member === 'emma')
  const isMonthEnd = selected.getDate() === new Date(selected.getFullYear(), selected.getMonth() + 1, 0).getDate()
  const label = new Intl.DateTimeFormat('ko-KR', { month: 'long', year: 'numeric' }).format(cursor)

  const moveMonth = (amount) => {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + amount, 1)
    setCursor(next)
  }

  const setSelectedShift = (shiftId) => {
    const selectedDate = iso(selected)
    const existing = shifts.find((shift) => shift.date === selectedDate && shift.member === 'emma')
    if (existing) {
      setShifts(shifts.map((shift) => shift.id === existing.id ? { ...shift, shift: shiftId } : shift))
    } else {
      setShifts([...shifts, { id: `emma-${selectedDate}`, date: selectedDate, member: 'emma', shift: shiftId }])
    }
    const nextDate = addDays(selected, 1)
    if (nextDate.getMonth() === selected.getMonth() && nextDate.getFullYear() === selected.getFullYear()) {
      setSelected(nextDate)
    }
  }

  const clearSelectedShift = () => {
    const selectedDate = iso(selected)
    setShifts(shifts.filter((shift) => !(shift.date === selectedDate && shift.member === 'emma')))
  }

  return (
    <div className="page calendar-page">
      <section className="calendar-toolbar card">
        <div>
          <span className="eyebrow">{mode === '일반' ? '가족 공유 캘린더' : '엄마 교대근무 달력'}</span>
          <div className="month-controls">
            <button className="icon-button" onClick={() => moveMonth(-1)} aria-label="이전 달"><ChevronLeft /></button>
            <h1>{label}</h1>
            <button className="icon-button" onClick={() => moveMonth(1)} aria-label="다음 달"><ChevronRight /></button>
          </div>
        </div>
        <div className="segmented">
          {['일반', '교대근무'].map((item) => <button key={item} aria-pressed={mode === item} className={mode === item ? 'active' : ''} onClick={() => setMode(item)}>{item}</button>)}
        </div>
      </section>

      <section className={`calendar-layout ${mode === '교대근무' ? 'shift-mode' : ''}`}>
        <div className="calendar-card card">
          <div className="weekday-row">{['일', '월', '화', '수', '목', '금', '토'].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="calendar-grid">
            {monthDays.map(({ day, date, outside }) => {
              const dayEvents = events.filter((event) => event.date === iso(date))
              const dayShift = shifts.find((shift) => shift.date === iso(date) && shift.member === 'emma')
              const shiftOption = SHIFT_OPTIONS.find((option) => option.id === dayShift?.shift)
              const ShiftIcon = shiftOption?.icon
              const isSelected = iso(date) === iso(selected)
              const isToday = iso(date) === iso(today)
              return (
                <button key={iso(date)} className={`${outside ? 'outside' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${mode === '교대근무' && shiftOption ? `has-shift shift-${shiftOption.color}` : ''}`} onClick={() => setSelected(date)}>
                  <span>{day}</span>
                  {mode === '일반' ? <>
                    <div className="day-dots">
                      {dayEvents.slice(0, 3).map((event) => {
                        const member = MEMBERS.find((person) => person.id === event.member)
                        return <i key={event.id} style={{ background: member?.color }} />
                      })}
                    </div>
                    {dayEvents[0] && <small>{dayEvents[0].title}</small>}
                  </> : shiftOption && <span className={`shift-chip ${shiftOption.color}`}>{ShiftIcon && <ShiftIcon />}{shiftOption.shortLabel}</span>}
                </button>
              )
            })}
          </div>
        </div>

        <aside className={`day-panel card ${mode === '교대근무' ? 'shift-day-panel' : ''}`}>
          {mode === '일반' ? <>
            <div className="section-heading">
              <div><span className="eyebrow">선택한 날짜</span><h2>{formatLongDate(selected)}</h2></div>
              <button className="small-add" onClick={() => openModal('event', iso(selected))}><Plus size={18} /> 추가</button>
            </div>
            <div className="day-events">
              {selectedEvents.map((event) => <EventCard
                key={event.id}
                event={event}
                compact
                onEdit={() => openModal('event', event.date, event)}
                onDelete={() => {
                  if (window.confirm(`‘${event.title}’ 일정을 삭제할까요?`)) deleteEvent(event.id)
                }}
              />)}
              {!selectedEvents.length && <div className="empty-state"><CalendarDays /><strong>등록된 일정이 없습니다</strong><span>여유롭게 쉬거나 새 일정을 추가하세요.</span></div>}
            </div>
            <MemberLegend />
          </> : <>
            <div className="shift-editor-heading">
              <Avatar memberId="emma" />
              <div><span className="eyebrow">엄마 교대근무</span><h2>{formatLongDate(selected)}</h2></div>
            </div>
            <p className="shift-help">{isMonthEnd ? '이번 달 마지막 날입니다. 저장해도 이 날짜에 머뭅니다.' : '근무를 선택하면 저장 후 자동으로 다음 날짜로 이동합니다.'}</p>
            <div className="shift-editor-grid">
              {SHIFT_OPTIONS.map(({ id, label: optionLabel, time, icon: Icon, color }) => (
                <button key={id} className={`${color} ${selectedShift?.shift === id ? 'active' : ''}`} aria-pressed={selectedShift?.shift === id} onClick={() => setSelectedShift(id)}>
                  <Icon />
                  <span><strong>{optionLabel}</strong><small>{time}</small></span>
                  {selectedShift?.shift === id && <Check className="shift-check" />}
                </button>
              ))}
            </div>
            <div className="shift-editor-footer">
              <span>{selectedShift ? `${SHIFT_OPTIONS.find((option) => option.id === selectedShift.shift)?.label}로 저장됨` : '아직 근무가 지정되지 않았습니다.'}</span>
              {selectedShift && <button onClick={clearSelectedShift}>지정 해제</button>}
            </div>
          </>}
        </aside>
      </section>
    </div>
  )
}

function TasksView({ tasks, setTasks, openModal }) {
  const categories = ['긴급', '집안일', '장보기']
  const toggleTask = (id) => setTasks(tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task))
  const remaining = tasks.filter((task) => !task.done).length

  return (
    <div className="page tasks-page">
      <section className="page-title-row">
        <div><span className="eyebrow">가족과 함께 나누는 일</span><h1>가족 할 일</h1><p>남은 할 일이 {remaining}개 있어요. 하나씩 함께 정리해요.</p></div>
        <button className="primary-button" onClick={() => openModal('task')}><Plus size={19} /> 새 할 일</button>
      </section>
      <div className="task-columns">
        {categories.map((category) => {
          const grouped = tasks.filter((task) => task.category === category)
          return (
            <section key={category} className={`task-group ${category === '긴급' ? 'urgent' : category === '집안일' ? 'housework' : 'groceries'}`}>
              <div className="task-heading">
                <span className="category-icon">{category === '긴급' ? <Bell /> : category === '집안일' ? <Home /> : <ShoppingBasket />}</span>
                <h2>{category}</h2><span className="count-badge">{grouped.filter((task) => !task.done).length}</span>
              </div>
              <div className="task-list">
                {grouped.map((task) => (
                  <article key={task.id} className={`task-card ${task.done ? 'done' : ''}`}>
                    <button className="checkbox" onClick={() => toggleTask(task.id)} aria-label={`${task.done ? '다시 열기' : '완료하기'} ${task.title}`}>{task.done && <Check />}</button>
                    <span className="task-copy"><strong>{task.title}</strong><small>{task.meta}</small></span>
                    <Avatar memberId={task.assignee} small />
                  </article>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function SchedulesView({ setView }) {
  const [season, setSeason] = useState('학기')
  const [shift, setShift] = useState('evening')
  return (
    <div className="page schedules-page">
      <section className="page-title-row"><div><span className="eyebrow">반복 일정과 루틴</span><h1>일정 관리</h1><p>시즌별 계획을 전환하고 반복 일정을 빠르게 적용하세요.</p></div></section>
      <div className="template-grid">
        <article className="template-card card">
          <div className="template-icon peach"><GraduationCap /></div>
          <div><h2>자녀 학원 스케줄</h2><p>정규 학기 수업과 방학 캠프 일정을 전환하세요.</p></div>
          <div className="segmented wide">{['학기', '방학'].map((item) => <button key={item} className={season === item ? 'active' : ''} onClick={() => setSeason(item)}>{item}</button>)}</div>
        </article>
        <article className="template-card card">
          <div className="template-icon blue"><HeartPulse /></div>
          <div><h2>의료 교대근무 템플릿</h2><p>다가오는 교대근무를 한 번에 적용하세요.</p></div>
          <div className="shift-options">
            {SHIFT_OPTIONS.map(({ id, label, icon: Icon, color }) => <button key={id} className={`${color} ${shift === id ? 'active' : ''}`} onClick={() => setShift(id)}><Icon /><span>{label}</span></button>)}
          </div>
        </article>
      </div>
      <section className="active-schedules">
        <div className="section-heading"><div><span className="eyebrow">현재 적용 중</span><h2>적용된 일정</h2></div></div>
        <div className="schedule-list">
          <article className="active-schedule card"><Avatar memberId="emma" /><span><strong>엄마</strong><small>오후 근무 로테이션</small></span><div className="schedule-meta"><Clock3 /> 다음: 오후 3:00 – 오후 11:00</div><button className="icon-button" onClick={() => setView('calendar')} aria-label="엄마 일정 캘린더에서 보기" title="캘린더에서 보기"><MoreHorizontal /></button></article>
          <article className="active-schedule card"><Avatar memberId="leo" /><span><strong>레오</strong><small>{season} 학원 일정</small></span><div className="schedule-meta"><GraduationCap /> 피아노 · 축구</div><button className="icon-button" onClick={() => setView('calendar')} aria-label="레오 일정 캘린더에서 보기" title="캘린더에서 보기"><MoreHorizontal /></button></article>
        </div>
      </section>
    </div>
  )
}

function Modal({ type, date, item, onClose, onAddEvent, onUpdateEvent, onDeleteEvent, onAddTask }) {
  const isTask = type === 'task'
  const isEditing = !isTask && Boolean(item)
  const [title, setTitle] = useState(item?.title || '')
  const [eventDate, setEventDate] = useState(item?.date || date || iso(today))
  const [time, setTime] = useState(item?.time || '오전 9:00')
  const [location, setLocation] = useState(item?.location || '우리 집')
  const [member, setMember] = useState(item?.member || 'emma')
  const [category, setCategory] = useState('집안일')
  const submit = (event) => {
    event.preventDefault()
    if (!title.trim()) return
    if (isTask) onAddTask({ title: title.trim(), category, assignee: member, meta: '새로 추가됨' })
    else if (isEditing) onUpdateEvent({ ...item, title: title.trim(), date: eventDate, time, location, member })
    else onAddEvent({ title: title.trim(), date: eventDate, time, end: '', location, member, type: 'family' })
    onClose()
  }
  const removeEvent = () => {
    if (window.confirm(`‘${item.title}’ 일정을 삭제할까요?`)) {
      onDeleteEvent(item.id)
      onClose()
    }
  }
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-heading"><div><span className="eyebrow">Family Scheduler</span><h2>{isTask ? '할 일 추가' : isEditing ? '일정 수정' : '일정 추가'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="닫기"><X /></button></div>
        <label>제목<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={isTask ? '무엇을 해야 하나요?' : '어떤 일정인가요?'} /></label>
        {!isTask && <div className="field-row"><label>날짜<input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></label><label>시간<input value={time} onChange={(event) => setTime(event.target.value)} /></label></div>}
        {!isTask && <label>장소<input value={location} onChange={(event) => setLocation(event.target.value)} /></label>}
        {isTask && <label>분류<select value={category} onChange={(event) => setCategory(event.target.value)}><option>긴급</option><option>집안일</option><option>장보기</option></select></label>}
        <fieldset><legend>담당자</legend><div className="member-picker">{MEMBERS.map((person) => <button type="button" key={person.id} className={member === person.id ? 'active' : ''} onClick={() => setMember(person.id)}><Avatar memberId={person.id} small />{person.name}</button>)}</div></fieldset>
        <div className="modal-actions">
          {isEditing && <button type="button" className="danger-button" onClick={removeEvent}><Trash2 size={17} /> 일정 삭제</button>}
          <button type="button" className="secondary-button" onClick={onClose}>취소</button>
          <button className="primary-button" type="submit">{isEditing ? <Check size={18} /> : <Plus size={18} />} {isTask ? '할 일 추가' : isEditing ? '수정 완료' : '일정 추가'}</button>
        </div>
      </form>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState('home')
  const [events, setEvents] = useState(() => load('family-scheduler-events', defaultEvents))
  const [tasks, setTasks] = useState(() => load('family-scheduler-tasks', defaultTasks))
  const [shifts, setShifts] = useState(() => load('family-scheduler-shifts', defaultShifts))
  const [modal, setModal] = useState(null)
  const [focusMode, setFocusMode] = useState(false)

  useEffect(() => localStorage.setItem('family-scheduler-events', JSON.stringify(events)), [events])
  useEffect(() => localStorage.setItem('family-scheduler-tasks', JSON.stringify(tasks)), [tasks])
  useEffect(() => localStorage.setItem('family-scheduler-shifts', JSON.stringify(shifts)), [shifts])

  const addEvent = (event) => setEvents([...events, { ...event, id: Date.now() }])
  const updateEvent = (updatedEvent) => setEvents(events.map((event) => event.id === updatedEvent.id ? updatedEvent : event))
  const deleteEvent = (eventId) => setEvents(events.filter((event) => event.id !== eventId))
  const addTask = (task) => setTasks([...tasks, { ...task, id: Date.now(), done: false }])
  const openModal = (type, date, item) => setModal({ type, date, item })

  return (
    <div className={`app ${focusMode ? 'focus-mode' : ''}`}>
      <Header active={view} onChange={setView} focusMode={focusMode} setFocusMode={setFocusMode} />
      <main>
        {view === 'home' && <HomeView events={events} setView={setView} openModal={openModal} />}
        {view === 'calendar' && <CalendarView events={events} shifts={shifts} setShifts={setShifts} openModal={openModal} deleteEvent={deleteEvent} />}
        {view === 'tasks' && <TasksView tasks={tasks} setTasks={setTasks} openModal={openModal} />}
        {view === 'schedules' && <SchedulesView setView={setView} />}
      </main>
      <div className="mobile-nav"><Navigation active={view} onChange={setView} /></div>
      {modal && <Modal {...modal} onClose={() => setModal(null)} onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} onAddTask={addTask} />}
    </div>
  )
}

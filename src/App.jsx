import { useEffect, useMemo, useState } from 'react'
import KoreanLunarCalendar from 'korean-lunar-calendar'
import {
  Bell, BookOpen, CalendarDays, CalendarRange, Check, CheckSquare, ChevronLeft,
  ChevronRight, Clock3, GraduationCap, Home, Moon, Pencil, Plus, Search,
  Settings2, ShoppingBasket, Sparkles, Sun, Sunset, Trash2, X,
} from 'lucide-react'

const MEMBERS = [
  { id: 'emma', name: '엄마', role: '엄마', initials: '엄', color: '#ffaaa0', tone: '#fff0ed' },
  { id: 'david', name: '아빠', role: '아빠', initials: '아', color: '#a9c978', tone: '#f2f7e8' },
  { id: 'leo', name: '초롱', role: '자녀', initials: '초', color: '#7fc7e3', tone: '#ecf8fc' },
  { id: 'mia', name: '연두', role: '자녀', initials: '연', color: '#c9df84', tone: '#f6fae9' },
]

const CHILDREN = MEMBERS.filter((member) => ['leo', 'mia'].includes(member.id))
const ANNIVERSARY_MEMBER = { id: 'anniversary', name: '기념일', initials: '기', color: '#e0b866', tone: '#fff8e6' }
const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
const WEEKDAY_SHORT = ['일', '월', '화', '수', '목', '금', '토']
const TIME_HOURS = Array.from({ length: 12 }, (_, index) => index + 1)
const TIME_MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'))
const CALENDAR_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)
const CALENDAR_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)

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
  { id: 4, title: '가족 저녁 식사', date: iso(today), time: '오후 6:30', end: '오후 8:00', member: 'emma', location: '우리 집', type: 'family' },
  { id: 6, title: '야간 근무', date: iso(addDays(today, 3)), time: '오후 4:00', end: '자정', member: 'david', location: '시립 병원', type: 'work' },
  { id: 7, title: '연두 생일', date: iso(addDays(today, 6)), time: '오후 2:00', end: '오후 5:00', member: 'mia', location: '우리 집', type: 'family' },
]

const defaultChildSchedules = [
  { id: 'leo-term-soccer', member: 'leo', season: '학기', kind: '학원', title: '축구 연습', weekday: 3, time: '오후 4:00', end: '오후 5:30', location: '강변 운동장' },
  { id: 'leo-term-piano', member: 'leo', season: '학기', kind: '학원', title: '피아노 레슨', weekday: 5, time: '오후 5:00', end: '오후 6:00', location: '음악실' },
  { id: 'mia-term-art', member: 'mia', season: '학기', kind: '학원', title: '미술 수업', weekday: 3, time: '오후 3:30', end: '오후 5:00', location: '커뮤니티 센터' },
  { id: 'leo-vacation-swim', member: 'leo', season: '방학', kind: '학원', title: '수영 수업', weekday: 2, time: '오전 10:00', end: '오전 11:30', location: '시민 수영장' },
  { id: 'mia-vacation-art', member: 'mia', season: '방학', kind: '학원', title: '미술 캠프', weekday: 4, time: '오후 2:00', end: '오후 4:00', location: '커뮤니티 센터' },
]

const defaultSchedulePeriods = [
  { id: 'term-first-2026', season: '학기', start: '2026-03-02', end: '2026-07-17' },
  { id: 'vacation-summer-2026', season: '방학', start: '2026-07-18', end: '2026-08-16' },
  { id: 'term-second-2026', season: '학기', start: '2026-08-17', end: '2026-12-23' },
]

const defaultAnniversaries = []

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

const SHIFT_OPTIONS = [
  { id: 'day', code: 'D', label: '주간 근무', shortLabel: 'D', time: '오전 6:30 – 오후 3:30', endLabel: '오후 3:30 종료', icon: Sun, color: 'sage' },
  { id: 'evening', code: 'E', label: '오후 근무', shortLabel: 'E', time: '오후 1:30 – 오후 10:30', endLabel: '오후 10:30 종료', icon: Sunset, color: 'blue' },
  { id: 'night', code: 'N', label: '야간 근무', shortLabel: 'N', time: '오후 10:00 – 오전 8:00', endLabel: '다음 날 오전 8:00 종료', icon: Moon, color: 'navy' },
  { id: 'off', code: 'OFF', label: '휴무', shortLabel: 'OFF', time: '근무 없음', endLabel: '오늘은 휴무입니다', icon: CalendarDays, color: 'lavender' },
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
const formatSolarDate = (date) => date ? `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.` : '변환 가능한 날짜 없음'

const validSolarDate = (year, month, day) => {
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

const anniversarySolarOccurrences = (anniversary, solarYear) => {
  if (anniversary.calendarType === 'solar') {
    const date = validSolarDate(solarYear, Number(anniversary.month), Number(anniversary.day))
    return date ? [date] : []
  }

  return [solarYear - 1, solarYear].flatMap((lunarYear) => {
    const calendar = new KoreanLunarCalendar()
    if (!calendar.setLunarDate(lunarYear, Number(anniversary.month), Number(anniversary.day), false)) return []
    const converted = calendar.getSolarCalendar()
    if (converted.year !== solarYear) return []
    return [new Date(converted.year, converted.month - 1, converted.day)]
  })
}

const nextAnniversaryOccurrence = (anniversary, from = today) => {
  for (let year = from.getFullYear(); year <= Math.min(from.getFullYear() + 3, 2050); year += 1) {
    const occurrence = anniversarySolarOccurrences(anniversary, year).find((date) => date >= from)
    if (occurrence) return occurrence
  }
  return null
}

const anniversaryTitle = (anniversary) => anniversary.kind === '기념일' ? anniversary.name : `${anniversary.name} ${anniversary.kind}`

const anniversaryEventsForDate = (date, anniversaries) => anniversaries.flatMap((anniversary) => {
  const matched = anniversarySolarOccurrences(anniversary, date.getFullYear()).find((occurrence) => iso(occurrence) === iso(date))
  if (!matched) return []
  const sourceLabel = anniversary.calendarType === 'lunar'
    ? `음력 ${anniversary.month}월 ${anniversary.day}일 → 양력 ${matched.getMonth() + 1}월 ${matched.getDate()}일`
    : `매년 양력 ${anniversary.month}월 ${anniversary.day}일`
  return [{
    id: `anniversary-${anniversary.id}-${iso(date)}`,
    anniversaryId: anniversary.id,
    date: iso(date),
    title: anniversaryTitle(anniversary),
    time: '종일',
    end: '',
    location: sourceLabel,
    member: 'anniversary',
    type: 'anniversary',
    recurring: true,
    anniversary: true,
  }]
})

const activeSeasonForDate = (date, periods) => {
  const dateValue = iso(date)
  return periods
    .filter((period) => period.start <= dateValue && dateValue <= period.end)
    .sort((a, b) => b.start.localeCompare(a.start))[0]?.season
}

const scheduleWeekdays = (schedule) => {
  const values = Array.isArray(schedule.weekdays) ? schedule.weekdays : [schedule.weekday]
  return [...new Set(values.map(Number).filter((day) => day >= 0 && day <= 6))].sort((a, b) => a - b)
}

const formatScheduleWeekdays = (schedule) => {
  const weekdays = scheduleWeekdays(schedule)
  return weekdays.length === 1 ? WEEKDAYS[weekdays[0]] : weekdays.map((day) => WEEKDAY_SHORT[day]).join('·')
}

const parseTime = (value, fallback = '오전 9:00') => {
  const normalized = value === '자정' ? '오전 12:00' : value === '정오' ? '오후 12:00' : value
  const match = /^(오전|오후)\s+(\d{1,2}):(\d{2})$/.exec(normalized || '')
  if (match) return { meridiem: match[1], hour: Number(match[2]), minute: match[3] }
  if (value === fallback) return { meridiem: '오전', hour: 9, minute: '00' }
  return parseTime(fallback, fallback)
}

const childEventsForDate = (date, childSchedules, schedulePeriods) => {
  const dateValue = iso(date)
  const season = activeSeasonForDate(date, schedulePeriods)
  if (!season) return []
  return childSchedules
    .filter((schedule) => schedule.season === season && scheduleWeekdays(schedule).includes(date.getDay()))
    .map((schedule) => ({
      ...schedule,
      id: `recurring-${schedule.id}-${dateValue}`,
      scheduleId: schedule.id,
      date: dateValue,
      type: 'school',
      recurring: true,
    }))
}

const eventsForDate = (date, events, childSchedules, schedulePeriods, anniversaries = []) => {
  const dateValue = iso(date)
  const merged = [
    ...events.filter((event) => event.date === dateValue),
    ...childEventsForDate(date, childSchedules, schedulePeriods),
    ...anniversaryEventsForDate(date, anniversaries),
  ]
  const seen = new Set()
  return merged.filter((event) => {
    const key = `${event.member}-${event.title}-${event.date}-${event.time}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function Avatar({ memberId, small = false }) {
  const member = memberId === ANNIVERSARY_MEMBER.id ? ANNIVERSARY_MEMBER : MEMBERS.find((person) => person.id === memberId) || MEMBERS[0]
  return (
    <span className={`avatar ${small ? 'avatar-small' : ''}`} style={{ '--member': member.color, '--member-tone': member.tone }} title={member.name}>
      {member.initials}
    </span>
  )
}

function TimePicker({ label, value, onChange, fallback }) {
  const selected = parseTime(value, fallback)
  const updatePart = (part, nextValue) => {
    const updated = { ...selected, [part]: part === 'hour' ? Number(nextValue) : nextValue }
    onChange(`${updated.meridiem} ${updated.hour}:${updated.minute}`)
  }

  return (
    <div className="time-picker" role="group" aria-label={label}>
      <select aria-label={`${label} 오전 오후`} value={selected.meridiem} onChange={(event) => updatePart('meridiem', event.target.value)}>
        <option>오전</option><option>오후</option>
      </select>
      <select aria-label={`${label} 시`} value={selected.hour} onChange={(event) => updatePart('hour', event.target.value)}>
        {TIME_HOURS.map((hour) => <option key={hour} value={hour}>{hour}시</option>)}
      </select>
      <select aria-label={`${label} 분`} value={selected.minute} onChange={(event) => updatePart('minute', event.target.value)}>
        {TIME_MINUTES.map((minute) => <option key={minute} value={minute}>{minute}분</option>)}
      </select>
    </div>
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
      {[...MEMBERS, ANNIVERSARY_MEMBER].map((member) => (
        <span key={member.id}><i style={{ background: member.color }} />{member.name}</span>
      ))}
    </div>
  )
}

function EventCard({ event, compact = false, onEdit, onDelete }) {
  const member = event.member === ANNIVERSARY_MEMBER.id ? ANNIVERSARY_MEMBER : MEMBERS.find((item) => item.id === event.member) || MEMBERS[0]
  const hasActions = Boolean(onEdit || onDelete)
  const editLabel = event.anniversary ? `${event.title} 기념일 관리` : event.recurring ? `${event.title} 반복 일정 관리` : `${event.title} 수정`
  const editTitle = event.anniversary ? '기념일 관리' : event.recurring ? '반복 일정 관리' : '일정 수정'
  return (
    <article className={`event-card ${compact ? 'compact' : ''} ${hasActions ? 'has-actions' : ''}`} style={{ '--event': member.color, '--event-bg': member.tone }}>
      <div className="event-time">{event.time}</div>
      <Avatar memberId={event.member} small />
      <div className="event-copy">
        <strong>{event.title}</strong>
        <div className="event-detail-row">
          <span>{event.location}</span>
          {hasActions && <div className="event-actions">
            {onEdit && <button onClick={onEdit} aria-label={editLabel} title={editTitle}><Pencil /></button>}
            {onDelete && <button className="delete" onClick={onDelete} aria-label={`${event.title} 삭제`} title="일정 삭제"><Trash2 /></button>}
          </div>}
        </div>
      </div>
    </article>
  )
}

function HomeView({ events, childSchedules, setChildSchedules, schedulePeriods, anniversaries, setAnniversaries, shifts, setView, openModal, deleteEvent }) {
  const todayEvents = eventsForDate(today, events, childSchedules, schedulePeriods, anniversaries)
  const childEvents = todayEvents.filter((event) => ['leo', 'mia'].includes(event.member))
  const todayShift = shifts.find((shift) => shift.date === iso(today) && shift.member === 'emma')
  const shiftOption = SHIFT_OPTIONS.find((option) => option.id === todayShift?.shift)
  const removeTodayEvent = (event) => {
    if (!window.confirm(`‘${event.title}’ 일정을 삭제할까요?`)) return
    if (event.anniversary) setAnniversaries((current) => current.filter((anniversary) => anniversary.id !== event.anniversaryId))
    else if (event.recurring) setChildSchedules((current) => current.filter((schedule) => schedule.id !== event.scheduleId))
    else deleteEvent(event.id)
  }

  return (
    <div className="page home-page">
      <section className="hero-intro">
        <span className="eyebrow">{formatLongDate(today)}</span>
        <h1>좋은 아침이에요, 우리 가족.</h1>
        <p>우리 가족의 오늘 하루를 한눈에 확인하세요.</p>
      </section>

      <section className="overview-grid">
        <article className="status-card card">
          <div className="card-label"><span>엄마 오늘 근무</span><span className="status-pill"><i /> {shiftOption?.code || '미입력'}</span></div>
          <h2>{shiftOption?.label || '근무 미입력'}</h2>
          <p className="large-detail"><Clock3 /> {shiftOption?.endLabel || '교대근무 달력에서 입력하세요'}</p>
          <div className="support-note">
            <Sparkles size={20} />
            <span><strong>가족 공유</strong>오늘 등록된 가족 일정이 {todayEvents.length}개 있습니다.</span>
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
          {todayEvents.slice(0, 6).map((event) => <EventCard
            key={event.id}
            event={event}
            onEdit={event.recurring ? () => setView('schedules') : () => openModal('event', event.date, event)}
            onDelete={() => removeTodayEvent(event)}
          />)}
          {!todayEvents.length && <p className="empty-copy">비어 있는 하루예요. 필요할 때 일정을 추가하세요.</p>}
        </div>
      </section>

      <button className="floating-add" onClick={() => openModal('event')} aria-label="일정 추가"><Plus /></button>
    </div>
  )
}

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

function CalendarView({ events, childSchedules, setChildSchedules, schedulePeriods, anniversaries, setAnniversaries, shifts, setShifts, openModal, deleteEvent, setView, mode, setMode }) {
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(today)
  const monthDays = useMemo(() => buildCalendarDays(cursor), [cursor])
  const selectedEvents = eventsForDate(selected, events, childSchedules, schedulePeriods, anniversaries)
  const selectedShift = shifts.find((shift) => shift.date === iso(selected) && shift.member === 'emma')
  const isMonthEnd = selected.getDate() === new Date(selected.getFullYear(), selected.getMonth() + 1, 0).getDate()
  const label = new Intl.DateTimeFormat('ko-KR', { month: 'long', year: 'numeric' }).format(cursor)

  const moveMonth = (amount) => {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + amount, 1)
    setCursor(next)
  }

  const setSelectedShift = (shiftId) => {
    const selectedDate = iso(selected)
    setShifts((currentShifts) => {
      const existing = currentShifts.find((shift) => shift.date === selectedDate && shift.member === 'emma')
      if (existing) return currentShifts.map((shift) => shift.id === existing.id ? { ...shift, shift: shiftId } : shift)
      return [...currentShifts, { id: `emma-${selectedDate}`, date: selectedDate, member: 'emma', shift: shiftId }]
    })
    const nextDate = addDays(selected, 1)
    if (nextDate.getMonth() === selected.getMonth() && nextDate.getFullYear() === selected.getFullYear()) {
      setSelected(nextDate)
    }
  }

  const clearSelectedShift = () => {
    const selectedDate = iso(selected)
    setShifts((currentShifts) => currentShifts.filter((shift) => !(shift.date === selectedDate && shift.member === 'emma')))
  }

  const removeSelectedEvent = (event) => {
    if (!window.confirm(`‘${event.title}’ 일정을 삭제할까요?`)) return
    if (event.anniversary) setAnniversaries((current) => current.filter((anniversary) => anniversary.id !== event.anniversaryId))
    else if (event.recurring) setChildSchedules((current) => current.filter((schedule) => schedule.id !== event.scheduleId))
    else deleteEvent(event.id)
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
              const dayEvents = eventsForDate(date, events, childSchedules, schedulePeriods, anniversaries)
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
                onEdit={event.recurring ? () => setView('schedules') : () => openModal('event', event.date, event)}
                onDelete={() => removeSelectedEvent(event)}
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
              {SHIFT_OPTIONS.map(({ id, code, label: optionLabel, time, icon: Icon, color }) => (
                <button key={id} className={`${color} ${selectedShift?.shift === id ? 'active' : ''}`} aria-pressed={selectedShift?.shift === id} onClick={() => setSelectedShift(id)}>
                  <Icon />
                  <span><strong>{code} · {optionLabel}</strong><small>{time}</small></span>
                  {selectedShift?.shift === id && <Check className="shift-check" />}
                </button>
              ))}
            </div>
            <div className="shift-editor-footer">
              <span>{selectedShift ? `${SHIFT_OPTIONS.find((option) => option.id === selectedShift.shift)?.code} · ${SHIFT_OPTIONS.find((option) => option.id === selectedShift.shift)?.label}로 저장됨` : '아직 근무가 지정되지 않았습니다.'}</span>
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
  const toggleTask = (id) => setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task))
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

const emptyScheduleForm = {
  member: 'leo', kind: '학원', title: '', weekdays: [1],
  time: '오후 4:00', end: '오후 5:00', location: '',
}

const emptyAnniversaryForm = {
  name: '', kind: '생일', calendarType: 'solar', month: today.getMonth() + 1, day: today.getDate(),
}

function SchedulesView({ childSchedules, setChildSchedules, schedulePeriods, setSchedulePeriods, anniversaries, setAnniversaries, openCalendar }) {
  const [season, setSeason] = useState(() => activeSeasonForDate(today, schedulePeriods) || '학기')
  const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm)
  const [editingId, setEditingId] = useState(null)
  const [scheduleError, setScheduleError] = useState('')
  const [periodForm, setPeriodForm] = useState({ season: '학기', start: iso(today), end: iso(addDays(today, 30)) })
  const [periodEditingId, setPeriodEditingId] = useState(null)
  const [periodError, setPeriodError] = useState('')
  const [anniversaryForm, setAnniversaryForm] = useState(emptyAnniversaryForm)
  const [anniversaryEditingId, setAnniversaryEditingId] = useState(null)
  const [anniversaryError, setAnniversaryError] = useState('')

  const visibleSchedules = [...childSchedules]
    .filter((schedule) => schedule.season === season)
    .sort((a, b) => `${a.member}-${scheduleWeekdays(a)[0]}-${a.time}`.localeCompare(`${b.member}-${scheduleWeekdays(b)[0]}-${b.time}`))
  const sortedAnniversaries = [...anniversaries].sort((a, b) => {
    const first = nextAnniversaryOccurrence(a)?.getTime() ?? Number.MAX_SAFE_INTEGER
    const second = nextAnniversaryOccurrence(b)?.getTime() ?? Number.MAX_SAFE_INTEGER
    return first - second
  })

  const changeScheduleField = (field, value) => setScheduleForm((current) => ({ ...current, [field]: value }))
  const toggleWeekday = (weekday) => {
    setScheduleForm((current) => {
      const selected = current.weekdays.includes(weekday)
      const weekdays = selected ? current.weekdays.filter((day) => day !== weekday) : [...current.weekdays, weekday].sort((a, b) => a - b)
      return { ...current, weekdays }
    })
    setScheduleError('')
  }

  const submitSchedule = (event) => {
    event.preventDefault()
    if (!scheduleForm.title.trim()) return
    if (!scheduleForm.weekdays.length) {
      setScheduleError('적용할 요일을 한 개 이상 선택해 주세요.')
      return
    }
    const nextSchedule = {
      ...scheduleForm,
      id: editingId || `child-${Date.now()}`,
      season,
      title: scheduleForm.title.trim(),
      location: scheduleForm.location.trim() || '장소 미정',
      weekdays: [...scheduleForm.weekdays],
      weekday: scheduleForm.weekdays[0],
    }
    setChildSchedules((current) => editingId
      ? current.map((schedule) => schedule.id === editingId ? nextSchedule : schedule)
      : [...current, nextSchedule])
    setScheduleForm(emptyScheduleForm)
    setEditingId(null)
    setScheduleError('')
  }

  const editSchedule = (schedule) => {
    setSeason(schedule.season)
    setScheduleForm({
      member: schedule.member,
      kind: schedule.kind,
      title: schedule.title,
      weekdays: scheduleWeekdays(schedule),
      time: schedule.time,
      end: schedule.end,
      location: schedule.location,
    })
    setEditingId(schedule.id)
    setScheduleError('')
  }

  const cancelScheduleEdit = () => {
    setScheduleForm(emptyScheduleForm)
    setEditingId(null)
    setScheduleError('')
  }

  const deleteSchedule = (schedule) => {
    if (!window.confirm(`‘${schedule.title}’ 반복 일정을 삭제할까요?`)) return
    setChildSchedules((current) => current.filter((item) => item.id !== schedule.id))
    if (editingId === schedule.id) cancelScheduleEdit()
  }

  const submitPeriod = (event) => {
    event.preventDefault()
    if (!periodForm.start || !periodForm.end || periodForm.start > periodForm.end) {
      setPeriodError('시작일과 종료일을 올바르게 입력해 주세요.')
      return
    }
    setSchedulePeriods((current) => periodEditingId
      ? current.map((period) => period.id === periodEditingId ? { ...periodForm, id: periodEditingId } : period)
      : [...current, { ...periodForm, id: `period-${Date.now()}` }])
    setPeriodError('')
    setPeriodForm((current) => ({ ...current, start: iso(today), end: iso(addDays(today, 30)) }))
    setPeriodEditingId(null)
  }

  const editPeriod = (period) => {
    setPeriodForm({ season: period.season, start: period.start, end: period.end })
    setPeriodEditingId(period.id)
    setPeriodError('')
  }

  const cancelPeriodEdit = () => {
    setPeriodForm({ season: '학기', start: iso(today), end: iso(addDays(today, 30)) })
    setPeriodEditingId(null)
    setPeriodError('')
  }

  const deletePeriod = (period) => {
    if (!window.confirm(`${period.season} 적용 기간을 삭제할까요?`)) return
    setSchedulePeriods((current) => current.filter((item) => item.id !== period.id))
    if (periodEditingId === period.id) cancelPeriodEdit()
  }

  const changeAnniversaryField = (field, value) => {
    setAnniversaryForm((current) => ({ ...current, [field]: value }))
    setAnniversaryError('')
  }

  const submitAnniversary = (event) => {
    event.preventDefault()
    const name = anniversaryForm.name.trim()
    if (!name) {
      setAnniversaryError('기념일 대상이나 이름을 입력해 주세요.')
      return
    }
    const candidate = { ...anniversaryForm, name, month: Number(anniversaryForm.month), day: Number(anniversaryForm.day) }
    if (!nextAnniversaryOccurrence(candidate)) {
      setAnniversaryError('선택한 날짜를 양력으로 변환할 수 없습니다. 월과 일을 확인해 주세요.')
      return
    }
    const nextAnniversary = { ...candidate, id: anniversaryEditingId || `anniversary-${Date.now()}` }
    setAnniversaries((current) => anniversaryEditingId
      ? current.map((anniversary) => anniversary.id === anniversaryEditingId ? nextAnniversary : anniversary)
      : [...current, nextAnniversary])
    setAnniversaryForm(emptyAnniversaryForm)
    setAnniversaryEditingId(null)
    setAnniversaryError('')
  }

  const editAnniversary = (anniversary) => {
    setAnniversaryForm({
      name: anniversary.name,
      kind: anniversary.kind,
      calendarType: anniversary.calendarType,
      month: Number(anniversary.month),
      day: Number(anniversary.day),
    })
    setAnniversaryEditingId(anniversary.id)
    setAnniversaryError('')
  }

  const cancelAnniversaryEdit = () => {
    setAnniversaryForm(emptyAnniversaryForm)
    setAnniversaryEditingId(null)
    setAnniversaryError('')
  }

  const deleteAnniversary = (anniversary) => {
    if (!window.confirm(`‘${anniversaryTitle(anniversary)}’ 기념일을 삭제할까요?`)) return
    setAnniversaries((current) => current.filter((item) => item.id !== anniversary.id))
    if (anniversaryEditingId === anniversary.id) cancelAnniversaryEdit()
  }

  const anniversaryPreview = nextAnniversaryOccurrence(anniversaryForm)

  return (
    <div className="page schedules-page">
      <section className="page-title-row">
        <div><span className="eyebrow">반복 일정과 기념일</span><h1>가족 일정 관리</h1><p>학교·학원 일정과 가족 기념일을 등록하면 가족 달력에 자동 반영됩니다.</p></div>
        <button className="secondary-button" onClick={() => openCalendar('일반')}><CalendarDays size={18} /> 달력 보기</button>
      </section>

      <section className="schedule-guide card">
        <CalendarRange />
        <span><strong>엄마 근무는 날짜마다 직접 입력합니다.</strong> 캘린더의 ‘교대근무’ 탭에서 D·E·N 또는 휴무를 선택하세요.</span>
        <button className="text-button" onClick={() => openCalendar('교대근무')}>교대근무 달력 열기 <ChevronRight size={16} /></button>
      </section>

      <section className="anniversary-card card">
        <div className="section-heading"><div><span className="eyebrow">매년 달력에 자동 표시</span><h2>가족 기념일 관리</h2><p>부모님 생일도 이름을 직접 입력하고 양력 또는 음력으로 등록할 수 있습니다.</p></div><CalendarDays /></div>
        <div className="anniversary-layout">
          <form className="anniversary-form" onSubmit={submitAnniversary}>
            <label className="anniversary-name-field">대상·이름<input value={anniversaryForm.name} onChange={(event) => changeAnniversaryField('name', event.target.value)} placeholder="예: 어머니, 부모님" required /></label>
            <label>기념일 종류<select value={anniversaryForm.kind} onChange={(event) => changeAnniversaryField('kind', event.target.value)}><option>생일</option><option>결혼기념일</option><option>기념일</option></select></label>
            <fieldset className="anniversary-calendar-field">
              <legend>날짜 기준</legend>
              <div className="segmented anniversary-calendar-tabs">
                {[['solar', '양력'], ['lunar', '음력']].map(([value, label]) => <button key={value} type="button" aria-pressed={anniversaryForm.calendarType === value} className={anniversaryForm.calendarType === value ? 'active' : ''} onClick={() => changeAnniversaryField('calendarType', value)}>{label}</button>)}
              </div>
            </fieldset>
            <label>월<select value={anniversaryForm.month} onChange={(event) => changeAnniversaryField('month', Number(event.target.value))}>{CALENDAR_MONTHS.map((month) => <option key={month} value={month}>{month}월</option>)}</select></label>
            <label>일<select value={anniversaryForm.day} onChange={(event) => changeAnniversaryField('day', Number(event.target.value))}>{CALENDAR_DAYS.slice(0, anniversaryForm.calendarType === 'lunar' ? 30 : 31).map((day) => <option key={day} value={day}>{day}일</option>)}</select></label>
            <div className="anniversary-preview"><span>{anniversaryForm.calendarType === 'lunar' ? '음력 → 양력 변환' : '다음 기념일'}</span><strong>{formatSolarDate(anniversaryPreview)}</strong></div>
            <div className="anniversary-form-actions">
              {anniversaryEditingId && <button className="secondary-button" type="button" onClick={cancelAnniversaryEdit}>취소</button>}
              <button className="primary-button" type="submit">{anniversaryEditingId ? <Check size={17} /> : <Plus size={17} />}{anniversaryEditingId ? '수정 완료' : '기념일 추가'}</button>
            </div>
            {anniversaryError && <p className="form-error anniversary-form-error" role="alert">{anniversaryError}</p>}
          </form>

          <div className="anniversary-list">
            {sortedAnniversaries.map((anniversary) => {
              const nextOccurrence = nextAnniversaryOccurrence(anniversary)
              return <article className="anniversary-row" key={anniversary.id}>
                <Avatar memberId="anniversary" />
                <div className="anniversary-copy"><span><em>{anniversary.calendarType === 'lunar' ? '음력' : '양력'}</em>{anniversary.kind}</span><strong>{anniversaryTitle(anniversary)}</strong><small>{anniversary.month}월 {anniversary.day}일 · 다음 양력 {formatSolarDate(nextOccurrence)}</small></div>
                <div className="event-actions">
                  <button onClick={() => editAnniversary(anniversary)} aria-label={`${anniversaryTitle(anniversary)} 수정`}><Pencil /></button>
                  <button className="delete" onClick={() => deleteAnniversary(anniversary)} aria-label={`${anniversaryTitle(anniversary)} 삭제`}><Trash2 /></button>
                </div>
              </article>
            })}
            {!sortedAnniversaries.length && <div className="anniversary-empty"><CalendarDays /><strong>등록된 기념일이 없습니다</strong><span>양력이나 음력으로 가족 기념일을 추가하세요.</span></div>}
          </div>
        </div>
      </section>

      <div className="schedule-management-grid">
        <section className="period-card card">
          <div className="section-heading"><div><span className="eyebrow">언제 적용할지</span><h2>학기·방학 적용 기간</h2></div><CalendarRange /></div>
          <p>기간이 겹치면 시작일이 더 최근인 일정이 우선 적용됩니다.</p>
          <form className="period-form" onSubmit={submitPeriod}>
            <label>구분<select value={periodForm.season} onChange={(event) => setPeriodForm((current) => ({ ...current, season: event.target.value }))}><option>학기</option><option>방학</option></select></label>
            <label>시작일<input type="date" value={periodForm.start} onChange={(event) => setPeriodForm((current) => ({ ...current, start: event.target.value }))} /></label>
            <label>종료일<input type="date" value={periodForm.end} onChange={(event) => setPeriodForm((current) => ({ ...current, end: event.target.value }))} /></label>
            <div className="period-form-actions">
              {periodEditingId && <button className="secondary-button" type="button" onClick={cancelPeriodEdit}>취소</button>}
              <button className="primary-button" type="submit">{periodEditingId ? <Check size={17} /> : <Plus size={17} />}{periodEditingId ? '수정 완료' : '기간 추가'}</button>
            </div>
          </form>
          {periodError && <p className="form-error" role="alert">{periodError}</p>}
          <div className="period-list">
            {[...schedulePeriods].sort((a, b) => a.start.localeCompare(b.start)).map((period) => (
              <div className="period-row" key={period.id}>
                <span className={`season-badge ${period.season === '방학' ? 'vacation' : ''}`}>{period.season}</span>
                <span><strong>{period.start}</strong><small>~ {period.end}</small></span>
                <div className="event-actions">
                  <button onClick={() => editPeriod(period)} aria-label={`${period.season} ${period.start} 적용 기간 수정`}><Pencil /></button>
                  <button className="delete" onClick={() => deletePeriod(period)} aria-label={`${period.season} ${period.start} 적용 기간 삭제`}><Trash2 /></button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="schedule-editor-card card">
          <div className="section-heading"><div><span className="eyebrow">무엇을 언제 할지</span><h2>자녀 학교·학원 일정</h2></div><BookOpen /></div>
          <div className="segmented wide schedule-season-tabs">
            {['학기', '방학'].map((item) => <button key={item} type="button" aria-pressed={season === item} className={season === item ? 'active' : ''} onClick={() => { setSeason(item); cancelScheduleEdit() }}>{item}</button>)}
          </div>
          <form className="child-schedule-form" onSubmit={submitSchedule}>
            <label>자녀<select value={scheduleForm.member} onChange={(event) => changeScheduleField('member', event.target.value)}>{CHILDREN.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>
            <label>구분<select value={scheduleForm.kind} onChange={(event) => changeScheduleField('kind', event.target.value)}><option>학교</option><option>학원</option></select></label>
            <label className="schedule-title-field">과목·일정명<input value={scheduleForm.title} onChange={(event) => changeScheduleField('title', event.target.value)} placeholder="예: 피아노 레슨" required /></label>
            <fieldset className="weekday-field">
              <legend>요일</legend>
              <div className="weekday-picker">
                {WEEKDAY_SHORT.map((day, index) => <button key={day} type="button" className={scheduleForm.weekdays.includes(index) ? 'active' : ''} aria-pressed={scheduleForm.weekdays.includes(index)} onClick={() => toggleWeekday(index)}>{day}</button>)}
              </div>
            </fieldset>
            <fieldset className="time-field"><legend>시작 시간</legend><TimePicker label="시작 시간" value={scheduleForm.time} fallback="오후 4:00" onChange={(value) => changeScheduleField('time', value)} /></fieldset>
            <fieldset className="time-field"><legend>종료 시간</legend><TimePicker label="종료 시간" value={scheduleForm.end} fallback="오후 5:00" onChange={(value) => changeScheduleField('end', value)} /></fieldset>
            <label className="schedule-location-field">장소<input value={scheduleForm.location} onChange={(event) => changeScheduleField('location', event.target.value)} placeholder="예: 음악실" /></label>
            <div className="schedule-form-actions">
              {editingId && <button className="secondary-button" type="button" onClick={cancelScheduleEdit}>취소</button>}
              <button className="primary-button" type="submit">{editingId ? <Check size={17} /> : <Plus size={17} />}{editingId ? '수정 완료' : `${season} 일정 추가`}</button>
            </div>
            {scheduleError && <p className="form-error schedule-form-error" role="alert">{scheduleError}</p>}
          </form>
        </section>
      </div>

      <section className="saved-child-schedules">
        <div className="section-heading"><div><span className="eyebrow">달력에 반복 반영</span><h2>{season} 등록 일정</h2></div><span className="count-badge">{visibleSchedules.length}</span></div>
        <div className="child-schedule-list">
          {visibleSchedules.map((schedule) => {
            const child = CHILDREN.find((item) => item.id === schedule.member)
            return (
              <article className="child-schedule-card card" key={schedule.id}>
                <Avatar memberId={schedule.member} />
                <div className="child-schedule-copy"><span><em>{schedule.kind}</em>{child?.name}</span><strong>{schedule.title}</strong><small>{formatScheduleWeekdays(schedule)} · {schedule.time}~{schedule.end} · {schedule.location}</small></div>
                <div className="event-actions">
                  <button onClick={() => editSchedule(schedule)} aria-label={`${schedule.title} 수정`}><Pencil /></button>
                  <button className="delete" onClick={() => deleteSchedule(schedule)} aria-label={`${schedule.title} 삭제`}><Trash2 /></button>
                </div>
              </article>
            )
          })}
          {!visibleSchedules.length && <div className="empty-state card"><GraduationCap /><strong>{season} 일정이 없습니다</strong><span>위 입력란에서 학교나 학원 일정을 추가하세요.</span></div>}
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
  const [end, setEnd] = useState(item?.end || '오전 10:00')
  const [location, setLocation] = useState(item?.location || '우리 집')
  const [member, setMember] = useState(item?.member || 'emma')
  const [category, setCategory] = useState('집안일')
  const submit = (event) => {
    event.preventDefault()
    if (!title.trim()) return
    if (isTask) onAddTask({ title: title.trim(), category, assignee: member, meta: '새로 추가됨' })
    else if (isEditing) onUpdateEvent({ ...item, title: title.trim(), date: eventDate, time, end, location, member })
    else onAddEvent({ title: title.trim(), date: eventDate, time, end, location, member, type: 'family' })
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
        {!isTask && <label>날짜<input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} /></label>}
        {!isTask && <div className="modal-time-row">
          <fieldset className="time-field"><legend>시작 시간</legend><TimePicker label="시작 시간" value={time} fallback="오전 9:00" onChange={setTime} /></fieldset>
          <fieldset className="time-field"><legend>종료 시간</legend><TimePicker label="종료 시간" value={end} fallback="오전 10:00" onChange={setEnd} /></fieldset>
        </div>}
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
  const [events, setEvents] = useState(() => load('family-scheduler-events', defaultEvents).map((event) => (
    event.member === 'mia' && event.title === '미아 생일' ? { ...event, title: '연두 생일' } : event
  )))
  const [tasks, setTasks] = useState(() => load('family-scheduler-tasks', defaultTasks))
  const [shifts, setShifts] = useState(() => load('family-scheduler-shifts', defaultShifts))
  const [childSchedules, setChildSchedules] = useState(() => load('family-scheduler-child-schedules-v1', defaultChildSchedules))
  const [schedulePeriods, setSchedulePeriods] = useState(() => load('family-scheduler-periods-v1', defaultSchedulePeriods))
  const [anniversaries, setAnniversaries] = useState(() => load('family-scheduler-anniversaries-v1', defaultAnniversaries))
  const [modal, setModal] = useState(null)
  const [focusMode, setFocusMode] = useState(false)
  const [calendarMode, setCalendarMode] = useState('일반')

  useEffect(() => localStorage.setItem('family-scheduler-events', JSON.stringify(events)), [events])
  useEffect(() => localStorage.setItem('family-scheduler-tasks', JSON.stringify(tasks)), [tasks])
  useEffect(() => localStorage.setItem('family-scheduler-shifts', JSON.stringify(shifts)), [shifts])
  useEffect(() => localStorage.setItem('family-scheduler-child-schedules-v1', JSON.stringify(childSchedules)), [childSchedules])
  useEffect(() => localStorage.setItem('family-scheduler-periods-v1', JSON.stringify(schedulePeriods)), [schedulePeriods])
  useEffect(() => localStorage.setItem('family-scheduler-anniversaries-v1', JSON.stringify(anniversaries)), [anniversaries])

  const addEvent = (event) => setEvents((current) => [...current, { ...event, id: Date.now() }])
  const updateEvent = (updatedEvent) => setEvents((current) => current.map((event) => event.id === updatedEvent.id ? updatedEvent : event))
  const deleteEvent = (eventId) => setEvents((current) => current.filter((event) => event.id !== eventId))
  const addTask = (task) => setTasks((current) => [...current, { ...task, id: Date.now(), done: false }])
  const openModal = (type, date, item) => setModal({ type, date, item })
  const openCalendar = (mode = '일반') => {
    setCalendarMode(mode)
    setView('calendar')
  }

  return (
    <div className={`app ${focusMode ? 'focus-mode' : ''}`}>
      <Header active={view} onChange={setView} focusMode={focusMode} setFocusMode={setFocusMode} />
      <main>
        {view === 'home' && <HomeView events={events} childSchedules={childSchedules} setChildSchedules={setChildSchedules} schedulePeriods={schedulePeriods} anniversaries={anniversaries} setAnniversaries={setAnniversaries} shifts={shifts} setView={setView} openModal={openModal} deleteEvent={deleteEvent} />}
        {view === 'calendar' && <CalendarView events={events} childSchedules={childSchedules} setChildSchedules={setChildSchedules} schedulePeriods={schedulePeriods} anniversaries={anniversaries} setAnniversaries={setAnniversaries} shifts={shifts} setShifts={setShifts} openModal={openModal} deleteEvent={deleteEvent} setView={setView} mode={calendarMode} setMode={setCalendarMode} />}
        {view === 'tasks' && <TasksView tasks={tasks} setTasks={setTasks} openModal={openModal} />}
        {view === 'schedules' && <SchedulesView childSchedules={childSchedules} setChildSchedules={setChildSchedules} schedulePeriods={schedulePeriods} setSchedulePeriods={setSchedulePeriods} anniversaries={anniversaries} setAnniversaries={setAnniversaries} openCalendar={openCalendar} />}
      </main>
      <div className="mobile-nav"><Navigation active={view} onChange={setView} /></div>
      {modal && <Modal {...modal} onClose={() => setModal(null)} onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} onAddTask={addTask} />}
    </div>
  )
}

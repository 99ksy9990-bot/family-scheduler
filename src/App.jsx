import { useCallback, useEffect, useMemo, useState } from 'react'
import Holidays from 'date-holidays'
import KoreanLunarCalendar from 'korean-lunar-calendar'
import {
  AlertTriangle, Bell, BookOpen, CalendarDays, CalendarRange, Check, CheckSquare,
  ChevronLeft, ChevronRight, Clock3, Focus, GraduationCap, Home, Moon, Pencil,
  Plus, RotateCcw, Settings2, ShoppingBasket, Sparkles, Sun, Sunset, Trash2,
  UserRoundCheck, Users, X,
} from 'lucide-react'
import FamilySyncPanel from './components/FamilySyncPanel'
import { useFamilySync } from './hooks/useFamilySync'

const MEMBERS = [
  { id: 'family', name: '가족', role: '가족', initials: '가', color: '#9b8bd3', tone: '#f4f1ff' },
  { id: 'david', name: '아빠', role: '아빠', initials: '아', color: '#a9c978', tone: '#f2f7e8' },
  { id: 'emma', name: '엄마', role: '엄마', initials: '엄', color: '#ffaaa0', tone: '#fff0ed' },
  { id: 'leo', name: '초롱', role: '자녀', initials: '초', color: '#7fc7e3', tone: '#ecf8fc' },
  { id: 'mia', name: '연두', role: '자녀', initials: '연', color: '#c9df84', tone: '#f6fae9' },
]

const CHILDREN = MEMBERS.filter((member) => ['leo', 'mia'].includes(member.id))
const ANNIVERSARY_MEMBER = { id: 'anniversary', name: '기념일', initials: '기', color: '#e0b866', tone: '#fff8e6' }
const HOLIDAY_MEMBER = { id: 'holiday', name: '공휴일', initials: '휴', color: '#e06b65', tone: '#fff1ef' }
const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
const WEEKDAY_SHORT = ['일', '월', '화', '수', '목', '금', '토']
const TIME_HOURS = Array.from({ length: 12 }, (_, index) => index + 1)
const TIME_MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'))
const CALENDAR_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)
const CALENDAR_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)
const TASK_PERIOD_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'today', label: '오늘' },
  { id: 'week', label: '이번 주' },
  { id: 'month', label: '이번 달' },
  { id: 'none', label: '기한 없음' },
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
const ANNIVERSARY_YEARS = Array.from({ length: today.getFullYear() - 1899 }, (_, index) => today.getFullYear() - index)
const holidayCalendar = new Holidays('KR')
holidayCalendar.setLanguages('ko')
const holidayYearCache = new Map()

const memberForId = (memberId) => {
  if (memberId === ANNIVERSARY_MEMBER.id) return ANNIVERSARY_MEMBER
  if (memberId === HOLIDAY_MEMBER.id) return HOLIDAY_MEMBER
  return MEMBERS.find((member) => member.id === memberId) || MEMBERS[0]
}

const normalizeHolidayName = (name) => name.replace('석가탄신일', '부처님오신날')

const holidaysForYear = (year) => {
  if (holidayYearCache.has(year)) return holidayYearCache.get(year)

  const holidayMap = new Map()
  const addHoliday = (dateValue, name, substitute = false) => {
    const list = holidayMap.get(dateValue) || []
    if (!list.some((holiday) => holiday.name === name)) list.push({ name, substitute })
    holidayMap.set(dateValue, list)
  }

  holidayCalendar.getHolidays(year)
    .filter((holiday) => holiday.type === 'public')
    .filter((holiday) => !holiday.name.startsWith('설날') && !holiday.name.startsWith('추석'))
    .forEach((holiday) => addHoliday(holiday.date.slice(0, 10), normalizeHolidayName(holiday.name), Boolean(holiday.substitute)))

  const addLunarFestival = (lunarMonth, lunarDay, name) => {
    const calendar = new KoreanLunarCalendar()
    if (!calendar.setLunarDate(year, lunarMonth, lunarDay, false)) return
    const solar = calendar.getSolarCalendar()
    const center = new Date(solar.year, solar.month - 1, solar.day)
    const festivalDates = [-1, 0, 1].map((offset) => addDays(center, offset))
    festivalDates.forEach((date, index) => addHoliday(iso(date), index === 1 ? name : `${name} 연휴`))

    const festivalNames = new Set([name, `${name} 연휴`])
    const needsSubstitute = festivalDates.some((date) => (
      date.getDay() === 0 || (holidayMap.get(iso(date)) || []).some((holiday) => !festivalNames.has(holiday.name))
    ))
    if (!needsSubstitute) return
    let substituteDate = addDays(festivalDates[2], 1)
    while (substituteDate.getDay() === 0 || substituteDate.getDay() === 6 || holidayMap.has(iso(substituteDate))) {
      substituteDate = addDays(substituteDate, 1)
    }
    addHoliday(iso(substituteDate), `${name} (대체공휴일)`, true)
  }

  addLunarFestival(1, 1, '설날')
  addLunarFestival(8, 15, '추석')
  if (year >= 2026) addHoliday(`${year}-05-01`, '노동절')
  if (year === 2026) addHoliday('2026-06-03', '전국동시지방선거일')

  holidayYearCache.set(year, holidayMap)
  return holidayMap
}

const holidayEventsForDate = (date) => (holidaysForYear(date.getFullYear()).get(iso(date)) || []).map((holiday, index) => ({
  id: `holiday-${iso(date)}-${index}`,
  date: iso(date),
  title: holiday.name,
  time: '종일',
  end: '',
  location: holiday.substitute ? '대한민국 대체공휴일' : '대한민국 공휴일',
  member: HOLIDAY_MEMBER.id,
  type: 'holiday',
  holiday: true,
}))

const DATA_RECOVERY_VERSION = 1
const RECOVERED_SHIFTS = [
  { id: 'emma-2026-08-05', date: '2026-08-05', member: 'emma', shift: 'day' },
]
const RECOVERED_ANNIVERSARIES = [
  { id: 'anniversary-recovered-mother', name: '어머니', kind: '생일', calendarType: 'solar', leapMonth: false, baseYear: 1990, month: 8, day: 5 },
  { id: 'anniversary-recovered-wedding', name: '결혼', kind: '결혼기념일', calendarType: 'solar', leapMonth: false, baseYear: 2000, month: 8, day: 5 },
  { id: 'anniversary-recovered-father', name: '아버지', kind: '생일', calendarType: 'solar', leapMonth: false, baseYear: '', month: 9, day: 7 },
]

const defaultEvents = []
const defaultChildSchedules = []
const defaultSchedulePeriods = []
const defaultAnniversaries = RECOVERED_ANNIVERSARIES
const defaultTasks = []
const defaultShifts = RECOVERED_SHIFTS
const defaultScheduleExceptions = []

const LEGACY_EVENT_IDS = new Set([1, 4, 6, 7])
const LEGACY_TASK_IDS = new Set([1, 2, 3, 4, 5, 6, 7])
const LEGACY_CHILD_SCHEDULE_IDS = new Set([
  'leo-term-soccer', 'leo-term-piano', 'mia-term-art', 'leo-vacation-swim', 'mia-vacation-art',
])
const LEGACY_PERIOD_IDS = new Set(['term-first-2026', 'vacation-summer-2026', 'term-second-2026'])

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

const createId = (prefix) => (
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
)

const loadWithoutLegacySeeds = (key, fallback, legacyIds) => (
  load(key, fallback).filter((item) => !legacyIds.has(item.id))
)

const mergeUnique = (current, recovered, identity) => {
  const merged = [...current]
  recovered.forEach((item) => {
    if (!merged.some((candidate) => identity(candidate) === identity(item))) merged.push(item)
  })
  return merged
}

const loadRecoveredCollection = (key, fallback, recovered, identity, markerKey) => {
  const current = load(key, fallback)
  if (Number(localStorage.getItem(markerKey) || 0) >= DATA_RECOVERY_VERSION) return current
  const merged = mergeUnique(current, recovered, identity)
  localStorage.setItem(markerKey, String(DATA_RECOVERY_VERSION))
  return merged
}

const upgradeSharedState = (state) => {
  if (!state || typeof state !== 'object' || Number(state.recoveryVersion || 0) >= DATA_RECOVERY_VERSION) return state
  return {
    ...state,
    schemaVersion: 3,
    recoveryVersion: DATA_RECOVERY_VERSION,
    shifts: mergeUnique(Array.isArray(state.shifts) ? state.shifts : [], RECOVERED_SHIFTS, (item) => `${item.member}-${item.date}`),
    anniversaries: mergeUnique(Array.isArray(state.anniversaries) ? state.anniversaries : [], RECOVERED_ANNIVERSARIES, (item) => `${item.name}-${item.kind}-${item.calendarType}-${item.month}-${item.day}`),
  }
}

const formatLongDate = (date) => new Intl.DateTimeFormat('ko-KR', {
  weekday: 'long', month: 'long', day: 'numeric',
}).format(date)
const formatSolarDate = (date) => date ? `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.` : '변환 가능한 날짜 없음'
const familyGreeting = (date = new Date()) => {
  const hour = date.getHours()
  if (hour < 12) return '좋은 아침이에요'
  if (hour < 18) return '좋은 오후예요'
  return '좋은 저녁이에요'
}

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
    if (!calendar.setLunarDate(lunarYear, Number(anniversary.month), Number(anniversary.day), Boolean(anniversary.leapMonth))) return []
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

const anniversaryMilestoneLabel = (anniversary, occurrence) => {
  const baseYear = Number(anniversary.baseYear)
  if (!occurrence || !Number.isInteger(baseYear) || baseYear < 1900 || baseYear > occurrence.getFullYear()) return ''
  const elapsedYears = occurrence.getFullYear() - baseYear
  return anniversary.kind === '생일' ? `다음 생일에 만 ${elapsedYears}세` : `다음 기념일에 ${elapsedYears}주년`
}

const anniversaryEventsForDate = (date, anniversaries) => anniversaries.flatMap((anniversary) => {
  const matched = anniversarySolarOccurrences(anniversary, date.getFullYear()).find((occurrence) => iso(occurrence) === iso(date))
  if (!matched) return []
  const sourceLabel = anniversary.calendarType === 'lunar'
    ? `음력${anniversary.leapMonth ? ' 윤달' : ''} ${anniversary.month}월 ${anniversary.day}일 → 양력 ${matched.getMonth() + 1}월 ${matched.getDate()}일`
    : `매년 양력 ${anniversary.month}월 ${anniversary.day}일`
  const milestoneLabel = anniversaryMilestoneLabel(anniversary, matched)
  return [{
    id: `anniversary-${anniversary.id}-${iso(date)}`,
    anniversaryId: anniversary.id,
    date: iso(date),
    title: anniversaryTitle(anniversary),
    time: '종일',
    end: '',
    location: sourceLabel,
    milestoneLabel,
    member: 'anniversary',
    type: 'anniversary',
    recurring: true,
    anniversary: true,
  }]
})

const activeSeasonForDate = (date, periods, member) => {
  const dateValue = iso(date)
  return periods
    .filter((period) => period.start <= dateValue && dateValue <= period.end)
    .filter((period) => !member || !period.member || period.member === 'all' || period.member === member)
    .sort((a, b) => b.start.localeCompare(a.start) || Number(b.member === member) - Number(a.member === member))[0]?.season
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

const childEventsForDate = (date, childSchedules, schedulePeriods, scheduleExceptions = []) => {
  const dateValue = iso(date)
  return childSchedules
    .filter((schedule) => schedule.season === activeSeasonForDate(date, schedulePeriods, schedule.member) && scheduleWeekdays(schedule).includes(date.getDay()))
    .filter((schedule) => !scheduleExceptions.some((exception) => exception.scheduleId === schedule.id && exception.date === dateValue && exception.type === 'skip'))
    .map((schedule) => ({
      ...schedule,
      id: `recurring-${schedule.id}-${dateValue}`,
      scheduleId: schedule.id,
      date: dateValue,
      type: 'school',
      recurring: true,
    }))
}

const eventsForDate = (date, events, childSchedules, schedulePeriods, anniversaries = [], scheduleExceptions = []) => {
  const dateValue = iso(date)
  const merged = [
    ...events.filter((event) => event.date <= dateValue && dateValue <= (event.endDate || event.date)),
    ...childEventsForDate(date, childSchedules, schedulePeriods, scheduleExceptions),
    ...anniversaryEventsForDate(date, anniversaries),
    ...holidayEventsForDate(date),
  ]
  const seen = new Set()
  return merged.filter((event) => {
    const key = `${event.member}-${event.title}-${event.date}-${event.time}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const timeToMinutes = (value) => {
  const parsed = parseTime(value)
  let hour = parsed.hour % 12
  if (parsed.meridiem === '오후') hour += 12
  return hour * 60 + Number(parsed.minute)
}

const overlappingEventIds = (events) => {
  const conflicts = new Set()
  events.forEach((event, index) => {
    events.slice(index + 1).forEach((candidate) => {
      if (event.member !== candidate.member || !event.end || !candidate.end) return
      if (timeToMinutes(event.time) < timeToMinutes(candidate.end) && timeToMinutes(candidate.time) < timeToMinutes(event.end)) {
        conflicts.add(event.id)
        conflicts.add(candidate.id)
      }
    })
  })
  return conflicts
}

function Avatar({ memberId, small = false }) {
  const member = memberForId(memberId)
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

function Header({ active, onChange, focusMode, onToggleFocus, syncStatus, onOpenFamily }) {
  const isSynced = ['synced', 'saving', 'readonly'].includes(syncStatus)
  return (
    <header className="app-header">
      <div className="header-inner">
        <button className="brand" onClick={() => onChange('home')} aria-label="홈으로 이동">
          <BrandMark />
          <span>Family Scheduler</span>
        </button>
        <Navigation active={active} onChange={onChange} />
        <div className="header-actions">
          <button className={`family-connect-button ${isSynced ? 'connected' : ''}`} onClick={onOpenFamily} aria-label="가족 연결과 백업 열기"><Users /><span>{isSynced ? '가족 연결됨' : '가족 연결'}</span><i /></button>
          <button className={`icon-button ${focusMode ? 'selected' : ''}`} onClick={onToggleFocus} aria-label={focusMode ? '집중 모드 끄기' : '집중 모드 켜기'} aria-pressed={focusMode} title={focusMode ? '집중 모드 끄기' : '오늘 일정에 집중하기'}>
            <Focus size={21} />
          </button>
        </div>
      </div>
    </header>
  )
}

function FocusModeBanner({ shiftOption, eventCount, onClose }) {
  return (
    <section className="focus-mode-banner" aria-live="polite">
      <div>
        <span><Focus /> 집중 모드</span>
        <strong>오늘 필요한 내용만 보고 있어요.</strong>
        <small>{shiftOption ? `엄마 ${shiftOption.code} · ${shiftOption.label}` : '엄마 근무 미입력'} · 오늘 일정 {eventCount}개</small>
      </div>
      <button onClick={onClose}><X /> 집중 모드 종료</button>
    </section>
  )
}

function MemberLegend() {
  return (
    <div className="member-legend">
      {[...MEMBERS, ANNIVERSARY_MEMBER, HOLIDAY_MEMBER].map((member) => (
        <span key={member.id}><i style={{ background: member.color }} />{member.name}</span>
      ))}
    </div>
  )
}

function EventCard({ event, compact = false, onEdit, onDelete }) {
  const member = memberForId(event.member)
  const hasActions = Boolean(onEdit || onDelete)
  const editLabel = event.anniversary ? `${event.title} 기념일 관리` : event.recurring ? `${event.title} 반복 일정 관리` : `${event.title} 수정`
  const editTitle = event.anniversary ? '기념일 관리' : event.recurring ? '반복 일정 관리' : '일정 수정'
  return (
    <article className={`event-card ${compact ? 'compact' : ''} ${hasActions ? 'has-actions' : ''} ${event.conflict ? 'conflict' : ''}`} style={{ '--event': member.color, '--event-bg': member.tone }}>
      <div className="event-time">{event.time || '종일'}</div>
      <Avatar memberId={event.member} small />
      <div className="event-copy">
        <div className="event-title-row">
          <strong>{event.title}</strong>
          {hasActions && <div className="event-actions">
            {onEdit && <button onClick={onEdit} aria-label={editLabel} title={editTitle}><Pencil /></button>}
            {onDelete && <button className="delete" onClick={onDelete} aria-label={`${event.title} 삭제`} title="일정 삭제"><Trash2 /></button>}
          </div>}
        </div>
        <div className={`event-detail-row ${event.anniversary ? 'anniversary-detail-row' : ''}`}>
          <span>{event.location}{event.milestoneLabel ? ` · ${event.milestoneLabel}` : ''}{event.pickupBy ? ` · ${MEMBERS.find((person) => person.id === event.pickupBy)?.name || '가족'} 픽업` : ''}</span>
          {event.conflict && <em className="conflict-badge"><AlertTriangle /> 시간 겹침</em>}
        </div>
      </div>
    </article>
  )
}

function HomeView({ events, childSchedules, schedulePeriods, anniversaries, setAnniversaries, shifts, tasks, scheduleExceptions, setView, openModal, deleteEvent, openRecurringActions, canEdit, isShared, notifyUndo }) {
  const [greeting, setGreeting] = useState(() => familyGreeting())
  const rawTodayEvents = eventsForDate(today, events, childSchedules, schedulePeriods, anniversaries, scheduleExceptions)
  const conflicts = overlappingEventIds(rawTodayEvents)
  const todayEvents = rawTodayEvents.map((event) => ({ ...event, conflict: conflicts.has(event.id) }))
  const childEvents = todayEvents.filter((event) => ['leo', 'mia'].includes(event.member))
  const dueTasks = tasks.filter((task) => !task.done && task.dueDate && task.dueDate <= iso(today))
  const todayShift = shifts.find((shift) => shift.date === iso(today) && shift.member === 'emma')
  const shiftOption = SHIFT_OPTIONS.find((option) => option.id === todayShift?.shift)

  useEffect(() => {
    const timer = window.setInterval(() => setGreeting(familyGreeting()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const removeTodayEvent = (event) => {
    if (event.recurring && !event.anniversary) {
      openRecurringActions(event)
      return
    }
    if (!window.confirm(`‘${event.title}’ 일정을 삭제할까요?`)) return
    if (event.anniversary) {
      const removed = anniversaries.find((anniversary) => anniversary.id === event.anniversaryId)
      setAnniversaries((current) => current.filter((anniversary) => anniversary.id !== event.anniversaryId))
      if (removed) notifyUndo?.(`‘${event.title}’을 삭제했습니다.`, () => setAnniversaries((current) => [...current, removed]))
    }
    else deleteEvent(event.id)
  }

  return (
    <div className="page home-page">
      <section className="hero-intro">
        <span className="eyebrow">{formatLongDate(today)}</span>
        <h1>{greeting}, 우리 가족.</h1>
        <p>우리 가족의 오늘 하루를 한눈에 확인하세요.</p>
      </section>

      <section className="overview-grid">
        <article className="status-card card">
          <div className="card-label"><span>엄마 오늘 근무</span><span className="status-pill"><i /> {shiftOption?.code || '미입력'}</span></div>
          <h2>{shiftOption?.label || '근무 미입력'}</h2>
          <p className="large-detail"><Clock3 /> {shiftOption?.endLabel || '근무표에서 입력하세요'}</p>
          <button className="support-note" type="button" aria-controls="today-schedule" onClick={() => document.getElementById('today-schedule')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            <Sparkles size={20} />
            <span><strong>{isShared ? '가족 동기화' : '오늘 요약'}</strong>오늘 일정 {todayEvents.length}개{dueTasks.length ? ` · 마감 할 일 ${dueTasks.length}개` : ''}</span>
          </button>
        </article>

        <article className="children-card card">
          <div className="section-heading"><h2>자녀 일정</h2><GraduationCap /></div>
          <div className="children-list">
            {childEvents.length ? childEvents.map((event) => (
              <div key={event.id} className="child-row">
                <Avatar memberId={event.member} />
                <span><strong>{MEMBERS.find((member) => member.id === event.member)?.name}</strong>{event.title} · {event.time}{event.pickupBy ? ` · ${MEMBERS.find((member) => member.id === event.pickupBy)?.name} 픽업` : ''}{event.conflict ? ' · 시간 겹침' : ''}</span>
              </div>
            )) : <p className="empty-copy">오늘은 수업이 없습니다.</p>}
          </div>
        </article>
      </section>

      <section className="today-card card" id="today-schedule">
        <div className="section-heading">
          <div><span className="eyebrow">오늘 한눈에 보기</span><h2>오늘의 일정</h2></div>
          <button className="text-button" onClick={() => setView('calendar')}>캘린더 보기 <ChevronRight size={16} /></button>
        </div>
        <div className={`timeline timeline-count-${Math.min(todayEvents.length, 3)}`}>
          {todayEvents.slice(0, 6).map((event) => <EventCard
            key={event.id}
            event={event}
            onEdit={canEdit && !event.holiday ? (event.recurring ? () => openRecurringActions(event) : () => openModal('event', event.date, event)) : undefined}
            onDelete={canEdit && !event.holiday ? () => removeTodayEvent(event) : undefined}
          />)}
          {!todayEvents.length && <p className="empty-copy">비어 있는 하루예요. 일정을 추가해 보세요.</p>}
        </div>
        {todayEvents.length > 6 && <button className="more-events-button" onClick={() => setView('calendar')}>+{todayEvents.length - 6}개 일정 더보기</button>}
      </section>

      {canEdit && <button className="floating-add" onClick={() => openModal('event')} aria-label="일정 추가"><Plus /></button>}
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

function CalendarView({ events, childSchedules, schedulePeriods, anniversaries, setAnniversaries, shifts, setShifts, scheduleExceptions, openModal, deleteEvent, mode, setMode, openRecurringActions, canEdit, notifyUndo }) {
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(today)
  const [lastShiftChange, setLastShiftChange] = useState(null)
  const monthDays = useMemo(() => buildCalendarDays(cursor), [cursor])
  const selectedEventsRaw = eventsForDate(selected, events, childSchedules, schedulePeriods, anniversaries, scheduleExceptions)
  const selectedConflicts = overlappingEventIds(selectedEventsRaw)
  const selectedEvents = selectedEventsRaw.map((event) => ({ ...event, conflict: selectedConflicts.has(event.id) }))
  const selectedShift = shifts.find((shift) => shift.date === iso(selected) && shift.member === 'emma')
  const isMonthEnd = selected.getDate() === new Date(selected.getFullYear(), selected.getMonth() + 1, 0).getDate()
  const label = new Intl.DateTimeFormat('ko-KR', { month: 'long', year: 'numeric' }).format(cursor)
  const cursorMonthShifts = shifts.filter((shift) => {
    const date = new Date(`${shift.date}T00:00:00`)
    return shift.member === 'emma' && date.getFullYear() === cursor.getFullYear() && date.getMonth() === cursor.getMonth()
  })
  const monthShiftCount = cursorMonthShifts.length
  const monthShiftCounts = SHIFT_OPTIONS.reduce((counts, option) => ({
    ...counts,
    [option.id]: cursorMonthShifts.filter((shift) => shift.shift === option.id).length,
  }), {})
  const daysInCursorMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()

  const moveMonth = (amount) => {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + amount, 1)
    setCursor(next)
  }

  const setSelectedShift = (shiftId) => {
    if (!canEdit) return
    const selectedDate = iso(selected)
    const previous = shifts.find((shift) => shift.date === selectedDate && shift.member === 'emma')
    setLastShiftChange({ date: selectedDate, previous: previous ? { ...previous } : null })
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
    if (!canEdit) return
    const selectedDate = iso(selected)
    setShifts((currentShifts) => currentShifts.filter((shift) => !(shift.date === selectedDate && shift.member === 'emma')))
  }

  const removeSelectedEvent = (event) => {
    if (event.recurring && !event.anniversary) {
      openRecurringActions(event)
      return
    }
    if (!window.confirm(`‘${event.title}’ 일정을 삭제할까요?`)) return
    if (event.anniversary) {
      const removed = anniversaries.find((anniversary) => anniversary.id === event.anniversaryId)
      setAnniversaries((current) => current.filter((anniversary) => anniversary.id !== event.anniversaryId))
      if (removed) notifyUndo?.(`‘${event.title}’을 삭제했습니다.`, () => setAnniversaries((current) => [...current, removed]))
    }
    else deleteEvent(event.id)
  }

  const undoLastShift = () => {
    if (!lastShiftChange) return
    setShifts((current) => {
      const withoutChanged = current.filter((shift) => !(shift.date === lastShiftChange.date && shift.member === 'emma'))
      return lastShiftChange.previous ? [...withoutChanged, lastShiftChange.previous] : withoutChanged
    })
    setSelected(new Date(`${lastShiftChange.date}T00:00:00`))
    setLastShiftChange(null)
  }

  return (
    <div className="page calendar-page">
      <section className={`calendar-toolbar card ${mode === '근무표' ? 'shift-mode' : ''}`}>
        <div className="calendar-title-slot">
          <div className="month-controls">
            <button className="icon-button" onClick={() => moveMonth(-1)} aria-label="이전 달"><ChevronLeft /></button>
            <h1>{label}</h1>
            <button className="icon-button" onClick={() => moveMonth(1)} aria-label="다음 달"><ChevronRight /></button>
          </div>
        </div>
        <div className="segmented">
          {['일반', '근무표'].map((item) => <button key={item} aria-pressed={mode === item} className={mode === item ? 'active' : ''} onClick={() => setMode(item)}>{item}</button>)}
        </div>
      </section>

      <section className={`calendar-layout ${mode === '근무표' ? 'shift-mode' : ''}`}>
        <div className="calendar-card card">
          <div className="weekday-row">{['일', '월', '화', '수', '목', '금', '토'].map((day, index) => <span key={day} className={index === 0 ? 'sunday' : index === 6 ? 'saturday' : ''}>{day}</span>)}</div>
          <div className="calendar-grid">
            {monthDays.map(({ day, date, outside }) => {
              const dayEvents = eventsForDate(date, events, childSchedules, schedulePeriods, anniversaries, scheduleExceptions)
              const dayShift = shifts.find((shift) => shift.date === iso(date) && shift.member === 'emma')
              const shiftOption = SHIFT_OPTIONS.find((option) => option.id === dayShift?.shift)
              const ShiftIcon = shiftOption?.icon
              const isSelected = iso(date) === iso(selected)
              const isToday = iso(date) === iso(today)
              const dayHoliday = dayEvents.find((event) => event.holiday)
              const scheduledDayEvents = dayEvents.filter((event) => !event.holiday)
              const weekdayClass = date.getDay() === 0 ? 'sunday' : date.getDay() === 6 ? 'saturday' : ''
              return (
                <button
                  key={iso(date)}
                  className={`${outside ? 'outside' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${weekdayClass} ${dayHoliday ? 'holiday' : ''} ${mode === '근무표' && shiftOption ? `has-shift shift-${shiftOption.color}` : ''}`}
                  data-date={iso(date)}
                  data-holiday={dayHoliday?.title || undefined}
                  aria-label={`${formatLongDate(date)}${dayHoliday ? `, ${dayHoliday.title}` : ''}`}
                  onClick={() => setSelected(date)}
                >
                  <span>{day}</span>
                  {dayHoliday && <small className="calendar-holiday-name">{dayHoliday.title}</small>}
                  {mode === '일반' ? <>
                    <div className="day-dots">
                      {dayEvents.slice(0, 3).map((event) => {
                        const member = memberForId(event.member)
                        return <i key={event.id} style={{ background: member.color }} />
                      })}
                    </div>
                    <div className="calendar-event-labels">
                      {scheduledDayEvents.slice(0, 2).map((event) => <small key={event.id}>{event.title}</small>)}
                      {scheduledDayEvents.length > 2 && <small className="more-count">+{scheduledDayEvents.length - 2}</small>}
                    </div>
                  </> : shiftOption && <span className={`shift-chip ${shiftOption.color}`}>{ShiftIcon && <ShiftIcon />}{shiftOption.shortLabel}</span>}
                </button>
              )
            })}
          </div>
        </div>

        <aside className={`day-panel card ${mode === '근무표' ? 'shift-day-panel' : ''}`}>
          {mode === '일반' ? <>
            <div className="section-heading">
              <div><span className="eyebrow">선택한 날짜</span><h2>{formatLongDate(selected)}</h2></div>
              {canEdit && <button className="small-add" onClick={() => openModal('event', iso(selected))}><Plus size={18} /> 추가</button>}
            </div>
            <div className="day-events">
              {selectedEvents.map((event) => <EventCard
                key={event.id}
                event={event}
                compact
                onEdit={canEdit && !event.holiday ? (event.recurring ? () => openRecurringActions(event) : () => openModal('event', event.date, event)) : undefined}
                onDelete={canEdit && !event.holiday ? () => removeSelectedEvent(event) : undefined}
              />)}
              {!selectedEvents.length && <div className="empty-state"><CalendarDays /><strong>등록된 일정이 없습니다</strong><span>쉬거나 새 일정을 추가하세요.</span></div>}
            </div>
            <MemberLegend />
          </> : <>
            <div className="shift-editor-heading">
              <Avatar memberId="emma" />
              <div><span className="eyebrow">엄마 근무표</span><h2>{formatLongDate(selected)}</h2></div>
            </div>
            <p className="shift-help">{isMonthEnd ? '월말에는 다음 달로 넘어가지 않습니다.' : '근무 선택 후 다음 날짜로 자동 이동합니다.'}</p>
            <div className="shift-editor-grid">
              {SHIFT_OPTIONS.map(({ id, code, label: optionLabel, time, icon: Icon, color }) => (
                <button key={id} className={`${color} ${selectedShift?.shift === id ? 'active' : ''}`} aria-pressed={selectedShift?.shift === id} disabled={!canEdit} onClick={() => setSelectedShift(id)}>
                  <Icon />
                  <span><strong>{code} · {optionLabel}</strong><small>{time}</small></span>
                  {selectedShift?.shift === id && <Check className="shift-check" />}
                </button>
              ))}
            </div>
            <div className="shift-editor-footer">
              <span className="shift-count-summary">
                <strong>{monthShiftCount}/{daysInCursorMonth}일 입력</strong>
                <span aria-label="이번 달 근무 개수">{SHIFT_OPTIONS.map((option) => <i key={option.id}><b>{option.code}</b> {monthShiftCounts[option.id]}</i>)}</span>
              </span>
              <div>{lastShiftChange && canEdit && <button onClick={undoLastShift}><RotateCcw /> 직전 입력 취소</button>}{selectedShift && canEdit && <button onClick={clearSelectedShift}>지정 해제</button>}</div>
            </div>
          </>}
        </aside>
      </section>
    </div>
  )
}

function TasksView({ tasks, setTasks, openModal, canEdit, notifyUndo, notificationPermission, onEnableNotifications }) {
  const [periodFilter, setPeriodFilter] = useState('all')
  const categories = ['긴급', '집안일', '장보기']
  const toggleTask = (id) => setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task))
  const deleteTask = (task) => {
    if (!window.confirm(`‘${task.title}’ 할 일을 삭제할까요?`)) return
    setTasks((current) => current.filter((item) => item.id !== task.id))
    notifyUndo?.(`‘${task.title}’ 할 일을 삭제했습니다.`, () => setTasks((current) => [...current, task]))
  }
  const remaining = tasks.filter((task) => !task.done).length
  const weekStart = addDays(today, -today.getDay())
  const weekEnd = addDays(weekStart, 6)
  const visibleTasks = tasks.filter((task) => {
    if (periodFilter === 'all') return true
    if (periodFilter === 'none') return !task.dueDate
    if (!task.dueDate) return false
    if (periodFilter === 'today') return task.dueDate === iso(today)
    if (periodFilter === 'week') return iso(weekStart) <= task.dueDate && task.dueDate <= iso(weekEnd)
    if (periodFilter === 'month') return task.dueDate.startsWith(`${today.getFullYear()}-${pad(today.getMonth() + 1)}`)
    return true
  })

  return (
    <div className="page tasks-page">
      <section className="page-title-row">
        <div><span className="eyebrow">가족과 함께 나누는 일</span><h1>가족 할 일</h1><p>{remaining ? `남은 할 일이 ${remaining}개 있어요. 하나씩 함께 정리해요.` : '남은 할 일이 없어요. 새 할 일을 추가해 보세요.'}</p></div>
        <div className="page-title-actions">
          {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && <button className="secondary-button" onClick={onEnableNotifications}><Bell size={18} /> 알림 켜기</button>}
          {canEdit && <button className="primary-button" onClick={() => openModal('task')}><Plus size={19} /> 새 할 일</button>}
        </div>
      </section>
      <div className="task-filter-bar" aria-label="할 일 기간 필터">
        {TASK_PERIOD_FILTERS.map((filter) => <button key={filter.id} className={periodFilter === filter.id ? 'active' : ''} aria-pressed={periodFilter === filter.id} onClick={() => setPeriodFilter(filter.id)}>{filter.label}</button>)}
      </div>
      <div className="task-columns">
        {categories.map((category) => {
          const grouped = visibleTasks.filter((task) => task.category === category)
          return (
            <section key={category} className={`task-group ${category === '긴급' ? 'urgent' : category === '집안일' ? 'housework' : 'groceries'}`}>
              <div className="task-heading">
                <span className="category-icon">{category === '긴급' ? <Bell /> : category === '집안일' ? <Home /> : <ShoppingBasket />}</span>
                <h2>{category}</h2><span className="count-badge">{grouped.filter((task) => !task.done).length}</span>
              </div>
              <div className="task-list">
                {grouped.map((task) => {
                  const visibleMeta = task.meta && task.meta.replace(/\s/g, '') !== '새로추가됨' ? task.meta : ''
                  const dueCopy = task.dueDate ? `${task.dueDate}${task.reminder && task.reminder !== 'none' ? ' 알림' : ''}` : ''
                  const detail = [visibleMeta, dueCopy].filter(Boolean).join(' · ')
                  return (
                    <article key={task.id} className={`task-card ${task.done ? 'done' : ''}`}>
                      <button className="checkbox" onClick={() => toggleTask(task.id)} aria-label={`${task.done ? '다시 열기' : '완료하기'} ${task.title}`}>{task.done && <Check />}</button>
                      <span className="task-copy">
                        <span className="task-title-row">
                          <strong>{task.title}</strong>
                          {canEdit && <span className="event-actions">
                            <button onClick={() => openModal('task', undefined, task)} aria-label={`${task.title} 수정`} title="할 일 수정"><Pencil /></button>
                            <button className="delete" onClick={() => deleteTask(task)} aria-label={`${task.title} 삭제`} title="할 일 삭제"><Trash2 /></button>
                          </span>}
                        </span>
                        {detail && <small>{detail}</small>}
                      </span>
                      <Avatar memberId={task.assignee} small />
                    </article>
                  )
                })}
                {!grouped.length && <div className="task-empty-state"><span>{category} 할 일이 없습니다.</span>{canEdit && <button onClick={() => openModal('task', undefined, undefined, { category })}><Plus /> {category} 추가</button>}</div>}
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
  time: '오후 4:00', end: '오후 5:00', location: '', pickupBy: '',
}

const emptyAnniversaryForm = {
  name: '', kind: '생일', calendarType: 'solar', leapMonth: false, baseYear: '', month: today.getMonth() + 1, day: today.getDate(),
}

function SchedulesView({ childSchedules, setChildSchedules, schedulePeriods, setSchedulePeriods, anniversaries, setAnniversaries, openCalendar, canEdit, notifyUndo, scheduleEditRequest, onScheduleEditHandled }) {
  const requestedSchedule = childSchedules.find((item) => item.id === scheduleEditRequest)
  const [managementSection, setManagementSection] = useState(requestedSchedule ? 'children' : 'anniversaries')
  const [season, setSeason] = useState(() => requestedSchedule?.season || activeSeasonForDate(today, schedulePeriods) || '학기')
  const [scheduleForm, setScheduleForm] = useState(() => requestedSchedule ? {
    member: requestedSchedule.member,
    kind: requestedSchedule.kind,
    title: requestedSchedule.title,
    weekdays: scheduleWeekdays(requestedSchedule),
    time: requestedSchedule.time,
    end: requestedSchedule.end,
    location: requestedSchedule.location,
    pickupBy: requestedSchedule.pickupBy || '',
  } : emptyScheduleForm)
  const [editingId, setEditingId] = useState(requestedSchedule?.id || null)
  const [scheduleError, setScheduleError] = useState('')
  const [periodForm, setPeriodForm] = useState({ member: 'leo', season: '학기', start: iso(today), end: iso(addDays(today, 30)) })
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
  const changePeriodField = (field, value) => {
    setPeriodForm((current) => ({ ...current, [field]: value }))
    setPeriodError('')
  }
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
    if (!canEdit) return
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
    const hasConflict = childSchedules.some((schedule) => (
      schedule.id !== editingId
      && schedule.season === season
      && schedule.member === nextSchedule.member
      && scheduleWeekdays(schedule).some((day) => nextSchedule.weekdays.includes(day))
      && timeToMinutes(schedule.time) < timeToMinutes(nextSchedule.end)
      && timeToMinutes(nextSchedule.time) < timeToMinutes(schedule.end)
    ))
    if (hasConflict) {
      setScheduleError('같은 자녀의 일정과 시간이 겹칩니다. 요일이나 시간을 조정해 주세요.')
      return
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
      pickupBy: schedule.pickupBy || '',
    })
    setEditingId(schedule.id)
    setScheduleError('')
  }

  const cancelScheduleEdit = () => {
    setScheduleForm(emptyScheduleForm)
    setEditingId(null)
    setScheduleError('')
  }

  useEffect(() => {
    if (!scheduleEditRequest) return
    const timer = window.setTimeout(() => onScheduleEditHandled?.(), 0)
    return () => window.clearTimeout(timer)
  }, [onScheduleEditHandled, scheduleEditRequest])

  const deleteSchedule = (schedule) => {
    if (!window.confirm(`‘${schedule.title}’ 반복 일정을 삭제할까요?`)) return
    setChildSchedules((current) => current.filter((item) => item.id !== schedule.id))
    notifyUndo?.(`‘${schedule.title}’ 반복 일정을 삭제했습니다.`, () => setChildSchedules((current) => [...current, schedule]))
    if (editingId === schedule.id) cancelScheduleEdit()
  }

  const submitPeriod = (event) => {
    event.preventDefault()
    if (!canEdit) return
    if (!periodForm.start || !periodForm.end || periodForm.start > periodForm.end) {
      setPeriodError('시작일과 종료일을 올바르게 입력해 주세요.')
      return
    }
    setSchedulePeriods((current) => periodEditingId
      ? current.map((period) => period.id === periodEditingId ? { ...periodForm, id: periodEditingId } : period)
      : [...current, { ...periodForm, id: `period-${Date.now()}` }])
    setPeriodError('')
    setPeriodForm((current) => ({ ...current, member: 'leo', start: iso(today), end: iso(addDays(today, 30)) }))
    setPeriodEditingId(null)
  }

  const editPeriod = (period) => {
    setPeriodForm({ member: period.member || 'all', season: period.season, start: period.start, end: period.end })
    setPeriodEditingId(period.id)
    setPeriodError('')
  }

  const cancelPeriodEdit = () => {
    setPeriodForm({ member: 'leo', season: '학기', start: iso(today), end: iso(addDays(today, 30)) })
    setPeriodEditingId(null)
    setPeriodError('')
  }

  const deletePeriod = (period) => {
    if (!window.confirm(`${period.season} 적용 기간을 삭제할까요?`)) return
    setSchedulePeriods((current) => current.filter((item) => item.id !== period.id))
    notifyUndo?.(`${period.season} 적용 기간을 삭제했습니다.`, () => setSchedulePeriods((current) => [...current, period]))
    if (periodEditingId === period.id) cancelPeriodEdit()
  }

  const changeAnniversaryField = (field, value) => {
    setAnniversaryForm((current) => ({ ...current, [field]: value }))
    setAnniversaryError('')
  }

  const submitAnniversary = (event) => {
    event.preventDefault()
    if (!canEdit) return
    const name = anniversaryForm.name.trim()
    if (!name) {
      setAnniversaryError('기념일 대상이나 이름을 입력해 주세요.')
      return
    }
    const candidate = {
      ...anniversaryForm,
      name,
      baseYear: anniversaryForm.baseYear ? Number(anniversaryForm.baseYear) : '',
      month: Number(anniversaryForm.month),
      day: Number(anniversaryForm.day),
    }
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
      leapMonth: Boolean(anniversary.leapMonth),
      baseYear: anniversary.baseYear || '',
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
    notifyUndo?.(`‘${anniversaryTitle(anniversary)}’을 삭제했습니다.`, () => setAnniversaries((current) => [...current, anniversary]))
    if (anniversaryEditingId === anniversary.id) cancelAnniversaryEdit()
  }

  return (
    <div className="page schedules-page">
      <section className="page-title-row">
        <div><span className="eyebrow">반복 일정과 기념일</span><h1>가족 일정 관리</h1><p>학교·학원과 기념일을 등록하면 달력에 바로 반영됩니다.</p></div>
        <button className="secondary-button" onClick={() => openCalendar('일반')}><CalendarDays size={18} /> 달력 보기</button>
      </section>

      <section className="schedule-guide card">
        <CalendarRange />
        <span><strong>엄마 근무는 날짜마다 직접 입력합니다.</strong><small>근무표에서 D·E·N·휴무를 선택하세요.</small></span>
        <button className="text-button" onClick={() => openCalendar('근무표')}>근무표 열기 <ChevronRight size={16} /></button>
      </section>

      <nav className="management-tabs card" aria-label="일정 관리 구분">
        {[
          ['anniversaries', '기념일', anniversaries.length],
          ['periods', '학기·방학', schedulePeriods.length],
          ['children', '자녀 일정', childSchedules.length],
        ].map(([id, label, count]) => <button key={id} className={managementSection === id ? 'active' : ''} aria-pressed={managementSection === id} onClick={() => setManagementSection(id)}><span>{label}</span><em>{count}</em></button>)}
      </nav>

      {!canEdit && <div className="readonly-notice"><UserRoundCheck /> 자녀 계정은 일정을 볼 수 있습니다. 수정은 가족 대표가 권한을 허용한 뒤 가능합니다.</div>}

      {managementSection === 'anniversaries' && <section className={`anniversary-card card ${!canEdit ? 'readonly-section' : ''}`}>
        <div className="section-heading"><div><span className="eyebrow">매년 달력에 자동 표시</span><h2>가족 기념일 관리</h2><p>양력·음력 가족 기념일을 등록하세요.</p></div><CalendarDays /></div>
        <div className="anniversary-layout">
          <form className="anniversary-form" onSubmit={submitAnniversary}>
            <label className="anniversary-name-field">대상·이름<input value={anniversaryForm.name} onChange={(event) => changeAnniversaryField('name', event.target.value)} placeholder="예: 어머니, 부모님" required /></label>
            <label className="anniversary-kind-field">기념일 종류<select value={anniversaryForm.kind} onChange={(event) => changeAnniversaryField('kind', event.target.value)}><option>생일</option><option>결혼기념일</option><option>기념일</option></select></label>
            <fieldset className="anniversary-calendar-field">
              <legend>날짜 기준</legend>
              <div className="segmented anniversary-calendar-tabs">
                {[['solar', '양력'], ['lunar', '음력']].map(([value, label]) => <button key={value} type="button" aria-pressed={anniversaryForm.calendarType === value} className={anniversaryForm.calendarType === value ? 'active' : ''} onClick={() => changeAnniversaryField('calendarType', value)}>{label}</button>)}
              </div>
              {anniversaryForm.calendarType === 'lunar' && <button className={`leap-month-toggle ${anniversaryForm.leapMonth ? 'active' : ''}`} type="button" aria-pressed={anniversaryForm.leapMonth} onClick={() => changeAnniversaryField('leapMonth', !anniversaryForm.leapMonth)}><Check /> 윤달</button>}
            </fieldset>
            <label className="anniversary-year-field">{anniversaryForm.kind === '생일' ? '출생 연도' : '시작 연도'}<select value={anniversaryForm.baseYear} onChange={(event) => changeAnniversaryField('baseYear', event.target.value)}><option value="">연도 선택</option>{ANNIVERSARY_YEARS.map((year) => <option key={year} value={year}>{year}년</option>)}</select></label>
            <label className="anniversary-month-field">월<select value={anniversaryForm.month} onChange={(event) => changeAnniversaryField('month', Number(event.target.value))}>{CALENDAR_MONTHS.map((month) => <option key={month} value={month}>{month}월</option>)}</select></label>
            <label className="anniversary-day-field">일<select value={anniversaryForm.day} onChange={(event) => changeAnniversaryField('day', Number(event.target.value))}>{CALENDAR_DAYS.slice(0, anniversaryForm.calendarType === 'lunar' ? 30 : 31).map((day) => <option key={day} value={day}>{day}일</option>)}</select></label>
            <div className="anniversary-form-actions">
              {anniversaryEditingId && <button className="secondary-button" type="button" onClick={cancelAnniversaryEdit}>취소</button>}
              <button className="primary-button" type="submit">{anniversaryEditingId ? <Check size={17} /> : <Plus size={17} />}{anniversaryEditingId ? '수정 완료' : '기념일 추가'}</button>
            </div>
            {anniversaryError && <p className="form-error anniversary-form-error" role="alert">{anniversaryError}</p>}
          </form>

          <div className="anniversary-list">
            {sortedAnniversaries.map((anniversary) => {
              const nextOccurrence = nextAnniversaryOccurrence(anniversary)
              const milestoneLabel = anniversaryMilestoneLabel(anniversary, nextOccurrence)
              return <article className="anniversary-row" key={anniversary.id}>
                <Avatar memberId="anniversary" />
                <div className="anniversary-copy">
                  <span><em>{anniversary.calendarType === 'lunar' ? `음력${anniversary.leapMonth ? ' 윤달' : ''}` : '양력'}</em>{anniversary.kind}</span>
                  <div className="anniversary-title-row">
                    <strong>{anniversaryTitle(anniversary)}</strong>
                    <div className="event-actions">
                      {canEdit && <button onClick={() => editAnniversary(anniversary)} aria-label={`${anniversaryTitle(anniversary)} 수정`}><Pencil /></button>}
                      {canEdit && <button className="delete" onClick={() => deleteAnniversary(anniversary)} aria-label={`${anniversaryTitle(anniversary)} 삭제`}><Trash2 /></button>}
                    </div>
                  </div>
                  <small>
                    <span>{anniversary.month}월 {anniversary.day}일 · 다음 양력 {formatSolarDate(nextOccurrence)}</span>
                    <span className={milestoneLabel ? 'anniversary-milestone' : 'anniversary-missing-year'}>{milestoneLabel || '연도 미입력'}</span>
                  </small>
                  {!milestoneLabel && canEdit && <button className="year-inline-button" onClick={() => editAnniversary(anniversary)}>{anniversary.kind === '생일' ? '출생 연도 추가' : '시작 연도 추가'}</button>}
                </div>
              </article>
            })}
            {!sortedAnniversaries.length && <div className="anniversary-empty"><CalendarDays /><strong>등록된 기념일이 없습니다</strong><span>양력이나 음력으로 가족 기념일을 추가하세요.</span></div>}
          </div>
        </div>
      </section>}

      {managementSection === 'periods' && <div className={`schedule-management-grid single ${!canEdit ? 'readonly-section' : ''}`}>
        <section className="period-card card">
          <div className="section-heading"><div><span className="eyebrow">언제 적용할지</span><h2>학기·방학 적용 기간</h2></div><CalendarRange /></div>
          <p>자녀별 기간을 따로 등록할 수 있으며, 같은 자녀의 기간이 겹치면 최근 시작 일정이 우선입니다.</p>
          <form className="period-form" onSubmit={submitPeriod}>
            <label>자녀<select value={periodForm.member} onChange={(event) => changePeriodField('member', event.target.value)}><option value="all">전체 자녀</option>{CHILDREN.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>
            <label>구분<select value={periodForm.season} onChange={(event) => changePeriodField('season', event.target.value)}><option>학기</option><option>방학</option></select></label>
            <label>시작일<input type="date" value={periodForm.start} required onInput={(event) => changePeriodField('start', event.currentTarget.value)} onChange={(event) => changePeriodField('start', event.currentTarget.value)} /></label>
            <label>종료일<input type="date" min={periodForm.start} value={periodForm.end} required onInput={(event) => changePeriodField('end', event.currentTarget.value)} onChange={(event) => changePeriodField('end', event.currentTarget.value)} /></label>
            <div className="period-form-actions">
              {periodEditingId && <button className="secondary-button" type="button" onClick={cancelPeriodEdit}>취소</button>}
              <button className="primary-button" type="submit">{periodEditingId ? <Check size={17} /> : <Plus size={17} />}{periodEditingId ? '수정 완료' : '기간 추가'}</button>
            </div>
          </form>
          {periodError && <p className="form-error" role="alert">{periodError}</p>}
          <div className="period-list">
            {[...schedulePeriods].sort((a, b) => `${a.member || 'all'}-${a.start}`.localeCompare(`${b.member || 'all'}-${b.start}`)).map((period) => {
              const periodMember = period.member && period.member !== 'all' ? MEMBERS.find((member) => member.id === period.member) : MEMBERS[0]
              return <div className="period-row" key={period.id}>
                <span className={`season-badge ${period.season === '방학' ? 'vacation' : ''}`}>{period.season}</span>
                <Avatar memberId={periodMember?.id || 'family'} small />
                <span><strong>{period.member && period.member !== 'all' ? periodMember?.name : '전체 자녀'} · {period.start}</strong><small>~ {period.end}</small></span>
                <div className="event-actions">
                  {canEdit && <button onClick={() => editPeriod(period)} aria-label={`${period.season} ${period.start} 적용 기간 수정`}><Pencil /></button>}
                  {canEdit && <button className="delete" onClick={() => deletePeriod(period)} aria-label={`${period.season} ${period.start} 적용 기간 삭제`}><Trash2 /></button>}
                </div>
              </div>
            })}
          </div>
        </section>

      </div>}

      {managementSection === 'children' && <>
        <section className={`schedule-editor-card card ${!canEdit ? 'readonly-section' : ''}`}>
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
            <label className="schedule-pickup-field">픽업 담당<select value={scheduleForm.pickupBy} onChange={(event) => changeScheduleField('pickupBy', event.target.value)}><option value="">미정</option>{MEMBERS.filter((member) => ['david', 'emma'].includes(member.id)).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
            <div className="schedule-form-actions">
              {editingId && <button className="secondary-button" type="button" onClick={cancelScheduleEdit}>취소</button>}
              <button className="primary-button" type="submit">{editingId ? <Check size={17} /> : <Plus size={17} />}{editingId ? '수정 완료' : `${season} 일정 추가`}</button>
            </div>
            {scheduleError && <p className="form-error schedule-form-error" role="alert">{scheduleError}</p>}
          </form>
        </section>


      <section className="saved-child-schedules">
        <div className="section-heading"><div><span className="eyebrow">달력에 반복 반영</span><h2>{season} 등록 일정</h2></div><span className="count-badge">{visibleSchedules.length}</span></div>
        <div className="child-schedule-list">
          {visibleSchedules.map((schedule) => {
            const child = CHILDREN.find((item) => item.id === schedule.member)
            return (
              <article className="child-schedule-card card" key={schedule.id}>
                <Avatar memberId={schedule.member} />
                <div className="child-schedule-copy"><span><em>{schedule.kind}</em>{child?.name}</span><strong>{schedule.title}</strong><small>{formatScheduleWeekdays(schedule)} · {schedule.time}~{schedule.end} · {schedule.location}{schedule.pickupBy ? ` · ${MEMBERS.find((member) => member.id === schedule.pickupBy)?.name} 픽업` : ''}</small></div>
                <div className="event-actions">
                  {canEdit && <button onClick={() => editSchedule(schedule)} aria-label={`${schedule.title} 수정`}><Pencil /></button>}
                  {canEdit && <button className="delete" onClick={() => deleteSchedule(schedule)} aria-label={`${schedule.title} 삭제`}><Trash2 /></button>}
                </div>
              </article>
            )
          })}
          {!visibleSchedules.length && <div className="empty-state card"><GraduationCap /><strong>{season} 일정이 없습니다</strong><span>위 입력란에서 학교나 학원 일정을 추가하세요.</span></div>}
        </div>
      </section></>}
    </div>
  )
}

function Modal({ type, date, item, defaults = {}, onAfterSave, onClose, onAddEvent, onUpdateEvent, onDeleteEvent, onAddTask, onUpdateTask, onDeleteTask }) {
  const isTask = type === 'task'
  const isEditing = Boolean(item?.id)
  const [title, setTitle] = useState(item?.title || defaults.title || '')
  const [eventDate, setEventDate] = useState(item?.date || defaults.date || date || iso(today))
  const [eventEndDate, setEventEndDate] = useState(item?.endDate || defaults.endDate || item?.date || defaults.date || date || iso(today))
  const [eventDateError, setEventDateError] = useState('')
  const [time, setTime] = useState(item?.time || defaults.time || '오전 9:00')
  const [end, setEnd] = useState(item?.end || defaults.end || '오전 10:00')
  const [hasTime, setHasTime] = useState(() => Boolean((item?.time || defaults.time) && (item?.time || defaults.time) !== '종일'))
  const [location, setLocation] = useState(item?.location || defaults.location || '우리 집')
  const [member, setMember] = useState(item?.member || defaults.member || 'emma')
  const [category, setCategory] = useState(item?.category || defaults.category || '집안일')
  const [dueDate, setDueDate] = useState(item?.dueDate || defaults.dueDate || '')
  const [reminder, setReminder] = useState(item?.reminder || defaults.reminder || 'none')
  const changeEventStartDate = (nextDate) => {
    setEventDate(nextDate)
    setEventEndDate((current) => !current || current < nextDate ? nextDate : current)
    setEventDateError('')
  }
  const submit = (event) => {
    event.preventDefault()
    if (!title.trim()) return
    const submitted = new FormData(event.currentTarget)
    const submittedEventDate = String(submitted.get('eventDate') || eventDate)
    const submittedEventEndDate = String(submitted.get('eventEndDate') || eventEndDate || submittedEventDate)
    const submittedDueDate = String(submitted.get('dueDate') || dueDate)
    if (!isTask && submittedEventEndDate < submittedEventDate) {
      setEventDateError('종료일자는 시작일자보다 빠를 수 없습니다.')
      return
    }
    if (isTask && isEditing) onUpdateTask({ ...item, title: title.trim(), category, assignee: member, dueDate: submittedDueDate, reminder })
    else if (isTask) onAddTask({ title: title.trim(), category, assignee: member, dueDate: submittedDueDate, reminder })
    else if (isEditing) onUpdateEvent({ ...item, title: title.trim(), date: submittedEventDate, endDate: submittedEventEndDate, time: hasTime ? time : '종일', end: hasTime ? end : '', location, member })
    else onAddEvent({ title: title.trim(), date: submittedEventDate, endDate: submittedEventEndDate, time: hasTime ? time : '종일', end: hasTime ? end : '', location, member, type: 'family' })
    onAfterSave?.()
    onClose()
  }
  const removeItem = () => {
    const itemType = isTask ? '할 일' : '일정'
    if (window.confirm(`‘${item.title}’ ${itemType}을 삭제할까요?`)) {
      if (isTask) onDeleteTask(item.id)
      else onDeleteEvent(item.id)
      onClose()
    }
  }
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-heading"><div><span className="eyebrow">Family Scheduler</span><h2>{isTask ? (isEditing ? '할 일 수정' : '할 일 추가') : isEditing ? '일정 수정' : '일정 추가'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="닫기"><X /></button></div>
        <label>제목<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={isTask ? '무엇을 해야 하나요?' : '어떤 일정인가요?'} /></label>
        {!isTask && <fieldset className="event-date-field"><legend>일정 기간</legend>
          <div className="field-row event-date-row">
            <label>시작일자<input name="eventDate" type="date" value={eventDate} required onInput={(event) => changeEventStartDate(event.currentTarget.value)} onChange={(event) => changeEventStartDate(event.currentTarget.value)} /></label>
            <label>종료일자<input name="eventEndDate" type="date" min={eventDate} value={eventEndDate} required onInput={(event) => { setEventEndDate(event.currentTarget.value); setEventDateError('') }} onChange={(event) => { setEventEndDate(event.currentTarget.value); setEventDateError('') }} /></label>
          </div>
          <small className="field-help">두 날짜가 같으면 당일 일정, 다르면 해당 기간에 계속 표시됩니다.</small>
          {eventDateError && <p className="form-error event-date-error" role="alert">{eventDateError}</p>}
        </fieldset>}
        {!isTask && <fieldset className="all-day-field"><legend>시간</legend><div className="segmented event-time-mode">
          <button type="button" className={!hasTime ? 'active' : ''} aria-pressed={!hasTime} onClick={() => setHasTime(false)}>종일</button>
          <button type="button" className={hasTime ? 'active' : ''} aria-pressed={hasTime} onClick={() => setHasTime(true)}>시간 지정</button>
        </div></fieldset>}
        {!isTask && hasTime && <div className="modal-time-row">
          <fieldset className="time-field"><legend>시작 시간</legend><TimePicker label="시작 시간" value={time} fallback="오전 9:00" onChange={setTime} /></fieldset>
          <fieldset className="time-field"><legend>종료 시간</legend><TimePicker label="종료 시간" value={end} fallback="오전 10:00" onChange={setEnd} /></fieldset>
        </div>}
        {!isTask && <label>장소<input value={location} onChange={(event) => setLocation(event.target.value)} /></label>}
        {isTask && <label>분류<select value={category} onChange={(event) => setCategory(event.target.value)}><option>긴급</option><option>집안일</option><option>장보기</option></select></label>}
        {isTask && <div className="field-row"><label>마감일<input name="dueDate" type="date" value={dueDate} onInput={(event) => setDueDate(event.currentTarget.value)} onChange={(event) => setDueDate(event.currentTarget.value)} /></label><label>알림<select value={reminder} onChange={(event) => setReminder(event.target.value)}><option value="none">알림 없음</option><option value="same-day">당일 알림</option><option value="day-before">하루 전 알림</option></select></label></div>}
        <fieldset><legend>담당자</legend><div className="member-picker">{MEMBERS.map((person) => <button type="button" key={person.id} className={member === person.id ? 'active' : ''} onClick={() => setMember(person.id)}><Avatar memberId={person.id} small />{person.name}</button>)}</div></fieldset>
        <div className="modal-actions">
          {isEditing && <button type="button" className="danger-button" onClick={removeItem}><Trash2 size={17} /> {isTask ? '할 일 삭제' : '일정 삭제'}</button>}
          <button type="button" className="secondary-button" onClick={onClose}>취소</button>
          <button className="primary-button" type="submit">{isEditing ? <Check size={18} /> : <Plus size={18} />} {isEditing ? '수정 완료' : isTask ? '할 일 추가' : '일정 추가'}</button>
        </div>
      </form>
    </div>
  )
}

function RecurringActionDialog({ event, onClose, onEditDate, onEditSeries, onSkipDate, onDeleteSeries }) {
  if (!event) return null
  return (
    <div className="modal-backdrop" onMouseDown={(click) => click.target === click.currentTarget && onClose()}>
      <section className="modal recurring-dialog" role="dialog" aria-modal="true" aria-labelledby="recurring-dialog-title">
        <div className="modal-heading"><div><span className="eyebrow">반복 일정 변경 범위</span><h2 id="recurring-dialog-title">{event.title}</h2></div><button className="icon-button" onClick={onClose} aria-label="닫기"><X /></button></div>
        <p>{formatLongDate(new Date(`${event.date}T00:00:00`))} 일정만 바꾸거나 전체 반복 규칙을 관리할 수 있습니다.</p>
        <div className="recurring-actions-grid">
          <button className="secondary-button" onClick={onEditDate}><Pencil /> 이 날짜만 수정</button>
          <button className="secondary-button" onClick={onEditSeries}><CalendarRange /> 전체 반복 수정</button>
          <button className="secondary-button warning" onClick={onSkipDate}><CalendarDays /> 이 날짜만 취소</button>
          <button className="danger-button" onClick={onDeleteSeries}><Trash2 /> 전체 반복 삭제</button>
        </div>
      </section>
    </div>
  )
}

function UndoToast({ toast, onUndo, onClose }) {
  if (!toast) return null
  return <div className="undo-toast" role="status"><span>{toast.message}</span><button onClick={onUndo}><RotateCcw /> 실행 취소</button><button className="toast-close" onClick={onClose} aria-label="알림 닫기"><X /></button></div>
}

export default function App() {
  const [view, setView] = useState('home')
  const [events, setEvents] = useState(() => loadWithoutLegacySeeds('family-scheduler-events', defaultEvents, LEGACY_EVENT_IDS).map((event) => (
    event.member === 'mia' && event.title === '미아 생일' ? { ...event, title: '연두 생일' } : event
  )))
  const [tasks, setTasks] = useState(() => loadWithoutLegacySeeds('family-scheduler-tasks', defaultTasks, LEGACY_TASK_IDS))
  const [shifts, setShifts] = useState(() => loadRecoveredCollection(
    'family-scheduler-shifts',
    defaultShifts,
    RECOVERED_SHIFTS,
    (item) => `${item.member}-${item.date}`,
    'family-scheduler-shifts-recovery-version',
  ))
  const [childSchedules, setChildSchedules] = useState(() => loadWithoutLegacySeeds('family-scheduler-child-schedules-v1', defaultChildSchedules, LEGACY_CHILD_SCHEDULE_IDS))
  const [schedulePeriods, setSchedulePeriods] = useState(() => loadWithoutLegacySeeds('family-scheduler-periods-v1', defaultSchedulePeriods, LEGACY_PERIOD_IDS))
  const [anniversaries, setAnniversaries] = useState(() => loadRecoveredCollection(
    'family-scheduler-anniversaries-v1',
    defaultAnniversaries,
    RECOVERED_ANNIVERSARIES,
    (item) => `${item.name}-${item.kind}-${item.calendarType}-${item.month}-${item.day}`,
    'family-scheduler-anniversaries-recovery-version',
  ))
  const [scheduleExceptions, setScheduleExceptions] = useState(() => load('family-scheduler-schedule-exceptions-v1', defaultScheduleExceptions))
  const [modal, setModal] = useState(null)
  const [focusMode, setFocusMode] = useState(false)
  const [calendarMode, setCalendarMode] = useState('일반')
  const [familyPanelOpen, setFamilyPanelOpen] = useState(false)
  const [recurringEvent, setRecurringEvent] = useState(null)
  const [scheduleEditRequest, setScheduleEditRequest] = useState(null)
  const [undoToast, setUndoToast] = useState(null)
  const [notificationPermission, setNotificationPermission] = useState(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)

  useEffect(() => localStorage.setItem('family-scheduler-events', JSON.stringify(events)), [events])
  useEffect(() => localStorage.setItem('family-scheduler-tasks', JSON.stringify(tasks)), [tasks])
  useEffect(() => localStorage.setItem('family-scheduler-shifts', JSON.stringify(shifts)), [shifts])
  useEffect(() => localStorage.setItem('family-scheduler-child-schedules-v1', JSON.stringify(childSchedules)), [childSchedules])
  useEffect(() => localStorage.setItem('family-scheduler-periods-v1', JSON.stringify(schedulePeriods)), [schedulePeriods])
  useEffect(() => localStorage.setItem('family-scheduler-anniversaries-v1', JSON.stringify(anniversaries)), [anniversaries])
  useEffect(() => localStorage.setItem('family-scheduler-schedule-exceptions-v1', JSON.stringify(scheduleExceptions)), [scheduleExceptions])

  const sharedState = useMemo(() => ({
    schemaVersion: 3,
    recoveryVersion: DATA_RECOVERY_VERSION,
    events,
    tasks,
    shifts,
    childSchedules,
    schedulePeriods,
    anniversaries,
    scheduleExceptions,
  }), [events, tasks, shifts, childSchedules, schedulePeriods, anniversaries, scheduleExceptions])

  const applySharedState = useCallback((nextState) => {
    const restoredState = upgradeSharedState(nextState)
    if (!restoredState || typeof restoredState !== 'object') return
    if (Array.isArray(restoredState.events)) setEvents(restoredState.events)
    if (Array.isArray(restoredState.tasks)) setTasks(restoredState.tasks)
    if (Array.isArray(restoredState.shifts)) setShifts(restoredState.shifts)
    if (Array.isArray(restoredState.childSchedules)) setChildSchedules(restoredState.childSchedules)
    if (Array.isArray(restoredState.schedulePeriods)) setSchedulePeriods(restoredState.schedulePeriods)
    if (Array.isArray(restoredState.anniversaries)) setAnniversaries(restoredState.anniversaries)
    if (Array.isArray(restoredState.scheduleExceptions)) setScheduleExceptions(restoredState.scheduleExceptions)
  }, [])

  const sync = useFamilySync({ localState: sharedState, onRemoteState: applySharedState })
  const canEdit = !sync.family || sync.family.membership.can_edit

  useEffect(() => {
    if (!undoToast) return undefined
    const timeout = window.setTimeout(() => setUndoToast(null), 6000)
    return () => window.clearTimeout(timeout)
  }, [undoToast])

  useEffect(() => {
    if (notificationPermission !== 'granted' || typeof Notification === 'undefined') return
    const todayValue = iso(today)
    tasks.filter((task) => !task.done && task.dueDate && task.reminder && task.reminder !== 'none').forEach((task) => {
      const due = new Date(`${task.dueDate}T00:00:00`)
      const trigger = task.reminder === 'day-before' ? iso(addDays(due, -1)) : task.dueDate
      const noticeKey = `family-scheduler-notified-${task.id}-${trigger}`
      if (trigger === todayValue && !localStorage.getItem(noticeKey)) {
        new Notification('Family Scheduler', { body: `${task.title} · ${task.dueDate} 마감` })
        localStorage.setItem(noticeKey, '1')
      }
    })
  }, [tasks, notificationPermission])

  const notifyUndo = (message, undo) => setUndoToast({ message, undo })

  const addEvent = (event) => setEvents((current) => [...current, { ...event, id: createId('event') }])
  const updateEvent = (updatedEvent) => setEvents((current) => current.map((event) => event.id === updatedEvent.id ? updatedEvent : event))
  const deleteEvent = (eventId) => {
    const removed = events.find((event) => event.id === eventId)
    setEvents((current) => current.filter((event) => event.id !== eventId))
    if (removed) notifyUndo(`‘${removed.title}’ 일정을 삭제했습니다.`, () => setEvents((current) => [...current, removed]))
  }
  const addTask = (task) => setTasks((current) => [...current, { ...task, id: createId('task'), done: false }])
  const updateTask = (updatedTask) => setTasks((current) => current.map((task) => task.id === updatedTask.id ? updatedTask : task))
  const deleteTask = (taskId) => {
    const removed = tasks.find((task) => task.id === taskId)
    setTasks((current) => current.filter((task) => task.id !== taskId))
    if (removed) notifyUndo(`‘${removed.title}’ 할 일을 삭제했습니다.`, () => setTasks((current) => [...current, removed]))
  }
  const openModal = (type, date, item, defaults = {}, onAfterSave) => setModal({ type, date, item, defaults, onAfterSave })
  const changeView = (nextView) => {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const toggleFocusMode = () => {
    if (!focusMode) {
      setView('home')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    setFocusMode(!focusMode)
  }
  const openCalendar = (mode = '일반') => {
    setCalendarMode(mode)
    changeView('calendar')
  }

  const skipRecurringDate = (event) => {
    const exception = { id: `skip-${event.scheduleId}-${event.date}`, scheduleId: event.scheduleId, date: event.date, type: 'skip' }
    setScheduleExceptions((current) => current.some((item) => item.id === exception.id) ? current : [...current, exception])
    notifyUndo(`‘${event.title}’의 ${event.date} 일정만 취소했습니다.`, () => setScheduleExceptions((current) => current.filter((item) => item.id !== exception.id)))
    setRecurringEvent(null)
  }

  const editRecurringDate = (event) => {
    setRecurringEvent(null)
    openModal('event', event.date, undefined, {
      title: event.title,
      date: event.date,
      time: event.time,
      end: event.end,
      location: event.location,
      member: event.member,
    }, () => {
      const exception = { id: `skip-${event.scheduleId}-${event.date}`, scheduleId: event.scheduleId, date: event.date, type: 'skip' }
      setScheduleExceptions((current) => current.some((item) => item.id === exception.id) ? current : [...current, exception])
    })
  }

  const deleteRecurringSeries = (event) => {
    const removedSchedule = childSchedules.find((schedule) => schedule.id === event.scheduleId)
    const removedExceptions = scheduleExceptions.filter((exception) => exception.scheduleId === event.scheduleId)
    if (!removedSchedule || !window.confirm(`‘${event.title}’ 전체 반복 일정을 삭제할까요?`)) return
    setChildSchedules((current) => current.filter((schedule) => schedule.id !== event.scheduleId))
    setScheduleExceptions((current) => current.filter((exception) => exception.scheduleId !== event.scheduleId))
    notifyUndo(`‘${event.title}’ 전체 반복 일정을 삭제했습니다.`, () => {
      setChildSchedules((current) => [...current, removedSchedule])
      setScheduleExceptions((current) => [...current, ...removedExceptions])
    })
    setRecurringEvent(null)
  }

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...sharedState }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `family-scheduler-${iso(today)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importBackup = async (file) => {
    try {
      const imported = JSON.parse(await file.text())
      applySharedState(imported)
      notifyUndo('백업 데이터를 불러왔습니다.', () => applySharedState(sharedState))
    } catch {
      window.alert('Family Scheduler 백업 파일인지 확인해 주세요.')
    }
  }

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') return
    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
  }

  const focusEvents = eventsForDate(today, events, childSchedules, schedulePeriods, anniversaries, scheduleExceptions)
  const focusShift = shifts.find((shift) => shift.date === iso(today) && shift.member === 'emma')
  const focusShiftOption = SHIFT_OPTIONS.find((option) => option.id === focusShift?.shift)

  return (
    <div className={`app ${focusMode ? 'focus-mode' : ''}`}>
      <Header active={view} onChange={changeView} focusMode={focusMode} onToggleFocus={toggleFocusMode} syncStatus={sync.syncStatus} onOpenFamily={() => setFamilyPanelOpen(true)} />
      {focusMode && <FocusModeBanner shiftOption={focusShiftOption} eventCount={focusEvents.length} onClose={toggleFocusMode} />}
      <main>
        {view === 'home' && <HomeView events={events} childSchedules={childSchedules} schedulePeriods={schedulePeriods} anniversaries={anniversaries} setAnniversaries={setAnniversaries} shifts={shifts} tasks={tasks} scheduleExceptions={scheduleExceptions} setView={changeView} openModal={openModal} deleteEvent={deleteEvent} openRecurringActions={setRecurringEvent} canEdit={canEdit} isShared={Boolean(sync.family)} notifyUndo={notifyUndo} />}
        {view === 'calendar' && <CalendarView events={events} childSchedules={childSchedules} schedulePeriods={schedulePeriods} anniversaries={anniversaries} setAnniversaries={setAnniversaries} shifts={shifts} setShifts={setShifts} scheduleExceptions={scheduleExceptions} openModal={openModal} deleteEvent={deleteEvent} mode={calendarMode} setMode={setCalendarMode} openRecurringActions={setRecurringEvent} canEdit={canEdit} notifyUndo={notifyUndo} />}
        {view === 'tasks' && <TasksView tasks={tasks} setTasks={setTasks} openModal={openModal} canEdit={canEdit} notifyUndo={notifyUndo} notificationPermission={notificationPermission} onEnableNotifications={enableNotifications} />}
        {view === 'schedules' && <SchedulesView childSchedules={childSchedules} setChildSchedules={setChildSchedules} schedulePeriods={schedulePeriods} setSchedulePeriods={setSchedulePeriods} anniversaries={anniversaries} setAnniversaries={setAnniversaries} openCalendar={openCalendar} canEdit={canEdit} notifyUndo={notifyUndo} scheduleEditRequest={scheduleEditRequest} onScheduleEditHandled={() => setScheduleEditRequest(null)} />}
      </main>
      <div className="mobile-nav"><Navigation active={view} onChange={changeView} /></div>
      {modal && <Modal {...modal} onClose={() => setModal(null)} onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} onAddTask={addTask} onUpdateTask={updateTask} onDeleteTask={deleteTask} />}
      <RecurringActionDialog
        event={recurringEvent}
        onClose={() => setRecurringEvent(null)}
        onEditDate={() => editRecurringDate(recurringEvent)}
        onEditSeries={() => { setScheduleEditRequest(recurringEvent?.scheduleId); setRecurringEvent(null); changeView('schedules') }}
        onSkipDate={() => skipRecurringDate(recurringEvent)}
        onDeleteSeries={() => deleteRecurringSeries(recurringEvent)}
      />
      <FamilySyncPanel open={familyPanelOpen} onClose={() => setFamilyPanelOpen(false)} sync={sync} onExport={exportBackup} onImport={importBackup} />
      <UndoToast toast={undoToast} onUndo={() => { undoToast?.undo(); setUndoToast(null) }} onClose={() => setUndoToast(null)} />
    </div>
  )
}

import { createContext, Fragment, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import KoreanLunarCalendar from 'korean-lunar-calendar'
import {
  AlertTriangle, Bell, BookOpen, CalendarDays, CalendarRange, Check, CheckSquare, Cloud,
  ChevronDown, ChevronLeft, ChevronRight, Clock3, Cog, Focus, GraduationCap, Home, Moon, Pencil,
  Phone, Plus, RotateCcw, Search, Settings2, ShoppingBasket, Sparkles, Sun, Sunset, Trash2, Upload,
  UserRoundCheck, X,
} from 'lucide-react'
import SyncStatusBar from './components/SyncStatusBar'
import ScheduleRow from './components/ScheduleRow'
import ScheduleActionSheet from './components/ScheduleActionSheet'
import { useAppDialog } from './hooks/useAppDialog'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { useFamilySync } from './hooks/useFamilySync'
import { usePersistedValue } from './hooks/usePersistedValue'
import { usePushNotifications } from './hooks/usePushNotifications'
import { useModalAccessibility } from './hooks/useModalAccessibility'
import { useToday } from './hooks/useToday'
import { useCurrentTime } from './hooks/useCurrentTime'
import { addDays, formatLongDate, formatSolarDate, iso, startOfToday, validSolarDate } from './lib/dates'
import { holidayEventsForDate, holidaysForYear } from './lib/holidays'
import { inspectBackup } from './lib/backup'
import { hasLegacyLocalData, load, loadRecoveredCollection, loadWithoutLegacySeeds, mergeUnique } from './lib/persistence'
import { hasRecurrence, isRecurrenceStart, recurringEventForDate } from './lib/recurrence'
import { MEMBER_COLORS, SYSTEM_COLORS, migrateMemberProfiles } from './lib/colors'

const FamilySyncPanel = lazy(() => import('./components/FamilySyncPanel'))
const FamilySettingsPanel = lazy(() => import('./components/FamilySettingsPanel'))
const EventCollaborationPanel = lazy(() => import('./components/EventCollaborationPanel'))
const SettingsView = lazy(() => import('./views/SettingsView'))

const FAMILY_MEMBER = { id: 'family', name: '가족', type: 'system', initials: '가', color: SYSTEM_COLORS.family, tone: '#EFF6F8' }
const LEGACY_PROFILES = [
  { id: 'david', name: '아빠', type: 'adult', relation: '아빠', initials: '아', color: MEMBER_COLORS[0].color, tone: MEMBER_COLORS[0].tone, active: true },
  { id: 'emma', name: '엄마', type: 'adult', relation: '엄마', initials: '엄', color: MEMBER_COLORS[1].color, tone: MEMBER_COLORS[1].tone, active: true },
  { id: 'leo', name: '초롱', type: 'child', relation: '자녀', initials: '초', color: MEMBER_COLORS[2].color, tone: MEMBER_COLORS[2].tone, active: true },
  { id: 'mia', name: '연두', type: 'child', relation: '자녀', initials: '연', color: MEMBER_COLORS[3].color, tone: MEMBER_COLORS[3].tone, active: true },
]
const ANNIVERSARY_MEMBER = { id: 'anniversary', name: '기념일', initials: '기', color: SYSTEM_COLORS.anniversary, tone: '#FFFBEB' }
const HOLIDAY_MEMBER = { id: 'holiday', name: '공휴일', initials: '휴', color: SYSTEM_COLORS.holiday, tone: '#FEF2F2' }
const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
const WEEKDAY_SHORT = ['일', '월', '화', '수', '목', '금', '토']
const TIME_HOURS = Array.from({ length: 12 }, (_, index) => index + 1)
const TIME_MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'))
const CALENDAR_MONTHS = Array.from({ length: 12 }, (_, index) => index + 1)
const CALENDAR_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)
const TASK_PERIOD_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'week', label: '이번 주' },
  { id: 'month', label: '이번 달' },
]
const REMINDER_OPTIONS = [
  { id: 'same-day', label: '당일 알림' },
  { id: '30-minutes', label: '30분 전' },
  { id: '10-minutes', label: '10분 전' },
]

const reminderValuesFor = (item = {}) => {
  if (Array.isArray(item.reminders)) return [...new Set(item.reminders.filter(Boolean))]
  return item.reminder && item.reminder !== 'none' ? [item.reminder] : []
}

const taskDisplayDate = (task) => task.done
  ? (task.completedDate || task.dueDate || task.startDate || task.createdDate)
  : (task.dueDate || task.startDate || task.createdDate)

const MIN_ANNIVERSARY_YEAR = 1950
const anniversaryYearsFor = (date) => Array.from(
  { length: date.getFullYear() - MIN_ANNIVERSARY_YEAR + 1 },
  (_, index) => date.getFullYear() - index,
)

const DEFAULT_SHIFT_TYPES = [
  { id: 'day', code: 'D', label: '주간 근무', start: '06:30', end: '15:30', color: 'sage', icon: 'sun' },
  { id: 'evening', code: 'E', label: '오후 근무', start: '13:30', end: '22:30', color: 'blue', icon: 'sunset' },
  { id: 'night', code: 'N', label: '야간 근무', start: '22:00', end: '08:00', color: 'navy', icon: 'moon' },
  { id: 'off', code: 'OFF', label: '휴무', start: '', end: '', color: 'lavender', icon: 'calendar' },
]

const FamilyProfilesContext = createContext(null)
const useFamilyProfiles = () => useContext(FamilyProfilesContext)

const memberForId = (memberId, profiles = []) => {
  if (memberId === ANNIVERSARY_MEMBER.id) return ANNIVERSARY_MEMBER
  if (memberId === HOLIDAY_MEMBER.id) return HOLIDAY_MEMBER
  if (memberId === FAMILY_MEMBER.id) return FAMILY_MEMBER
  return profiles.find((member) => member.id === memberId) || FAMILY_MEMBER
}

const DATA_RECOVERY_VERSION = 2
const RECOVERED_SHIFTS = []
const RECOVERED_ANNIVERSARIES = []

const defaultEvents = []
const defaultChildSchedules = []
const defaultSchedulePeriods = []
const defaultAnniversaries = []
const defaultTasks = []
const defaultShifts = []
const defaultScheduleExceptions = []
const emptyChildProfile = (member) => ({
  member,
  school: '',
  grade: '',
  classNumber: '',
  studentNumber: '',
  teacherName: '',
  teacherPhone: '',
})

const LEGACY_EVENT_IDS = new Set([1, 4, 6, 7])
const LEGACY_TASK_IDS = new Set([1, 2, 3, 4, 5, 6, 7])
const LEGACY_CHILD_SCHEDULE_IDS = new Set([
  'leo-term-soccer', 'leo-term-piano', 'mia-term-art', 'leo-vacation-swim', 'mia-vacation-art',
])
const LEGACY_PERIOD_IDS = new Set(['term-first-2026', 'vacation-summer-2026', 'term-second-2026'])

const SHIFT_ICONS = { sun: Sun, sunset: Sunset, moon: Moon, calendar: CalendarDays }
const LEGACY_SHIFT_ICON_NAMES = {
  day: 'sun',
  evening: 'sunset',
  night: 'moon',
  off: 'calendar',
  D: 'sun',
  E: 'sunset',
  N: 'moon',
  OFF: 'calendar',
}
const shiftIconNameFor = (shift) => (
  SHIFT_ICONS[shift.icon]
    ? shift.icon
    : LEGACY_SHIFT_ICON_NAMES[shift.id] || LEGACY_SHIFT_ICON_NAMES[String(shift.code || '').toUpperCase()] || 'calendar'
)
const buildShiftOptions = (shiftTypes) => shiftTypes.map((shift) => ({
  ...shift,
  shortLabel: shift.code,
  time: shift.start && shift.end ? `${formatDisplayTime(shift.start)} – ${formatDisplayTime(shift.end)}` : '근무 없음',
  endLabel: shift.end ? `${formatDisplayTime(shift.end)} 종료` : '오늘은 휴무입니다',
  icon: SHIFT_ICONS[shiftIconNameFor(shift)],
}))

const shiftEntryFor = (shifts, dateValue, memberId) => {
  const dateKey = typeof dateValue === 'string' ? dateValue : iso(dateValue)
  for (let index = shifts.length - 1; index >= 0; index -= 1) {
    const shift = shifts[index]
    if (shift.date === dateKey && shift.member === memberId) return shift
  }
  return undefined
}

const uniqueLatestShifts = (shifts) => {
  const latest = new Map()
  shifts.forEach((shift) => latest.set(`${shift.member}-${shift.date}`, shift))
  return [...latest.values()]
}

const LEGACY_STORAGE_KEYS = [
  'family-scheduler-events', 'family-scheduler-tasks', 'family-scheduler-shifts',
  'family-scheduler-child-schedules-v1', 'family-scheduler-child-profiles-v1',
  'family-scheduler-periods-v1', 'family-scheduler-anniversaries-v1',
]

const defaultWorkSettingsFor = (profiles, shifts = []) => {
  const profileIds = new Set(profiles.map((profile) => profile.id))
  const shiftMemberIds = [...new Set(shifts.map((shift) => shift.member).filter((id) => profileIds.has(id)))]
  const workerIds = shiftMemberIds.length ? shiftMemberIds : profileIds.has('emma') ? ['emma'] : []
  return { enabled: workerIds.length > 0, workerIds, shiftTypes: DEFAULT_SHIFT_TYPES }
}

const createId = (prefix) => (
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
)

const upgradeSharedState = (state) => {
  if (!state || typeof state !== 'object') return state
  const needsRecovery = Number(state.recoveryVersion || 0) < DATA_RECOVERY_VERSION
  const needsProfiles = Number(state.schemaVersion || 0) < 5 || !Array.isArray(state.profiles)
  const needsCalendarScopes = Number(state.schemaVersion || 0) < 6
  const needsMemberColors = Number(state.schemaVersion || 0) < 7
  if (!needsRecovery && !needsProfiles && !needsCalendarScopes && !needsMemberColors) return state
  const hasLegacyData = ['events', 'tasks', 'shifts', 'childSchedules', 'childProfiles', 'schedulePeriods', 'anniversaries']
    .some((key) => Array.isArray(state[key]) && state[key].length > 0)
  const sourceProfiles = Array.isArray(state.profiles) ? state.profiles : hasLegacyData ? LEGACY_PROFILES : []
  const profiles = needsMemberColors ? migrateMemberProfiles(sourceProfiles) : sourceProfiles
  return {
    ...state,
    schemaVersion: 7,
    recoveryVersion: DATA_RECOVERY_VERSION,
    profiles,
    workSettings: state.workSettings || defaultWorkSettingsFor(profiles, state.shifts),
    profileLinks: state.profileLinks && typeof state.profileLinks === 'object' ? state.profileLinks : {},
    events: normalizeEventCalendarScopes(Array.isArray(state.events) ? state.events : [], profiles),
    shifts: mergeUnique(Array.isArray(state.shifts) ? state.shifts : [], RECOVERED_SHIFTS, (item) => `${item.member}-${item.date}`),
    anniversaries: mergeUnique(Array.isArray(state.anniversaries) ? state.anniversaries : [], RECOVERED_ANNIVERSARIES, (item) => `${item.name}-${item.kind}-${item.calendarType}-${item.month}-${item.day}`),
  }
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

const nextAnniversaryOccurrence = (anniversary, from = startOfToday()) => {
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
    anniversaryCalendarType: anniversary.calendarType,
    anniversaryLeapMonth: Boolean(anniversary.leapMonth),
    anniversaryMonth: Number(anniversary.month),
    anniversaryDay: Number(anniversary.day),
    anniversaryOccurrenceLabel: formatSolarDate(matched),
  }]
})

const activePeriodForDate = (date, periods, member) => {
  const dateValue = iso(date)
  return periods
    .filter((period) => period.start <= dateValue && dateValue <= period.end)
    .filter((period) => !member || !period.member || period.member === 'all' || period.member === member)
    .sort((a, b) => b.start.localeCompare(a.start) || Number(b.member === member) - Number(a.member === member))[0]
}

const activeSeasonForDate = (date, periods, member) => activePeriodForDate(date, periods, member)?.season

const scheduleWeekdays = (schedule) => {
  const values = Array.isArray(schedule.weekdays) ? schedule.weekdays : [schedule.weekday]
  return [...new Set(values.map(Number).filter((day) => day >= 0 && day <= 6))].sort((a, b) => a - b)
}

const formatScheduleWeekdays = (schedule) => {
  const weekdays = scheduleWeekdays(schedule)
  return weekdays.length === 1 ? WEEKDAYS[weekdays[0]] : weekdays.map((day) => WEEKDAY_SHORT[day]).join('·')
}

const formatRecurrenceLabel = (item) => {
  const recurrence = item?.recurrence
  if (!recurrence || recurrence.frequency === 'none') return ''
  const interval = Math.max(1, Number(recurrence.interval) || 1)
  const sourceDate = item.date || item.dueDate
  const date = sourceDate ? new Date(`${sourceDate}T00:00:00`) : null
  if (recurrence.frequency === 'daily') return interval === 1 ? '매일' : `${interval}일마다`
  if (recurrence.frequency === 'weekly') {
    const weekday = date ? WEEKDAYS[date.getDay()] : '매주'
    return interval === 1 ? `매주 ${weekday}` : `${interval}주마다 ${weekday}`
  }
  if (recurrence.frequency === 'monthly') return date ? (interval === 1 ? `매월 ${date.getDate()}일` : `${interval}개월마다 ${date.getDate()}일`) : '매월'
  if (recurrence.frequency === 'yearly') return date ? (interval === 1 ? `매년 ${date.getMonth() + 1}월 ${date.getDate()}일` : `${interval}년마다 ${date.getMonth() + 1}월 ${date.getDate()}일`) : '매년'
  return ''
}

const parseTime = (value, fallback = '오전 9:00') => {
  const normalized = value === '자정' ? '오전 12:00' : value === '정오' ? '오후 12:00' : value
  const match = /^(오전|오후)\s+(\d{1,2}):(\d{2})$/.exec(normalized || '')
  if (match) return { meridiem: match[1], hour: Number(match[2]), minute: match[3] }
  const twentyFourHour = /^(\d{1,2}):(\d{2})$/.exec(normalized || '')
  if (twentyFourHour) {
    const hour = Number(twentyFourHour[1])
    if (hour >= 0 && hour < 24) return { meridiem: hour < 12 ? '오전' : '오후', hour: hour % 12 || 12, minute: twentyFourHour[2] }
  }
  if (value === fallback) return { meridiem: '오전', hour: 9, minute: '00' }
  return parseTime(fallback, fallback)
}

const formatDisplayTime = (value) => {
  if (!value) return ''
  if (value === '종일') return value
  const parsed = parseTime(value)
  return `${parsed.meridiem} ${parsed.hour}:${parsed.minute}`
}

const assignedMemberIds = (item, pluralKey = 'members', singularKey = 'member') => {
  const plural = Array.isArray(item?.[pluralKey]) ? item[pluralKey].filter(Boolean) : []
  return plural.length ? [...new Set(plural)] : item?.[singularKey] ? [item[singularKey]] : [FAMILY_MEMBER.id]
}

const eventCalendarScope = (event) => event?.calendarScope === 'children' || event?.type === 'child' ? 'children' : 'family'
const isChildCalendarEvent = (event) => event?.type === 'school' || eventCalendarScope(event) === 'children'
const childScheduleKind = (event) => {
  if (event?.kind === '학교' || event?.kind === '학원') return event.kind
  if (event?.location?.includes('학교')) return '학교'
  if (event?.location?.includes('학원')) return '학원'
  return '자녀'
}

const normalizeEventCalendarScopes = (events, profiles = []) => {
  const childIds = new Set(profiles.filter((profile) => profile.type === 'child').map((profile) => profile.id))
  return events.map((event) => {
    if (event.calendarScope === 'family' || event.calendarScope === 'children') return event
    const memberIds = assignedMemberIds(event)
    const belongsToChildren = childIds.size > 0 && memberIds.length > 0 && memberIds.every((memberId) => childIds.has(memberId))
    return { ...event, calendarScope: belongsToChildren ? 'children' : 'family' }
  })
}

const childEventsForDate = (date, childSchedules, schedulePeriods, scheduleExceptions = []) => {
  const dateValue = iso(date)
  if (holidaysForYear(date.getFullYear()).has(dateValue)) return []
  return childSchedules
    .filter((schedule) => schedule.season === activeSeasonForDate(date, schedulePeriods, schedule.member) && scheduleWeekdays(schedule).includes(date.getDay()))
    .filter((schedule) => !scheduleExceptions.some((exception) => exception.scheduleId === schedule.id && exception.date === dateValue && exception.type === 'skip'))
    .map((schedule) => ({
      ...schedule,
      location: '',
      pickupBy: '',
      id: `recurring-${schedule.id}-${dateValue}`,
      scheduleId: schedule.id,
      date: dateValue,
      type: 'school',
      recurring: true,
      recurrenceType: 'child',
    }))
}

const eventsForDate = (date, events, childSchedules, schedulePeriods, anniversaries = [], scheduleExceptions = []) => {
  const dateValue = iso(date)
  const familyEvents = events.flatMap((event) => {
    if (hasRecurrence(event)) {
      const occurrence = recurringEventForDate(event, date, scheduleExceptions)
      return occurrence ? [occurrence] : []
    }
    return event.date <= dateValue && dateValue <= (event.endDate || event.date) ? [event] : []
  })
  const merged = [
    ...familyEvents,
    ...childEventsForDate(date, childSchedules, schedulePeriods, scheduleExceptions),
    ...anniversaryEventsForDate(date, anniversaries),
    ...holidayEventsForDate(date),
  ]
  const seen = new Set()
  return merged.filter((event) => {
    const key = `${event.id}-${event.member}-${event.title}-${event.date}-${event.time}`
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

const formatTimelineRange = (start, end, crossesMidnight = false) => {
  if (!start) return ''
  if (!end) return start
  const startTime = parseTime(start)
  const endTime = parseTime(end)
  const sameMeridiem = startTime.meridiem === endTime.meridiem && !crossesMidnight
  const endLabel = sameMeridiem ? `${endTime.hour}:${endTime.minute}` : `${crossesMidnight ? '익일 ' : ''}${end}`
  return `${start} ~ ${endLabel}`
}

const timelineStateForEvent = (event, currentTime) => {
  if (!event?.time || event.time === '종일') return 'all-day'
  const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()
  const startMinutes = timeToMinutes(event.time)
  if (event.carryoverFromPreviousDay) {
    return nowMinutes < timeToMinutes(event.end) ? 'active' : 'past'
  }
  if (!event.end) return nowMinutes > startMinutes ? 'past' : nowMinutes === startMinutes ? 'active' : 'upcoming'

  const endMinutes = timeToMinutes(event.end)
  if (endMinutes > startMinutes) {
    if (nowMinutes < startMinutes) return 'upcoming'
    if (nowMinutes < endMinutes) return 'active'
    return 'past'
  }

  return nowMinutes >= startMinutes ? 'active' : 'upcoming'
}

const sortChildEventsByMemberAndTime = (events, children) => {
  const memberOrder = new Map(children.map((child, index) => [child.id, index]))
  const childIndexFor = (event) => {
    const indices = assignedMemberIds(event)
      .map((memberId) => memberOrder.get(memberId))
      .filter((index) => index !== undefined)
    return indices.length ? Math.min(...indices) : children.length
  }
  const startMinutesFor = (event) => event.time && event.time !== '종일' ? timeToMinutes(event.time) : -1

  return [...events].sort((first, second) => childIndexFor(first) - childIndexFor(second)
    || startMinutesFor(first) - startMinutesFor(second)
    || first.title.localeCompare(second.title, 'ko'))
}

const overlappingEventIds = (events, requireSharedMember = true) => {
  const conflicts = new Set()
  events.forEach((event, index) => {
    events.slice(index + 1).forEach((candidate) => {
      const eventMembers = new Set(assignedMemberIds(event))
      const sharesMember = assignedMemberIds(candidate).some((memberId) => eventMembers.has(memberId))
      if ((requireSharedMember && !sharesMember) || !event.end || !candidate.end) return
      if (timeToMinutes(event.time) < timeToMinutes(candidate.end) && timeToMinutes(candidate.time) < timeToMinutes(event.end)) {
        conflicts.add(event.id)
        conflicts.add(candidate.id)
      }
    })
  })
  return conflicts
}

const overlappingEventCount = (events, requireSharedMember = true) => events.reduce((count, event, index) => count + events.slice(index + 1).filter((candidate) => {
  const eventMembers = new Set(assignedMemberIds(event))
  const sharesMember = assignedMemberIds(candidate).some((memberId) => eventMembers.has(memberId))
  return (!requireSharedMember || sharesMember) && event.end && candidate.end
    && timeToMinutes(event.time) < timeToMinutes(candidate.end)
    && timeToMinutes(candidate.time) < timeToMinutes(event.end)
}).length, 0)

function Avatar({ memberId }) {
  const { profiles } = useFamilyProfiles()
  const member = memberForId(memberId, profiles)
  return (
    <span className="avatar" style={{ '--member': member.color, '--member-tone': member.tone }} title={member.name}>
      {member.initials}
    </span>
  )
}

function AvatarGroup({ memberIds }) {
  const uniqueIds = [...new Set(memberIds?.length ? memberIds : [FAMILY_MEMBER.id])]
  return <span className="avatar-group" aria-label={`${uniqueIds.length}명 담당`}>
    {uniqueIds.slice(0, 3).map((memberId) => <Avatar key={memberId} memberId={memberId} />)}
    {uniqueIds.length > 3 && <span className="avatar avatar-more">+{uniqueIds.length - 3}</span>}
  </span>
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
  { id: 'settings', label: '설정', icon: Cog },
]

const CALENDAR_MODES = {
  all: '전체',
  family: '가족',
  work: '근무',
  children: '자녀',
}

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

function Header({ active, onChange, focusMode, onToggleFocus, onOpenSearch }) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <button className="brand" onClick={() => onChange('home')} aria-label="홈으로 이동">
          <BrandMark />
          <span>Family Scheduler</span>
        </button>
        <Navigation active={active} onChange={onChange} />
        <div className="header-actions">
          <button className="icon-button search-button" onClick={onOpenSearch} aria-label="통합 검색 열기" title="일정 통합 검색"><Search size={21} /></button>
          <button className={`icon-button ${focusMode ? 'selected' : ''}`} onClick={onToggleFocus} aria-label={focusMode ? '집중 모드 끄기' : '집중 모드 켜기'} aria-pressed={focusMode} title={focusMode ? '집중 모드 끄기' : '오늘 일정에 집중하기'}>
            <Focus size={21} />
          </button>
        </div>
      </div>
    </header>
  )
}

function SearchPanel({ open, onClose, today, events, childSchedules, schedulePeriods, anniversaries, scheduleExceptions, onSelect }) {
  const dialogRef = useModalAccessibility(open, onClose)
  const { profiles } = useFamilyProfiles()
  const defaultFrom = iso(addDays(today, -365))
  const defaultTo = iso(addDays(today, 365))
  const [query, setQuery] = useState('')
  const [fromDate, setFromDate] = useState(defaultFrom)
  const [toDate, setToDate] = useState(defaultTo)
  const debouncedQuery = useDebouncedValue(query, 300)

  const results = useMemo(() => {
    if (!open || !fromDate || !toDate || fromDate > toDate) return []
    const needle = debouncedQuery.trim().toLocaleLowerCase('ko-KR')
    const start = new Date(`${fromDate}T00:00:00`)
    const end = new Date(`${toDate}T00:00:00`)
    const cappedEnd = new Date(Math.min(end.getTime(), addDays(start, 1095).getTime()))
    const matches = new Map()
    const addMatch = (event) => {
      const member = memberForId(event.member, profiles)
      const searchable = [event.title, member.name, event.location, event.date, event.time].filter(Boolean).join(' ').toLocaleLowerCase('ko-KR')
      if (!needle || searchable.includes(needle)) matches.set(`${event.id}-${event.date}`, { ...event, memberName: member.name })
    }
    events
      .filter((event) => !hasRecurrence(event) && event.date <= toDate && (event.endDate || event.date) >= fromDate)
      .forEach(addMatch)
    for (let cursor = start; cursor <= cappedEnd; cursor = addDays(cursor, 1)) {
      eventsForDate(cursor, events, childSchedules, schedulePeriods, anniversaries, scheduleExceptions)
        .filter((event) => event.recurring || event.anniversary || event.holiday)
        .forEach(addMatch)
      if (matches.size >= 200) break
    }
    return [...matches.values()].sort((first, second) => `${first.date} ${first.time}`.localeCompare(`${second.date} ${second.time}`)).slice(0, 100)
  }, [anniversaries, childSchedules, debouncedQuery, events, fromDate, open, profiles, scheduleExceptions, schedulePeriods, toDate])

  if (!open) return null
  return (
    <div className="modal-backdrop search-backdrop" role="presentation" onMouseDown={(click) => click.target === click.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex="-1" className="modal search-panel" role="dialog" aria-modal="true" aria-labelledby="search-title">
        <div className="modal-heading"><div><span className="eyebrow">가족 일정 전체에서 찾기</span><h2 id="search-title">통합 검색</h2></div><button className="icon-button" onClick={onClose} aria-label="검색 닫기"><X /></button></div>
        <label className="search-query"><Search /><input autoFocus value={query} onChange={(change) => setQuery(change.target.value)} placeholder="일정명, 가족 구성원, 장소 검색" /></label>
        <div className="search-date-range"><label>시작일<input type="date" value={fromDate} onChange={(change) => setFromDate(change.target.value)} /></label><span>~</span><label>종료일<input type="date" value={toDate} onChange={(change) => setToDate(change.target.value)} /></label></div>
        <div className="search-result-heading"><strong>{query.trim() ? `검색 결과 ${results.length}개` : `기간 내 일정 ${results.length}개`}</strong><small>최대 100개 표시</small></div>
        <div className="search-results">
          {results.map((event) => <button key={`${event.id}-${event.date}`} onClick={() => onSelect(event)}><AvatarGroup memberIds={assignedMemberIds(event)} /><span><strong>{event.title}</strong><small>{event.date} · {event.time || '종일'} · {event.memberName}{event.location ? ` · ${event.location}` : ''}</small></span><ChevronRight /></button>)}
          {!results.length && <div className="empty-state"><Search /><strong>찾은 일정이 없습니다</strong><span>검색어 또는 날짜 범위를 바꿔 보세요.</span></div>}
        </div>
      </section>
    </div>
  )
}

function FocusModeBanner({ shiftOption, shiftMember, eventCount, onClose }) {
  return (
    <section className="focus-mode-banner" aria-live="polite">
      <div>
        <span><Focus /> 집중 모드</span>
        <strong>오늘 필요한 내용만 보고 있어요.</strong>
        <small>{shiftMember ? (shiftOption ? `${shiftMember.name} ${shiftOption.code} · ${shiftOption.label}` : `${shiftMember.name} 근무 미입력`) : '근무표 미사용'} · 오늘 일정 {eventCount}개</small>
      </div>
      <button onClick={onClose}><X /> 집중 모드 종료</button>
    </section>
  )
}

function MemberLegend() {
  const { activeProfiles } = useFamilyProfiles()
  return (
    <div className="member-legend">
      {[FAMILY_MEMBER, ...activeProfiles, ANNIVERSARY_MEMBER, HOLIDAY_MEMBER].map((member) => (
        <span key={member.id}><i style={{ background: member.color }} />{member.name}</span>
      ))}
    </div>
  )
}

function EventCard({ event, compact = false, calendarSummary = false, showRecurrence = true, onOpen, onEdit, onDelete, onDiscuss }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const rowRef = useRef(null)
  const { profiles } = useFamilyProfiles()
  const member = memberForId(event.member, profiles)
  const eventMembers = assignedMemberIds(event)
  const hasActions = Boolean(onEdit || onDelete)
  const hasInteraction = Boolean(onOpen || hasActions)
  const timeLabel = event.displayTime || (event.end && event.time && event.time !== '종일'
    ? formatTimelineRange(event.time, event.end, Boolean(event.homeShift && timeToMinutes(event.end) <= timeToMinutes(event.time)))
    : event.time || '종일')
  void onDiscuss
  const detail = [event.location, event.milestoneLabel, event.pickupBy ? `${profiles.find((person) => person.id === event.pickupBy)?.name || '가족'} 픽업` : ''].filter(Boolean).join(' · ')
  const category = event.homeCategory
    ? (event.homeCategoryId === 'children' ? childScheduleKind(event) : !detail ? event.homeCategory : '')
    : (event.anniversary ? '기념일' : isChildCalendarEvent(event) ? childScheduleKind(event) : '가족')
  const recurrenceLabel = event.recurrenceType === 'child' ? formatScheduleWeekdays(event) : formatRecurrenceLabel(event)

  return <>
  <ScheduleRow
    className={`event-card ${event.homeCategory ? 'home-event-row' : ''} ${event.homeTimeline ? 'home-timeline-row' : event.homeCategory ? 'home-untimed-row' : ''} ${event.timelineState ? `timeline-${event.timelineState}` : ''} ${calendarSummary ? 'calendar-summary' : ''} ${compact ? 'compact' : ''} ${hasInteraction ? 'has-actions' : ''} ${event.conflict ? 'conflict' : ''}`}
    memberColor={member.color}
    memberTone={member.tone}
    timelineTime={event.homeTimeline ? (event.timelineTime || (event.time && event.time !== '종일' ? event.time : '')) : undefined}
    leading={<AvatarGroup memberIds={eventMembers} />}
    title={event.title}
    primaryMeta={detail}
    time={event.time === '종일' ? '' : timeLabel}
    secondaryMeta={showRecurrence ? recurrenceLabel : ''}
    status={event.timelineState === 'active' ? '진행' : ''}
    conflict={event.conflict}
    category={category}
    categoryClassName={event.homeCategory ? `home-category-chip ${event.homeCategoryId || ''}` : ''}
    onClick={onOpen || (hasActions ? () => setSheetOpen(true) : undefined)}
    ariaLabel={`${event.title}${event.timelineState === 'active' ? ', 현재 진행 중' : event.timelineState === 'past' ? ', 지난 일정' : ''}${event.conflict ? ', 시간 겹침' : ''}${hasInteraction ? ', 작업 열기' : ''}`}
    rowRef={rowRef}
  />
  <ScheduleActionSheet open={sheetOpen} title={event.title} onClose={() => setSheetOpen(false)} onEdit={onEdit} onDelete={onDelete} returnFocusRef={rowRef} confirmDelete={!event.recurring} />
  </>
}

function ManagedChildScheduleRow({ schedule, canEdit, onEdit, onDelete }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const rowRef = useRef(null)
  const { profiles } = useFamilyProfiles()
  const member = memberForId(schedule.member, profiles)
  const timeLabel = schedule.end ? `${schedule.time} ~ ${schedule.end}` : schedule.time
  const hasActions = Boolean(canEdit && (onEdit || onDelete))

  return <>
    <ScheduleRow
      className="managed-child-schedule-row"
      memberColor={member.color}
      memberTone={member.tone}
      leading={<Avatar memberId={schedule.member} />}
      title={schedule.title}
      time={timeLabel}
      secondaryMeta={formatScheduleWeekdays(schedule)}
      category={schedule.kind}
      onClick={hasActions ? () => setSheetOpen(true) : undefined}
      ariaLabel={hasActions ? `${schedule.title} 작업 열기` : undefined}
      rowRef={rowRef}
    />
    <ScheduleActionSheet
      open={sheetOpen}
      title={schedule.title}
      onClose={() => setSheetOpen(false)}
      onEdit={onEdit}
      onDelete={onDelete}
      returnFocusRef={rowRef}
    />
  </>
}

function AnniversaryDisplayRow({ event, className = '', registeredFormat = false }) {
  const occurrenceCopy = registeredFormat
    ? `${event.anniversaryMonth}월 ${event.anniversaryDay}일 · 다음 양력 ${event.anniversaryOccurrenceLabel}`
    : event.location

  return <article className={`anniversary-row ${className}`.trim()}>
    <Avatar memberId="anniversary" />
    <div className="anniversary-copy">
      <div className="anniversary-title-row">
        <div className="anniversary-title-copy">
          <strong>{event.title}</strong>
          <em>{event.anniversaryCalendarType === 'lunar' ? `음력${event.anniversaryLeapMonth ? ' 윤달' : ''}` : '양력'}</em>
        </div>
      </div>
      <small>
        <span>{occurrenceCopy}</span>
        {event.milestoneLabel && <span className="anniversary-milestone">{event.milestoneLabel}</span>}
      </small>
    </div>
  </article>
}

function CalendarAnniversarySection({ events }) {
  if (!events.length) return null

  return <section className="overview-day-section calendar-anniversary-group">
    <header><h3>기념일</h3><b>{events.length}</b></header>
    <div className="anniversary-list calendar-anniversary-list">
      {events.map((event) => <AnniversaryDisplayRow key={event.id} event={event} className="calendar-anniversary-row" registeredFormat />)}
    </div>
  </section>
}

function TodayAnniversarySection({ events }) {
  if (!events.length) return null

  return <section className="today-anniversary-section" aria-labelledby="today-anniversary-title">
    <h3 id="today-anniversary-title">기념일</h3>
    <div className="anniversary-list today-anniversary-list">
      {events.map((event) => <AnniversaryDisplayRow key={event.id} event={event} className="home-anniversary-row" />)}
    </div>
  </section>
}

function HomeView({ today, events, childSchedules, schedulePeriods, anniversaries, shifts, tasks, scheduleExceptions, openCalendar, openCalendarDate, openChildCalendarDate, openTasks, openModal, openRecurringActions, deleteEvent, canEdit, onOpenSettings, sync, onOpenFamily }) {
  const [familyNoticeDismissed, setFamilyNoticeDismissed] = useState(() => window.sessionStorage.getItem('family-scheduler-family-notice-dismissed') === '1')
  const currentTime = useCurrentTime()
  const { activeProfiles, children, shiftWorkers, shiftOptions, workSettings } = useFamilyProfiles()
  const rawTodayEvents = eventsForDate(today, events, childSchedules, schedulePeriods, anniversaries, scheduleExceptions)
  const conflicts = overlappingEventIds(rawTodayEvents)
  const todayEvents = rawTodayEvents.map((event) => ({ ...event, conflict: conflicts.has(event.id) }))
  const childIds = new Set(children.map((child) => child.id))
  const childEvents = sortChildEventsByMemberAndTime(todayEvents
    .filter((event) => isChildCalendarEvent(event) && assignedMemberIds(event).some((memberId) => childIds.has(memberId))), children)
  const childEventIds = new Set(childEvents.map((event) => event.id))
  const todayAnniversaryEvents = todayEvents.filter((event) => event.anniversary)
  const generalTodayEvents = todayEvents.filter((event) => !childEventIds.has(event.id) && !event.anniversary)
  const todayTasks = tasks.flatMap((task) => {
    if (hasRecurrence(task)) {
      return recurringTaskOccursOn(task, today) && !task.completedDates?.includes(iso(today))
        ? [recurringTaskOccurrence(task, today)]
        : []
    }
    const taskDate = task.dueDate || task.startDate || task.createdDate
    return !task.done && taskDate && taskDate <= iso(today) ? [task] : []
  })
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index)
    const dateKey = iso(date)
    const dayEvents = eventsForDate(date, events, childSchedules, schedulePeriods, anniversaries, scheduleExceptions)
    const dayWorkerShifts = workSettings.enabled ? shiftWorkers.flatMap((worker) => {
      const shift = shiftEntryFor(shifts, date, worker.id)
      const option = shiftOptions.find((item) => item.id === shift?.shift)
      return option ? [{ worker, option }] : []
    }) : []
    return {
      date,
      generalEvents: dayEvents.filter((event) => !isChildCalendarEvent(event)),
      childEvents: dayEvents.filter((event) => isChildCalendarEvent(event)),
      workerShifts: dayWorkerShifts,
      taskCount: tasks.filter((task) => hasRecurrence(task)
        ? recurringTaskOccursOn(task, date) && !task.skippedDates?.includes(dateKey)
        : taskDisplayDate(task) === dateKey).length,
    }
  })
  const todayWorkerShifts = workSettings.enabled ? shiftWorkers.map((worker) => {
    const shift = shiftEntryFor(shifts, today, worker.id)
    return { worker, option: shiftOptions.find((option) => option.id === shift?.shift) }
  }) : []
  const previousDate = addDays(today, -1)
  const previousOvernightShifts = workSettings.enabled ? shiftWorkers.flatMap((worker) => {
    const shift = shiftEntryFor(shifts, previousDate, worker.id)
    const option = shiftOptions.find((item) => item.id === shift?.shift)
    if (!option?.start || !option?.end || timeToMinutes(formatDisplayTime(option.end)) > timeToMinutes(formatDisplayTime(option.start))) return []
    return [{ worker, option }]
  }) : []
  const todayShiftEvents = [...previousOvernightShifts.map(({ worker, option }) => ({
    id: `home-shift-carryover-${worker.id}-${iso(previousDate)}`,
    title: option.code,
    date: iso(today),
    time: formatDisplayTime(option.end),
    timelineTime: formatDisplayTime(option.end),
    end: formatDisplayTime(option.end),
    displayTime: formatTimelineRange(formatDisplayTime(option.start), formatDisplayTime(option.end), true),
    member: worker.id,
    members: [worker.id],
    homeShift: true,
    carryoverFromPreviousDay: true,
    homeCategory: '근무',
    homeCategoryId: 'work',
  })), ...todayWorkerShifts
    .filter(({ option }) => option && option.code !== 'OFF')
    .map(({ worker, option }) => ({
      id: `home-shift-${worker.id}-${iso(today)}`,
      title: option.code,
      date: iso(today),
      time: option.start ? formatDisplayTime(option.start) : '',
      end: option.end ? formatDisplayTime(option.end) : '',
      member: worker.id,
      members: [worker.id],
      homeShift: true,
      homeCategory: '근무',
      homeCategoryId: 'work',
    }))]
  const primaryTodayShift = todayWorkerShifts.find(({ option }) => option)?.option
  const TodayShiftIcon = primaryTodayShift?.icon || CalendarDays
  const todayTaskEvents = todayTasks.map((task) => ({
    id: `home-task-${task.id}`,
    sourceTaskId: task.id,
    title: task.title,
    date: taskDisplayDate(task),
    time: task.time || '종일',
    end: task.end || '',
    member: task.assignee || 'family',
    members: assignedMemberIds(task, 'assignees', 'assignee'),
    homeTask: true,
    homeCategory: '할 일',
    homeCategoryId: 'tasks',
  }))
  const todayHomeEvents = [...todayShiftEvents.filter((event) => event.time), ...[...generalTodayEvents, ...childEvents].map((event) => ({
    ...event,
    homeCategory: event.holiday ? '공휴일' : isChildCalendarEvent(event) ? '자녀' : '가족',
    homeCategoryId: event.holiday ? 'holiday' : isChildCalendarEvent(event) ? 'children' : 'family',
  })), ...todayTaskEvents]
    .map((event) => ({ ...event, timelineState: timelineStateForEvent(event, currentTime) }))
  const todayTimelineEvents = todayHomeEvents
    .filter((event) => event.time && event.time !== '종일')
    .map((event) => ({ ...event, homeTimeline: true }))
    .sort((first, second) => {
      return timeToMinutes(first.time) - timeToMinutes(second.time) || first.title.localeCompare(second.title, 'ko')
    })
  const todayUntimedEvents = todayHomeEvents
    .filter((event) => !event.time || event.time === '종일')
    .map((event) => ({ ...event, homeTimeline: false }))
  const todayRegularEventCount = todayTimelineEvents.length + todayUntimedEvents.length
  const todayEventCount = todayRegularEventCount + todayAnniversaryEvents.length
  const todayVisibleLimit = 10
  const visibleTodayTimelineEvents = todayTimelineEvents.slice(0, todayVisibleLimit)
  const visibleTodayUntimedEvents = todayUntimedEvents.slice(0, Math.max(0, todayVisibleLimit - visibleTodayTimelineEvents.length))
  const nowMarkerIndex = visibleTodayTimelineEvents.findIndex((event) => event.timelineState === 'upcoming')
  const resolvedNowMarkerIndex = nowMarkerIndex < 0 ? visibleTodayTimelineEvents.length : nowMarkerIndex
  const currentTimeLabel = currentTime.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true })

  return (
    <div className="page home-page">
      {!sync.family && !familyNoticeDismissed && <section className="family-connect-banner card" aria-label="가족 연결 안내">
        <Cloud />
        <div><strong>가족 연결 안 됨</strong><span>현재 일정은 이 기기에만 저장됩니다.</span></div>
        <button className="secondary-button" onClick={onOpenFamily}>가족 연결</button>
        <button className="icon-button" aria-label="가족 연결 안내 닫기" onClick={() => {
          window.sessionStorage.setItem('family-scheduler-family-notice-dismissed', '1')
          setFamilyNoticeDismissed(true)
        }}><X /></button>
      </section>}

      <section className={`today-card card ${todayEventCount ? '' : 'is-empty'}`} id="today-schedule">
        <div className="section-heading">
          <div><h2>{today.getMonth() + 1}월 {today.getDate()}일({WEEKDAY_SHORT[today.getDay()]}) 일정</h2></div>
          <button className="text-button" onClick={openCalendar}>캘린더 <ChevronRight size={16} /></button>
        </div>
        {visibleTodayTimelineEvents.length > 0 && <div className={`timeline timeline-count-${Math.min(todayTimelineEvents.length, 3)}`}>
          {visibleTodayTimelineEvents.map((event, index) => <Fragment key={event.id}>
            {index === resolvedNowMarkerIndex && <div className="timeline-now-marker" aria-label={`현재 시각 ${currentTimeLabel}`}><time className="timeline-now-time">{currentTimeLabel}</time><span className="timeline-now-dot" aria-hidden="true" /><i /></div>}
            <EventCard
              event={event}
              showRecurrence={false}
              onOpen={event.homeShift ? () => openCalendarDate(today, 'work') : event.homeTask ? openTasks : undefined}
              onEdit={canEdit && !event.homeShift && !event.holiday && !event.anniversary ? (event.recurring ? () => openRecurringActions(event) : () => openModal('event', event.date, event)) : undefined}
              onDelete={canEdit && !event.homeShift && !event.holiday && !event.anniversary ? (event.recurring ? () => openRecurringActions(event) : () => deleteEvent(event.id)) : undefined}
            />
          </Fragment>)}
          {visibleTodayTimelineEvents.length > 0 && resolvedNowMarkerIndex === visibleTodayTimelineEvents.length && <div className="timeline-now-marker" aria-label={`현재 시각 ${currentTimeLabel}`}><time className="timeline-now-time">{currentTimeLabel}</time><span className="timeline-now-dot" aria-hidden="true" /><i /></div>}
        </div>}
        {!todayEventCount && <p className="empty-copy">비어 있는 하루예요. 일정을 추가해 보세요.</p>}
        <TodayAnniversarySection events={todayAnniversaryEvents} />
        {visibleTodayUntimedEvents.length > 0 && <section className="today-untimed-section" aria-labelledby="today-untimed-title">
          <h3 id="today-untimed-title">시간 미정</h3>
          <div className="today-untimed-list">
            {visibleTodayUntimedEvents.map((event) => <EventCard
              key={event.id}
              event={event}
              showRecurrence={false}
              onOpen={event.homeTask ? openTasks : undefined}
              onEdit={canEdit && !event.homeTask && !event.holiday && !event.anniversary ? (event.recurring ? () => openRecurringActions(event) : () => openModal('event', event.date, event)) : undefined}
              onDelete={canEdit && !event.homeTask && !event.holiday && !event.anniversary ? (event.recurring ? () => openRecurringActions(event) : () => deleteEvent(event.id)) : undefined}
            />)}
          </div>
        </section>}
        {todayRegularEventCount > todayVisibleLimit && <button className="more-events-button" onClick={openCalendar}>+{todayRegularEventCount - todayVisibleLimit}개 일정 더보기</button>}
        <nav className="today-summary-bar" aria-label="오늘 일정 요약">
          <button className={`work ${primaryTodayShift?.color || 'is-empty'}`} type="button" aria-label={primaryTodayShift ? `근무 ${primaryTodayShift.code}` : '근무 미입력'} onClick={() => openCalendarDate(today, 'work')}><TodayShiftIcon aria-hidden="true" /><b>{primaryTodayShift?.code || 0}</b>{todayShiftEvents.length > 1 && <small>+{todayShiftEvents.length - 1}</small>}</button>
          <button className="family" type="button" aria-label={`가족 일정 ${generalTodayEvents.length}개`} onClick={() => openCalendarDate(today, 'family')}><Home aria-hidden="true" /><b>{generalTodayEvents.length}</b></button>
          <button className="children" type="button" aria-label={`자녀 일정 ${childEvents.length}개`} onClick={() => openChildCalendarDate(today)}><GraduationCap aria-hidden="true" /><b>{childEvents.length}</b></button>
          <button className="tasks" type="button" aria-label={`오늘 할 일 ${todayTasks.length}개`} onClick={openTasks}><CheckSquare aria-hidden="true" /><b>{todayTasks.length}</b></button>
        </nav>
      </section>

      <section className="week-strip-card card" aria-labelledby="week-strip-title">
        <div className="section-heading">
          <div><h2 id="week-strip-title">다가오는 7일</h2></div>
        </div>
        <div className="home-week-strip">
          {weekDays.map(({ date, generalEvents: dayGeneralEvents, childEvents: dayChildEvents, workerShifts: dayWorkerShifts, taskCount }) => {
            const isToday = iso(date) === iso(today)
            const openDay = () => openCalendarDate(date, 'all')
            const dayHolidays = dayGeneralEvents.filter((event) => event.holiday)
            const familyCount = dayGeneralEvents.length - dayHolidays.length
            const childCount = dayChildEvents.length
            const conflictCount = overlappingEventCount([...dayGeneralEvents.filter((event) => !event.holiday), ...dayChildEvents])
            const weekdayClass = date.getDay() === 0 ? 'sunday' : date.getDay() === 6 ? 'saturday' : ''
            const visibleShifts = dayWorkerShifts
            const primaryShift = visibleShifts[0]
            const ShiftIcon = primaryShift?.option.icon || null
            const shiftCodes = visibleShifts.map(({ option }) => option.code).join('·')
            return <button key={iso(date)} className={`${isToday ? 'today' : ''} ${weekdayClass}`} onClick={openDay} aria-label={`${formatLongDate(date)}${shiftCodes ? `, 근무 ${shiftCodes}` : ', 근무 없음'}, 가족 일정 ${familyCount}개, 자녀 일정 ${childCount}개, 할 일 ${taskCount}개${dayHolidays.length ? `, ${dayHolidays[0].title}` : ''}${conflictCount ? `, 시간 겹침 ${conflictCount}개` : ''}`}>
              <strong className={`week-date-label ${weekdayClass}`}>{date.getDate()}<span>({WEEKDAY_SHORT[date.getDay()]})</span>{conflictCount > 0 && <i className="week-conflict-dot" title="시간 겹침" />}</strong>
              <span className="week-summary" aria-hidden="true">
                <span className={`week-summary-item work ${primaryShift ? primaryShift.option.color : 'is-empty'}`}>
                  {primaryShift && <span className="week-work-badge"><ShiftIcon /><b>{primaryShift.option.code}</b>{visibleShifts.length > 1 && <small>+{visibleShifts.length - 1}</small>}</span>}
                </span>
                <span className={`week-summary-item family ${familyCount ? '' : 'is-empty'}`}><Home /><b>{familyCount}</b></span>
                <span className={`week-summary-item children ${childCount ? '' : 'is-empty'}`}><GraduationCap /><b>{childCount}</b></span>
                <span className={`week-summary-item tasks ${taskCount ? '' : 'is-empty'}`}><CheckSquare /><b>{taskCount}</b></span>
              </span>
            </button>
          })}
        </div>
      </section>

      {!activeProfiles.length && <section className="family-setup-card card"><UserRoundCheck /><div><span className="eyebrow">처음 시작하기</span><h2>가족 구성원을 등록해 주세요</h2><p>가족 등록 후 일정·자녀·근무표를 함께 씁니다.</p></div><button className="primary-button" onClick={onOpenSettings}><Plus /> 구성원 등록</button></section>}

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

function ChildWeekView({ today, events, childSchedules, schedulePeriods, scheduleExceptions, monthDays, selectedDate, onSelectDate, detailRef, openModal, openRecurringActions, removeEvent, canEdit }) {
  const { children } = useFamilyProfiles()
  const childIds = new Set(children.map((child) => child.id))
  const directEventsForDate = (date) => eventsForDate(date, events, [], [], [], scheduleExceptions)
    .filter((event) => !event.holiday && event.type !== 'school' && eventCalendarScope(event) === 'children' && assignedMemberIds(event).some((memberId) => childIds.has(memberId)))
  const holidayNames = (holidaysForYear(selectedDate.getFullYear()).get(iso(selectedDate)) || []).map((holiday) => holiday.name)
  const selectedDaySchedules = childEventsForDate(selectedDate, childSchedules, schedulePeriods, scheduleExceptions)
  const selectedDirectEvents = directEventsForDate(selectedDate)
    .sort((first, second) => timeToMinutes(first.time) - timeToMinutes(second.time) || first.title.localeCompare(second.title, 'ko'))
  const selectedScheduleGroups = children.map((child) => ({
    child,
    season: activeSeasonForDate(selectedDate, schedulePeriods, child.id),
    schedules: selectedDaySchedules
      .filter((schedule) => schedule.member === child.id)
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)),
  }))
  const visibleScheduleGroups = selectedScheduleGroups.filter((group) => group.schedules.length)
  const selectedSeasons = [...new Set(selectedScheduleGroups.map((group) => group.season).filter(Boolean))]
  const selectedSeasonLabel = selectedSeasons.length ? selectedSeasons.join(' · ') : '기간 미설정'

  if (!children.length) return <div className="empty-state card"><GraduationCap /><strong>등록된 자녀가 없습니다</strong><span>가족 구성원 설정에서 자녀를 추가하면 주간 생활표가 열립니다.</span></div>

  return (
    <section className="child-week-view">
      <div className="calendar-layout shift-mode child-calendar-layout">
        <div className="calendar-card child-month-calendar card">
        <div className="weekday-row">{['일', '월', '화', '수', '목', '금', '토'].map((day, index) => <span key={day} className={index === 0 ? 'sunday' : index === 6 ? 'saturday' : ''}>{day}</span>)}</div>
        <div className="calendar-grid">
          {monthDays.map(({ day, date, outside }) => {
            const dateHolidays = holidaysForYear(date.getFullYear()).get(iso(date)) || []
            const dateSchedules = outside ? [] : childEventsForDate(date, childSchedules, schedulePeriods, scheduleExceptions)
            const dateDirectEvents = outside ? [] : directEventsForDate(date)
            const childDotGroups = children.map((child) => ({
              child,
              schedules: [
                ...dateSchedules.filter((schedule) => schedule.member === child.id),
                ...dateDirectEvents.filter((event) => assignedMemberIds(event).includes(child.id)),
              ],
            }))
              .filter((group) => group.schedules.length)
            const active = iso(date) === iso(selectedDate)
            const isToday = iso(date) === iso(today)
            const weekdayClass = date.getDay() === 0 ? 'sunday' : date.getDay() === 6 ? 'saturday' : ''
            return <button
              key={iso(date)}
              type="button"
              disabled={outside}
              data-date={iso(date)}
              className={`${outside ? 'outside' : ''} ${active ? 'selected' : ''} ${isToday ? 'today' : ''} ${weekdayClass} ${dateHolidays.length ? 'holiday' : ''}`}
              aria-pressed={active}
              aria-label={`${formatLongDate(date)}${childDotGroups.length ? `, ${childDotGroups.map(({ child, schedules }) => `${child.name} 일정 ${schedules.length}개`).join(', ')}` : ''}`}
              onClick={() => onSelectDate(date)}
            >
              <div className="calendar-cell-slots">
                <span className="calendar-cell-top"><span className="calendar-day-number">{day}</span></span>
                <small className={`calendar-cell-holiday calendar-holiday-name ${dateHolidays.length ? '' : 'is-empty'}`}>{dateHolidays[0]?.name || '공휴일 없음'}</small>
                <div className="calendar-cell-mode-content child-calendar-counts" aria-hidden="true">
                  {childDotGroups.slice(0, 2).map(({ child, schedules }) => <span className="child-calendar-count" key={child.id} style={{ '--child': child.color, '--child-tone': child.tone }}>
                    <i>{child.initials}</i><b>{schedules.length}</b>
                  </span>)}
                </div>
              </div>
            </button>
          })}
        </div>
        </div>

        <article ref={detailRef} className="child-day-card card">
          <div className="child-day-heading">
            <div><h2>{formatLongDate(selectedDate)}</h2></div>
            <div className="child-day-actions">
              <span className={`season-badge ${selectedSeasons.length === 1 && selectedSeasons[0] === '방학' ? 'vacation' : ''}`}>{selectedSeasonLabel}</span>
              {canEdit && <button className="small-add" aria-label="일정 추가" onClick={() => openModal('event', iso(selectedDate), undefined, { member: children[0].id, members: [children[0].id], calendarScope: 'children' })}><Plus size={18} /> 추가</button>}
            </div>
          </div>

          {holidayNames.length > 0 && <div className="holiday-empty-state"><CalendarDays /><div><strong>{holidayNames.join(' · ')}</strong><span>공휴일에는 학교·학원 반복 일정이 표시되지 않습니다.</span></div></div>}
          {selectedDirectEvents.length > 0 && <section className="child-direct-events"><span className="eyebrow">직접 등록 일정</span><div className="day-events">{selectedDirectEvents.map((event) => <EventCard key={event.id} event={event} compact calendarSummary onEdit={canEdit ? (event.recurring ? () => openRecurringActions(event) : () => openModal('event', event.date, event)) : undefined} onDelete={canEdit ? () => removeEvent(event) : undefined} />)}</div></section>}
          {holidayNames.length === 0 && visibleScheduleGroups.length ? <div className="child-timeline-groups">
            {visibleScheduleGroups.map(({ child, season, schedules }) => <section className="child-timeline-group" key={child.id} style={{ '--child': child.color, '--child-tone': child.tone }}>
              <header className="child-timeline-group-heading"><span><Avatar memberId={child.id} /><strong>{child.name}</strong></span><span className={`season-badge ${season === '방학' ? 'vacation' : ''}`}>{season || '기간 미설정'}</span></header>
              <div className="child-timeline">
                {schedules.map((schedule) => <article
                  className={`child-timeline-row ${canEdit ? 'interactive' : ''}`}
                  key={schedule.id}
                  role={canEdit ? 'button' : undefined}
                  tabIndex={canEdit ? 0 : undefined}
                  aria-label={canEdit ? `${child.name} ${schedule.title} 수정 및 삭제` : undefined}
                  onClick={canEdit ? () => openRecurringActions(schedule) : undefined}
                  onKeyDown={canEdit ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openRecurringActions(schedule)
                    }
                  } : undefined}
                >
                  <time>{schedule.time}</time>
                  <span className="timeline-mark" />
                  <div>
                    <div className="child-timeline-title-row">
                      <span><strong>{schedule.title}</strong><em>{schedule.kind}</em></span>
                    </div>
                    <small><Clock3 /> {schedule.time}{schedule.end ? ` ~ ${schedule.end}` : ''}</small>
                  </div>
                </article>)}
              </div>
            </section>)}
          </div> : holidayNames.length === 0 && selectedDirectEvents.length === 0 && <div className="holiday-empty-state normal"><GraduationCap /><div><strong>등록된 자녀 일정이 없습니다</strong><span>일회성·기간·반복 일정을 바로 추가할 수 있습니다.</span></div></div>}
        </article>
      </div>
    </section>
  )
}

function CalendarView({ today, events, childSchedules, schedulePeriods, anniversaries, setAnniversaries, shifts, setShifts, scheduleExceptions, openModal, deleteEvent, mode, setMode, openRecurringActions, canEdit, notifyUndo, jumpDate, onOpenCollaboration }) {
  const { profiles, children, shiftWorkers, shiftOptions, workSettings } = useFamilyProfiles()
  const initialDate = jumpDate ? new Date(`${jumpDate}T00:00:00`) : today
  const [cursor, setCursor] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1))
  const [selected, setSelected] = useState(initialDate)
  const [lastShiftChange, setLastShiftChange] = useState(null)
  const [previewShiftId, setPreviewShiftId] = useState(shiftOptions[0]?.id || '')
  const [selectedShiftMemberId, setSelectedShiftMemberId] = useState(shiftWorkers[0]?.id || '')
  const dayPanelRef = useRef(null)
  const monthDays = useMemo(() => buildCalendarDays(cursor), [cursor])
  const selectedAllEventsRaw = eventsForDate(selected, events, childSchedules, schedulePeriods, anniversaries, scheduleExceptions)
  const selectedHolidayEvents = selectedAllEventsRaw.filter((event) => event.holiday)
  const selectedAnniversaryEvents = selectedAllEventsRaw.filter((event) => event.anniversary)
  const selectedChildEventsRaw = selectedAllEventsRaw.filter((event) => !event.holiday && !event.anniversary && isChildCalendarEvent(event))
  const selectedFamilyEventsRaw = selectedAllEventsRaw.filter((event) => !event.holiday && !event.anniversary && !isChildCalendarEvent(event))
  const selectedConflicts = overlappingEventIds([...selectedFamilyEventsRaw, ...selectedChildEventsRaw])
  const withConflict = (items) => items.map((event) => ({ ...event, conflict: selectedConflicts.has(event.id) }))
  const selectedFamilyEvents = withConflict(selectedFamilyEventsRaw)
  const selectedChildEvents = sortChildEventsByMemberAndTime(withConflict(selectedChildEventsRaw), children)
  const selectedEvents = [...withConflict(selectedHolidayEvents), ...selectedFamilyEvents]
  const selectedShiftMember = shiftWorkers.find((worker) => worker.id === selectedShiftMemberId) || shiftWorkers[0]
  const currentMode = mode === 'work' && (!workSettings.enabled || !shiftWorkers.length)
    ? 'all'
    : mode === 'children' && !children.length ? 'all' : CALENDAR_MODES[mode] ? mode : 'all'
  const selectedShift = shiftEntryFor(shifts, selected, selectedShiftMember?.id)
  const previewShiftOption = shiftOptions.find((option) => option.id === (selectedShift?.shift || previewShiftId)) || shiftOptions[0]
  const PreviewShiftIcon = previewShiftOption?.icon
  const selectedWorkShifts = shiftWorkers.map((worker) => {
    const shift = shiftEntryFor(shifts, selected, worker.id)
    return { worker, shift, option: shiftOptions.find((option) => option.id === shift?.shift) }
  }).filter(({ shift }) => shift)
  const isMonthEnd = selected.getDate() === new Date(selected.getFullYear(), selected.getMonth() + 1, 0).getDate()
  const label = new Intl.DateTimeFormat('ko-KR', { month: 'long', year: 'numeric' }).format(cursor)
  const cursorMonthShifts = uniqueLatestShifts(shifts).filter((shift) => {
    const date = new Date(`${shift.date}T00:00:00`)
    return shift.member === selectedShiftMember?.id && date.getFullYear() === cursor.getFullYear() && date.getMonth() === cursor.getMonth()
  })
  const monthShiftCounts = shiftOptions.reduce((counts, option) => ({
    ...counts,
    [option.id]: cursorMonthShifts.filter((shift) => shift.shift === option.id).length,
  }), {})

  const moveMonth = (amount) => {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + amount, 1)
    setCursor(next)
    if (currentMode === 'children') setSelected(next)
  }

  const goToToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelected(today)
  }

  const selectCalendarDate = (date) => {
    setSelected(date)
    if ((currentMode === 'all' || currentMode === 'family' || currentMode === 'children') && window.matchMedia('(max-width: 900px)').matches) {
      window.requestAnimationFrame(() => dayPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  const setSelectedShift = (shiftId) => {
    if (!canEdit || !selectedShiftMember) return
    setPreviewShiftId(shiftId)
    const selectedDate = iso(selected)
    const previous = shiftEntryFor(shifts, selectedDate, selectedShiftMember.id)
    setLastShiftChange({ date: selectedDate, member: selectedShiftMember.id, previous: previous ? { ...previous } : null })
    setShifts((currentShifts) => {
      const existing = shiftEntryFor(currentShifts, selectedDate, selectedShiftMember.id)
      const withoutDateDuplicates = currentShifts.filter((shift) => !(shift.date === selectedDate && shift.member === selectedShiftMember.id))
      return [...withoutDateDuplicates, existing
        ? { ...existing, shift: shiftId }
        : { id: `${selectedShiftMember.id}-${selectedDate}`, date: selectedDate, member: selectedShiftMember.id, shift: shiftId }]
    })
    const nextDate = addDays(selected, 1)
    if (nextDate.getMonth() === selected.getMonth() && nextDate.getFullYear() === selected.getFullYear()) {
      setSelected(nextDate)
    }
  }

  const clearSelectedShift = () => {
    if (!canEdit || !selectedShiftMember) return
    const selectedDate = iso(selected)
    setShifts((currentShifts) => currentShifts.filter((shift) => !(shift.date === selectedDate && shift.member === selectedShiftMember.id)))
  }

  const removeSelectedEvent = (event) => {
    if (event.recurring && !event.anniversary) {
      openRecurringActions(event)
      return
    }
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
      const withoutChanged = current.filter((shift) => !(shift.date === lastShiftChange.date && shift.member === lastShiftChange.member))
      return lastShiftChange.previous ? [...withoutChanged, lastShiftChange.previous] : withoutChanged
    })
    setSelected(new Date(`${lastShiftChange.date}T00:00:00`))
    setLastShiftChange(null)
  }

  return (
    <div className={`page calendar-page ${currentMode === 'children' ? 'child-calendar-page' : ''}`}>
      <section className={`calendar-toolbar card ${currentMode === 'work' ? 'shift-mode' : ''} ${currentMode === 'children' ? 'child-mode' : ''}`}>
        <div className="calendar-title-slot">
          <div className="month-controls">
            <button className="icon-button" onClick={() => moveMonth(-1)} aria-label="이전 달"><ChevronLeft /></button>
            <h1>{label}</h1>
            <button className="icon-button" onClick={() => moveMonth(1)} aria-label="다음 달"><ChevronRight /></button>
          </div>
        </div>
        <div className="calendar-toolbar-actions">
        <div className="segmented">
          {[
            ['all', CALENDAR_MODES.all],
            ...(workSettings.enabled && shiftWorkers.length ? [['work', CALENDAR_MODES.work]] : []),
            ['family', CALENDAR_MODES.family],
            ...(children.length ? [['children', CALENDAR_MODES.children]] : []),
          ].map(([modeId, labelText]) => <button key={modeId} aria-pressed={currentMode === modeId} className={currentMode === modeId ? 'active' : ''} onClick={() => setMode(modeId)}>{labelText}</button>)}
        </div>
        <button className="calendar-today-button" onClick={goToToday}>오늘</button>
        </div>
      </section>

      {currentMode === 'children' ? <ChildWeekView today={today} events={events} childSchedules={childSchedules} schedulePeriods={schedulePeriods} scheduleExceptions={scheduleExceptions} monthDays={monthDays} selectedDate={selected} onSelectDate={selectCalendarDate} detailRef={dayPanelRef} openModal={openModal} openRecurringActions={openRecurringActions} removeEvent={removeSelectedEvent} canEdit={canEdit} /> : <section className={`calendar-layout ${currentMode === 'work' ? 'shift-mode' : ''}`}>
        <div className="calendar-card card">
          <div className="weekday-row">{['일', '월', '화', '수', '목', '금', '토'].map((day, index) => <span key={day} className={index === 0 ? 'sunday' : index === 6 ? 'saturday' : ''}>{day}</span>)}</div>
          <div className="calendar-grid">
            {monthDays.map(({ day, date, outside }) => {
              const dayEvents = outside ? [] : eventsForDate(date, events, childSchedules, schedulePeriods, anniversaries, scheduleExceptions)
              const dayShift = outside ? undefined : shiftEntryFor(shifts, date, selectedShiftMember?.id)
              const shiftOption = shiftOptions.find((option) => option.id === dayShift?.shift)
              const overviewShiftOptions = outside ? [] : shiftWorkers.flatMap((worker) => {
                const workerShift = shiftEntryFor(shifts, date, worker.id)
                const workerOption = shiftOptions.find((option) => option.id === workerShift?.shift)
                return workerOption ? [{ worker, option: workerOption }] : []
              })
              const visibleOverviewShifts = overviewShiftOptions.filter(({ option }) => option.code !== 'OFF')
              const ShiftIcon = shiftOption?.icon
              const isSelected = iso(date) === iso(selected)
              const isToday = iso(date) === iso(today)
              const dayHoliday = dayEvents.find((event) => event.holiday)
              const familyDayEvents = dayEvents.filter((event) => !event.holiday && !isChildCalendarEvent(event))
              const childDayEvents = dayEvents.filter((event) => !event.holiday && isChildCalendarEvent(event))
              const countableDayEvents = [...familyDayEvents, ...childDayEvents]
              const conflictCount = overlappingEventCount(countableDayEvents)
              const scheduledDayEvents = currentMode === 'family' ? familyDayEvents : dayEvents.filter((event) => !event.holiday)
              const weekdayClass = date.getDay() === 0 ? 'sunday' : date.getDay() === 6 ? 'saturday' : ''
              const overviewLabel = currentMode === 'all' ? [
                overviewShiftOptions.map(({ worker, option }) => `${worker.name} 근무 ${option.code}`).join(', '),
                familyDayEvents.length ? `가족 일정 ${familyDayEvents.length}개` : '',
                childDayEvents.length ? `자녀 일정 ${childDayEvents.length}개` : '',
                conflictCount ? `시간 겹침 ${conflictCount}개` : '',
              ].filter(Boolean).join(', ') : ''
              return (
                <button
                  key={iso(date)}
                  disabled={outside}
                  className={`${outside ? 'outside' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${weekdayClass} ${dayHoliday ? 'holiday' : ''} ${currentMode === 'work' && shiftOption ? `has-shift shift-${shiftOption.color}` : ''} ${currentMode === 'all' && visibleOverviewShifts.length ? 'overview-has-shift' : ''}`}
                  data-date={iso(date)}
                  data-holiday={dayHoliday?.title || undefined}
                  aria-label={`${formatLongDate(date)}${dayHoliday ? `, ${dayHoliday.title}` : ''}${overviewLabel ? `, ${overviewLabel}` : ''}`}
                  onClick={() => selectCalendarDate(date)}
                >
                  {currentMode === 'all' ? <div className="calendar-cell-slots" aria-hidden="true">
                    <span className="calendar-cell-top">
                      <span className="calendar-day-number">{day}</span>
                      <span className={`overview-shift-icons ${visibleOverviewShifts.length ? '' : 'is-empty'}`}>{visibleOverviewShifts.slice(0, 1).map(({ worker, option }) => {
                        const OverviewShiftIcon = option.icon
                        return <i key={worker.id} className={`shift-icon ${option.color}`}>{OverviewShiftIcon && <OverviewShiftIcon />}</i>
                      })}</span>
                    </span>
                    <small className={`calendar-cell-holiday calendar-holiday-name ${dayHoliday ? '' : 'is-empty'}`}>{dayHoliday?.title || '공휴일 없음'}</small>
                    <span className={`calendar-cell-count calendar-cell-family ${familyDayEvents.length ? '' : 'is-empty'}`}><Home /><b>{familyDayEvents.length}</b></span>
                    <span className={`calendar-cell-count calendar-cell-children ${childDayEvents.length ? '' : 'is-empty'}`}><GraduationCap /><b>{childDayEvents.length}</b></span>
                  </div> : <div className="calendar-cell-slots">
                    <span className="calendar-cell-top"><span className="calendar-day-number">{day}</span></span>
                    <small className={`calendar-cell-holiday calendar-holiday-name ${dayHoliday ? '' : 'is-empty'}`}>{dayHoliday?.title || '공휴일 없음'}</small>
                    <div className={`calendar-cell-mode-content calendar-cell-${currentMode}`}>
                      {currentMode === 'family' ? <>
                        <div className="day-dots">
                          {scheduledDayEvents.slice(0, 3).map((event) => {
                            const member = memberForId(event.member, profiles)
                            return <i key={event.id} style={{ background: member.color }} />
                          })}
                        </div>
                        <div className="calendar-event-labels">
                          {scheduledDayEvents.slice(0, 2).map((event) => <small key={event.id}>{event.title}</small>)}
                          {scheduledDayEvents.length > 2 && <small className="more-count">+{scheduledDayEvents.length - 2}</small>}
                        </div>
                      </> : currentMode === 'work' && shiftOption && <span className={`shift-chip ${shiftOption.color}`}>{ShiftIcon && <ShiftIcon />}{shiftOption.shortLabel}</span>}
                    </div>
                  </div>}
                </button>
              )
            })}
          </div>
          {currentMode === 'family' && <MemberLegend />}
        </div>

        <aside ref={dayPanelRef} className={`day-panel card ${currentMode === 'work' ? 'shift-day-panel' : ''}`}>
          {currentMode === 'all' ? <>
            <div className="section-heading overview-heading">
              <div><h2>{formatLongDate(selected)}</h2></div>
              {canEdit && <button className="small-add" aria-label="일정 추가" onClick={() => openModal('event', iso(selected))}><Plus size={18} /> 추가</button>}
            </div>
            <div className="overview-day-groups">
              {selectedConflicts.size > 0 && <div className="overview-conflict-banner" role="status"><AlertTriangle /><span><strong>시간이 겹치는 일정이 있습니다</strong><small>아래 일정에서 시간을 확인해 주세요.</small></span></div>}
              {workSettings.enabled && shiftWorkers.length > 0 && <section className="overview-day-section"><header><span>근무</span><b>{selectedWorkShifts.length}</b></header><div className="overview-shift-list">{selectedWorkShifts.map(({ worker, option }) => <ScheduleRow key={worker.id} className="overview-work-row" memberColor={worker.color} memberTone={worker.tone} leading={<Avatar memberId={worker.id} />} title={option?.code || '미입력'} time={option?.time || ''} category="근무" />)}{!selectedWorkShifts.length && <p className="overview-empty">입력된 근무가 없습니다.</p>}</div></section>}
              {selectedHolidayEvents.length > 0 && <section className="overview-day-section holiday-group"><header><span>공휴일</span><small>일정 개수에서 제외</small></header>{selectedHolidayEvents.map((event) => <div className="overview-holiday" key={event.id}><CalendarDays /> <strong>{event.title}</strong></div>)}</section>}
              <CalendarAnniversarySection events={selectedAnniversaryEvents} />
              <section className="overview-day-section"><header><span>가족 일정</span><b>{selectedFamilyEvents.length}</b></header><div className="day-events">{selectedFamilyEvents.map((event) => <EventCard key={event.id} event={event} compact calendarSummary onDiscuss={() => onOpenCollaboration(event)} onEdit={canEdit ? (event.recurring ? () => openRecurringActions(event) : () => openModal('event', event.date, event)) : undefined} onDelete={canEdit ? () => removeSelectedEvent(event) : undefined} />)}{!selectedFamilyEvents.length && <p className="overview-empty">등록된 가족 일정이 없습니다.</p>}</div></section>
              {children.length > 0 && <section className="overview-day-section"><header><span>자녀 일정</span><b>{selectedChildEvents.length}</b></header><div className="day-events">{selectedChildEvents.map((event) => <EventCard key={event.id} event={event} compact calendarSummary showRecurrence={false} onEdit={canEdit ? (event.recurring ? () => openRecurringActions(event) : () => openModal('event', event.date, event)) : undefined} onDelete={canEdit ? () => removeSelectedEvent(event) : undefined} />)}{!selectedChildEvents.length && <p className="overview-empty">등록된 자녀 일정이 없습니다.</p>}</div></section>}
            </div>
          </> : currentMode === 'family' ? <>
            <div className="section-heading">
              <div><h2>{formatLongDate(selected)}</h2></div>
              {canEdit && <button className="small-add" aria-label="일정 추가" onClick={() => openModal('event', iso(selected))}><Plus size={18} /> 추가</button>}
            </div>
            <CalendarAnniversarySection events={selectedAnniversaryEvents} />
            <div className="day-events">
              {selectedEvents.map((event) => <EventCard
                key={event.id}
                event={event}
                compact
                calendarSummary
                onDiscuss={!event.holiday ? () => onOpenCollaboration(event) : undefined}
                onEdit={canEdit && !event.holiday ? (event.recurring ? () => openRecurringActions(event) : () => openModal('event', event.date, event)) : undefined}
                onDelete={canEdit && !event.holiday ? () => removeSelectedEvent(event) : undefined}
              />)}
              {!selectedEvents.length && <div className="empty-state"><CalendarDays /><strong>등록된 일정이 없습니다</strong><span>쉬거나 새 일정을 추가하세요.</span></div>}
            </div>
            {selectedChildEvents.length > 0 && <button className="related-calendar-link" onClick={() => setMode('children')}><GraduationCap /> 자녀 일정 {selectedChildEvents.length}개 <span>자녀 탭에서 보기</span><ChevronRight /></button>}
          </> : <>
            {shiftWorkers.length > 1 && <div className="shift-worker-switcher" aria-label="근무표 구성원 선택">{shiftWorkers.map((worker) => <button key={worker.id} className={selectedShiftMember?.id === worker.id ? 'active' : ''} aria-pressed={selectedShiftMember?.id === worker.id} onClick={() => { setSelectedShiftMemberId(worker.id); setLastShiftChange(null) }}><Avatar memberId={worker.id} />{worker.name}</button>)}</div>}
            <div className="shift-editor-heading">
              <Avatar memberId={selectedShiftMember?.id || FAMILY_MEMBER.id} />
              <h2>{formatLongDate(selected)}</h2>
            </div>
            <p className="shift-help">{isMonthEnd ? '월말에는 다음 달로 넘어가지 않습니다.' : '근무 선택 후 다음 날짜로 자동 이동합니다.'}</p>
            <div className="shift-editor-grid">
              {shiftOptions.map(({ id, code, icon: Icon, color }) => (
                <button key={id} className={`${color} ${selectedShift?.shift === id ? 'active' : ''}`} aria-pressed={selectedShift?.shift === id} disabled={!canEdit} onClick={() => setSelectedShift(id)}>
                  <span className="shift-option-label"><Icon /><strong>{code}</strong></span>
                  {selectedShift?.shift === id && <Check className="shift-check" />}
                </button>
              ))}
            </div>
            {previewShiftOption && <div className={`shift-selected-time ${previewShiftOption.color}`} aria-live="polite">
              <span>{PreviewShiftIcon && <PreviewShiftIcon />}<strong>{previewShiftOption.code} · {previewShiftOption.label}</strong></span>
              <small>{previewShiftOption.time}</small>
            </div>}
            <div className="shift-editor-footer">
              <span className="shift-count-summary">
                <span aria-label="이번 달 근무 개수">{shiftOptions.map((option) => <i key={option.id}><b>{option.code}</b> {monthShiftCounts[option.id]}</i>)}</span>
              </span>
              <div>{lastShiftChange && canEdit && <button onClick={undoLastShift}><RotateCcw /> 직전 입력 취소</button>}{selectedShift && canEdit && <button onClick={clearSelectedShift}>지정 해제</button>}</div>
            </div>
          </>}
        </aside>
      </section>}
    </div>
  )
}

const recurringTaskOccursOn = (task, date) => hasRecurrence({ ...task, date: task.dueDate })
  && isRecurrenceStart({ ...task, date: task.dueDate }, date)
  && !task.skippedDates?.includes(iso(date))

const recurringTaskOccurrence = (task, date) => ({
  ...task,
  id: `task-occurrence-${task.id}-${iso(date)}`,
  sourceTaskId: task.id,
  occurrenceDate: iso(date),
  dueDate: iso(date),
  done: Boolean(task.completedDates?.includes(iso(date))),
  recurringTask: true,
})

const recurringTaskOccurrencesBetween = (task, start, end) => {
  const occurrences = []
  for (let cursor = start; cursor <= end && occurrences.length < 62; cursor = addDays(cursor, 1)) {
    if (recurringTaskOccursOn(task, cursor)) occurrences.push(recurringTaskOccurrence(task, cursor))
  }
  return occurrences
}

function RecurringTaskDialog({ task, onClose, onEditOccurrence, onEditSeries, onStop }) {
  const dialogRef = useModalAccessibility(Boolean(task), onClose)
  if (!task) return null
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} tabIndex="-1" className="modal recurring-dialog" role="dialog" aria-modal="true" aria-labelledby="recurring-task-title">
      <div className="modal-heading"><div><span className="eyebrow">반복 할 일 변경 범위</span><h2 id="recurring-task-title">{task.title}</h2></div><button className="icon-button" onClick={onClose} aria-label="닫기"><X /></button></div>
      <p>{formatLongDate(new Date(`${task.occurrenceDate}T00:00:00`))} 회차만 바꾸거나 전체 반복 규칙을 관리할 수 있습니다.</p>
      <div className="recurring-actions-grid">
        <button className="secondary-button" onClick={onEditOccurrence}><Pencil /> 이번 회차 수정</button>
        <button className="secondary-button" onClick={onEditSeries}><CalendarRange /> 전체 반복 수정</button>
        <button className="danger-button recurring-stop-button" onClick={onStop}><X /> 반복 중지</button>
      </div>
    </section>
  </div>
}

function TasksView({ today, tasks, setTasks, openModal, canEdit, notifyUndo, pushStatus, pushError, onEnableNotifications }) {
  const { profiles } = useFamilyProfiles()
  const [periodFilter, setPeriodFilter] = useState('month')
  const [showCompleted, setShowCompleted] = useState(false)
  const [recurringTask, setRecurringTask] = useState(null)
  const [actionTask, setActionTask] = useState(null)
  const taskActionTriggerRef = useRef(null)
  const categories = ['긴급', '장보기', '집안일']
  const toggleTask = (task) => setTasks((current) => current.map((source) => {
    if (!task.recurringTask || source.id !== task.sourceTaskId) return source.id === task.id ? {
      ...source,
      done: !source.done,
      completedDate: source.done ? '' : (source.completedDate || iso(today)),
    } : source
    const completedDates = new Set(source.completedDates || [])
    if (completedDates.has(task.occurrenceDate)) completedDates.delete(task.occurrenceDate)
    else completedDates.add(task.occurrenceDate)
    return { ...source, completedDates: [...completedDates].sort() }
  }))
  const deleteTask = (task) => {
    setTasks((current) => current.filter((item) => item.id !== task.id))
    notifyUndo?.(`‘${task.title}’ 할 일을 삭제했습니다.`, () => setTasks((current) => [...current, task]))
  }
  const weekStart = addDays(today, -today.getDay())
  const weekEnd = addDays(weekStart, 6)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const taskRange = periodFilter === 'week' ? [weekStart, weekEnd]
      : periodFilter === 'month' ? [monthStart, monthEnd] : null
  const periodTasks = tasks.flatMap((task) => {
    if (hasRecurrence(task)) {
      if (taskRange) return recurringTaskOccurrencesBetween(task, taskRange[0], taskRange[1])
      if (periodFilter === 'all') return recurringTaskOccurrencesBetween(task, today, addDays(today, 90)).slice(0, 12)
    }
    if (periodFilter === 'all') return [task]
    const taskDate = taskDisplayDate(task)
    return taskDate && iso(taskRange[0]) <= taskDate && taskDate <= iso(taskRange[1]) ? [task] : []
  })
  const completedInPeriod = periodTasks.filter((task) => task.done).length
  const visibleTasks = periodTasks.filter((task) => showCompleted || !task.done)
  const totalRemaining = tasks.filter((task) => hasRecurrence(task) || !task.done).length
  const visibleRemaining = visibleTasks.filter((task) => !task.done).length
  const sortTasks = (first, second) => {
    const todayValue = iso(today)
    const firstPast = Boolean(first.dueDate && first.dueDate < todayValue)
    const secondPast = Boolean(second.dueDate && second.dueDate < todayValue)
    if (firstPast !== secondPast) return firstPast ? 1 : -1
    if (!first.dueDate !== !second.dueDate) return first.dueDate ? -1 : 1
    return firstPast
      ? (second.dueDate || '').localeCompare(first.dueDate || '')
      : (first.dueDate || '').localeCompare(second.dueDate || '')
  }

  const renderTaskCard = (task) => {
    const visibleMeta = task.meta && task.meta.replace(/\s/g, '') !== '새로추가됨' ? task.meta : ''
    const dueCopy = task.dueDate ? `마감 ${task.dueDate}${reminderValuesFor(task).length ? ' 알림' : ''}` : ''
    const startCopy = task.startDate ? `시작 ${task.startDate}` : ''
    const completedCopy = task.completedDate ? `완료 ${task.completedDate}` : ''
    const taskTimeCopy = task.time ? `${task.time}${task.end ? ` ~ ${task.end}` : ''}` : ''
    const recurrenceLabel = formatRecurrenceLabel({ ...task, date: task.dueDate })
    const memberIds = assignedMemberIds(task, 'assignees', 'assignee')
    const member = memberForId(memberIds[0], profiles)
    return <ScheduleRow
      key={task.id}
      className={`task-card ${task.done ? 'done' : ''}`}
      memberColor={member.color}
      memberTone={member.tone}
      leading={<><button className="checkbox" onClick={(event) => { event.stopPropagation(); toggleTask(task) }} aria-label={`${task.done ? '다시 열기' : '완료하기'} ${task.title}`}>{task.done && <Check />}</button><AvatarGroup memberIds={memberIds} /></>}
      title={task.title}
      primaryMeta={visibleMeta}
      secondaryMeta={[taskTimeCopy, startCopy, dueCopy, completedCopy, recurrenceLabel].filter(Boolean).join(' · ')}
      category={task.category}
      categoryClassName={task.category === '긴급' ? 'urgent' : ''}
      onClick={canEdit ? (event) => { taskActionTriggerRef.current = event.currentTarget; setActionTask(task) } : undefined}
      ariaLabel={canEdit ? `${task.title} 작업 열기` : undefined}
    />
  }

  return (
    <div className="page tasks-page">
      <section className="page-title-row">
        <div><span className="eyebrow">가족과 함께 나누는 일</span><h1>가족 할 일</h1><p>{totalRemaining ? (periodFilter === 'all' ? `남은 할 일이 ${totalRemaining}개 있어요.` : `현재 범위 ${visibleRemaining}개 · 전체 ${totalRemaining}개`) : '남은 할 일이 없어요. 새 할 일을 추가해 보세요.'}</p></div>
        <div className="page-title-actions">
          {pushStatus !== 'enabled' && pushStatus !== 'unsupported' && <button className="secondary-button" onClick={onEnableNotifications} disabled={pushStatus === 'enabling'} title={pushError || '앱을 닫아도 서버에서 알림을 보냅니다.'}><Bell size={18} /> {pushStatus === 'enabling' ? '알림 연결 중' : '알림 켜기'}</button>}
          {pushStatus === 'enabled' && <span className="push-enabled-label"><Check /> 백그라운드 알림 켜짐</span>}
          {canEdit && <button className="primary-button" onClick={() => openModal('task')}><Plus size={19} /> 추가</button>}
        </div>
      </section>
      <div className="task-filter-bar" aria-label="할 일 기간 필터">
        {TASK_PERIOD_FILTERS.map((filter) => <button key={filter.id} className={periodFilter === filter.id ? 'active' : ''} aria-pressed={periodFilter === filter.id} onClick={() => setPeriodFilter(filter.id)}>{filter.label}</button>)}
        {completedInPeriod > 0 && <button className="completed-task-toggle" aria-pressed={showCompleted} onClick={() => setShowCompleted((current) => !current)}>{showCompleted ? '완료 숨기기' : `완료 보기 ${completedInPeriod}`}</button>}
      </div>
      <div className="task-columns">
        {categories.map((category) => {
          const grouped = visibleTasks.filter((task) => task.category === category).sort(sortTasks)
          return (
            <section key={category} className={`task-group ${category === '긴급' ? 'urgent' : category === '집안일' ? 'housework' : 'groceries'}`}>
              <div className="task-heading">
                <span className="category-icon">{category === '긴급' ? <Bell /> : category === '집안일' ? <Home /> : <ShoppingBasket />}</span>
                <h2>{category}</h2><span className="count-badge">{grouped.filter((task) => !task.done).length}</span>
              </div>
              <div className="task-list">
                {grouped.map((task) => renderTaskCard(task))}
                {!grouped.length && <div className="task-empty-state"><span>{category} 할 일이 없습니다.</span></div>}
              </div>
            </section>
          )
        })}
      </div>
      <ScheduleActionSheet
        open={Boolean(actionTask)}
        title={actionTask?.title || ''}
        onClose={() => setActionTask(null)}
        onComplete={actionTask ? () => toggleTask(actionTask) : undefined}
        completed={Boolean(actionTask?.done)}
        onEdit={actionTask ? () => actionTask.recurringTask ? setRecurringTask(actionTask) : openModal('task', undefined, actionTask) : undefined}
        onDelete={actionTask ? () => actionTask.recurringTask ? setRecurringTask(actionTask) : deleteTask(actionTask) : undefined}
        returnFocusRef={taskActionTriggerRef}
        confirmDelete={!actionTask?.recurringTask}
      />
      <RecurringTaskDialog task={recurringTask} onClose={() => setRecurringTask(null)} onEditOccurrence={() => {
        const occurrence = recurringTask
        setRecurringTask(null)
        openModal('task', undefined, undefined, { title: occurrence.title, category: occurrence.category, assignee: occurrence.assignee, assignees: occurrence.assignees, dueDate: occurrence.occurrenceDate, reminder: occurrence.reminder, time: occurrence.time, end: occurrence.end }, () => {
          setTasks((current) => current.map((task) => task.id === occurrence.sourceTaskId ? { ...task, skippedDates: [...new Set([...(task.skippedDates || []), occurrence.occurrenceDate])].sort() } : task))
        })
      }} onEditSeries={() => {
        const source = tasks.find((task) => task.id === recurringTask.sourceTaskId)
        setRecurringTask(null)
        if (source) openModal('task', undefined, source)
      }} onStop={() => {
        const occurrence = recurringTask
        setRecurringTask(null)
        setTasks((current) => current.map((task) => task.id === occurrence.sourceTaskId ? { ...task, recurrence: occurrence.occurrenceDate <= task.dueDate ? undefined : { ...task.recurrence, until: iso(addDays(new Date(`${occurrence.occurrenceDate}T00:00:00`), -1)) } } : task))
      }} />
    </div>
  )
}

const emptyScheduleFormFor = (member = '') => ({
  member, kind: '학원', title: '', weekdays: [1],
  time: '오후 4:00', end: '오후 5:00',
})

const emptyAnniversaryFormFor = (date) => ({
  name: '', kind: '생일', calendarType: 'solar', leapMonth: false, baseYear: '', month: date.getMonth() + 1, day: date.getDate(),
})

function SchedulesView({ today, childSchedules, setChildSchedules, childProfiles, setChildProfiles, schedulePeriods, setSchedulePeriods, anniversaries, setAnniversaries, canEdit, notifyUndo, scheduleEditRequest, onScheduleEditHandled, profileEditRequest, onProfileEditHandled, onOpenProfiles }) {
  const { profiles, children } = useFamilyProfiles()
  const primaryChildId = children[0]?.id || ''
  const requestedSchedule = childSchedules.find((item) => item.id === scheduleEditRequest)
  const initialProfileMember = profileEditRequest || primaryChildId
  const initialProfile = childProfiles.find((item) => item.member === initialProfileMember) || emptyChildProfile(initialProfileMember)
  const [managementSection, setManagementSection] = useState(profileEditRequest ? 'profiles' : 'children')
  const [season, setSeason] = useState(() => requestedSchedule?.season || activeSeasonForDate(today, schedulePeriods) || '학기')
  const [scheduleForm, setScheduleForm] = useState(() => requestedSchedule ? {
    member: requestedSchedule.member,
    kind: requestedSchedule.kind,
    title: requestedSchedule.title,
    weekdays: scheduleWeekdays(requestedSchedule),
    time: requestedSchedule.time,
    end: requestedSchedule.end,
  } : emptyScheduleFormFor(primaryChildId))
  const [editingId, setEditingId] = useState(requestedSchedule?.id || null)
  const [scheduleError, setScheduleError] = useState('')
  const [periodForm, setPeriodForm] = useState({ member: primaryChildId, season: '학기', start: iso(today), end: iso(addDays(today, 30)) })
  const [periodEditingId, setPeriodEditingId] = useState(null)
  const [periodError, setPeriodError] = useState('')
  const [anniversaryForm, setAnniversaryForm] = useState(() => emptyAnniversaryFormFor(today))
  const [anniversaryEditingId, setAnniversaryEditingId] = useState(null)
  const [anniversaryError, setAnniversaryError] = useState('')
  const [actionAnniversary, setActionAnniversary] = useState(null)
  const [actionProfile, setActionProfile] = useState(null)
  const [actionPeriod, setActionPeriod] = useState(null)
  const [profileMember, setProfileMember] = useState(initialProfileMember)
  const [profileForm, setProfileForm] = useState(initialProfile)
  const [profileSaved, setProfileSaved] = useState(false)
  const anniversaryYears = useMemo(() => anniversaryYearsFor(today), [today])
  const profileEditorRef = useRef(null)
  const anniversaryActionTriggerRef = useRef(null)
  const profileActionTriggerRef = useRef(null)
  const periodActionTriggerRef = useRef(null)
  const currentScheduleMember = children.some((child) => child.id === scheduleForm.member) ? scheduleForm.member : primaryChildId
  const currentProfileMember = children.some((child) => child.id === profileMember) ? profileMember : primaryChildId
  const currentPeriodMember = periodForm.member === 'all' || children.some((child) => child.id === periodForm.member) ? periodForm.member : primaryChildId

  const scheduleSortKey = (schedule) => `${schedule.member}-${scheduleWeekdays(schedule)[0]}-${schedule.time}-${schedule.title}`
  const sortSchedules = (schedules) => [...schedules].sort((a, b) => scheduleSortKey(a).localeCompare(scheduleSortKey(b), 'ko'))
  const activePeriodsByMember = new Map(children.map((child) => [child.id, activePeriodForDate(today, schedulePeriods, child.id)]))
  const currentSchedules = sortSchedules(childSchedules.filter((schedule) => activePeriodsByMember.get(schedule.member)?.season === schedule.season))
  const currentScheduleIds = new Set(currentSchedules.map((schedule) => schedule.id))
  const inactiveScheduleGroups = [...childSchedules]
    .filter((schedule) => !currentScheduleIds.has(schedule.id))
    .reduce((groups, schedule) => {
      const dateValue = iso(today)
      const matchingPeriods = schedulePeriods
        .filter((period) => period.season === schedule.season)
        .filter((period) => !period.member || period.member === 'all' || period.member === schedule.member)
      const period = matchingPeriods
        .filter((candidate) => candidate.end < dateValue)
        .sort((a, b) => b.end.localeCompare(a.end) || b.start.localeCompare(a.start))[0]
        || matchingPeriods
          .filter((candidate) => candidate.start > dateValue)
          .sort((a, b) => a.start.localeCompare(b.start))[0]
      const status = period ? (period.end < dateValue ? 'past' : 'upcoming') : 'unassigned'
      const key = period ? `${period.id}-${schedule.member}` : `${status}-${schedule.member}-${schedule.season}`
      const existing = groups.get(key) || { key, period, status, member: schedule.member, season: schedule.season, schedules: [] }
      existing.schedules.push(schedule)
      groups.set(key, existing)
      return groups
    }, new Map())
  const sortedInactiveScheduleGroups = [...inactiveScheduleGroups.values()]
    .map((group) => ({ ...group, schedules: sortSchedules(group.schedules) }))
    .sort((a, b) => {
      const statusOrder = { past: 0, upcoming: 1, unassigned: 2 }
      return statusOrder[a.status] - statusOrder[b.status]
        || (b.period?.end || '').localeCompare(a.period?.end || '')
        || `${a.member}-${a.season}`.localeCompare(`${b.member}-${b.season}`, 'ko')
    })
  const sortedAnniversaries = [...anniversaries].sort((a, b) => {
    const first = nextAnniversaryOccurrence(a)?.getTime() ?? Number.MAX_SAFE_INTEGER
    const second = nextAnniversaryOccurrence(b)?.getTime() ?? Number.MAX_SAFE_INTEGER
    return first - second
  })
  const savedChildProfiles = childProfiles.filter((profile) => (
    profile.school || profile.grade || profile.classNumber || profile.studentNumber || profile.teacherName || profile.teacherPhone
  ))

  const changeScheduleField = (field, value) => setScheduleForm((current) => ({ ...current, [field]: value }))
  const selectProfileMember = (memberId) => {
    setProfileMember(memberId)
    setProfileForm(childProfiles.find((item) => item.member === memberId) || emptyChildProfile(memberId))
    setProfileSaved(false)
  }
  const changeProfileField = (field, value) => {
    setProfileForm((current) => ({ ...current, [field]: value }))
    setProfileSaved(false)
  }
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
      member: currentScheduleMember,
      id: editingId || `child-${Date.now()}`,
      season,
      title: scheduleForm.title.trim(),
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
    setScheduleForm(emptyScheduleFormFor(primaryChildId))
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
    })
    setEditingId(schedule.id)
    setScheduleError('')
  }

  const cancelScheduleEdit = () => {
    setScheduleForm(emptyScheduleFormFor(primaryChildId))
    setEditingId(null)
    setScheduleError('')
  }

  useEffect(() => {
    if (!scheduleEditRequest) return
    const timer = window.setTimeout(() => onScheduleEditHandled?.(), 0)
    return () => window.clearTimeout(timer)
  }, [onScheduleEditHandled, scheduleEditRequest])

  useEffect(() => {
    if (!profileEditRequest) return
    const timer = window.setTimeout(() => {
      setManagementSection('profiles')
      setProfileMember(profileEditRequest)
      setProfileForm(childProfiles.find((item) => item.member === profileEditRequest) || emptyChildProfile(profileEditRequest))
      onProfileEditHandled?.()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [childProfiles, onProfileEditHandled, profileEditRequest])

  const submitProfile = (event) => {
    event.preventDefault()
    if (!canEdit) return
    const nextProfile = Object.fromEntries(Object.entries({ ...profileForm, member: currentProfileMember }).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]))
    setChildProfiles((current) => current.some((item) => item.member === currentProfileMember)
      ? current.map((item) => item.member === currentProfileMember ? nextProfile : item)
      : [...current, nextProfile])
    setProfileSaved(true)
  }

  const editProfile = (memberId) => {
    selectProfileMember(memberId)
    window.requestAnimationFrame(() => profileEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const deleteProfile = (profile) => {
    const child = children.find((item) => item.id === profile.member)
    if (!child) return
    setChildProfiles((current) => current.filter((item) => item.member !== profile.member))
    if (profileMember === profile.member) {
      setProfileForm(emptyChildProfile(profile.member))
      setProfileSaved(false)
    }
    notifyUndo?.(`‘${child.name}’ 학교 정보를 삭제했습니다.`, () => setChildProfiles((current) => (
      current.some((item) => item.member === profile.member)
        ? current.map((item) => item.member === profile.member ? profile : item)
        : [...current, profile]
    )))
  }

  const deleteSchedule = (schedule) => {
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
      ? current.map((period) => period.id === periodEditingId ? { ...periodForm, member: currentPeriodMember, id: periodEditingId } : period)
      : [...current, { ...periodForm, member: currentPeriodMember, id: `period-${Date.now()}` }])
    setPeriodError('')
    setPeriodForm((current) => ({ ...current, member: primaryChildId, start: iso(today), end: iso(addDays(today, 30)) }))
    setPeriodEditingId(null)
  }

  const editPeriod = (period) => {
    setPeriodForm({ member: period.member || 'all', season: period.season, start: period.start, end: period.end })
    setPeriodEditingId(period.id)
    setPeriodError('')
  }

  const cancelPeriodEdit = () => {
    setPeriodForm({ member: primaryChildId, season: '학기', start: iso(today), end: iso(addDays(today, 30)) })
    setPeriodEditingId(null)
    setPeriodError('')
  }

  const deletePeriod = (period) => {
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
    setAnniversaryForm(emptyAnniversaryFormFor(today))
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
    setAnniversaryForm(emptyAnniversaryFormFor(today))
    setAnniversaryEditingId(null)
    setAnniversaryError('')
  }

  const deleteAnniversary = (anniversary) => {
    setAnniversaries((current) => current.filter((item) => item.id !== anniversary.id))
    notifyUndo?.(`‘${anniversaryTitle(anniversary)}’을 삭제했습니다.`, () => setAnniversaries((current) => [...current, anniversary]))
    if (anniversaryEditingId === anniversary.id) cancelAnniversaryEdit()
  }

  return (
    <div className="page schedules-page">
      <section className="page-title-row">
        <div><span className="eyebrow">반복 일정과 기념일</span><h1>가족 일정 관리</h1><p>학교·학원과 기념일을 등록하면 달력에 바로 반영됩니다.</p></div>
      </section>

      <nav className="management-tabs card" aria-label="일정 관리 구분">
        {[
          ['children', '자녀 일정', currentSchedules.length],
          ['periods', '학기·방학', schedulePeriods.length],
          ['profiles', '자녀 정보', savedChildProfiles.length],
          ['anniversaries', '기념일', anniversaries.length],
        ].map(([id, label, count]) => <button key={id} className={managementSection === id ? 'active' : ''} aria-pressed={managementSection === id} onClick={() => setManagementSection(id)}><span>{label}</span><em>{count}</em></button>)}
      </nav>

      {!canEdit && <div className="readonly-notice"><UserRoundCheck /> 자녀 계정은 일정을 볼 수 있습니다. 수정은 가족 대표가 권한을 허용한 뒤 가능합니다.</div>}

      {managementSection === 'anniversaries' && <section className={`anniversary-card card ${!canEdit ? 'readonly-section' : ''}`}>
        <div className="section-heading"><div><span className="eyebrow">매년 달력에 자동 표시</span><h2>가족 기념일 관리</h2><p>양력·음력 가족 기념일을 등록하세요.</p></div><CalendarDays /></div>
        <div className="anniversary-layout">
          <form className="anniversary-form" onSubmit={submitAnniversary}>
            <div className="anniversary-identity-fields">
              <label className="anniversary-name-field">대상·이름<input value={anniversaryForm.name} onChange={(event) => changeAnniversaryField('name', event.target.value)} placeholder="예: 어머니, 부모님" required /></label>
              <label className="anniversary-kind-field">기념일 종류<select value={anniversaryForm.kind} onChange={(event) => changeAnniversaryField('kind', event.target.value)}><option>생일</option><option>결혼기념일</option><option>기념일</option></select></label>
            </div>
            <fieldset className="anniversary-calendar-field">
              <legend>날짜 기준</legend>
              <div className="segmented anniversary-calendar-tabs">
                {[['solar', '양력'], ['lunar', '음력']].map(([value, label]) => <button key={value} type="button" aria-pressed={anniversaryForm.calendarType === value} className={anniversaryForm.calendarType === value ? 'active' : ''} onClick={() => changeAnniversaryField('calendarType', value)}>{label}</button>)}
              </div>
              {anniversaryForm.calendarType === 'lunar' && <button className={`leap-month-toggle ${anniversaryForm.leapMonth ? 'active' : ''}`} type="button" aria-pressed={anniversaryForm.leapMonth} onClick={() => changeAnniversaryField('leapMonth', !anniversaryForm.leapMonth)}><Check /> 윤달</button>}
            </fieldset>
            <div className="anniversary-date-fields">
              <label className="anniversary-year-field">{anniversaryForm.kind === '생일' ? '출생 연도' : '시작 연도'}<select className={anniversaryForm.baseYear ? '' : 'placeholder-value'} value={anniversaryForm.baseYear} onChange={(event) => changeAnniversaryField('baseYear', event.target.value)}><option value="">연도 선택</option>{anniversaryYears.map((year) => <option key={year} value={year}>{year}년</option>)}</select></label>
              <label className="anniversary-month-field">월<select value={anniversaryForm.month} onChange={(event) => changeAnniversaryField('month', Number(event.target.value))}>{CALENDAR_MONTHS.map((month) => <option key={month} value={month}>{month}월</option>)}</select></label>
              <label className="anniversary-day-field">일<select value={anniversaryForm.day} onChange={(event) => changeAnniversaryField('day', Number(event.target.value))}>{CALENDAR_DAYS.slice(0, anniversaryForm.calendarType === 'lunar' ? 30 : 31).map((day) => <option key={day} value={day}>{day}일</option>)}</select></label>
            </div>
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
              return <article className={`anniversary-row ${canEdit ? 'actionable' : ''}`} key={anniversary.id} role={canEdit ? 'button' : undefined} tabIndex={canEdit ? 0 : undefined} aria-label={canEdit ? `${anniversaryTitle(anniversary)} 작업 열기` : undefined} onClick={canEdit ? (event) => { anniversaryActionTriggerRef.current = event.currentTarget; setActionAnniversary(anniversary) } : undefined} onKeyDown={canEdit ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); anniversaryActionTriggerRef.current = event.currentTarget; setActionAnniversary(anniversary) } } : undefined}>
                <Avatar memberId="anniversary" />
                <div className="anniversary-copy">
                  <div className="anniversary-title-row">
                    <div className="anniversary-title-copy">
                      <strong>{anniversaryTitle(anniversary)}</strong>
                      <em>{anniversary.calendarType === 'lunar' ? `음력${anniversary.leapMonth ? ' 윤달' : ''}` : '양력'}</em>
                    </div>
                  </div>
                  <small>
                    <span>{anniversary.month}월 {anniversary.day}일 · 다음 양력 {formatSolarDate(nextOccurrence)}</span>
                    <span className={milestoneLabel ? 'anniversary-milestone' : 'anniversary-missing-year'}>{milestoneLabel || '연도 미입력'}</span>
                  </small>
                  {!milestoneLabel && canEdit && <button className="year-inline-button" onClick={(event) => { event.stopPropagation(); editAnniversary(anniversary) }}>{anniversary.kind === '생일' ? '출생 연도 추가' : '시작 연도 추가'}</button>}
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
          {children.length ? <form className="period-form" onSubmit={submitPeriod}>
            <label>자녀<select value={currentPeriodMember} onChange={(event) => changePeriodField('member', event.target.value)}><option value="all">전체 자녀</option>{children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>
            <label>구분<select value={periodForm.season} onChange={(event) => changePeriodField('season', event.target.value)}><option>학기</option><option>방학</option></select></label>
            <label>시작일<input type="date" value={periodForm.start} required onInput={(event) => changePeriodField('start', event.currentTarget.value)} onChange={(event) => changePeriodField('start', event.currentTarget.value)} /></label>
            <label>종료일<input type="date" min={periodForm.start} value={periodForm.end} required onInput={(event) => changePeriodField('end', event.currentTarget.value)} onChange={(event) => changePeriodField('end', event.currentTarget.value)} /></label>
            <div className="period-form-actions">
              {periodEditingId && <button className="secondary-button" type="button" onClick={cancelPeriodEdit}>취소</button>}
              <button className="primary-button" type="submit">{periodEditingId ? <Check size={17} /> : <Plus size={17} />}{periodEditingId ? '수정 완료' : '기간 추가'}</button>
            </div>
          </form> : <div className="settings-empty"><GraduationCap /><strong>등록된 자녀가 없습니다</strong><span>가족 구성원 설정에서 자녀를 먼저 추가해 주세요.</span></div>}
          {periodError && <p className="form-error" role="alert">{periodError}</p>}
          <div className="period-list">
            {[...schedulePeriods].sort((a, b) => `${a.member || 'all'}-${a.start}`.localeCompare(`${b.member || 'all'}-${b.start}`)).map((period) => {
              const periodMember = period.member && period.member !== 'all' ? profiles.find((member) => member.id === period.member) : FAMILY_MEMBER
              return <div className={`period-row ${canEdit ? 'actionable' : ''}`} key={period.id} role={canEdit ? 'button' : undefined} tabIndex={canEdit ? 0 : undefined} aria-label={canEdit ? `${period.season} ${period.start} 적용 기간 작업 열기` : undefined} onClick={canEdit ? (event) => { periodActionTriggerRef.current = event.currentTarget; setActionPeriod(period) } : undefined} onKeyDown={canEdit ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); periodActionTriggerRef.current = event.currentTarget; setActionPeriod(period) } } : undefined}>
                <span className={`season-badge ${period.season === '방학' ? 'vacation' : ''}`}>{period.season}</span>
                <Avatar memberId={periodMember?.id || 'family'} />
                <span><strong>{period.member && period.member !== 'all' ? periodMember?.name : '전체 자녀'} · {period.start}</strong><small>~ {period.end}</small></span>
              </div>
            })}
          </div>
        </section>

      </div>}

      {managementSection === 'profiles' && <><section ref={profileEditorRef} className={`child-profile-editor card ${!canEdit ? 'readonly-section' : ''}`}>
        <div className="section-heading"><div><span className="eyebrow">학기 중 기본 정보</span><h2>자녀 학교 정보</h2><p>학년·반·번호와 담임선생님 연락처를 자녀표에서 한눈에 확인합니다.</p></div><GraduationCap /></div>
        {children.length ? <><div className="profile-child-picker" aria-label="정보를 편집할 자녀">
          {children.map((child) => <button key={child.id} type="button" className={currentProfileMember === child.id ? 'active' : ''} aria-pressed={currentProfileMember === child.id} onClick={() => selectProfileMember(child.id)}><Avatar memberId={child.id} />{child.name}</button>)}
        </div>
        <form className="child-profile-form" onSubmit={submitProfile}>
          <label className="profile-school-field">학교<input value={profileForm.school} onChange={(event) => changeProfileField('school', event.target.value)} placeholder="예: 새봄초등학교" /></label>
          <label>학년<input inputMode="numeric" value={profileForm.grade} onChange={(event) => changeProfileField('grade', event.target.value)} placeholder="예: 3" /></label>
          <label>반<input inputMode="numeric" value={profileForm.classNumber} onChange={(event) => changeProfileField('classNumber', event.target.value)} placeholder="예: 2" /></label>
          <label>번호<input inputMode="numeric" value={profileForm.studentNumber} onChange={(event) => changeProfileField('studentNumber', event.target.value)} placeholder="예: 15" /></label>
          <label>담임선생님<input value={profileForm.teacherName} onChange={(event) => changeProfileField('teacherName', event.target.value)} placeholder="예: 김하늘" /></label>
          <label className="profile-phone-field">연락처<input type="tel" value={profileForm.teacherPhone} onChange={(event) => changeProfileField('teacherPhone', event.target.value)} placeholder="010-0000-0000" /></label>
          <div className="profile-form-actions"><button className="primary-button" type="submit"><Check size={17} /> 정보 저장</button>{profileSaved && <span role="status">저장되었습니다.</span>}</div>
        </form></> : <div className="settings-empty"><GraduationCap /><strong>등록된 자녀가 없습니다</strong><span>가족 구성원 설정에서 자녀를 추가하면 학교 정보를 입력할 수 있습니다.</span></div>}
      </section>

      <section className="saved-child-profiles">
        <div className="section-heading"><div><span className="eyebrow">자녀표에 표시되는 정보</span><h2>등록된 자녀 정보</h2></div><span className="count-badge">{savedChildProfiles.length}</span></div>
        <div className="child-profile-list">
          {savedChildProfiles.map((profile) => {
            const child = children.find((item) => item.id === profile.member)
            if (!child) return null
            const classInfo = [profile.grade && `${profile.grade}학년`, profile.classNumber && `${profile.classNumber}반`, profile.studentNumber && `${profile.studentNumber}번`].filter(Boolean).join(' · ')
            return <article className={`saved-child-profile-card card ${canEdit ? 'actionable' : ''}`} key={profile.member} role={canEdit ? 'button' : undefined} tabIndex={canEdit ? 0 : undefined} aria-label={canEdit ? `${child.name} 학교 정보 작업 열기` : undefined} onClick={canEdit ? (event) => { profileActionTriggerRef.current = event.currentTarget; setActionProfile(profile) } : undefined} onKeyDown={canEdit ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); profileActionTriggerRef.current = event.currentTarget; setActionProfile(profile) } } : undefined}>
              <Avatar memberId={profile.member} />
              <div className="saved-child-profile-copy">
                <span><strong>{child.name}</strong>{classInfo && <em>{classInfo}</em>}</span>
                <h3>{profile.school || '학교 미입력'}</h3>
                <small>{profile.teacherName ? `담임 ${profile.teacherName} 선생님` : '담임선생님 미입력'}{profile.teacherPhone && <a href={`tel:${profile.teacherPhone}`} onClick={(event) => event.stopPropagation()}><Phone />{profile.teacherPhone}</a>}</small>
              </div>
            </article>
          })}
          {!savedChildProfiles.length && <div className="empty-state card"><GraduationCap /><strong>등록된 자녀 정보가 없습니다</strong><span>위 입력란에서 학교 정보를 저장하면 여기에 표시됩니다.</span></div>}
        </div>
      </section></>}

      {managementSection === 'children' && <>
        <section className={`schedule-editor-card card ${!canEdit ? 'readonly-section' : ''}`}>
          <div className="section-heading"><div><span className="eyebrow">무엇을 언제 할지</span><h2>자녀 학교·학원 일정</h2></div><BookOpen /></div>
          {children.length ? <><div className="segmented wide schedule-season-tabs">
            {['학기', '방학'].map((item) => <button key={item} type="button" aria-pressed={season === item} className={season === item ? 'active' : ''} onClick={() => { setSeason(item); cancelScheduleEdit() }}>{item}</button>)}
          </div>
          <form className="child-schedule-form" onSubmit={submitSchedule}>
            <label>자녀<select value={currentScheduleMember} onChange={(event) => changeScheduleField('member', event.target.value)}>{children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>
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
            <div className="schedule-form-actions">
              {editingId && <button className="secondary-button" type="button" onClick={cancelScheduleEdit}>취소</button>}
              <button className="primary-button" type="submit">{editingId ? <Check size={17} /> : <Plus size={17} />}{editingId ? '수정 완료' : `${season} 일정 추가`}</button>
            </div>
            {scheduleError && <p className="form-error schedule-form-error" role="alert">{scheduleError}</p>}
          </form></> : <div className="settings-empty child-onboarding-empty"><GraduationCap /><strong>자녀 일정을 시작해 보세요</strong><span>자녀 추가 → 학기·방학 설정 → 학교·학원 일정 등록</span>{canEdit && <button className="primary-button" type="button" onClick={onOpenProfiles}><Plus /> 자녀 추가</button>}</div>}
        </section>

      {children.length > 0 && <section className="saved-child-schedules">
        <div className="section-heading"><div><span className="eyebrow">현재 기간에 달력 반영</span><h2>등록 일정</h2></div><span className="count-badge">{currentSchedules.length}</span></div>
        <div className="child-schedule-list current-child-schedule-list">
          {currentSchedules.map((schedule) => <ManagedChildScheduleRow
            key={schedule.id}
            schedule={schedule}
            canEdit={canEdit}
            onEdit={canEdit ? () => editSchedule(schedule) : undefined}
            onDelete={canEdit ? () => deleteSchedule(schedule) : undefined}
          />)}
          {!currentSchedules.length && <div className="empty-state card"><GraduationCap /><strong>현재 적용 중인 일정이 없습니다</strong><span>현재 학기·방학 기간에 맞는 일정을 추가하세요.</span></div>}
        </div>
        {sortedInactiveScheduleGroups.length > 0 && <section className="inactive-child-schedules" aria-labelledby="inactive-child-schedules-title">
          <div className="inactive-child-schedules-heading"><h3 id="inactive-child-schedules-title">지난·예정 일정</h3><span>기간별로 접어 두었습니다.</span></div>
          {sortedInactiveScheduleGroups.map((group) => {
            const member = profiles.find((profile) => profile.id === group.member)
            const statusLabel = group.status === 'past' ? '지난 기간' : group.status === 'upcoming' ? '예정 기간' : '기간 미지정'
            const rangeLabel = group.period ? `${group.period.start} ~ ${group.period.end}` : '적용 기간을 등록해 주세요.'
            return <details className={`inactive-child-schedule-group ${group.status === 'past' ? 'past-child-schedule-group' : ''}`} key={group.key}>
              <summary><span><Avatar memberId={group.member} /><strong>{member?.name || '자녀'} · {group.season}</strong><small>{statusLabel} · {rangeLabel}</small></span><em>{group.schedules.length}</em><ChevronDown aria-hidden="true" /></summary>
              <div className="child-schedule-list inactive-child-schedule-list">
                {group.schedules.map((schedule) => <ManagedChildScheduleRow
                  key={schedule.id}
                  schedule={schedule}
                  canEdit={canEdit}
                  onEdit={canEdit ? () => editSchedule(schedule) : undefined}
                  onDelete={canEdit ? () => deleteSchedule(schedule) : undefined}
                />)}
              </div>
            </details>
          })}
        </section>}
      </section>}</>}

      <ScheduleActionSheet
        open={Boolean(actionAnniversary)}
        title={actionAnniversary ? anniversaryTitle(actionAnniversary) : ''}
        onClose={() => setActionAnniversary(null)}
        onEdit={actionAnniversary ? () => editAnniversary(actionAnniversary) : undefined}
        onDelete={actionAnniversary ? () => deleteAnniversary(actionAnniversary) : undefined}
        returnFocusRef={anniversaryActionTriggerRef}
      />
      <ScheduleActionSheet
        open={Boolean(actionProfile)}
        title={actionProfile ? `${children.find((child) => child.id === actionProfile.member)?.name || '자녀'} 학교 정보` : ''}
        onClose={() => setActionProfile(null)}
        onEdit={actionProfile ? () => editProfile(actionProfile.member) : undefined}
        onDelete={actionProfile ? () => deleteProfile(actionProfile) : undefined}
        returnFocusRef={profileActionTriggerRef}
      />
      <ScheduleActionSheet
        open={Boolean(actionPeriod)}
        title={actionPeriod ? `${actionPeriod.season} ${actionPeriod.start} ~ ${actionPeriod.end}` : ''}
        onClose={() => setActionPeriod(null)}
        onEdit={actionPeriod ? () => editPeriod(actionPeriod) : undefined}
        onDelete={actionPeriod ? () => deletePeriod(actionPeriod) : undefined}
        returnFocusRef={periodActionTriggerRef}
      />
    </div>
  )
}

function ReminderPicker({ value, onChange }) {
  const selected = new Set(value)
  const toggle = (id) => onChange(selected.has(id) ? value.filter((item) => item !== id) : [...value, id])
  return <fieldset className="reminder-field"><legend>알림 <small>중복 선택 가능</small></legend><div className="reminder-options">
    {REMINDER_OPTIONS.map((option) => <label key={option.id}><input type="checkbox" checked={selected.has(option.id)} onChange={() => toggle(option.id)} /><span>{option.label}</span></label>)}
  </div></fieldset>
}

function Modal({ type, date, today, item, defaults = {}, getConflictEventsForDate, onAfterSave, onNavigateAfterSave, onClose, onAddEvent, onUpdateEvent, onDeleteEvent, onAddTask, onUpdateTask, onDeleteTask, returnFocusRef }) {
  const dialogRef = useModalAccessibility(true, onClose, returnFocusRef)
  const { activeProfiles, children } = useFamilyProfiles()
  const selectableMembers = [FAMILY_MEMBER, ...activeProfiles]
  const isTask = type === 'task'
  const isEditing = Boolean(item?.id)
  const recentEventDefaults = !isTask && !item ? load('family-scheduler-recent-event-v1', {}) : {}
  const requestedCalendarScope = item ? eventCalendarScope(item) : defaults.calendarScope || recentEventDefaults.calendarScope || 'family'
  const [calendarScope, setCalendarScope] = useState(requestedCalendarScope === 'children' && children.length ? 'children' : 'family')
  const [childKind, setChildKind] = useState(item?.kind === '학교' ? '학교' : item?.kind === '학원' ? '학원' : recentEventDefaults.childKind || '학원')
  const [title, setTitle] = useState(item?.title || defaults.title || '')
  const [eventDate, setEventDate] = useState(item?.date || defaults.date || date || iso(today))
  const [eventEndDate, setEventEndDate] = useState(item?.endDate || defaults.endDate || item?.date || defaults.date || date || iso(today))
  const [eventDateError, setEventDateError] = useState('')
  const [time, setTime] = useState(item?.time || defaults.time || recentEventDefaults.time || '오전 9:00')
  const [end, setEnd] = useState(item?.end || defaults.end || recentEventDefaults.end || '오전 10:00')
  const [hasTime, setHasTime] = useState(() => item || defaults.time ? Boolean((item?.time || defaults.time) && (item?.time || defaults.time) !== '종일') : Boolean(recentEventDefaults.hasTime))
  const [hasEndTime, setHasEndTime] = useState(() => item || defaults.time || defaults.end ? Boolean(item?.end || defaults.end) : Boolean(recentEventDefaults.hasEndTime))
  const [showAdvanced, setShowAdvanced] = useState(() => isTask
    ? Boolean(item?.time || defaults.time || reminderValuesFor(item).length || item?.recurrence || reminderValuesFor(defaults).length || defaults.recurrence)
    : Boolean(item))
  const [location, setLocation] = useState(item?.location || defaults.location || '')
  const defaultMember = item?.member || item?.assignee || defaults.member || recentEventDefaults.members?.[0] || activeProfiles[0]?.id || FAMILY_MEMBER.id
  const [selectedMembers, setSelectedMembers] = useState(() => {
    const stored = isTask ? (item?.assignees || defaults.assignees) : (item?.members || defaults.members || recentEventDefaults.members)
    return Array.isArray(stored) && stored.length ? stored : [defaultMember]
  })
  const member = selectedMembers[0] || FAMILY_MEMBER.id
  const [category, setCategory] = useState(item?.category || defaults.category || '집안일')
  const [startDate, setStartDate] = useState(item?.startDate || defaults.startDate || (isTask && !item ? iso(today) : ''))
  const [dueDate, setDueDate] = useState(item?.dueDate || defaults.dueDate || '')
  const [completedDate, setCompletedDate] = useState(item?.completedDate || defaults.completedDate || '')
  const [reminders, setReminders] = useState(() => reminderValuesFor(item).length ? reminderValuesFor(item) : reminderValuesFor(defaults))
  const [repeatFrequency, setRepeatFrequency] = useState(item?.recurrence?.frequency || defaults.recurrence?.frequency || 'none')
  const [repeatInterval, setRepeatInterval] = useState(item?.recurrence?.interval || defaults.recurrence?.interval || 1)
  const [repeatUntil, setRepeatUntil] = useState(item?.recurrence?.until || defaults.recurrence?.until || '')
  const recurrence = repeatFrequency === 'none' ? null : { frequency: repeatFrequency, interval: Math.max(1, Number(repeatInterval) || 1), until: repeatUntil }
  const conflictingEvents = (() => {
    if (isTask || !hasTime || !hasEndTime || !eventDate || !getConflictEventsForDate) return []
    const selectedSet = new Set(selectedMembers)
    return getConflictEventsForDate(eventDate).filter((candidate) => {
      if (candidate.id === item?.id || (item?.id && candidate.seriesId === item.id) || !candidate.end) return false
      if (!assignedMemberIds(candidate).some((memberId) => selectedSet.has(memberId))) return false
      return timeToMinutes(time) < timeToMinutes(candidate.end) && timeToMinutes(candidate.time) < timeToMinutes(end)
    })
  })()
  const toggleMember = (memberId) => setSelectedMembers((current) => {
    if (memberId === FAMILY_MEMBER.id) return [FAMILY_MEMBER.id]
    const withoutFamily = current.filter((id) => id !== FAMILY_MEMBER.id)
    if (withoutFamily.includes(memberId)) return withoutFamily.length > 1 ? withoutFamily.filter((id) => id !== memberId) : withoutFamily
    return [...withoutFamily, memberId]
  })
  const changeCalendarScope = (nextScope) => {
    setCalendarScope(nextScope)
    if (nextScope === 'children' && !selectedMembers.some((memberId) => children.some((child) => child.id === memberId))) {
      setSelectedMembers([children[0].id])
    }
  }
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
    const submittedEventEndDate = String(submitted.get('eventEndDate') || (showAdvanced ? eventEndDate : submittedEventDate) || submittedEventDate)
    const submittedStartDate = String(submitted.get('startDate') || startDate)
    const submittedDueDate = String(submitted.get('dueDate') || dueDate)
    const submittedCompletedDate = String(submitted.get('completedDate') || completedDate)
    if (!isTask && submittedEventEndDate < submittedEventDate) {
      setEventDateError('종료일자는 시작일자보다 빠를 수 없습니다.')
      return
    }
    const repeatValue = recurrence || undefined
    if (isTask && recurrence && !submittedDueDate) {
      setEventDateError('반복 할 일은 첫 날짜를 선택해 주세요.')
      return
    }
    const reminder = reminders[0] || 'none'
    if (isTask && isEditing) onUpdateTask({ ...item, title: title.trim(), category, assignee: member, assignees: selectedMembers, startDate: submittedStartDate, dueDate: submittedDueDate, completedDate: submittedCompletedDate, done: Boolean(submittedCompletedDate), time: hasTime ? time : '', end: hasTime && hasEndTime ? end : '', reminder, reminders, recurrence: repeatValue })
    else if (isTask) onAddTask({ title: title.trim(), category, assignee: member, assignees: selectedMembers, startDate: submittedStartDate, dueDate: submittedDueDate, completedDate: submittedCompletedDate, done: Boolean(submittedCompletedDate), time: hasTime ? time : '', end: hasTime && hasEndTime ? end : '', reminder, reminders, recurrence: repeatValue, completedDates: [], skippedDates: [] })
    else if (isEditing) onUpdateEvent({ ...item, title: title.trim(), date: submittedEventDate, endDate: submittedEventEndDate, time: hasTime ? time : '종일', end: hasTime && hasEndTime ? end : '', location, member, members: selectedMembers, reminder, reminders, recurrence: repeatValue, type: calendarScope === 'children' ? 'child' : 'family', calendarScope, kind: calendarScope === 'children' ? childKind : undefined })
    else onAddEvent({ title: title.trim(), date: submittedEventDate, endDate: submittedEventEndDate, time: hasTime ? time : '종일', end: hasTime && hasEndTime ? end : '', location, member, members: selectedMembers, reminder, reminders, recurrence: repeatValue, type: calendarScope === 'children' ? 'child' : 'family', calendarScope, kind: calendarScope === 'children' ? childKind : undefined })
    if (!isTask) {
      try { window.localStorage.setItem('family-scheduler-recent-event-v1', JSON.stringify({ calendarScope, childKind, members: selectedMembers, hasTime, hasEndTime, time, end })) } catch { /* 최근 입력값 저장 실패는 일정 저장을 막지 않습니다. */ }
    }
    onAfterSave?.(isTask ? submittedDueDate : submittedEventDate)
    if (!isTask) onNavigateAfterSave?.(submittedEventDate, calendarScope)
    onClose()
  }
  const removeItem = () => {
    if (isTask) onDeleteTask(item.id)
    else onDeleteEvent(item.id)
    onClose()
  }
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form ref={dialogRef} tabIndex="-1" className="modal form-modal" role="dialog" aria-modal="true" aria-labelledby="event-modal-title" onSubmit={submit}>
        <div className="modal-heading"><div><span className="eyebrow">Family Scheduler</span><h2 id="event-modal-title">{isTask ? (isEditing ? '할 일 수정' : '할 일 추가') : isEditing ? '일정 수정' : '일정 추가'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="닫기"><X /></button></div>
        <div className="modal-scroll-body">
        <label>제목<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={isTask ? '무엇을 해야 하나요?' : '어떤 일정인가요?'} /></label>
        {!isTask && !showAdvanced && <label>날짜<input name="eventDate" type="date" value={eventDate} required onInput={(event) => changeEventStartDate(event.currentTarget.value)} onChange={(event) => changeEventStartDate(event.currentTarget.value)} /></label>}
        {!isTask && children.length > 0 && <fieldset className="calendar-scope-field"><legend>일정 종류</legend><div className="segmented wide">
          <button type="button" className={calendarScope === 'family' ? 'active' : ''} aria-pressed={calendarScope === 'family'} onClick={() => changeCalendarScope('family')}>가족</button>
          <button type="button" className={calendarScope === 'children' ? 'active' : ''} aria-pressed={calendarScope === 'children'} onClick={() => changeCalendarScope('children')}>자녀</button>
        </div></fieldset>}
        {!isTask && calendarScope === 'children' && <fieldset className="child-kind-field"><legend>자녀 일정 구분</legend><div className="segmented wide">
          <button type="button" className={childKind === '학교' ? 'active' : ''} aria-pressed={childKind === '학교'} onClick={() => setChildKind('학교')}>학교</button>
          <button type="button" className={childKind === '학원' ? 'active' : ''} aria-pressed={childKind === '학원'} onClick={() => setChildKind('학원')}>학원</button>
        </div></fieldset>}
        <fieldset><legend>담당자 <small>여러 명 선택 가능</small></legend><div className="member-picker">{selectableMembers.map((person) => <button type="button" key={person.id} className={selectedMembers.includes(person.id) ? 'active' : ''} aria-pressed={selectedMembers.includes(person.id)} onClick={() => toggleMember(person.id)}><Avatar memberId={person.id} />{person.name}</button>)}</div></fieldset>
        {!isTask && <button type="button" className={`advanced-toggle ${showAdvanced ? 'active' : ''}`} aria-expanded={showAdvanced} onClick={() => setShowAdvanced((current) => !current)}><Settings2 /> <span><strong>시간·장소·반복 설정</strong><small>{showAdvanced ? '추가 설정 닫기' : '필요할 때만 펼치기'}</small></span><ChevronRight /></button>}
        {!isTask && showAdvanced && <fieldset className="event-date-field"><legend>일정 기간</legend>
          <div className="field-row event-date-row">
            <label>시작일자<input name="eventDate" type="date" value={eventDate} required onInput={(event) => changeEventStartDate(event.currentTarget.value)} onChange={(event) => changeEventStartDate(event.currentTarget.value)} /></label>
            <label>종료일자<input name="eventEndDate" type="date" min={eventDate} value={eventEndDate} required onInput={(event) => { setEventEndDate(event.currentTarget.value); setEventDateError('') }} onChange={(event) => { setEventEndDate(event.currentTarget.value); setEventDateError('') }} /></label>
          </div>
          <small className="field-help">두 날짜가 같으면 당일 일정, 다르면 해당 기간에 계속 표시됩니다.</small>
          {eventDateError && <p className="form-error event-date-error" role="alert">{eventDateError}</p>}
        </fieldset>}
        {!isTask && showAdvanced && <fieldset className="all-day-field"><legend>시간</legend><div className="segmented event-time-mode">
          <button type="button" className={!hasTime ? 'active' : ''} aria-pressed={!hasTime} onClick={() => setHasTime(false)}>종일</button>
          <button type="button" className={hasTime && !hasEndTime ? 'active' : ''} aria-pressed={hasTime && !hasEndTime} onClick={() => { setHasTime(true); setHasEndTime(false) }}>시작만</button>
          <button type="button" className={hasTime && hasEndTime ? 'active' : ''} aria-pressed={hasTime && hasEndTime} onClick={() => { setHasTime(true); setHasEndTime(true) }}>시작·종료</button>
        </div></fieldset>}
        {!isTask && showAdvanced && hasTime && <div className={`modal-time-row ${hasEndTime ? '' : 'single'}`}>
          <fieldset className="time-field"><legend>시작 시간</legend><TimePicker label="시작 시간" value={time} fallback="오전 9:00" onChange={setTime} /></fieldset>
          {hasEndTime && <fieldset className="time-field"><legend>종료 시간</legend><TimePicker label="종료 시간" value={end} fallback="오전 10:00" onChange={setEnd} /></fieldset>}
        </div>}
        {!isTask && showAdvanced && conflictingEvents.length > 0 && <div className="form-warning" role="status"><AlertTriangle /><span><strong>시간이 겹치는 일정이 있습니다.</strong>{conflictingEvents.slice(0, 2).map((event) => event.title).join(' · ')}</span></div>}
        {!isTask && showAdvanced && <ReminderPicker value={reminders} onChange={setReminders} />}
        {!isTask && showAdvanced && <label>장소<input value={location} onChange={(event) => setLocation(event.target.value)} /></label>}
        {isTask && <label>분류<select value={category} onChange={(event) => setCategory(event.target.value)}><option>긴급</option><option>장보기</option><option>집안일</option></select></label>}
        {isTask && <fieldset className="task-date-field"><legend>할 일 날짜</legend><div className="task-date-row">
          <label>시작일자<input name="startDate" type="date" value={startDate} onInput={(event) => setStartDate(event.currentTarget.value)} onChange={(event) => setStartDate(event.currentTarget.value)} /></label>
          <label>마감일자<input name="dueDate" type="date" value={dueDate} onInput={(event) => setDueDate(event.currentTarget.value)} onChange={(event) => setDueDate(event.currentTarget.value)} /></label>
          <label>완료일자<input name="completedDate" type="date" value={completedDate} onInput={(event) => setCompletedDate(event.currentTarget.value)} onChange={(event) => setCompletedDate(event.currentTarget.value)} /></label>
        </div></fieldset>}
        {isTask && <button type="button" className={`advanced-toggle ${showAdvanced ? 'active' : ''}`} aria-expanded={showAdvanced} onClick={() => setShowAdvanced((current) => !current)}><Settings2 /> <span><strong>시간·알림·반복 설정</strong><small>{showAdvanced ? '추가 설정 닫기' : '필요할 때만 펼치기'}</small></span><ChevronRight /></button>}
        {isTask && showAdvanced && <fieldset className="all-day-field"><legend>시간</legend><div className="segmented event-time-mode">
          <button type="button" className={!hasTime ? 'active' : ''} aria-pressed={!hasTime} onClick={() => setHasTime(false)}>시간 없음</button>
          <button type="button" className={hasTime && !hasEndTime ? 'active' : ''} aria-pressed={hasTime && !hasEndTime} onClick={() => { setHasTime(true); setHasEndTime(false) }}>시작만</button>
          <button type="button" className={hasTime && hasEndTime ? 'active' : ''} aria-pressed={hasTime && hasEndTime} onClick={() => { setHasTime(true); setHasEndTime(true) }}>시작·종료</button>
        </div></fieldset>}
        {isTask && showAdvanced && hasTime && <div className={`modal-time-row ${hasEndTime ? '' : 'single'}`}>
          <fieldset className="time-field"><legend>시작 시간</legend><TimePicker label="시작 시간" value={time} fallback="오전 9:00" onChange={setTime} /></fieldset>
          {hasEndTime && <fieldset className="time-field"><legend>종료 시간</legend><TimePicker label="종료 시간" value={end} fallback="오전 10:00" onChange={setEnd} /></fieldset>}
        </div>}
        {isTask && showAdvanced && <ReminderPicker value={reminders} onChange={setReminders} />}
        {showAdvanced && <fieldset className="repeat-field"><legend>{isTask ? '반복 할 일' : '반복'}</legend><div className="repeat-controls">
          <select aria-label="반복 주기" value={repeatFrequency} onChange={(event) => setRepeatFrequency(event.target.value)}>
            <option value="none">반복 안 함</option>{!isTask && <option value="daily">매일</option>}<option value="weekly">매주</option><option value="monthly">매월</option>{!isTask && <option value="yearly">매년</option>}
          </select>
          {repeatFrequency !== 'none' && <><label>간격<input type="number" min="1" max="99" value={repeatInterval} onChange={(event) => setRepeatInterval(event.target.value)} /></label><label>종료일<input type="date" min={isTask ? dueDate : eventDate} value={repeatUntil} onChange={(event) => setRepeatUntil(event.target.value)} /></label></>}
        </div></fieldset>}
        {isTask && eventDateError && <p className="form-error event-date-error" role="alert">{eventDateError}</p>}
        </div>
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
  const dialogRef = useModalAccessibility(Boolean(event), onClose)
  if (!event) return null
  return (
    <div className="modal-backdrop" onMouseDown={(click) => click.target === click.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex="-1" className="modal recurring-dialog" role="dialog" aria-modal="true" aria-labelledby="recurring-dialog-title">
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

function BackupPreviewDialog({ preview, onClose, onConfirm }) {
  const dialogRef = useModalAccessibility(Boolean(preview), onClose)
  if (!preview) return null
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} tabIndex="-1" className="modal backup-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="backup-preview-title">
      <div className="modal-heading"><div><span className="eyebrow">덮어쓰기 전 확인</span><h2 id="backup-preview-title">백업 내용을 확인해 주세요</h2></div><button className="icon-button" onClick={onClose} aria-label="백업 미리보기 닫기"><X /></button></div>
      <p><strong>{preview.fileName}</strong>의 내용으로 현재 가족 데이터를 대체합니다. 적용 후에도 실행 취소할 수 있습니다.</p>
      <div className="backup-preview-grid">{preview.summary.counts.filter((item) => item.count > 0).map((item) => <span key={item.key}><strong>{item.count}</strong>{item.label}</span>)}</div>
      <small>백업 형식 v{preview.summary.schemaVersion}{preview.summary.exportedAt ? ` · ${new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(preview.summary.exportedAt))}` : ''}</small>
      <div className="modal-actions"><button className="secondary-button" onClick={onClose}>취소</button><button className="primary-button" data-autofocus onClick={onConfirm}><Upload /> 이 내용 불러오기</button></div>
    </section>
  </div>
}

function UndoToast({ toast, onUndo, onClose }) {
  if (!toast) return null
  return <div className="undo-toast" role="status"><span>{toast.message}</span><button onClick={onUndo}><RotateCcw /> 실행 취소</button><button className="toast-close" onClick={onClose} aria-label="알림 닫기"><X /></button></div>
}

function AppUpdateBanner({ onUpdate, onClose }) {
  return <div className="app-update-banner" role="status">
    <span><strong>새 버전이 준비됐습니다.</strong>저장된 일정은 그대로 유지됩니다.</span>
    <button onClick={onUpdate}>지금 업데이트</button>
    <button className="update-close" onClick={onClose} aria-label="업데이트 안내 닫기"><X /></button>
  </div>
}

export default function App() {
  const today = useToday()
  const { alert, confirm } = useAppDialog()
  const [view, setView] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('view')
    return NAV.some((item) => item.id === requested) ? requested : 'home'
  })
  const [profiles, setProfiles] = useState(() => migrateMemberProfiles(load('family-scheduler-profiles-v1', hasLegacyLocalData(LEGACY_STORAGE_KEYS) ? LEGACY_PROFILES : [])))
  const [events, setEvents] = useState(() => normalizeEventCalendarScopes(
    loadWithoutLegacySeeds('family-scheduler-events', defaultEvents, LEGACY_EVENT_IDS).map((event) => (
      event.member === 'mia' && event.title === '미아 생일' ? { ...event, title: '연두 생일' } : event
    )),
    profiles,
  ))
  const [tasks, setTasks] = useState(() => loadWithoutLegacySeeds('family-scheduler-tasks', defaultTasks, LEGACY_TASK_IDS))
  const [shifts, setShifts] = useState(() => loadRecoveredCollection(
    'family-scheduler-shifts',
    defaultShifts,
    RECOVERED_SHIFTS,
    (item) => `${item.member}-${item.date}`,
    'family-scheduler-shifts-recovery-version',
    DATA_RECOVERY_VERSION,
  ))
  const [workSettings, setWorkSettings] = useState(() => load('family-scheduler-work-settings-v1', defaultWorkSettingsFor(profiles, shifts)))
  const [profileLinks, setProfileLinks] = useState(() => load('family-scheduler-profile-links-v1', {}))
  const [childSchedules, setChildSchedules] = useState(() => loadWithoutLegacySeeds('family-scheduler-child-schedules-v1', defaultChildSchedules, LEGACY_CHILD_SCHEDULE_IDS))
  const [childProfiles, setChildProfiles] = useState(() => load('family-scheduler-child-profiles-v1', profiles.filter((profile) => profile.type === 'child').map((profile) => emptyChildProfile(profile.id))))
  const [schedulePeriods, setSchedulePeriods] = useState(() => loadWithoutLegacySeeds('family-scheduler-periods-v1', defaultSchedulePeriods, LEGACY_PERIOD_IDS))
  const [anniversaries, setAnniversaries] = useState(() => loadRecoveredCollection(
    'family-scheduler-anniversaries-v1',
    defaultAnniversaries,
    RECOVERED_ANNIVERSARIES,
    (item) => `${item.name}-${item.kind}-${item.calendarType}-${item.month}-${item.day}`,
    'family-scheduler-anniversaries-recovery-version',
    DATA_RECOVERY_VERSION,
  ))
  const [scheduleExceptions, setScheduleExceptions] = useState(() => load('family-scheduler-schedule-exceptions-v1', defaultScheduleExceptions))
  const [modal, setModal] = useState(null)
  const modalTriggerRef = useRef(null)
  const [focusMode, setFocusMode] = useState(false)
  const [calendarMode, setCalendarMode] = useState('all')
  const [familyPanelOpen, setFamilyPanelOpen] = useState(false)
  const [familySettingsOpen, setFamilySettingsOpen] = useState(() => !profiles.some((profile) => profile.active !== false))
  const [recurringEvent, setRecurringEvent] = useState(null)
  const [scheduleEditRequest, setScheduleEditRequest] = useState(null)
  const [profileEditRequest, setProfileEditRequest] = useState(null)
  const [undoToast, setUndoToast] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [calendarJumpDate, setCalendarJumpDate] = useState(null)
  const [collaborationEvent, setCollaborationEvent] = useState(null)
  const [backupPreview, setBackupPreview] = useState(null)
  const [updateWorker, setUpdateWorker] = useState(null)

  usePersistedValue('family-scheduler-profiles-v1', profiles)
  usePersistedValue('family-scheduler-events', events)
  usePersistedValue('family-scheduler-tasks', tasks)
  usePersistedValue('family-scheduler-shifts', shifts)
  usePersistedValue('family-scheduler-child-schedules-v1', childSchedules)
  usePersistedValue('family-scheduler-child-profiles-v1', childProfiles)
  usePersistedValue('family-scheduler-periods-v1', schedulePeriods)
  usePersistedValue('family-scheduler-anniversaries-v1', anniversaries)
  usePersistedValue('family-scheduler-schedule-exceptions-v1', scheduleExceptions)
  usePersistedValue('family-scheduler-work-settings-v1', workSettings)
  usePersistedValue('family-scheduler-profile-links-v1', profileLinks)
  const sharedState = useMemo(() => ({
    schemaVersion: 7,
    recoveryVersion: DATA_RECOVERY_VERSION,
    profiles,
    workSettings,
    profileLinks,
    events,
    tasks,
    shifts,
    childSchedules,
    childProfiles,
    schedulePeriods,
    anniversaries,
    scheduleExceptions,
  }), [profiles, workSettings, profileLinks, events, tasks, shifts, childSchedules, childProfiles, schedulePeriods, anniversaries, scheduleExceptions])

  const applySharedState = useCallback((nextState) => {
    const restoredState = upgradeSharedState(nextState)
    if (!restoredState || typeof restoredState !== 'object') return
    if (Array.isArray(restoredState.profiles)) setProfiles(restoredState.profiles)
    if (restoredState.workSettings && typeof restoredState.workSettings === 'object') setWorkSettings(restoredState.workSettings)
    if (restoredState.profileLinks && typeof restoredState.profileLinks === 'object') setProfileLinks(restoredState.profileLinks)
    if (Array.isArray(restoredState.events)) setEvents(restoredState.events)
    if (Array.isArray(restoredState.tasks)) setTasks(restoredState.tasks)
    if (Array.isArray(restoredState.shifts)) setShifts(restoredState.shifts)
    if (Array.isArray(restoredState.childSchedules)) setChildSchedules(restoredState.childSchedules)
    if (Array.isArray(restoredState.childProfiles)) setChildProfiles(restoredState.childProfiles)
    if (Array.isArray(restoredState.schedulePeriods)) setSchedulePeriods(restoredState.schedulePeriods)
    if (Array.isArray(restoredState.anniversaries)) setAnniversaries(restoredState.anniversaries)
    if (Array.isArray(restoredState.scheduleExceptions)) setScheduleExceptions(restoredState.scheduleExceptions)
  }, [])

  const sync = useFamilySync({ localState: sharedState, onRemoteState: applySharedState })
  const pushNotifications = usePushNotifications({ session: sync.session, family: sync.family })
  const canEdit = !sync.family || sync.family.membership.can_edit

  useEffect(() => {
    const handleUpdateReady = (event) => setUpdateWorker(event.detail?.worker || null)
    window.addEventListener('family-scheduler:update-ready', handleUpdateReady)
    return () => window.removeEventListener('family-scheduler:update-ready', handleUpdateReady)
  }, [])

  const applyAppUpdate = () => {
    if (!updateWorker) return
    navigator.serviceWorker?.addEventListener('controllerchange', () => window.location.reload(), { once: true })
    updateWorker.postMessage({ type: 'SKIP_WAITING' })
  }

  useEffect(() => {
    if (!undoToast) return undefined
    const timeout = window.setTimeout(() => setUndoToast(null), 6000)
    return () => window.clearTimeout(timeout)
  }, [undoToast])

  const notifyUndo = (message, undo) => setUndoToast({ message, undo })

  const addEvent = (event) => setEvents((current) => [...current, { ...event, id: createId('event') }])
  const updateEvent = (updatedEvent) => setEvents((current) => current.map((event) => event.id === updatedEvent.id ? updatedEvent : event))
  const deleteEvent = (eventId) => {
    const removed = events.find((event) => event.id === eventId)
    const removedExceptions = scheduleExceptions.filter((exception) => exception.scheduleId === eventId)
    setEvents((current) => current.filter((event) => event.id !== eventId))
    setScheduleExceptions((current) => current.filter((exception) => exception.scheduleId !== eventId))
    if (removed) notifyUndo(`‘${removed.title}’ 일정을 삭제했습니다.`, () => {
      setEvents((current) => [...current, removed])
      setScheduleExceptions((current) => [...current, ...removedExceptions])
    })
  }
  const addTask = (task) => {
    const createdDate = iso(new Date())
    setTasks((current) => [...current, {
      ...task,
      id: createId('task'),
      createdDate,
      startDate: task.startDate || createdDate,
      done: Boolean(task.completedDate || task.done),
    }])
  }
  const updateTask = (updatedTask) => setTasks((current) => current.map((task) => task.id === updatedTask.id ? updatedTask : task))
  const deleteTask = (taskId) => {
    const removed = tasks.find((task) => task.id === taskId)
    setTasks((current) => current.filter((task) => task.id !== taskId))
    if (removed) notifyUndo(`‘${removed.title}’ 할 일을 삭제했습니다.`, () => setTasks((current) => [...current, removed]))
  }
  const openModal = (type, date, item, defaults = {}, onAfterSave) => {
    modalTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setModal({ type, date, item, defaults, onAfterSave })
  }
  const changeView = (nextView) => {
    if (nextView === 'calendar') setCalendarMode('all')
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
      endDate: event.endDate,
      time: event.time,
      end: event.end,
      location: event.location,
      member: event.member,
      members: event.members,
      reminder: event.reminder,
      recurrence: undefined,
      calendarScope: event.calendarScope,
    }, () => {
      const exception = { id: `skip-${event.scheduleId}-${event.date}`, scheduleId: event.scheduleId, date: event.date, type: 'skip' }
      setScheduleExceptions((current) => current.some((item) => item.id === exception.id) ? current : [...current, exception])
    })
  }

  const editRecurringSeries = (event) => {
    setRecurringEvent(null)
    if (event?.recurrenceType === 'event') {
      const source = events.find((item) => item.id === event.seriesId)
      if (source) openModal('event', source.date, source)
      return
    }
    setScheduleEditRequest(event?.scheduleId)
    changeView('schedules')
  }

  const deleteRecurringSeries = async (event) => {
    if (event?.recurrenceType === 'event') {
      const removedEvent = events.find((item) => item.id === event.seriesId)
      const removedExceptions = scheduleExceptions.filter((exception) => exception.scheduleId === event.seriesId)
      if (!removedEvent || !await confirm(`‘${event.title}’ 전체 반복 일정을 삭제할까요?`)) return
      setEvents((current) => current.filter((item) => item.id !== event.seriesId))
      setScheduleExceptions((current) => current.filter((exception) => exception.scheduleId !== event.seriesId))
      notifyUndo(`‘${event.title}’ 전체 반복 일정을 삭제했습니다.`, () => {
        setEvents((current) => [...current, removedEvent])
        setScheduleExceptions((current) => [...current, ...removedExceptions])
      })
      setRecurringEvent(null)
      return
    }
    const removedSchedule = childSchedules.find((schedule) => schedule.id === event.scheduleId)
    const removedExceptions = scheduleExceptions.filter((exception) => exception.scheduleId === event.scheduleId)
    if (!removedSchedule || !await confirm(`‘${event.title}’ 전체 반복 일정을 삭제할까요?`)) return
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
      const summary = inspectBackup(imported)
      setBackupPreview({ imported, summary, fileName: file.name })
    } catch (error) {
      await alert(error.message || 'Family Scheduler 백업 파일인지 확인해 주세요.')
    }
  }

  const confirmBackupImport = () => {
    const previous = sharedState
    applySharedState(backupPreview.imported)
    setBackupPreview(null)
    notifyUndo('백업 데이터를 불러왔습니다.', () => applySharedState(previous))
  }

  const openGeneralCalendar = () => {
    setCalendarMode('all')
    changeView('calendar')
  }

  const openCalendarDate = (date, nextMode = 'all') => {
    setCalendarJumpDate(iso(date))
    setCalendarMode(nextMode)
    setView('calendar')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const navigateAfterEventSave = (dateValue, nextMode) => {
    setCalendarJumpDate(dateValue)
    setCalendarMode(nextMode)
    setView('calendar')
  }

  const openChildCalendarDate = (date) => openCalendarDate(date, 'children')

  const openSearchResult = (event) => {
    setSearchOpen(false)
    setCalendarJumpDate(event.date)
    setCalendarMode(isChildCalendarEvent(event) ? 'children' : 'family')
    changeView('calendar')
  }

  const activeProfiles = useMemo(() => profiles.filter((profile) => profile.active !== false), [profiles])
  const children = useMemo(() => activeProfiles.filter((profile) => profile.type === 'child'), [activeProfiles])
  const shiftOptions = useMemo(() => buildShiftOptions(Array.isArray(workSettings.shiftTypes) && workSettings.shiftTypes.length ? workSettings.shiftTypes : DEFAULT_SHIFT_TYPES), [workSettings.shiftTypes])
  const shiftWorkers = useMemo(() => activeProfiles.filter((profile) => workSettings.workerIds?.includes(profile.id)), [activeProfiles, workSettings.workerIds])
  const familyProfilesValue = useMemo(() => ({ profiles, activeProfiles, children, shiftWorkers, shiftOptions, workSettings }), [profiles, activeProfiles, children, shiftWorkers, shiftOptions, workSettings])
  const focusEvents = eventsForDate(today, events, childSchedules, schedulePeriods, anniversaries, scheduleExceptions)
  const focusShiftMember = workSettings.enabled ? shiftWorkers[0] : null
  const focusShift = shiftEntryFor(shifts, today, focusShiftMember?.id)
  const focusShiftOption = shiftOptions.find((option) => option.id === focusShift?.shift)
  const getConflictEventsForDate = useCallback((dateValue) => eventsForDate(
    new Date(`${dateValue}T00:00:00`),
    events,
    childSchedules,
    schedulePeriods,
    anniversaries,
    scheduleExceptions,
  ), [anniversaries, childSchedules, events, scheduleExceptions, schedulePeriods])

  return (
    <FamilyProfilesContext.Provider value={familyProfilesValue}>
    <div className={`app ${focusMode ? 'focus-mode' : ''}`}>
      <Header active={view} onChange={changeView} focusMode={focusMode} onToggleFocus={toggleFocusMode} onOpenSearch={() => setSearchOpen(true)} />
      <SyncStatusBar sync={sync} />
      {focusMode && <FocusModeBanner shiftOption={focusShiftOption} shiftMember={focusShiftMember} eventCount={focusEvents.length} onClose={toggleFocusMode} />}
      <main>
        {view === 'home' && <HomeView today={today} events={events} childSchedules={childSchedules} schedulePeriods={schedulePeriods} anniversaries={anniversaries} shifts={shifts} tasks={tasks} scheduleExceptions={scheduleExceptions} openCalendar={openGeneralCalendar} openCalendarDate={openCalendarDate} openChildCalendarDate={openChildCalendarDate} openTasks={() => changeView('tasks')} openModal={openModal} openRecurringActions={setRecurringEvent} deleteEvent={deleteEvent} canEdit={canEdit} onOpenSettings={() => setFamilySettingsOpen(true)} sync={sync} onOpenFamily={() => setFamilyPanelOpen(true)} />}
        {view === 'calendar' && <CalendarView key={calendarJumpDate || 'calendar'} today={today} events={events} childSchedules={childSchedules} schedulePeriods={schedulePeriods} anniversaries={anniversaries} setAnniversaries={setAnniversaries} shifts={shifts} setShifts={setShifts} scheduleExceptions={scheduleExceptions} openModal={openModal} deleteEvent={deleteEvent} mode={calendarMode} setMode={setCalendarMode} openRecurringActions={setRecurringEvent} canEdit={canEdit} notifyUndo={notifyUndo} jumpDate={calendarJumpDate} onOpenCollaboration={setCollaborationEvent} />}
        {view === 'tasks' && <TasksView today={today} tasks={tasks} setTasks={setTasks} openModal={openModal} canEdit={canEdit} notifyUndo={notifyUndo} pushStatus={pushNotifications.status} pushError={pushNotifications.error} onEnableNotifications={pushNotifications.enable} />}
        {view === 'schedules' && <SchedulesView today={today} childSchedules={childSchedules} setChildSchedules={setChildSchedules} childProfiles={childProfiles} setChildProfiles={setChildProfiles} schedulePeriods={schedulePeriods} setSchedulePeriods={setSchedulePeriods} anniversaries={anniversaries} setAnniversaries={setAnniversaries} canEdit={canEdit} notifyUndo={notifyUndo} scheduleEditRequest={scheduleEditRequest} onScheduleEditHandled={() => setScheduleEditRequest(null)} profileEditRequest={profileEditRequest} onProfileEditHandled={() => setProfileEditRequest(null)} onOpenProfiles={() => setFamilySettingsOpen(true)} />}
        {view === 'settings' && <Suspense fallback={<div className="page-loading" role="status">설정을 불러오는 중입니다.</div>}><SettingsView appVersion={import.meta.env.VITE_APP_VERSION || 'local'} profiles={profiles} workSettings={workSettings} sync={sync} pushStatus={pushNotifications.status} pushError={pushNotifications.error} onOpenProfiles={() => setFamilySettingsOpen(true)} onOpenFamily={() => setFamilyPanelOpen(true)} onEnableNotifications={pushNotifications.enable} /></Suspense>}
      </main>
      <div className="mobile-nav"><Navigation active={view} onChange={changeView} /></div>
      {modal && <Modal {...modal} today={today} getConflictEventsForDate={getConflictEventsForDate} onNavigateAfterSave={navigateAfterEventSave} onClose={() => setModal(null)} onAddEvent={addEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} onAddTask={addTask} onUpdateTask={updateTask} onDeleteTask={deleteTask} returnFocusRef={modalTriggerRef} />}
      <RecurringActionDialog
        event={recurringEvent}
        onClose={() => setRecurringEvent(null)}
        onEditDate={() => editRecurringDate(recurringEvent)}
        onEditSeries={() => editRecurringSeries(recurringEvent)}
        onSkipDate={() => skipRecurringDate(recurringEvent)}
        onDeleteSeries={() => deleteRecurringSeries(recurringEvent)}
      />
      <BackupPreviewDialog preview={backupPreview} onClose={() => setBackupPreview(null)} onConfirm={confirmBackupImport} />
      <Suspense fallback={null}>
        {familyPanelOpen && <FamilySyncPanel open onClose={() => setFamilyPanelOpen(false)} sync={sync} onExport={exportBackup} onImport={importBackup} profiles={activeProfiles} profileLinks={profileLinks} onLinkProfile={(userId, profileId) => setProfileLinks((current) => ({ ...current, [userId]: profileId }))} />}
        {familySettingsOpen && <FamilySettingsPanel open onClose={() => setFamilySettingsOpen(false)} profiles={profiles} setProfiles={setProfiles} workSettings={workSettings} setWorkSettings={setWorkSettings} canEdit={canEdit} />}
        {collaborationEvent && <EventCollaborationPanel event={collaborationEvent} family={sync.family} session={sync.session} canEdit={canEdit} onClose={() => setCollaborationEvent(null)} />}
      </Suspense>
      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} today={today} events={events} childSchedules={childSchedules} schedulePeriods={schedulePeriods} anniversaries={anniversaries} scheduleExceptions={scheduleExceptions} onSelect={openSearchResult} />
      <UndoToast toast={undoToast} onUndo={() => { undoToast?.undo(); setUndoToast(null) }} onClose={() => setUndoToast(null)} />
      {updateWorker && <AppUpdateBanner onUpdate={applyAppUpdate} onClose={() => setUpdateWorker(null)} />}
    </div>
    </FamilyProfilesContext.Provider>
  )
}

import KoreanLunarCalendar from 'korean-lunar-calendar'
import { iso, startOfToday, validSolarDate, formatSolarDate } from './dates'
import { holidaysForYear, holidayEventsForDate } from './holidays'
import { hasRecurrence, recurringEventForDate } from './recurrence'

export const anniversarySolarOccurrences = (anniversary, solarYear) => {
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

export const nextAnniversaryOccurrence = (anniversary, from = startOfToday()) => {
  for (let year = from.getFullYear(); year <= Math.min(from.getFullYear() + 3, 2050); year += 1) {
    const occurrence = anniversarySolarOccurrences(anniversary, year).find((date) => date >= from)
    if (occurrence) return occurrence
  }
  return null
}

export const anniversaryTitle = (anniversary) => anniversary.kind === '기념일' ? anniversary.name : `${anniversary.name} ${anniversary.kind}`

export const anniversaryMilestoneLabel = (anniversary, occurrence) => {
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

export const activePeriodForDate = (date, periods, member) => {
  const dateValue = iso(date)
  return periods
    .filter((period) => period.start <= dateValue && dateValue <= period.end)
    .filter((period) => !member || !period.member || period.member === 'all' || period.member === member)
    .sort((a, b) => b.start.localeCompare(a.start) || Number(b.member === member) - Number(a.member === member))[0]
}

export const activeSeasonForDate = (date, periods, member) => activePeriodForDate(date, periods, member)?.season

export const scheduleWeekdays = (schedule) => {
  const values = Array.isArray(schedule.weekdays) ? schedule.weekdays : [schedule.weekday]
  return [...new Set(values.map(Number).filter((day) => day >= 0 && day <= 6))].sort((a, b) => a - b)
}

// 기간 구분: 옛 앱은 '학기'/'방학', 새 앱 초기 버전은 'term'/'vacation'으로 저장 → 같은 것으로 비교
export const seasonOf = (value) => value === 'term' ? '학기' : value === 'vacation' ? '방학' : value

export const childEventsForDate = (date, childSchedules, schedulePeriods, scheduleExceptions = []) => {
  const dateValue = iso(date)
  if (holidaysForYear(date.getFullYear()).has(dateValue)) return []
  return childSchedules
    .filter((schedule) => seasonOf(schedule.season) === seasonOf(activeSeasonForDate(date, schedulePeriods, schedule.member)) && scheduleWeekdays(schedule).includes(date.getDay()))
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

export const eventsForDate = (date, events, childSchedules, schedulePeriods, anniversaries = [], scheduleExceptions = []) => {
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

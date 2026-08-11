import { addDays, iso } from './dates'

const DAY_MS = 24 * 60 * 60 * 1000

const localDate = (value) => new Date(`${value}T00:00:00`)

const daysBetween = (start, end) => Math.round((Date.UTC(
  end.getFullYear(), end.getMonth(), end.getDate(),
) - Date.UTC(
  start.getFullYear(), start.getMonth(), start.getDate(),
)) / DAY_MS)

const normalizedInterval = (recurrence) => Math.max(1, Number(recurrence?.interval) || 1)

export const hasRecurrence = (item) => Boolean(item?.recurrence?.frequency && item.recurrence.frequency !== 'none')

export const isRecurrenceStart = (item, candidate) => {
  if (!hasRecurrence(item) || !item.date) return false
  const start = localDate(item.date)
  if (candidate < start) return false
  if (item.recurrence.until && iso(candidate) > item.recurrence.until) return false
  const interval = normalizedInterval(item.recurrence)
  const dayDifference = daysBetween(start, candidate)

  if (item.recurrence.frequency === 'daily') return dayDifference % interval === 0
  if (item.recurrence.frequency === 'weekly') return dayDifference % (7 * interval) === 0
  if (item.recurrence.frequency === 'monthly') {
    const monthDifference = (candidate.getFullYear() - start.getFullYear()) * 12 + candidate.getMonth() - start.getMonth()
    const candidateDay = Math.min(start.getDate(), new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate())
    return monthDifference >= 0 && monthDifference % interval === 0 && candidate.getDate() === candidateDay
  }
  if (item.recurrence.frequency === 'yearly') {
    const yearDifference = candidate.getFullYear() - start.getFullYear()
    const candidateDay = Math.min(start.getDate(), new Date(candidate.getFullYear(), start.getMonth() + 1, 0).getDate())
    return yearDifference >= 0 && yearDifference % interval === 0
      && candidate.getMonth() === start.getMonth() && candidate.getDate() === candidateDay
  }
  return false
}

export const recurringEventForDate = (event, date, exceptions = []) => {
  if (!hasRecurrence(event)) return null
  const duration = Math.max(0, daysBetween(localDate(event.date), localDate(event.endDate || event.date)))
  for (let offset = 0; offset <= Math.min(duration, 366); offset += 1) {
    const occurrenceStart = addDays(date, -offset)
    if (!isRecurrenceStart(event, occurrenceStart)) continue
    const occurrenceDate = iso(occurrenceStart)
    if (exceptions.some((exception) => exception.scheduleId === event.id && exception.date === occurrenceDate && exception.type === 'skip')) return null
    return {
      ...event,
      id: `recurring-event-${event.id}-${occurrenceDate}`,
      seriesId: event.id,
      scheduleId: event.id,
      date: occurrenceDate,
      endDate: iso(addDays(occurrenceStart, duration)),
      recurring: true,
      recurrenceType: 'event',
    }
  }
  return null
}

import { addDays, iso } from '../../lib/dates'
import { eventsForDate } from '../../lib/schedule'
import { assignedMemberIds, DEFAULT_SHIFT_TYPES } from '../../lib/legacyState'
import { hasRecurrence, isRecurrenceStart } from '../../lib/recurrence'

export function clock(value) {
  if (!value || value === '종일') return ''
  if (value === '자정') return '00:00'
  if (value === '정오') return '12:00'
  const match = /^(?:(오전|오후)\s*)?(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return ''
  const hour = match[1] ? Number(match[2]) % 12 + (match[1] === '오후' ? 12 : 0) : Number(match[2])
  return hour < 24 && Number(match[3]) < 60 ? `${String(hour).padStart(2, '0')}:${match[3]}` : ''
}

export function scheduleForDate(state, date) {
  const key = iso(date)
  const events = eventsForDate(date, state.events, state.childSchedules, state.schedulePeriods, state.anniversaries, state.scheduleExceptions)
  const settings = state.workSettings || {}
  const shiftTypes = settings.shiftTypes?.length ? settings.shiftTypes : DEFAULT_SHIFT_TYPES
  const shifts = settings.enabled ? [date, addDays(date, -1)].flatMap((sourceDate, index) => {
    const sourceKey = iso(sourceDate)
    return (settings.workerIds || []).flatMap((member) => {
      const shift = state.shifts.findLast((item) => item.member === member && item.date === sourceKey)
      const option = shiftTypes.find((item) => item.id === shift?.shift)
      if (!option || option.code === 'OFF' || !option.start || !option.end) return []
      const overnight = option.end <= option.start
      if (index && !overnight) return []
      return [{ id: `shift-${member}-${sourceKey}`, date: key, title: `근무 ${option.code}`, member, members: [member],
        time: index ? '00:00' : option.start, end: option.end, type: 'shift',
        crossesMidnight: !index && overnight, carryover: Boolean(index) }]
    })
  }) : []
  return [...events, ...shifts].map((event) => ({ ...event, displayStart: clock(event.time), displayEnd: clock(event.end) }))
    .sort((a, b) => (a.displayStart || '').localeCompare(b.displayStart || '') || a.title.localeCompare(b.title, 'ko'))
}

export const taskOccursOn = (task, date) => {
  const key = iso(date)
  if (hasRecurrence(task)) return !task.skippedDates?.includes(key) && isRecurrenceStart({ ...task, date: task.dueDate }, date)
  return (task.dueDate || task.startDate || task.createdDate) === key
}

export function memberStatus(profile, rows, tasks, now) {
  const key = iso(now)
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const own = rows.filter((row) => assignedMemberIds(row).includes(profile.id) || assignedMemberIds(row).includes('family'))
  const active = own.find((row) => row.displayStart && row.displayStart <= time
    && (row.crossesMidnight || (row.displayEnd && time < row.displayEnd)))
  if (active) return { expression: 'busy', label: `${active.title} ${active.displayStart}–${active.displayEnd || ''}`, shortLabel: active.type === 'shift' ? active.title : `${active.title} 중` }
  const next = own.find((row) => row.displayStart > time)
  if (next) return { expression: 'basic', label: `${next.title} ${next.displayStart}` }
  const ownTasks = tasks.filter((task) => taskOccursOn(task, now)
    && assignedMemberIds(task, 'assignees', 'assignee').some((id) => id === profile.id || id === 'family'))
  const allEnded = own.length > 0 && own.every((row) => row.displayEnd && !row.crossesMidnight && row.displayEnd <= time)
  const tasksDone = ownTasks.every((task) => hasRecurrence(task) ? task.completedDates?.includes(key) : task.done)
  if ((allEnded || (!own.length && ownTasks.length)) && tasksDone) return { expression: 'done', label: '오늘 완료' }
  return { expression: 'basic', label: ownTasks.some((task) => !task.done) ? '할 일 남음' : '쉬는 중' }
}

import { addDays, iso } from '../../lib/dates'
import { eventsForDate } from '../../lib/schedule'
import { assignedMemberIds, DEFAULT_SHIFT_TYPES } from '../../lib/legacyState'
import { hasRecurrence, isRecurrenceStart } from '../../lib/recurrence'
import { holidaysForYear } from '../../lib/holidays'

// 고정 근무(예: 평일 08:00–17:00, 공휴일 쉼). 프로필에 regularWork가 있을 때만. 옛 앱은 이 필드를 모르고 그대로 보존함.
// 연차·반차: regularWork.leaves[날짜] = 'full'|'am'|'pm'. 반차 시간은 고정(오전 08–12, 오후 12:45–17)
export const LEAVES = { full: { label: '연차', code: '연차', full: true, off: '하루 종일' }, am: { label: '오전 반차', code: '오전 반차', off: '08:00–12:00', start: '12:45', end: '17:00' }, pm: { label: '오후 반차', code: '오후 반차', off: '12:45–17:00', start: '08:00', end: '12:00' } }

export function regularWorkRows(state, date, taken) {
  const key = iso(date)
  const holiday = holidaysForYear(date.getFullYear()).has(key)
  return (state.profiles || []).flatMap((profile) => {
    const work = profile.regularWork
    if (!work?.start || !work?.end || profile.active === false || taken.has(profile.id)) return []
    if (!(work.weekdays || [1, 2, 3, 4, 5]).includes(date.getDay()) || (work.skipHolidays !== false && holiday)) return []
    const base = { id: `work-${profile.id}-${key}`, date: key, member: profile.id, members: [profile.id], type: 'shift', regular: true }
    const leave = LEAVES[work.leaves?.[key]]
    if (leave?.full) return [{ ...base, title: '연차', time: '종일', type: 'leave' }]
    return [{ ...base, title: leave ? `근무 · ${leave.label}` : '근무', time: leave?.start || work.start, end: leave?.end || work.end }]
  })
}

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
      return [{ id: `shift-${member}-${sourceKey}`, date: key, title: `근무 ${option.code}${index ? ' 마침' : ''}`, member, members: [member],
        time: index ? '00:00' : option.start, end: option.end, type: 'shift', sourceDate: sourceKey,
        crossesMidnight: !index && overnight, carryover: Boolean(index) }]
    })
  }) : []
  const regular = regularWorkRows(state, date, new Set(shifts.filter((row) => !row.carryover).map((row) => row.member)))
  return [...events, ...shifts, ...regular].map((event) => ({ ...event, displayStart: clock(event.time), displayEnd: clock(event.end) }))
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

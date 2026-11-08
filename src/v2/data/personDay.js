import { iso } from '../../lib/dates'
import { scheduleForDate, clock } from './schedule'
import { rowsForMember } from './house'
import { taskRows } from './tasks'
import { membersFor } from './members'

// 교대 근무자의 OFF도 한 줄로 (밤 근무가 이어져 와도 그날이 쉬는 날임을 보여 줌)
export function offRows(state, date) {
  const key = iso(date), ws = state.workSettings || {}
  if (!ws.enabled) return []
  return (ws.workerIds || []).filter((m) => state.shifts.findLast((s) => s.member === m && s.date === key)?.shift === 'off')
    .map((m) => ({ id: `off-${m}-${key}`, type: 'shift', title: 'OFF', member: m, date: key, displayStart: '하루 종일' }))
}

export function personDayRows(state, memberId, date, today) {
  const key = iso(date)
  const isToday = key === iso(today)
  const tasks = taskRows(state.tasks, date, 'all', true).filter((task) => {
    if (!membersFor(task, state.profiles, 'assignees', 'assignee').some((profile) => profile.id === memberId)) return false
    if (task.occurrenceDate) return task.occurrenceDate === key
    if (task.dueDate === key) return true
    if (!isToday || task.startDate > key || task.createdDate > key) return false
    if (task.done) return task.completedDate === key
    return !task.dueDate || task.dueDate < key
  }).map((task) => ({ ...task, id: `task-${task.id}`, task: true, displayStart: clock(task.time), displayEnd: clock(task.end) }))
  const off = offRows(state, date).filter((r) => r.member === memberId)
  return [...rowsForMember(scheduleForDate(state, date), memberId), ...off, ...tasks]
    .sort((a, b) => (a.displayStart || '').localeCompare(b.displayStart || '') || a.title.localeCompare(b.title, 'ko'))
}

export function editTarget(row, state) {
  if (row.task) return { type: 'task', record: state.tasks.find((task) => task.id === row.sourceTaskId) }
  const event = state.events.find((item) => item.id === (row.seriesId || row.scheduleId || row.id))
  if (event) return { type: 'event', record: event }
  if (row.type === 'shift') return { type: 'shifts', record: state.shifts.findLast((shift) => shift.member === row.member && shift.date === (row.sourceDate || row.date)) }
  if (row.recurrenceType === 'child') return { type: 'schedules', record: state.childSchedules.find((item) => item.id === row.scheduleId) }
  return { type: 'event', record: undefined }
}

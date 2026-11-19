import { addDays, iso } from '../../lib/dates'
import { hasRecurrence, isRecurrenceStart } from '../../lib/recurrence'

export function taskRows(tasks, today, category = 'all', showCompleted = false) {
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return tasks.flatMap((task) => {
    if (category !== 'all' && task.category !== category) return []
    if (!hasRecurrence(task)) return showCompleted || !task.done ? [{ ...task, sourceTaskId: task.id }] : []
    // 지난 날 끝낸 기록도 (끝낸 일 · 달별 보기)
    const rows = showCompleted ? (task.completedDates || []).filter((key) => key < iso(today)).map((key) => ({ ...task, id: `${task.id}-${key}`, sourceTaskId: task.id, occurrenceDate: key, dueDate: key, done: true })) : []
    // 놓친 회차: 지난 7일 중 가장 최근 것 하나만 남김 (매일 할 일이 줄줄이 쌓이지 않게)
    if (!showCompleted && task.dueDate) for (let date = addDays(today, -1); date >= addDays(today, -7); date = addDays(date, -1)) {
      const key = iso(date)
      if (key < task.dueDate || !isRecurrenceStart({ ...task, date: task.dueDate }, date)) continue
      if (!task.completedDates?.includes(key) && !task.skippedDates?.includes(key)) rows.push({ ...task, id: `${task.id}-${key}`, sourceTaskId: task.id, occurrenceDate: key, dueDate: key, done: false })
      break
    }
    for (let date = today; date <= monthEnd; date = addDays(date, 1)) {
      const key = iso(date)
      if (!task.dueDate || !isRecurrenceStart({ ...task, date: task.dueDate }, date) || task.skippedDates?.includes(key)) continue
      const done = Boolean(task.completedDates?.includes(key))
      if (showCompleted || !done) rows.push({ ...task, id: `${task.id}-${key}`, sourceTaskId: task.id, occurrenceDate: key, dueDate: key, done })
    }
    return rows
  }).sort((a, b) => Number(a.done) - Number(b.done) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || a.title.localeCompare(b.title, 'ko'))
}

export function toggleTask(tasks, row, today, by = '') {
  return tasks.map((task) => {
    if (task.id !== row.sourceTaskId) return task
    if (!row.occurrenceDate) { const { completedBy: _cb, ...rest } = task; return task.done ? { ...rest, done: false, completedDate: '' } : { ...rest, done: true, completedDate: iso(today), ...(by && { completedBy: by }) } }
    const dates = new Set(task.completedDates || [])
    if (dates.has(row.occurrenceDate)) dates.delete(row.occurrenceDate)
    else dates.add(row.occurrenceDate)
    const doneBy = { ...(task.doneBy || {}) }; if (dates.has(row.occurrenceDate)) { if (by) doneBy[row.occurrenceDate] = by } else delete doneBy[row.occurrenceDate] // 반복 할 일은 날짜별로 누가 했는지
    const { doneBy: _old, ...rest } = task
    return { ...rest, completedDates: [...dates].sort(), ...(Object.keys(doneBy).length && { doneBy }) }
  })
}

export function renameCategory(state, oldName, newName) {
  if (!newName.trim() || (newName !== oldName && state.taskCategories.includes(newName))) return state
  return { ...state, taskCategories: state.taskCategories.map((value) => value === oldName ? newName : value), tasks: state.tasks.map((task) => task.category === oldName ? { ...task, category: newName } : task) }
}

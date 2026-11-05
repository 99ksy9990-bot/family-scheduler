import { addDays, iso } from '../../lib/dates'
import { hasRecurrence, isRecurrenceStart } from '../../lib/recurrence'

export function taskRows(tasks, today, category = 'all', showCompleted = false) {
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return tasks.flatMap((task) => {
    if (category !== 'all' && task.category !== category) return []
    if (!hasRecurrence(task)) return showCompleted || !task.done ? [{ ...task, sourceTaskId: task.id }] : []
    const rows = []
    for (let date = today; date <= monthEnd; date = addDays(date, 1)) {
      const key = iso(date)
      if (!task.dueDate || !isRecurrenceStart({ ...task, date: task.dueDate }, date) || task.skippedDates?.includes(key)) continue
      const done = Boolean(task.completedDates?.includes(key))
      if (showCompleted || !done) rows.push({ ...task, id: `${task.id}-${key}`, sourceTaskId: task.id, occurrenceDate: key, dueDate: key, done })
    }
    return rows
  }).sort((a, b) => Number(a.done) - Number(b.done) || (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || a.title.localeCompare(b.title, 'ko'))
}

export function toggleTask(tasks, row, today) {
  return tasks.map((task) => {
    if (task.id !== row.sourceTaskId) return task
    if (!row.occurrenceDate) return { ...task, done: !task.done, completedDate: task.done ? '' : iso(today) }
    const dates = new Set(task.completedDates || [])
    if (dates.has(row.occurrenceDate)) dates.delete(row.occurrenceDate)
    else dates.add(row.occurrenceDate)
    return { ...task, completedDates: [...dates].sort() }
  })
}

export function renameCategory(state, oldName, newName) {
  if (!newName.trim() || (newName !== oldName && state.taskCategories.includes(newName))) return state
  return { ...state, taskCategories: state.taskCategories.map((value) => value === oldName ? newName : value), tasks: state.tasks.map((task) => task.category === oldName ? { ...task, category: newName } : task) }
}

import { test, expect } from '@playwright/test'
import { taskRows } from '../../src/v2/data/tasks.js'

test('놓친 반복 할 일은 가장 최근 하루만 남음', () => {
  const task = { id: 't', title: '물 주기', dueDate: '2026-11-01', recurrence: { frequency: 'daily', interval: 1 }, completedDates: ['2026-11-16'] }
  const rows = taskRows([task], new Date(2026, 10, 19))
  expect(rows.filter((r) => r.occurrenceDate < '2026-11-19').map((r) => r.occurrenceDate)).toEqual(['2026-11-18'])
  const doneYesterday = taskRows([{ ...task, completedDates: ['2026-11-18'] }], new Date(2026, 10, 19))
  expect(doneYesterday.some((r) => r.occurrenceDate < '2026-11-19')).toBe(false)
})

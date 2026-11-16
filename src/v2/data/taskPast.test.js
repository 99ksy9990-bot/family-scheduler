import { test } from 'node:test'
import assert from 'node:assert'
import { taskRows } from './tasks.js'

test('반복 할 일의 지난 달 완료 기록도 끝낸 일에 나옴', () => {
  const task = { id: 't', title: '분리수거', dueDate: '2026-09-01', recurrence: { frequency: 'weekly' }, completedDates: ['2026-10-06', '2026-11-16'] }
  const today = new Date(2026, 10, 16)
  assert.ok(taskRows([task], today, 'all', true).some((r) => r.occurrenceDate === '2026-10-06' && r.done))
  assert.ok(!taskRows([task], today, 'all', false).some((r) => r.occurrenceDate === '2026-10-06'))
})

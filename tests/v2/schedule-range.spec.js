import { test, expect } from '@playwright/test'
import { childEventsForDate } from '../../src/lib/schedule.js'

test('시간표 종료일 지나면 안 나옴', () => {
  const s = { id: 'e', title: '영어', member: 'little', season: '학기', weekdays: [1, 2, 3, 4, 5], time: '15:00', end: '16:00', toDate: '2026-11-30' }
  const p = [{ id: 'p', member: 'little', season: '학기', start: '2026-09-01', end: '2027-02-10' }]
  expect(childEventsForDate(new Date(2026, 10, 30), [s], p).length).toBe(1)
  expect(childEventsForDate(new Date(2026, 11, 1), [s], p).length).toBe(0)
})

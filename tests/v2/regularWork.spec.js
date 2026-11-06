import { test, expect } from '@playwright/test'
import { regularWorkRows, scheduleForDate } from '../../src/v2/data/schedule.js'

const state = { profiles: [{ id: 'david', regularWork: { weekdays: [1, 2, 3, 4, 5], start: '08:00', end: '17:00' } }, { id: 'emma' }] }
test('고정 근무: 평일만, 주말·공휴일 제외, 근무표 있는 날은 생략', () => {
  expect(regularWorkRows(state, new Date(2026, 10, 6), new Set())).toHaveLength(1)
  expect(regularWorkRows(state, new Date(2026, 10, 7), new Set())).toHaveLength(0)
  expect(regularWorkRows(state, new Date(2026, 9, 9), new Set())).toHaveLength(0)
  expect(regularWorkRows(state, new Date(2026, 10, 6), new Set(['david']))).toHaveLength(0)
  const full = { ...state, events: [], childSchedules: [], schedulePeriods: [], anniversaries: [], scheduleExceptions: [], shifts: [], workSettings: {} }
  expect(scheduleForDate(full, new Date(2026, 10, 6)).find((row) => row.member === 'david')).toMatchObject({ type: 'shift', displayStart: '08:00', displayEnd: '17:00' })
})

test('연차·반차: 연차는 종일, 오전 반차 12:45–17:00, 오후 반차 08:00–12:00', () => {
  const s = { profiles: [{ id: 'david', regularWork: { weekdays: [1, 2, 3, 4, 5], start: '08:00', end: '17:00', leaves: { '2026-11-04': 'full', '2026-11-05': 'am', '2026-11-06': 'pm' } } }] }
  expect(regularWorkRows(s, new Date(2026, 10, 4), new Set())[0]).toMatchObject({ title: '연차', time: '종일', type: 'leave' })
  expect(regularWorkRows(s, new Date(2026, 10, 5), new Set())[0]).toMatchObject({ title: '근무 · 오전 반차', time: '12:45', end: '17:00' })
  expect(regularWorkRows(s, new Date(2026, 10, 6), new Set())[0]).toMatchObject({ title: '근무 · 오후 반차', time: '08:00', end: '12:00' })
})

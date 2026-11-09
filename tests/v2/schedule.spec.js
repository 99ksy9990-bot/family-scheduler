import { test, expect } from '@playwright/test'
import { scheduleForDate, clock, memberStatus } from '../../src/v2/data/schedule.js'

const state = {
  events: [{ id: 'late', date: '2026-11-05', time: '오후 4:00', title: '일반', member: 'kid' },
    { id: 'repeat', date: '2026-11-04', time: '09:00', title: '반복', recurrence: { frequency: 'daily' } }],
  childSchedules: [{ id: 'c', member: 'kid', title: '이른 수업', season: 'term', weekday: 4, time: '오전 8:40', end: '오후 1:50' }],
  schedulePeriods: [{ id: 'p', member: 'kid', season: 'term', start: '2026-01-01', end: '2026-12-31' }],
  anniversaries: [{ id: 'a', name: '기념', kind: '기념일', calendarType: 'solar', month: 11, day: 5 }],
  scheduleExceptions: [], shifts: [{ member: 'mom', date: '2026-11-04', shift: 'night' }, { member: 'mom', date: '2026-11-05', shift: 'off' }],
  workSettings: { enabled: true, workerIds: ['mom'], shiftTypes: [] }, tasks: [],
}

test('24시간 표기와 통합 시간순·반복·기념일·야간 근무 이월', () => {
  expect(['오전 12:00', '오후 12:00', '오후 4:05', '09:10', '종일'].map(clock)).toEqual(['00:00', '12:00', '16:05', '09:10', ''])
  const rows = scheduleForDate(state, new Date('2026-11-05T00:00:00'))
  expect(rows.map((row) => row.displayStart)).toEqual(['', '00:00', '08:40', '09:00', '16:00'])
  expect(rows.find((row) => row.type === 'shift')).toMatchObject({ carryover: true, displayEnd: '08:00' })
  const cancelled = scheduleForDate({ ...state, scheduleExceptions: [{ scheduleId: 'c', date: '2026-11-05', type: 'skip' }, { scheduleId: 'repeat', date: '2026-11-05', type: 'skip' }] }, new Date('2026-11-05T00:00:00'))
  expect(cancelled).toHaveLength(rows.length - 2)
})

test('공휴일 포함·자녀 수업 제외', () => {
  const rows = scheduleForDate(state, new Date('2026-08-17T00:00:00'))
  expect(rows.some((row) => row.holiday)).toBe(true)
  expect(rows.some((row) => row.type === 'school')).toBe(false)
})

test('표정: 바쁨·기본·완료, 미완료 할 일과 반복 완료일 반영', () => {
  const profile = { id: 'kid' }
  const now = new Date('2026-11-05T10:00:00')
  expect(memberStatus(profile, [{ member: 'kid', title: '수업', displayStart: '09:00', displayEnd: '11:00' }], [], now).expression).toBe('busy')
  expect(memberStatus(profile, [{ member: 'kid', title: '수업', displayStart: '11:00', displayEnd: '12:00' }], [], now).expression).toBe('basic')
  const ended = [{ member: 'kid', title: '수업', displayStart: '08:00', displayEnd: '09:00' }]
  expect(memberStatus(profile, ended, [], now).expression).toBe('done')
  const task = { assignee: 'kid', dueDate: '2026-11-05', done: false }
  expect(memberStatus(profile, ended, [task], now).expression).toBe('basic')
  expect(memberStatus(profile, ended, [{ ...task, recurrence: { frequency: 'daily' }, completedDates: ['2026-11-05'] }], now).expression).toBe('done')
})

test('연속 N은 전날 마침과 오늘 시작으로 구분하고 근무 중 상태는 끝 시각 사용', async () => {
  const { groupShiftRows } = await import('../../src/v2/data/shiftGroups.js')
  const { houseStatus } = await import('../../src/v2/data/house.js')
  const day = new Date(2026, 10, 5)
  const consecutive = { ...state, events: [], childSchedules: [], anniversaries: [], profiles: [{ id: 'mom', name: '엄마' }],
    shifts: [{ member: 'mom', date: '2026-11-04', shift: 'night' }, { member: 'mom', date: '2026-11-05', shift: 'night' }],
    workSettings: { enabled: true, workerIds: ['mom'], shiftTypes: [{ id: 'night', code: 'N', start: '22:00', end: '07:00' }] } }
  const rows = scheduleForDate(consecutive, day)
  expect(rows.map((row) => row.title)).toEqual(['근무 N', '근무 N'])
  expect(rows[0]).toMatchObject({ carryover: true, displayEnd: '07:00', sourceDate: '2026-11-04' })
  expect(rows[1]).toMatchObject({ crossesMidnight: true, displayStart: '22:00' })
  expect(groupShiftRows(rows)).toHaveLength(1)
  expect(houseStatus(consecutive.profiles[0], rows, [], day, new Date(2026, 10, 5, 6))).toMatchObject({ badge: '근무 중', detail: '@work:07:00' })
})

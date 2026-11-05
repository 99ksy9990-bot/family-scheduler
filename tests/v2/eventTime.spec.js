import { test, expect } from '@playwright/test'
import { oneHourLater, eventPhase } from '../../src/v2/data/eventTime.js'

test('시작 시간+1시간과 자정 이후 종료일', () => {
  expect(oneHourLater('15:30', '2026-11-05')).toEqual({ time: '16:30', endDate: '2026-11-05' })
  expect(oneHourLater('23:30', '2026-12-31')).toEqual({ time: '00:30', endDate: '2027-01-01' })
})

test('지난 일정·진행 중·미래·야간·종일 상태', () => {
  const date = new Date('2026-11-05T00:00:00')
  const now = new Date('2026-11-05T14:20:00')
  expect(eventPhase({ displayStart: '08:40', displayEnd: '13:50' }, date, now)).toBe('past')
  expect(eventPhase({ displayStart: '08:40', displayEnd: '16:10' }, date, now)).toBe('active')
  expect(eventPhase({ displayStart: '15:00', displayEnd: '16:00' }, date, now)).toBe('future')
  expect(eventPhase({ displayStart: '12:00', displayEnd: '08:00', crossesMidnight: true }, date, now)).toBe('active')
  expect(eventPhase({ displayStart: '' }, date, now)).toBe('untimed')
})

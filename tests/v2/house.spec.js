import { test, expect } from '@playwright/test'
import { houseStatus, remainingSchedule, rowsForMember, moodFor, softDetail } from '../../src/v2/data/house.js'

const date = new Date('2026-11-05T00:00:00')
const now = new Date('2026-11-05T10:00:00')
const rows = [
  { id: 'past', member: 'p', title: '지난 일정', displayStart: '08:00', displayEnd: '09:00' },
  { id: 'work', members: ['p', 'q'], title: '근무 D', type: 'shift', displayStart: '09:00', displayEnd: '11:00' },
  { id: 'next', member: 'p', title: '다음 일정', displayStart: '14:00', displayEnd: '15:00' },
  { id: 'all', member: 'family', title: '종일', displayStart: '' },
]

test('지금 타일 상태는 진행 중 태그와 종료 시각을 사용', () => {
  expect(houseStatus({ id: 'p' }, rows, [], date, now)).toMatchObject({ expression: 'busy', badge: '근무', detail: '@work:11:00' })
  expect(houseStatus({ id: 'r' }, [], [], date, now)).toMatchObject({ expression: 'basic', detail: '여유로운 하루' })
})

test('남은 목록은 미래·종일 일정, 개인 시트는 지난 일정도 보존', () => {
  expect(remainingSchedule(rows, date, now).map((row) => row.id)).toEqual(['next', 'all'])
  expect(rowsForMember(rows, 'p')).toHaveLength(4)
  expect(rowsForMember(rows, 'q').map((row) => row.id)).toEqual(['work', 'all'])
  expect(rows).toHaveLength(4)
})

test('학교·학원 현재와 다음 일정 칩을 같은 kind 기준으로 구분', () => {
  const day = new Date(2026, 10, 5)
  const profile = { id: 'kid' }
  const row = { id: 'class', title: '피아노', member: 'kid', kind: '학원', displayStart: '16:00', displayEnd: '17:00' }
  expect(houseStatus(profile, [row], [], day, new Date(2026, 10, 5, 15))).toMatchObject({ badge: '학원', badgeUpcoming: true, detail: '16:00 시작' })
  expect(houseStatus(profile, [row], [], day, new Date(2026, 10, 5, 16, 30))).toMatchObject({ badge: '학원', expression: 'busy', detail: '@study:17:00' })
  expect(houseStatus(profile, [{ ...row, kind: '학교' }], [], day, new Date(2026, 10, 5, 16, 30))).toMatchObject({ badge: '학교', badgeKind: '학교' })
})

test('오늘 안 끝낸 병원 할 일이 있으면 아픈 얼굴', () => {
  const now = new Date(2026, 10, 10, 12)
  const task = { title: '병원 가기', assignees: ['p'], dueDate: '2026-11-10', done: false }
  expect(moodFor({ id: 'p' }, { expression: 'basic' }, { tasks: [task], now })).toBe('sick')
  expect(moodFor({ id: 'p' }, { expression: 'basic' }, { tasks: [{ ...task, done: true }], now })).toBe('basic')
  expect(moodFor({ id: 'q' }, { expression: 'basic' }, { tasks: [task], now })).toBe('basic')
})

test('병원 할 일이 있으면 여유로운 하루 대신 병원 문구', () => {
  const day = new Date(2026, 10, 10); const now = new Date(2026, 10, 10, 15)
  const task = { title: '병원 가기', assignees: ['p'], dueDate: '2026-11-10', done: false }
  expect(houseStatus({ id: 'p' }, [], [task], day, now).detail).toBe('병원 가는 날')
})

test('수업 중이어도 병원 할 일이 있으면 아픈 얼굴', () => {
  const now = new Date(2026, 10, 10, 11)
  const task = { title: '병원 가기', assignees: ['p'], dueDate: '2026-11-10', done: false }
  expect(moodFor({ id: 'p' }, { expression: 'busy', badgeKind: '학교' }, { tasks: [task], now })).toBe('sick')
  expect(moodFor({ id: 'p' }, { expression: 'busy', badgeKind: '학교' }, { tasks: [], now })).toBe('study')
})

test('한 번만 넣은 학교 일정도 반복 시간표와 같은 학교 그림', async () => {
  const { kindOf } = await import('../../src/v2/data/kinds.js')
  expect(kindOf({ kind: '학교', title: '수업' })).toBe(kindOf({ recurrenceType: 'child', kind: '학교' }))
})

test('날씨는 얼굴을 바꾸지 않음', () => {
  const now = new Date(2026, 10, 12, 9)
  for (const mood of ['sunny', 'cloudy', 'rain', 'cold']) expect(moodFor({ id: 'p' }, { expression: 'basic' }, { now, weather: { mood } })).toBe('basic')
})

test('홈 작은 글씨에 일정 이름', () => {
  expect(softDetail('@study:17:00', { id: 'k' }, new Date(2026, 10, 5), '피아노')).toBe('피아노 17:00까지')
})

test('엄마 근무 중에는 마스크 얼굴', () => {
  expect(moodFor({ id: 'm', characterId: 'mom' }, { expression: 'busy', badge: '근무' }, { now: new Date(2026, 10, 5, 10) })).toBe('mask')
  expect(moodFor({ id: 'd', characterId: 'dad' }, { expression: 'busy', badge: '근무' }, { now: new Date(2026, 10, 5, 10) })).toBe('busy')
})

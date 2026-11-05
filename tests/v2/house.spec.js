import { test, expect } from '@playwright/test'
import { houseStatus, remainingSchedule, rowsForMember } from '../../src/v2/data/house.js'

const date = new Date('2026-11-05T00:00:00')
const now = new Date('2026-11-05T10:00:00')
const rows = [
  { id: 'past', member: 'p', title: '지난 일정', displayStart: '08:00', displayEnd: '09:00' },
  { id: 'work', members: ['p', 'q'], title: '근무 D', type: 'shift', displayStart: '09:00', displayEnd: '11:00' },
  { id: 'next', member: 'p', title: '다음 일정', displayStart: '14:00', displayEnd: '15:00' },
  { id: 'all', member: 'family', title: '종일', displayStart: '' },
]

test('지금 타일 상태는 진행 중 태그와 종료 시각을 사용', () => {
  expect(houseStatus({ id: 'p' }, rows, [], date, now)).toMatchObject({ expression: 'busy', badge: '근무 중', detail: '11:00까지' })
  expect(houseStatus({ id: 'r' }, [], [], date, now)).toMatchObject({ expression: 'basic', detail: '쉬는 중' })
})

test('남은 목록은 미래·종일 일정, 개인 시트는 지난 일정도 보존', () => {
  expect(remainingSchedule(rows, date, now).map((row) => row.id)).toEqual(['next', 'all'])
  expect(rowsForMember(rows, 'p')).toHaveLength(4)
  expect(rowsForMember(rows, 'q').map((row) => row.id)).toEqual(['work', 'all'])
  expect(rows).toHaveLength(4)
})

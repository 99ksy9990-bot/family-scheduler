import { test, expect } from '@playwright/test'
import { inspectV2Backup } from '../../src/v2/data/backup.js'
import { taskRows, toggleTask, renameCategory } from '../../src/v2/data/tasks.js'

const today = new Date('2026-11-05T00:00:00')
const tasks = [{ id: 'once', title: '한 번', category: '집안일', done: false },
  { id: 'repeat', title: '반복', category: '긴급', dueDate: '2026-11-04', recurrence: { frequency: 'weekly' }, completedDates: ['2026-11-11'], skippedDates: ['2026-11-18'], zzz: 1 }]

test('분류·반복 회차·완료·예외를 같은 목록 함수로 계산', () => {
  expect(taskRows(tasks, today).map((row) => row.id)).toEqual(['repeat-2026-11-25', 'once'])
  expect(taskRows(tasks, today, '긴급', true).map((row) => row.occurrenceDate)).toEqual(['2026-11-25', '2026-11-11'])
  expect(taskRows(tasks, today, '집안일')).toHaveLength(1)
})

test('회차 완료는 전체 반복을 완료하지 않고 기존 필드를 보존', () => {
  const row = taskRows(tasks, today, '긴급')[0]
  const next = toggleTask(tasks, row, today)
  expect(next[1]).toMatchObject({ completedDates: ['2026-11-11', '2026-11-25'], zzz: 1 })
  expect(tasks[1].completedDates).toEqual(['2026-11-11'])
  expect(toggleTask(next, row, today)).toEqual(tasks)
  expect(toggleTask(tasks, { ...tasks[0], sourceTaskId: 'once' }, today)[0]).toMatchObject({ done: true, completedDate: '2026-11-05' })
})

test('분류 이름 변경은 기존 할 일도 함께 갱신하고 중복은 거절', () => {
  const state = { tasks, taskCategories: ['긴급', '집안일'] }
  expect(renameCategory(state, '긴급', '학교')).toMatchObject({ taskCategories: ['학교', '집안일'], tasks: [{ category: '집안일' }, { category: '학교' }] })
  expect(renameCategory(state, '긴급', '집안일')).toBe(state)
  expect(state.taskCategories).toEqual(['긴급', '집안일'])
})


test('잘못된 백업은 미리보기 전 거절하고 확장 필드는 허용', () => {
  expect(inspectV2Backup({ events: [], zzz: 1 }).counts.find((item) => item.key === 'events').count).toBe(0)
  for (const data of [{ events: [null] }, { events: [], taskCategories: 'bad' }, { events: [], workSettings: [] }]) expect(() => inspectV2Backup(data)).toThrow()
})

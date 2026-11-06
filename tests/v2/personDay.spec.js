import { test, expect } from '@playwright/test'
import { personDayRows, editTarget } from '../../src/v2/data/personDay.js'
import { membersFor } from '../../src/v2/data/members.js'
import { createDemo } from '../../src/v2/data/demo.js'
import { addDays, iso } from '../../src/lib/dates.js'

const today = new Date(2026, 10, 5)

test('담당자 여러 명·모두·기존 단일 필드와 순서·중복 보존', () => {
  const profiles = createDemo(today).profiles
  expect(membersFor({ member: 'family' }, profiles)).toEqual(profiles)
  expect(membersFor({ members: ['demo-mom', 'demo-dad', 'demo-mom'] }, profiles).map((profile) => profile.id)).toEqual(['demo-dad', 'demo-mom'])
  expect(membersFor({ member: 'demo-little' }, profiles)[0].name).toBe('연두')
  expect(membersFor({ members: ['demo-mom'], member: 'demo-dad' }, profiles)[0].name).toBe('엄마')
  expect(membersFor({ member: 'unknown' }, profiles)).toEqual([])
})

test('한 사람의 오늘·내일: 근무 이월·공통 일정·시간표·반복 회차·지난 할 일', () => {
  const state = createDemo(today)
  state.events = [{ id: 'event', member: 'family', date: iso(today), time: '14:00', title: '공통 일정' }]
  state.shifts = [{ member: 'demo-dad', date: iso(addDays(today, -1)), shift: 'night' }]
  state.workSettings = { ...state.workSettings, workerIds: ['demo-dad'] }
  state.profiles = state.profiles.map(({ regularWork, ...profile }) => profile) // eslint-disable-line no-unused-vars
  state.tasks = [
    { id: 'task', title: '오늘 할 일', dueDate: iso(today), time: '16:00', assignee: 'demo-dad' },
    { id: 'other', title: '다른 가족', dueDate: iso(today), assignee: 'demo-mom' },
    { id: 'late', title: '기한 지난 일', dueDate: '2026-11-01', assignee: 'demo-dad' },
    { id: 'rec', title: '매일 할 일', dueDate: iso(today), time: '20:00', assignee: 'family', recurrence: { frequency: 'daily' }, completedDates: [iso(today)] },
    { id: 'next', title: '내일 할 일', dueDate: iso(addDays(today, 1)), assignee: 'demo-dad' },
  ]
  const rows = personDayRows(state, 'demo-dad', today, today)
  expect(rows.map((row) => row.title)).toEqual(['기한 지난 일', '근무 N 마침', '공통 일정', '오늘 할 일', '매일 할 일'])
  expect(rows.at(-1).done).toBe(true)
  expect(editTarget(rows.find((row) => row.type === 'shift'), state).record).toBe(state.shifts[0])
  expect(editTarget(rows.find((row) => row.title === '공통 일정'), state).record).toBe(state.events[0])
  expect(editTarget(rows.find((row) => row.title === '매일 할 일'), state).record).toBe(state.tasks[3])
  const next = personDayRows(state, 'demo-dad', addDays(today, 1), today)
  expect(next.map((row) => row.title)).toEqual(['내일 할 일', '매일 할 일'])
  expect(next.at(-1).done).toBe(false)
  state.schedulePeriods = [{ member: 'demo-big', start: '2026-01-01', end: '2026-12-31', season: 'term' }]
  state.childSchedules = [{ id: 'school', member: 'demo-big', title: '학교 수업', weekdays: [4], season: 'term', time: '09:00' }]
  const school = personDayRows(state, 'demo-big', today, today).find((row) => row.scheduleId === 'school')
  expect(school).toBeTruthy()
  expect(editTarget(school, state).record).toBe(state.childSchedules[0])
})

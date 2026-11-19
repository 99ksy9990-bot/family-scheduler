import { test, expect } from '@playwright/test'
import { mergeSharedShiftChanges } from '../../src/lib/shiftSyncMerge.js'

const row = (id, title = id) => ({ id, title })

test('다른 일정과 할 일의 수정·추가·삭제를 함께 반영한다', () => {
  const base = { events: [row('a'), row('b'), row('c')], tasks: [row('x'), row('y')] }
  const local = { events: [row('a', '시간 변경'), row('b')], tasks: [row('x', '완료'), row('y')] }
  const remote = { events: [row('a'), row('b', '장소 변경'), row('c'), row('d')], tasks: [row('x'), row('y', '완료')] }

  expect(mergeSharedShiftChanges(base, local, remote)).toEqual({
    events: [row('a', '시간 변경'), row('b', '장소 변경'), row('d')],
    tasks: [row('x', '완료'), row('y', '완료')],
  })
})

test('같은 일정의 수정과 삭제가 충돌하면 선택한 쪽을 반영하고 다른 일정은 유지한다', () => {
  const base = { events: [row('a'), row('b')] }
  const local = { events: [row('b', '휴무')] }
  const remote = { events: [row('a', '시간 변경'), row('b'), row('c')] }

  expect(mergeSharedShiftChanges(base, local, remote)).toBeNull()
  expect(mergeSharedShiftChanges(base, local, remote, 'local')).toEqual({ events: [row('b', '휴무'), row('c')] })
  expect(mergeSharedShiftChanges(base, local, remote, 'remote')).toEqual({ events: [row('a', '시간 변경'), row('b', '휴무'), row('c')] })
})

test('보낸 뒤 응답을 못 받은 일정이 이미 서버에 있으면 중복 없이 다시 합친다', () => {
  const base = { events: [row('a')] }
  const local = { events: [row('a'), row('b')] }
  const remote = { events: [row('a'), row('b'), row('c')] }

  expect(mergeSharedShiftChanges(base, local, remote)).toEqual(remote)
})

test('가족마다 다른 날짜의 근무와 연차를 함께 반영한다', () => {
  const dad = (leaves) => ({ id: 'dad', regularWork: { leaves } })
  const shift = (date) => ({ member: 'mom', date, shift: 'night' })
  const base = { profiles: [dad({})], shifts: [] }
  const local = { profiles: [dad({ '2026-11-20': 'full' })], shifts: [shift('2026-11-20')] }
  const remote = { profiles: [dad({ '2026-11-21': 'am' })], shifts: [shift('2026-11-21')] }

  const merged = mergeSharedShiftChanges(base, local, remote)
  expect(merged.profiles).toEqual([dad({ '2026-11-20': 'full', '2026-11-21': 'am' })])
  expect(merged.shifts).toEqual(expect.arrayContaining([...local.shifts, ...remote.shifts]))
})

test('같은 할 일을 서로 다르게 수정하면 충돌하고 같은 수정은 한 번만 반영한다', () => {
  const base = { tasks: [row('task', '준비물')] }
  const local = { tasks: [row('task', '체육복 준비')] }
  const remote = { tasks: [row('task', '미술 준비')] }

  expect(mergeSharedShiftChanges(base, local, remote)).toBeNull()
  expect(mergeSharedShiftChanges(base, local, local)).toEqual(local)
})

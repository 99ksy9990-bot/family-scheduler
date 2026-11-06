import { test, expect } from '@playwright/test'
import { createDemo } from '../../src/v2/data/demo.js'
import { iso } from '../../src/lib/dates.js'

test('공개 예시는 기준일의 새 데이터만 만들고 호출 사이에 공유하지 않는다', () => {
  const today = new Date(2026, 10, 6)
  const state = createDemo(today)
  expect(state.profiles.map((profile) => [profile.name, profile.characterId])).toEqual([['아빠', 'dad'], ['엄마', 'mom'], ['초롱', 'big'], ['연두', 'little']])
  expect(state.events).toHaveLength(6)
  expect(state.tasks).toHaveLength(5)
  expect(state.events.every((event) => event.date === iso(today))).toBe(true)
  state.events[0].title = '화면에서 변경'
  state.workSettings.shiftTypes[0].label = '변경'
  const next = createDemo(new Date(2026, 10, 7))
  expect(next.events.every((event) => event.date === '2026-11-07')).toBe(true)
  expect(next.events[0].title).not.toBe('화면에서 변경')
  expect(next.workSettings.shiftTypes[0].label).not.toBe('변경')
})

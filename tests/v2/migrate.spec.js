import { test, expect } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fromLegacy, toLegacy, readLegacyStorage } from '../../src/v2/data/migrate.js'

const backupPath = fileURLToPath(new URL('../fixtures/real-backup.json', import.meta.url))
const collections = ['profiles', 'events', 'tasks', 'shifts', 'childSchedules', 'childProfiles', 'schedulePeriods', 'anniversaries', 'scheduleExceptions']
const fixture = {
  schemaVersion: 7,
  profiles: [{ id: 'parent', name: '테스트' }],
  events: [{ id: 'e', member: 'parent', members: ['parent'], zzz: 1 }],
  tasks: [{ id: 't', assignee: 'parent', category: '긴급' }],
  shifts: [{ id: 's' }], childSchedules: [{ id: 'c' }], childProfiles: [],
  schedulePeriods: [], anniversaries: [{ id: 'a' }], scheduleExceptions: [{ id: 'x' }],
  workSettings: { enabled: true }, profileLinks: {}, zzz: 1,
}

function withoutAdditions(actual, original) {
  const next = structuredClone(actual)
  for (const field of ['v2SchemaVersion', 'taskCategories']) {
    if (!Object.hasOwn(original, field)) delete next[field]
  }
  for (const [key, fields] of [['events', ['recurrence']], ['tasks', ['recurrence']], ['profiles', ['characterId']]]) {
    next[key]?.forEach((item, index) => {
      for (const field of fields) if (!Object.hasOwn(original[key][index], field)) delete item[field]
    })
  }
  return next
}

test('실제 백업 개수와 왕복 보존', () => {
  if (!existsSync(backupPath)) console.log('skip: real-backup.json 없음')
  test.skip(!existsSync(backupPath), 'skip: real-backup.json 없음')
  const original = JSON.parse(readFileSync(backupPath, 'utf8'))
  const migrated = fromLegacy(original)
  for (const key of collections) expect(migrated[key]?.length).toBe(original[key]?.length)
  expect(withoutAdditions(toLegacy(migrated), original)).toEqual(original)
})

test('모든 컬렉션·모르는 필드·원본 불변·왕복 보존', () => {
  const original = structuredClone(fixture)
  const migrated = fromLegacy(original)
  expect(migrated.v2SchemaVersion).toBe(1)
  expect(migrated.taskCategories).toEqual(['긴급', '장보기', '집안일'])
  for (const key of collections) expect(migrated[key].length).toBe(original[key].length)
  expect(withoutAdditions(toLegacy(migrated), original)).toEqual(original)
  migrated.events[0].zzz = 2
  expect(original).toEqual(fixture)
})

test('빈 상태와 잘못된 입력', () => {
  expect(fromLegacy({})).toEqual({ v2SchemaVersion: 1, taskCategories: ['긴급', '장보기', '집안일'] })
  for (const input of [null, [], 'invalid']) expect(() => fromLegacy(input)).toThrow()
})

test('기존 반복·캐릭터·사용자 분류·확장 필드 유지 및 재변환', () => {
  const original = { ...fixture, taskCategories: [], profiles: [{ id: 'p', characterId: 'custom', zzz: 1 }],
    events: [{ member: 'p', members: ['p', 'q'], recurrence: { frequency: 'weekly', interval: 2 }, zzz: 1 }],
    tasks: [{ recurrence: { frequency: 'daily' }, zzz: 1 }] }
  const migrated = fromLegacy(original)
  expect(fromLegacy(migrated)).toEqual(migrated)
  expect(withoutAdditions(toLegacy(migrated), original)).toEqual(original)
})

test('기존 단일·여러 담당자 필드를 그대로 보존', () => {
  const original = { events: [{ member: 'p', members: ['p', 'q'] }, { member: 'q' }, { members: [] }, {}] }
  expect(toLegacy(fromLegacy(original)).events).toEqual(original.events)
})

const storageFor = (entries = {}) => {
  const values = new Map(Object.entries(entries).map(([key, value]) => [key, JSON.stringify(value)]))
  const writes = []
  return { values, writes, getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { writes.push([key, value]); values.set(key, value) } }
}

test('공용 불러오기: 시드 제거·프로필 색상·달력 분류·근무 기본값·이름 보정', async () => {
  const { loadLegacyState } = await import('../../src/lib/legacyState.js')
  const storage = storageFor({
    'family-scheduler-events': [{ id: 1 }, { id: 'kept', member: 'mia', title: '미아 생일', zzz: 1 }],
    'family-scheduler-tasks': [{ id: 1 }, { id: 'kept-task' }],
    'family-scheduler-shifts': [{ id: 's', member: 'emma', date: '2026-11-05' }],
    'family-scheduler-child-schedules-v1': [{ id: 'leo-term-soccer' }, { id: 'custom' }],
    'family-scheduler-periods-v1': [{ id: 'term-first-2026' }, { id: 'custom' }],
    'family-scheduler-anniversaries-v1': [{ id: 'anniversary' }],
    'family-scheduler-schedule-exceptions-v1': [{ id: 'exception' }],
    'family-scheduler-profile-links-v1': { parent: 'user' },
  })
  const before = [...storage.values]
  const migrated = readLegacyStorage(storage)
  expect(storage.writes).toEqual([])
  expect([...storage.values]).toEqual(before)
  expect(migrated.profiles).toHaveLength(4)
  expect(migrated.profiles.map((profile) => profile.characterId)).toEqual(['dad', 'mom', 'big', 'little'])
  expect(migrated.events).toEqual([{ id: 'kept', member: 'mia', title: '연두 생일', zzz: 1, calendarScope: 'children' }])
  expect(migrated.tasks).toEqual([{ id: 'kept-task' }])
  expect(migrated.childSchedules).toEqual([{ id: 'custom' }])
  expect(migrated.schedulePeriods).toEqual([{ id: 'custom' }])
  expect(migrated.workSettings.workerIds).toEqual(['emma'])
  expect(migrated.childProfiles.map((profile) => profile.member)).toEqual(['leo', 'mia'])
  expect(migrated.profileLinks).toEqual({ parent: 'user' })
  const legacy = loadLegacyState(storage)
  expect(withoutAdditions(migrated, legacy)).toEqual(legacy)
  expect(storage.writes).toEqual([
    ['family-scheduler-shifts-recovery-version', '2'],
    ['family-scheduler-anniversaries-recovery-version', '2'],
  ])
  storage.writes.length = 0
  expect(loadLegacyState(storage)).toEqual(legacy)
  expect(storage.writes).toEqual([])
})

test('공용 불러오기: 빈 저장소·손상 JSON·명시한 빈 데이터와 설정 유지', () => {
  const empty = readLegacyStorage(storageFor())
  expect(empty.profiles).toEqual([])
  expect(empty.events).toEqual([])
  expect(empty.workSettings).toMatchObject({ enabled: false, workerIds: [] })
  const storage = storageFor({
    'family-scheduler-profiles-v1': [],
    'family-scheduler-work-settings-v1': { enabled: false, workerIds: [], shiftTypes: [] },
    'family-scheduler-child-profiles-v1': [],
  })
  storage.values.set('family-scheduler-events', '{broken')
  expect(readLegacyStorage(storage)).toEqual({ ...empty, workSettings: { enabled: false, workerIds: [], shiftTypes: [] } })
  expect(storage.writes).toEqual([])
})

test('공용 클라우드 보정: 구형 상태 정리·확장 필드 보존·최신 상태 유지', async () => {
  const { upgradeSharedState } = await import('../../src/lib/legacyState.js')
  const original = { events: [{ id: 'e', member: 'mia' }], zzz: 1 }
  const upgraded = upgradeSharedState(original)
  expect(upgraded).toMatchObject({ schemaVersion: 7, recoveryVersion: 2, zzz: 1,
    events: [{ id: 'e', member: 'mia', calendarScope: 'children' }],
    workSettings: { enabled: true, workerIds: ['emma'] }, shifts: [], anniversaries: [], profileLinks: {} })
  expect(upgraded.profiles).toHaveLength(4)
  expect(upgradeSharedState(upgraded)).toBe(upgraded)
  expect(original).toEqual({ events: [{ id: 'e', member: 'mia' }], zzz: 1 })
})


test('프로필 id에 따른 기본 캐릭터·기존 선택 유지·알 수 없는 id', () => {
  const profiles = [{ id: 'david' }, { id: 'emma' }, { id: 'leo' }, { id: 'mia' },
    { id: 'other' }, { id: 'toString' }, { id: 'david', characterId: 'custom' },
    { id: 'leo', characterId: null }, { id: 'mia', characterId: '' }]
  const migrated = fromLegacy({ profiles })
  expect(migrated.profiles.map((profile) => profile.characterId)).toEqual(['dad', 'mom', 'big', 'little', null, null, 'custom', 'big', ''])
  expect(profiles[0]).toEqual({ id: 'david' })
  expect(fromLegacy(migrated)).toEqual(migrated)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeSharedShiftChanges } from '../../lib/shiftSyncMerge.js'

test('다른 폰이 놀이·다른 사람을 바꿔도 아빠 연차는 남음', () => {
  const dad = { id: 'dad', name: '아빠', regularWork: { start: '08:00', end: '17:00', leaves: {} } }
  const mom = { id: 'mom', name: '엄마' }
  const base = { profiles: [dad, mom], gameScores: { a: 1 } }
  const local = { profiles: [{ ...dad, regularWork: { ...dad.regularWork, leaves: { '2026-11-20': 'full' } } }, mom], gameScores: { a: 2 } }
  const remote = { profiles: [dad, { ...mom, color: 'red' }], gameScores: { a: 3 } }
  const m = mergeSharedShiftChanges(base, local, remote)
  assert.equal(m.profiles[0].regularWork.leaves['2026-11-20'], 'full')
  assert.equal(m.profiles[1].color, 'red')
  // 양쪽에서 아빠 연차를 서로 다른 날에 넣어도 둘 다 남음
  const remote2 = { profiles: [{ ...dad, regularWork: { ...dad.regularWork, leaves: { '2026-11-21': 'am' } } }, mom], gameScores: { a: 1 } }
  const m2 = mergeSharedShiftChanges(base, local, remote2)
  assert.deepEqual(m2.profiles[0].regularWork.leaves, { '2026-11-20': 'full', '2026-11-21': 'am' })
})

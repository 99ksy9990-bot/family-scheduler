import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeProgress, mergeAllProgress } from './cleanProgress.js'

test('오래된 진행도가 와도 꾸민 방·별이 사라지지 않음', () => {
  const mine = { unlocked: 3, stars: { 0: 3, 1: 2 }, done: ['0-0', '0-1'], bought: 2, extra: { 0: 4 } }
  const stale = { unlocked: 2, stars: { 0: 3, 1: 1 }, done: [], bought: 0 }
  assert.deepEqual(mergeProgress(stale, mine), { unlocked: 3, stars: { 0: 3, 1: 2 }, extra: { 0: 4 }, done: ['0-0', '0-1'], bought: 2 })
  assert.deepEqual(mergeAllProgress({ p: stale }, { p: mine, q: stale }).q, stale)
  assert.equal(mergeProgress(undefined, mine), mine)
})

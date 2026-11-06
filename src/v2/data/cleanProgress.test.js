import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeProgress, mergeAllProgress } from './cleanProgress.js'

test('오래된 진행도가 와도 꾸민 방·별이 사라지지 않음', () => {
  const mine = { unlocked: 3, stars: { 0: 3, 1: 2 }, done: ['0-0', '0-1'], bought: 2, econ: 2, streak: 0, streakAt: 20, day: { id: '2026-11-7', n: 4, claimed: false, checkin: true } }
  const stale = { unlocked: 2, stars: { 0: 3, 1: 1 }, done: [], bought: 90, streak: 4, streakAt: 10, bonus: 10, day: { id: '2026-11-7', n: 6, claimed: true } }
  const m = mergeProgress(stale, mine)
  assert.deepEqual(m.stars, { 0: 3, 1: 2 }); assert.deepEqual(m.done, ['0-0', '0-1']); assert.equal(m.unlocked, 3)
  assert.equal(m.bought, 2) // 예전 계산의 쓴 별은 버림
  assert.equal(m.streak, 0) // 최근에 끊긴 연승이 이김
  assert.equal(m.bonus, 10); assert.deepEqual(m.day, { id: '2026-11-7', n: 6, claimed: true, checkin: true })
  assert.equal(mergeProgress(mine, { ...mine, day: { id: '2026-11-9', n: 1 } }).day.id, '2026-11-9')
  assert.deepEqual(mergeAllProgress({ p: stale }, { p: mine, q: stale }).q, stale)
  assert.equal(mergeProgress(undefined, mine), mine)
})

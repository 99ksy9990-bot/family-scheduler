import test from 'node:test'
import assert from 'node:assert/strict'
import { walletOf, earnStar, spendStars, mergeArcade, DAILY, dailyGame } from './wallet.js'

test('다른 게임 별: 하루 한도, 쓰면 줄고, 합치면 큰 쪽', () => {
  let p = { unlocked: 0, stars: { 0: 3 } }
  assert.equal(walletOf(p), 3)
  for (let i = 0; i < DAILY + 2; i++) p = earnStar(p, 'catch').progress
  assert.equal(walletOf(p), 3 + DAILY * (dailyGame() === 'catch' ? 2 : 1))
  assert.ok(earnStar(p, 'pairs').got >= 1)
  p = spendStars(p, walletOf(p) - 3); assert.equal(walletOf(p), 3)
  assert.ok(earnStar(p, 'catch', new Date(Date.now() + 864e5)).got >= 1)
  const m = mergeArcade({ earned: 5, spent: 1, day: { id: '2026-11-7', by: { catch: 2 } } }, { earned: 3, spent: 4, day: { id: '2026-11-7', by: { tap: 1 } } })
  assert.deepEqual(m, { earned: 5, spent: 4, day: { id: '2026-11-7', by: { catch: 2, tap: 1 } } })
})

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

test('다 꾸민 방 하나마다 하루 별 한도 +1, 방 효과는 맡은 게임만', async () => {
  const { homeBonus, earnStar } = await import('./wallet.js')
  const { ROOMS } = await import('./cleanRooms.js')
  const { perkLevel } = await import('./theme.js')
  const done = ROOMS[0].tasks.map((t) => t.id)
  assert.equal(homeBonus({ done }), 1)
  assert.equal(perkLevel('catch', done), 1)
  assert.equal(perkLevel('tap', done), 0)
  let p = { done }; const d = new Date('2026-11-01T10:00:00+09:00'); let total = 0
  for (let i = 0; i < 5; i++) { const r = earnStar(p, 'tap', d); p = r.progress; total += r.got ? 1 : 0 }
  assert.equal(total, 3)
})

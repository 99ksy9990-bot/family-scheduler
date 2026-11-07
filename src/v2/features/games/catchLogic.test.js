import test from 'node:test'
import assert from 'node:assert/strict'
import { begin, step } from './catchLogic.js'

test('쉬움은 1분이 지나면 끝나요', () => {
  let s = begin()
  for (let i = 0; i < 1300; i++) s = step(s, 50, 0.5, 'easy', () => 0.5)
  assert.equal(s.over, true)
  assert.ok(s.t <= 60050)
})

test('바구니 폭 밖의 선물은 안 받아요', () => {
  const s = { ...begin(), half: 0.08, items: [{ id: 1, x: 0.62, y: 0.69, kind: 'star' }] }
  const n = step(s, 50, 0.5, 'easy', () => 0.99)
  assert.equal(n.score, 0)
  const m = step({ ...s, items: [{ id: 3, x: 0.56, y: 0.69, kind: 'star' }] }, 50, 0.5, 'easy', () => 0.99)
  assert.equal(m.score, 1)
})

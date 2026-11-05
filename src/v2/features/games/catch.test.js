import test from 'node:test'
import assert from 'node:assert/strict'
import { BASKET, begin, step } from './catchLogic.js'

test('바구니에 닿으면 점수, 비구름은 목숨 감소, 3번이면 끝', () => {
  let s = { ...begin(), items: [{ id: 1, x: 0.5, y: BASKET.y - 0.01, kind: 'star' }, { id: 2, x: 0.1, y: BASKET.y - 0.01, kind: 'heart' }] }
  s = step(s, 100, 0.5, 'easy', () => 0.5)
  assert.equal(s.score, 1); assert.equal(s.items.some((i) => i.id === 2), true)
  for (let k = 0; k < 3; k += 1) s = step({ ...s, items: [{ id: 9, x: 0.5, y: BASKET.y - 0.01, kind: 'cloud' }] }, 100, 0.5, 'hard')
  assert.equal(s.lives, 0); assert.equal(s.over, true)
})

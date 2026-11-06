import test from 'node:test'
import assert from 'node:assert/strict'
import { begin, drop, height, move } from './stackLogic.js'

test('딱 맞추면 폭 유지·콤보, 어긋나면 잘림, 완전히 빗나가면 끝', () => {
  let s = begin()
  s = { ...s, moving: { x: 0.21, w: 0.6, dir: 1 } }
  s = drop(s, 'normal'); assert.equal(height(s), 1); assert.equal(s.combo, 1); assert.equal(s.floors[1].w, 0.6)
  s = { ...s, moving: { x: 0.4, w: 0.6, dir: 1 } }
  s = drop(s, 'normal'); assert.ok(Math.abs(s.floors[2].w - 0.4) < 1e-9); assert.equal(s.combo, 0)
  s = { ...s, moving: { x: 0.95, w: 0.05, dir: 1 } }
  s = drop(s, 'normal'); assert.equal(s.over, true)
  const m = move({ ...begin(), moving: { x: 0.39, w: 0.6, dir: 1 } }, 100, 'easy'); assert.equal(m.moving.dir, -1)
})

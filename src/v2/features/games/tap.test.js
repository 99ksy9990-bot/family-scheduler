import test from 'node:test'
import assert from 'node:assert/strict'
import { empty, hit, spawn } from './tapLogic.js'

test('얼굴 누르면 +1, 비구름 -2, 빈칸 0, 시간 지나면 사라짐', () => {
  let h = spawn(empty(), 'hard', 0, () => 0.5)
  assert.equal(h.filter((x) => x.kind).length, 2)
  const i = h.findIndex((x) => x.kind)
  assert.equal(hit(h, i, 'hard').delta, 1)
  assert.equal(hit(h, h.findIndex((x) => !x.kind), 'hard').delta, 0)
  h = h.map((x, j) => (j === i ? { kind: 'cloud', until: 99 } : x))
  assert.equal(hit(h, i, 'hard').delta, -2)
  assert.equal(hit(h, i, 'easy').delta, 0)
  const later = spawn(h, 'easy', 10000, () => 0.99)
  assert.equal(later.filter((x) => x.kind).length, 1)
})

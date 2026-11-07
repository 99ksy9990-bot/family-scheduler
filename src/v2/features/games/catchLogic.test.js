import test from 'node:test'
import assert from 'node:assert/strict'
import { begin, step } from './catchLogic.js'

test('쉬움은 1분이 지나면 끝나요', () => {
  let s = begin()
  for (let i = 0; i < 1300; i++) s = step(s, 50, 0.5, 'easy', () => 0.5)
  assert.equal(s.over, true)
  assert.ok(s.t <= 60050)
})

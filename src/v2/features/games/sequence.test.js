import test from 'node:test'
import assert from 'node:assert/strict'
import { press, stage, start } from './sequence.js'

test('맞히면 길어지고, 쉬움은 한 번 봐줌, 보통은 끝', () => {
  let s = start(() => 0) // [0]
  let r = press(s, 0, 'normal', () => 0.5); assert.equal(r.result, 'round'); s = r.state
  assert.deepEqual(s.seq, [0, 2]); assert.equal(stage(s), 1)
  r = press(s, 1, 'easy'); assert.equal(r.result, 'retry'); assert.equal(r.state.pos, 0)
  r = press(r.state, 1, 'easy'); assert.equal(r.result, 'over')
  r = press(s, 3, 'normal'); assert.equal(r.result, 'over')
})

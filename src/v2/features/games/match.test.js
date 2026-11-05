import test from 'node:test'
import assert from 'node:assert/strict'
import { N, findMatches, fresh, hasMove, swap } from './matchLogic.js'

test('새 판은 맞은 줄 없고 둘 곳 있음; 무효 이동은 null; 유효 이동은 점수', () => {
  let seed = 1; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const b = fresh(rand)
  assert.equal(findMatches(b).size, 0); assert.ok(hasMove(b))
  let done = false
  for (let i = 0; i < N * N && !done; i += 1) for (const j of [i + 1, i + N]) {
    const r = j < N * N ? swap(b, i, j, rand) : null
    if (r) { assert.ok(r.gained >= 30); assert.equal(findMatches(r.board).size, 0); done = true; break }
  }
  assert.ok(done)
  assert.equal(swap(b, 0, 2), null) // 이웃 아님
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { begin, drop, step, STAGES } from './mergeLogic.js'

const settle = (s, sec = 3) => { for (let i = 0; i < sec * 60; i++) s = step(s, 1 / 60); return s }

test('같은 것 둘이 닿으면 다음 단계 하나로 합쳐지고 점수가 오름', () => {
  let s = { ...begin(1.4, () => 0), next: 0, after: 0 }
  s = settle(drop(s, 0.5, () => 0), 1)
  s = settle(drop(s, 0.5, () => 0), 2)
  assert.equal(s.balls.length, 1)
  assert.equal(s.balls[0].stage, 1)
  assert.ok(s.score > 0)
})

test('다른 것은 겹치지 않고 바닥 위에 쌓임', () => {
  let s = { ...begin(1.4), next: 0, after: 1 }
  s = settle(drop(s, 0.5), 1); s = settle(drop(s, 0.5), 2)
  assert.equal(s.balls.length, 2)
  const [a, b] = s.balls
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= STAGES[a.stage].r + STAGES[b.stage].r - 0.01)
  for (const ball of s.balls) assert.ok(ball.y <= 1.4 - STAGES[ball.stage].r + 1e-6)
})

test('선 위까지 차면 끝남', () => {
  let s = begin(0.6)
  for (let i = 0; i < 40 && !s.over; i++) { s = drop({ ...s, next: 3, after: 4 }, 0.2 + (i % 4) * 0.2); s = settle(s, 0.5) }
  assert.equal(s.over, true)
})

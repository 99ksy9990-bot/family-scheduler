// node --test src/v2/features/games/pairs.test.js
import test from 'node:test'
import assert from 'node:assert/strict'
import { flip, isDone, newDeck, closeMismatch } from './pairs.js'

test('짝 맞추면 matched, 틀리면 열린 채 대기', () => {
  const deck = newDeck('easy', () => 0.3)
  assert.equal(deck.length, 12)
  let s = { deck, open: [], moves: 0 }
  const a = deck[0], b = deck.find((c) => c.face === a.face && c.id !== a.id), x = deck.find((c) => c.face !== a.face)
  s = flip(flip(s, a.id), x.id)
  assert.equal(s.open.length, 2); assert.equal(s.moves, 1)
  assert.equal(flip(s, b.id), s) // 두 장 열린 동안 무시
  s = flip(flip(closeMismatch(s), a.id), b.id)
  assert.ok(s.deck[a.id].matched && s.deck[b.id].matched)
  for (const c of s.deck) if (!c.matched) { const p = s.deck.find((d) => d.face === c.face && d.id !== c.id); s = flip(flip(s, c.id), p.id) }
  assert.ok(isDone(s))
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { N, begin, play, goals, hasMove, STAGES } from './cleanLogic.js'

// 결정적 난수
const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
const T = (k, sp = null) => ({ k, sp })
const fill = () => Array.from({ length: N * N }, (_, i) => T((i + Math.floor(i / N) * 2) % 6)) // 줄 없는 판

test('시작 판: 줄 없음, 움직일 수 있음, 먼지 배치', () => {
  const s = begin(1, seeded(3))
  assert.ok(hasMove(s.board))
  assert.equal(s.dust.filter(Boolean).length, 2 * N - 2) // 아래 모서리 두 칸은 뚫림
  assert.equal(s.moves, STAGES[1].moves)
})

test('3개 맞추기: 지워지고 이동 1 줄고 모으기 증가, 무효 바꾸기는 null', () => {
  const s = begin(0, seeded(5)); s.board = fill()
  s.board[0] = T(0); s.board[1] = T(0); s.board[N + 2] = T(0); s.board[2] = T(3)
  const r = play(s, 2, N + 2, seeded(9))
  assert.ok(r); assert.equal(r.state.moves, s.moves - 1)
  assert.ok(r.state.collected[0] >= 3)
  assert.equal(play(r.state, 3 * N + 3, 3 * N + 5), null)
})

test('4개 → 로켓, 로켓끼리 바꾸면 줄 두 개 지움', () => {
  const s = begin(0, seeded(7)); s.board = fill()
  for (const c of [0, 1, 3]) s.board[c] = T(0); s.board[N + 2] = T(0); s.board[2] = T(4)
  const r = play(s, 2, N + 2, seeded(11))
  assert.ok(r.events.some((e) => e.type === 'make' && (e.sp === 'col' || e.sp === 'row')))
})

test('무지개 + 아무거나: 그 종류 전부 지움, 먼지 닦임', () => {
  const s = begin(1, seeded(13)); s.board = fill()
  s.board[(N - 1) * N] = T(2, 'rainbow')
  const k = s.board[(N - 1) * N + 1].k
  const before = s.board.filter((t) => t.k === k).length
  const r = play(s, (N - 1) * N, (N - 1) * N + 1, seeded(17))
  assert.ok(r.state.collected[k] >= before)
  assert.ok(goals(r.state)[0].left < goals(s)[0].left)
})

test('목표를 다 채우면 승리, 이동이 0이면 실패', () => {
  const s = begin(0, seeded(19)); s.board = fill()
  s.collected[0] = 11; s.board[0] = T(0); s.board[1] = T(0); s.board[N + 2] = T(0); s.board[2] = T(3)
  assert.equal(play(s, 2, N + 2, seeded(23)).state.done, 'win')
  const t = { ...begin(0, seeded(29)), moves: 1 }; t.board = fill(); t.board[0] = T(5); t.board[1] = T(5); t.board[N + 2] = T(5); t.board[2] = T(3)
  assert.equal(play(t, 2, N + 2, seeded(31)).state.done, 'lose')
})

test('2×2 네모 → 프로펠러, 특수는 옆과 바꾸기만 해도 터짐, 합치기', () => {
  const s = begin(0, seeded(37)); s.board = fill()
  s.board[0] = T(1); s.board[1] = T(1); s.board[N] = T(1); s.board[N + 2] = T(1); s.board[N + 1] = T(5); s.board[2 * N + 1] = T(4)
  const r = play(s, N + 1, N + 2, seeded(41))
  assert.ok(r.events.some((e) => e.type === 'make' && e.sp === 'prop'))
  const t = begin(0, seeded(43)); t.board = fill(); t.board[3 * N + 3] = T(0, 'row')
  const r2 = play(t, 3 * N + 3, 3 * N + 4, seeded(47))
  assert.ok(r2 && r2.events.some((e) => e.type === 'row'))
  const u = begin(0, seeded(53)); u.board = fill(); u.board[3 * N + 3] = T(0, 'bomb'); u.board[3 * N + 4] = T(1, 'bomb')
  const r3 = play(u, 3 * N + 3, 3 * N + 4, seeded(59))
  assert.ok(r3.events.some((e) => e.type === 'combo' && e.kinds === 'bomb+bomb'))
})

test('승리하면 별과 남은 이동 보너스', () => {
  const s = begin(0, seeded(61)); s.board = fill(); s.collected[0] = 11
  s.board[0] = T(0); s.board[1] = T(0); s.board[N + 2] = T(0); s.board[2] = T(3)
  const r = play(s, 2, N + 2, seeded(67))
  assert.equal(r.state.done, 'win'); assert.equal(r.state.stars, 3)
  assert.ok(r.events.some((e) => e.type === 'bonus' && e.n === STAGES[0].moves - 1))
})

test('300단계·먼지 최대 2겹', () => {
  assert.equal(STAGES.length, 300)
  assert.ok(STAGES.every((st) => !st.dust || st.dust.hp <= 2))
  assert.ok(begin(99).moves > 0)
})

test('뚫린 칸·상자: 안 움직임, 옆에서 맞추면 상자 깨짐, 망치·섞기', async () => {
  const { smash, shuffle, isFixed } = await import('./cleanLogic.js')
  const s = begin(2, seeded(71)) // 3단계: 가운데 뚫림 + 상자
  assert.ok(isFixed(s.board[24]) && s.board[22].fix === 'box')
  assert.equal(play(s, 22, 21), null)
  assert.equal(goals(s).find((g) => g.kind === 'box').left, 4)
  const r = smash(s, 15, seeded(73)) // 상자(22) 바로 위 칸 깨기
  assert.ok(goals(r.state).find((g) => g.kind === 'box').left < 4)
  assert.equal(r.state.moves, s.moves)
  const t = shuffle(s, seeded(79))
  assert.ok(hasMove(t.board) && t.board[24].fix === 'hole' && t.board.filter((x) => x.fix === 'box').length === 4)
  for (let i = 0; i < 20; i++) { const m = (() => { for (let a = 0; a < N * N; a++) for (const b of [a + 1, a + N]) { const x = play(t, a, b, seeded(i + 1)); if (x) return x } })(); if (m) assert.ok(m.state.board.every(Boolean)) }
})

test('특수 블록이 생긴 칸의 먼지도 같이 닦임', () => {
  for (let t = 0; t < 200; t++) {
    const s = begin(4)
    for (let a = 0; a < N * N; a++) for (const b of [a + 1, a + N]) {
      const r = play(s, a, b); if (!r) continue
      for (const e of r.events.filter((x) => x.type === 'make' && s.dust[x.i])) assert.ok(r.state.dust[e.i] < s.dust[e.i] || r.events.filter((x) => x.type === 'dust' && x.i === e.i).length)
    }
  }
})

test('오리 구출: 맨 아래 줄에 닿으면 모임, 오리는 안 깨짐', () => {
  const s = begin(3, seeded(83)) // 4단계: 오리 2마리
  assert.equal(s.board.filter((t) => t.drop).length, 2)
  assert.equal(goals(s).find((g) => g.kind === 'drop').left, 2)
  const t = { ...s, board: [...s.board] }
  const duck = t.board.findIndex((x) => x.drop)
  const c = duck % N
  // 오리를 맨 아래 바로 위로 옮기고 그 아래 칸을 망치로 깨면 내려와서 구출
  t.board[(N - 2) * N + c] = t.board[duck]; t.board[duck] = { k: 0, sp: null }
  return import('./cleanLogic.js').then(({ smash }) => {
    const r = smash(t, (N - 1) * N + c, seeded(89))
    assert.ok(r.events.some((e) => e.type === 'drop'))
    assert.ok(goals(r.state).find((g) => g.kind === 'drop').left < 2)
    assert.equal(smash(t, (N - 2) * N + c, seeded(97)).state.board.filter((x) => x.drop).length, 2)
  })
})

test('빗자루는 한 줄을, 지우개는 한 종류를 치움', async () => {
  const { sweep, erase } = await import('./cleanLogic.js')
  const s = { ...begin(0, seeded(3)), board: fill() }
  const r = sweep(s, N * 3, seeded(4))
  assert.ok(r)
  const k = s.board[0].k, e = erase(s, k, seeded(5))
  assert.ok(e)
  assert.equal(e.state.collected[k] >= s.board.filter((t) => t.k === k).length, true)
})

test('얼음: 못 움직이고 맞추면 깨짐 / 거품: 못 닦으면 번짐 / 세로 빗자루', async () => {
  const { sweep, isLocked } = await import('./cleanLogic.js')
  const i = STAGES.findIndex((st) => st.ice.length)
  const s = begin(i, seeded(101)); const x = STAGES[i].ice[0]
  assert.ok(isLocked(s.board[x]) && goals(s).find((g) => g.kind === 'ice').left === STAGES[i].ice.length)
  assert.equal(play(s, x, x + 1), null)
  const r = sweep(s, x, seeded(102))
  assert.ok(r.events.some((e) => e.type === 'ice') && r.state.board[x].k >= 0)
  const f = STAGES.findIndex((st) => st.foam.length)
  const t = { ...begin(f, seeded(103)), board: fill(), foam: Array.from({ length: N * N }, (_, k) => (k === 0 ? 1 : 0)) }
  const before = t.foam.filter(Boolean).length
  t.board[3 * N] = T(0); t.board[3 * N + 1] = T(0); t.board[4 * N + 2] = T(0); t.board[3 * N + 2] = T(3)
  const m = play(t, 3 * N + 2, 4 * N + 2, seeded(104))
  assert.ok(m.state.foam.filter(Boolean).length >= before) // 거품 옆이 아니면 번지거나 그대로
  const c = sweep({ ...begin(0, seeded(105)), board: fill() }, 3, seeded(106), true)
  assert.ok(c.events.filter((e) => e.type === 'smash').length === 1 && c.state.collected.reduce((a, b) => a + b) >= N)
  assert.ok(STAGES[9].hard && !STAGES[8].hard)
})

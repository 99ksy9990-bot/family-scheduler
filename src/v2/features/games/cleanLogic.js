// 우리집 대청소: 단계별 목표(먼지 닦기·물건 모으기)를 정해진 이동 안에 끝내는 셋 맞추기.
// 판: N×N, 칸 = { k: 0~5 종류, sp: null|'row'|'col'|'bomb'|'rainbow'|'prop' } 또는 고정 칸 { k: -1, fix: 'hole'|'box', hp }
// dust[i] = 먼지 남은 횟수, 상자는 옆에서 맞추거나 터뜨리면 hp가 줄고 0이면 사라짐
export const N = 7
export const KINDS = 6

// 단계: moves 이동 수, dust 먼지 배치(행 범위·두께), collect 모을 종류와 개수
const BASE = [
  { moves: 20, collect: [[0, 12]] },
  { moves: 20, dust: { rows: [6, 7], hp: 1 } },
  { moves: 22, collect: [[1, 15], [2, 15]] },
  { moves: 22, dust: { rows: [4, 7], hp: 1 } },
  { moves: 24, dust: { rows: [6, 7], hp: 2 }, collect: [[3, 10]] },
  { moves: 22, collect: [[0, 20], [4, 20]] },
  { moves: 25, dust: { rows: [3, 7], hp: 1 } },
  { moves: 25, dust: { rows: [5, 7], hp: 2 }, collect: [[5, 15]] },
  { moves: 24, dust: { rows: [2, 7], hp: 1 }, collect: [[1, 12]] },
  { moves: 28, dust: { rows: [4, 7], hp: 2 } },
  { moves: 26, collect: [[0, 25], [2, 25], [3, 25]] },
  { moves: 30, dust: { rows: [0, 7], hp: 1 } },
  { moves: 24, dust: { rows: [5, 7], hp: 2 }, collect: [[2, 18]] },
  { moves: 24, collect: [[1, 22], [4, 22]] },
  { moves: 28, dust: { rows: [3, 7], hp: 2 } },
  { moves: 26, dust: { rows: [2, 7], hp: 1 }, collect: [[0, 18], [5, 18]] },
  { moves: 25, collect: [[2, 28], [3, 28]] },
  { moves: 30, dust: { rows: [1, 7], hp: 2 } },
  { moves: 28, dust: { rows: [4, 7], hp: 2 }, collect: [[1, 20], [3, 20]] },
  { moves: 27, collect: [[0, 30], [1, 30], [5, 30]] },
  { moves: 32, dust: { rows: [0, 7], hp: 2 } },
  { moves: 30, dust: { rows: [2, 7], hp: 2 }, collect: [[4, 25]] },
  { moves: 30, dust: { rows: [0, 7], hp: 1 }, collect: [[2, 25], [3, 25]] },
  { moves: 34, dust: { rows: [0, 7], hp: 2 }, collect: [[0, 20], [5, 20]] },
]
// 25~48단계: 앞 24단계를 조금 어렵게 (먼지 hp+1 최대 2, 모을 개수 +3, 이동 +4)
const HARD = BASE.map((st) => ({
  moves: st.moves + 4,
  ...(st.dust && { dust: { rows: st.dust.rows, hp: Math.min(2, st.dust.hp + 1) } }),
  ...(st.collect && { collect: st.collect.map(([k, n]) => [k, n + 3]) }),
}))
// 쉽게 조정: 이동 1.5배, 모을 개수 0.7배
// 판 모양(뚫린 칸)과 상자 줄: 단계 번호로 돌아가며
const SHAPES = [[], [0, 6, 42, 48], [24], [14, 21, 28, 20, 27, 34], [0, 1, 5, 6], [21, 27]]
// 101단계부터 더 다양한 판 모양
const SHAPES2 = [[0, 1, 7, 5, 6, 13, 35, 42, 43, 41, 47, 48], [16, 18, 30, 32], [3, 45], [21, 22, 26, 27], [0, 6, 24, 42, 48], [3, 10, 38, 45], [0, 1, 2, 4, 5, 6], [7, 14, 13, 20, 28, 35, 34, 41]]
// 151단계부터 판 모양 8개 더
const SHAPES3 = [[3, 21, 27, 45], [0, 6, 8, 12, 36, 40, 42, 48], [10, 24, 38], [0, 1, 2, 46, 47, 48], [14, 20, 28, 34, 15, 19], [17, 23, 25, 31], [0, 7, 14, 6, 13, 20], [21, 27, 10, 38]]
// 201단계부터 판 모양 12개 더 (십자·기둥·대각선·계단·화살표 등), 앞 모양과 섞어서 돌림
const SHAPES4 = [[17, 23, 24, 25, 31], [8, 15, 22, 12, 19, 26], [0, 1, 2, 4, 5, 6, 43, 44, 45], [8, 10, 12, 36, 38, 40], [16, 17, 18, 23, 25, 30, 31, 32], [0, 8, 16, 32, 40, 48], [6, 12, 18, 30, 36, 42], [35, 41, 42, 43, 47, 48], [21, 23, 25, 27], [0, 3, 6, 7, 13], [0, 7, 8, 14, 15, 16], [3, 9, 11, 15, 19]]
const MIX = [...SHAPES4, ...SHAPES2, ...SHAPES3, ...SHAPES4.slice(0, 6)]
const shapeFor = (i) => (i >= 200 ? MIX[(i * 7) % MIX.length] : i >= 150 ? SHAPES3[i % SHAPES3.length] : i >= 100 ? SHAPES2[i % SHAPES2.length] : SHAPES[i % SHAPES.length])
const boxesFor = (i) => (i >= 2 && i % 3 === 2 ? { cells: [22, 23, 25, 26].concat(i >= 14 ? [15, 16, 17, 18, 19] : []), hp: i >= 24 && i < 200 ? 2 : 1 } : null)
// 오리 구출: 오리(k=-2)를 맨 아래 줄까지 내리면 모임
const dropsFor = (i) => (i >= 3 && i % 4 === 3 ? (i >= 24 ? 3 : 2) : 0)
// 49~60단계: 후반 12단계를 한 번 더, 먼지 2겹 + 모을 개수 +3
const EXTRA = HARD.slice(12).map((st) => ({ ...st, moves: st.moves + 3, ...(st.dust && { dust: { ...st.dust, hp: 2 } }), ...(st.collect && { collect: st.collect.map(([k, n]) => [k, n + 3]) }) }))
// 61~100단계: 후반 판을 돌려 쓰며 먼지 2겹 + 모을 개수 +5
const LATE = [...HARD, ...HARD.slice(0, 16)].map((st) => ({ ...st, moves: st.moves + 4, ...(st.dust && { dust: { ...st.dust, hp: 2 } }), ...(st.collect && { collect: st.collect.map(([k, n]) => [k, n + 5]) }) }))
// 101~200단계: 더 어렵게 — 먼지 2겹, 모을 개수 +10, 이동 -3
const ULTRA = [...HARD, ...HARD, ...HARD, ...HARD, ...HARD.slice(0, 4)].map((st) => ({ ...st, moves: st.moves - 3, ...(st.dust && { dust: { ...st.dust, hp: 2 } }), ...(st.collect && { collect: st.collect.map(([k, n]) => [k, n + 10]) }) }))
// 얼음(그 칸에서 맞추면 깨짐, 깨지기 전엔 못 움직임)·거품(안 닦으면 옆으로 번짐)
// 얼음·거품: 200단계 뒤엔 더 자주, 놓이는 줄도 바꿈
const iceFor = (i) => (i >= 20 && (i % 5 === 1 || (i >= 200 && i % 5 === 3)) ? (i % 2 ? [29, 30, 31, 32, 33] : [36, 37, 38, 39, 40]) : [])
const foamFor = (i) => (i >= 40 && (i % 7 === 5 || (i >= 200 && i % 7 === 2)) ? (i % 2 ? [0, 6, 42, 48, 3, 45] : [21, 27, 24, 3]) : [])
export const isHard = (i) => i % 10 === 9 // 10단계마다 '어려움': 별 2배
// 201~300단계: 101~200과 비슷한 수준 (아이들도 할 수 있게 이동 +3)
const MEGA = [...HARD, ...HARD, ...HARD, ...HARD, ...HARD.slice(0, 4)].map((st, k) => ({ ...st, moves: st.moves - 3 + 3, ...(st.dust && { dust: { ...st.dust, hp: 2 } }), ...(st.collect && { collect: st.collect.map(([kd, n]) => [(kd + k) % 6, n + 10]) }) }))
const RAW = [...BASE, ...HARD, ...EXTRA, ...LATE, ...ULTRA, ...MEGA]
export const STAGES = RAW.map((st, i) => {
  const holes = shapeFor(i)
  const free = (x) => !holes.includes(x) && !boxesFor(i)?.cells.includes(x)
  const ice = iceFor(i).filter(free); let foam = foamFor(i).filter(free).slice(0, 2)
  if (foamFor(i).length && !foam.length) foam = [24]
  // 201단계부터: 목표 종류가 4개 이상이면 이동 +10 (너무 빡빡하지 않게)
  const kinds = [st.dust, st.collect, boxesFor(i), dropsFor(i), ice.length, foam.length].filter(Boolean).length
  return { ...st, ice, foam, hard: isHard(i), extraMoves: (ice.length ? 4 : 0) + (foam.length ? 5 : 0) - (isHard(i) ? 2 : 0) + (i >= 200 && kinds >= 4 ? 10 : 0), holes }
}).map((st, i) => ({ ...st, boxes: boxesFor(i), drops: dropsFor(i), ...(st.dust && { dust: { ...st.dust, rows: [Math.max(0, st.dust.rows[0] - 1), N - 1] } }), moves: Math.round(st.moves * 1.5 * (st.dust ? (st.dust.hp > 1 ? 1.5 : 1.3) : 1) * (i < 12 ? 1.1 : 1)) + (dropsFor(i) ? 5 : 0) + (i >= 150 ? 4 : 0) + st.extraMoves, ...(st.collect && { collect: st.collect.map(([k, n]) => [k, Math.round(n * 0.7)]) }) }))

const rc = (i) => [Math.floor(i / N), i % N]
const kindAt = (b, r, c) => (r < 0 || c < 0 || r >= N || c >= N || !b[r * N + c] ? -1 : b[r * N + c].k)
const pick = (rand) => Math.floor(rand() * KINDS)

export function begin(stageIndex, rand = Math.random) {
  const st = STAGES[stageIndex]
  const fixed = Array.from({ length: N * N }, (_, i) => (st.holes?.includes(i) ? { k: -1, fix: 'hole' } : st.boxes?.cells.includes(i) ? { k: -1, fix: 'box', hp: st.boxes.hp } : null))
  const board = deal(fixed, rand)
  const dust = Array.from({ length: N * N }, (_, i) => (!fixed[i] && st.dust && rc(i)[0] >= st.dust.rows[0] && rc(i)[0] <= st.dust.rows[1] ? st.dust.hp : 0))
  // 오리는 위쪽 줄 서로 다른 칸에
  const tops = board.map((t, x) => (!isFixed(t) && rc(x)[0] <= 1 ? x : -1)).filter((x) => x >= 0)
  for (let n = 0; n < (st.drops || 0) && tops.length; n++) { const x = tops.splice(Math.floor(rand() * tops.length), 1)[0]; board[x] = { k: -2, drop: true, sp: null } }
  for (const x of st.ice) board[x] = { ...board[x], ice: 1 }
  if (st.ice.length && !hasMove(board)) return begin(stageIndex, rand)
  const foam = Array.from({ length: N * N }, (_, i) => (st.foam.includes(i) ? 1 : 0))
  return { stage: stageIndex, dropped: 0, board, dust, foam, moves: st.moves, collected: Array(KINDS).fill(0), score: 0, done: null }
}

// 고정 칸은 두고 나머지를 줄 없이 새로 채움 (움직일 수 있을 때까지)
function deal(fixed, rand) {
  let board
  do {
    board = []
    for (let i = 0; i < N * N; i++) {
      if (fixed[i]) { board.push(fixed[i]); continue }
      const [r, c] = rc(i)
      let k
      do k = pick(rand); while ((c >= 2 && board[i - 1].k === k && board[i - 2].k === k) || (r >= 2 && board[i - N].k === k && board[i - 2 * N].k === k))
      board.push({ k, sp: null })
    }
  } while (!hasMove(board))
  return board
}
export const isFixed = (t) => !!t?.fix
export const isLocked = (t) => !!t?.fix || !!t?.ice // 얼음 칸도 못 움직임

// 가로·세로 3개 이상 줄 찾기 → [{ cells, dir }]
function runs(b) {
  const out = []
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const k = kindAt(b, r, c); if (k < 0) continue
    if (kindAt(b, r, c - 1) !== k) { let e = c; while (kindAt(b, r, e + 1) === k) e++; if (e - c >= 2) out.push({ cells: Array.from({ length: e - c + 1 }, (_, x) => r * N + c + x), dir: 'h', k }) }
    if (kindAt(b, r - 1, c) !== k) { let e = r; while (kindAt(b, e + 1, c) === k) e++; if (e - r >= 2) out.push({ cells: Array.from({ length: e - r + 1 }, (_, x) => (r + x) * N + c), dir: 'v', k }) }
  }
  return out
}

// 줄들을 겹치는 것끼리 묶어 특수 블록 결정: 5줄→무지개, ㄱ·T→폭탄, 4줄→로켓, 2×2→프로펠러
function groups(b, prefer = []) {
  const rs = runs(b); const used = new Set(); const out = []
  for (let a = 0; a < rs.length; a++) {
    if (used.has(a)) continue
    const g = [rs[a]]; used.add(a)
    for (let x = a + 1; x < rs.length; x++) if (!used.has(x) && rs[x].k === rs[a].k && g.some((y) => y.cells.some((c) => rs[x].cells.includes(c)))) { g.push(rs[x]); used.add(x) }
    const cells = [...new Set(g.flatMap((x) => x.cells))]
    const longest = Math.max(...g.map((x) => x.cells.length))
    const sp = longest >= 5 ? 'rainbow' : g.length > 1 ? 'bomb' : longest === 4 ? (g[0].dir === 'h' ? 'col' : 'row') : null
    const at = cells.find((c) => prefer.includes(c)) ?? cells[Math.floor(cells.length / 2)]
    out.push({ cells, sp, at, k: rs[a].k })
  }
  // 2×2 네모 → 프로펠러 (줄에 이미 들어간 칸은 제외)
  const taken = new Set(out.flatMap((g) => g.cells))
  for (let r = 0; r < N - 1; r++) for (let c = 0; c < N - 1; c++) {
    const sq = [r * N + c, r * N + c + 1, (r + 1) * N + c, (r + 1) * N + c + 1]
    const k = kindAt(b, r, c)
    if (k < 0 || sq.some((x) => b[x].k !== k || taken.has(x))) continue
    sq.forEach((x) => taken.add(x))
    out.push({ cells: sq, sp: 'prop', at: sq.find((x) => prefer.includes(x)) ?? sq[0], k })
  }
  return out
}

export const adjacent = (i, j) => (Math.abs(i - j) === 1 && Math.floor(i / N) === Math.floor(j / N)) || Math.abs(i - j) === N
const swapped = (b, i, j) => { const n = [...b]; [n[i], n[j]] = [n[j], n[i]]; return n }

// 바꿀 수 있는 두 칸 [i, j] (힌트용), 없으면 null
export function findMove(b) {
  for (let i = 0; i < N * N; i++) {
    for (const j of [i + 1, i + N]) if (j < N * N && adjacent(i, j) && !isLocked(b[i]) && !isLocked(b[j]) && (b[i]?.sp || b[j]?.sp || runs(swapped(b, i, j)).length)) return [i, j]
  }
  return null
}
export const hasMove = (b) => !!findMove(b)
// 맨 아래(뚫린 칸 제외)에 닿은 오리를 꺼냄
function rescue(s, events) {
  let got = false
  for (let c = 0; c < N; c++) {
    let r = N - 1; while (r >= 0 && s.board[r * N + c]?.fix === 'hole') r--
    const i = r * N + c
    if (r >= 0 && s.board[i]?.drop) { s.board[i] = null; s.dropped = (s.dropped || 0) + 1; events.push({ type: 'drop', i }); got = true }
  }
  return got
}

// 특수 블록 터짐 범위
const square = (r, c, size) => { const o = []; for (let y = r - size; y <= r + size; y++) for (let x = c - size; x <= c + size; x++) if (y >= 0 && x >= 0 && y < N && x < N) o.push(y * N + x); return o }
// 프로펠러가 날아갈 곳: 남은 먼지 → 모아야 할 물건 → 아무 칸
function propTarget(s, from) {
  const dust = s.dust.map((d, x) => (d ? x : -1)).filter((x) => x >= 0 && x !== from)
  if (dust.length) return dust[0]
  const need = (STAGES[s.stage].collect || []).filter(([k, n]) => s.collected[k] < n).map(([k]) => k)
  const hit = s.board.findIndex((t, x) => t && x !== from && need.includes(t.k))
  return hit >= 0 ? hit : (from + N * 3) % (N * N)
}
function blast(b, i, target = null, s = null) {
  const [r, c] = rc(i); const sp = b[i]?.sp
  if (sp === 'prop') { const o = [i, ...[[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([y, x]) => y >= 0 && x >= 0 && y < N && x < N).map(([y, x]) => y * N + x)]; if (s) o.push(propTarget(s, i)); return o }
  if (sp === 'row') return Array.from({ length: N }, (_, x) => r * N + x)
  if (sp === 'col') return Array.from({ length: N }, (_, x) => x * N + c)
  if (sp === 'bomb') return square(r, c, 1)
  if (sp === 'rainbow') { const k = target ?? b.find((t) => t && !t.sp && t.k >= 0)?.k; return b.map((t, x) => (t && t.k === k ? x : -1)).filter((x) => x >= 0).concat(i) }
  return [i]
}

// 칸들을 지우면서 그 안의 특수 블록도 연쇄로 터뜨림
function clearCells(s, cells, events) {
  const queue = [...cells]; const gone = new Set(); const hitBox = new Set(); const thawed = new Set()
  while (queue.length) {
    const i = queue.pop(); if (gone.has(i) || !s.board[i]) continue
    if (isFixed(s.board[i])) { if (s.board[i].fix === 'box') hitBox.add(i); continue }
    if (s.board[i].drop) continue // 오리는 안 깨짐
    if (thawed.has(i)) continue
    if (s.board[i].ice) { s.board[i] = { ...s.board[i], ice: 0 }; thawed.add(i); events.push({ type: 'ice', i }); continue } // 얼음만 깨지고 물건은 남음
    gone.add(i)
    if (s.board[i].sp) { const hit = blast(s.board, i, null, s); events.push({ type: s.board[i].sp, i, cells: hit }); for (const x of hit) if (!gone.has(x)) queue.push(x) }
  }
  // 지운 칸 옆 상자도 한 번씩 맞음
  for (const i of gone) { const [r, c] = rc(i); for (const [y, x] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) if (y >= 0 && x >= 0 && y < N && x < N && s.board[y * N + x]?.fix === 'box') hitBox.add(y * N + x) }
  for (const i of hitBox) { const hp = s.board[i].hp - 1; s.board[i] = hp > 0 ? { ...s.board[i], hp } : null; s.boxes = (s.boxes || 0) + (hp > 0 ? 0 : 1); events.push({ type: 'box', i }) }
  for (const i of gone) {
    s.collected[s.board[i].k]++
    if (s.dust[i]) { s.dust[i]--; events.push({ type: 'dust', i }) }
    if (s.foam?.[i]) { s.foam[i] = 0; s.foamHit = true; events.push({ type: 'foam', i }) }
    s.board[i] = null
  }
  s.score += gone.size * 10
  return gone
}

function fall(s, rand) {
  for (let c = 0; c < N; c++) {
    // 고정 칸(뚫린 칸·상자)은 그 자리에 두고, 블록은 그 사이로 떨어짐
    const col = []; for (let r = N - 1; r >= 0; r--) { const t = s.board[r * N + c]; if (t && !isLocked(t)) col.push(t) }
    for (let r = N - 1, x = 0; r >= 0; r--) if (!isLocked(s.board[r * N + c])) s.board[r * N + c] = col[x++] || { k: pick(rand), sp: null }
  }
}

// 특수 블록 두 개 합치기: 로켓+로켓=십자, 로켓+폭탄=가로·세로 3줄씩, 폭탄+폭탄=5×5, 프로펠러+X=목표 칸에서 X 터짐
function combo(s, i, j, events) {
  const A = s.board[i].sp; const B = s.board[j].sp; const [r, c] = rc(j); const kinds = [A, B].sort().join('+')
  const line = (y, x) => [...Array.from({ length: N }, (_, k) => y * N + k), ...Array.from({ length: N }, (_, k) => k * N + x)]
  let cells
  if (kinds === 'col+col' || kinds === 'col+row' || kinds === 'row+row') cells = line(r, c)
  else if (kinds === 'bomb+col' || kinds === 'bomb+row') cells = [-1, 0, 1].flatMap((d) => line(Math.min(N - 1, Math.max(0, r + d)), Math.min(N - 1, Math.max(0, c + d))))
  else if (kinds === 'bomb+bomb') cells = square(r, c, 2)
  else { const other = A === 'prop' ? B : A; const t = propTarget(s, j); const tmp = [...s.board]; tmp[t] = { ...tmp[t], sp: other === 'prop' ? 'bomb' : other }; cells = [i, j, ...blast(tmp, t, null, s)] }
  events.push({ type: 'combo', i: j, kinds, cells })
  s.board[i] = { ...s.board[i], sp: null }; s.board[j] = { ...s.board[j], sp: null }
  return [...new Set(cells)]
}

// 바꾸기 한 번. 무효면 null. → 새 상태 + events(효과용)
export function play(state, i, j, rand = Math.random) {
  if (state.done || !adjacent(i, j) || !state.board[i] || !state.board[j] || isLocked(state.board[i]) || isLocked(state.board[j])) return null
  const s = copy(state)
  const events = []
  const a = s.board[i]; const bb = s.board[j]
  if (a.sp === 'rainbow' || bb.sp === 'rainbow') {
    const [rain, other] = a.sp === 'rainbow' ? [i, bb] : [j, a]
    events.push({ type: 'rainbow', i: rain, cells: a.sp === 'rainbow' && bb.sp === 'rainbow' ? s.board.map((_, x) => x) : s.board.map((t, x) => (t && t.k === other.k ? x : -1)).filter((x) => x >= 0) })
    if (a.sp === 'rainbow' && bb.sp === 'rainbow') { s.board[rain] = { ...s.board[rain], sp: null }; clearCells(s, s.board.map((_, x) => x), events) }
    else if (other.sp) {
      // 무지개 + 특수: 같은 종류가 모두 그 특수 블록이 되어 한꺼번에 터짐
      const same = s.board.map((t, x) => (t && t.k === other.k ? x : -1)).filter((x) => x >= 0)
      for (const x of same) s.board[x] = { ...s.board[x], sp: other.sp === 'row' || other.sp === 'col' ? (x % 2 ? 'row' : 'col') : other.sp }
      s.board[rain] = { ...s.board[rain], sp: null }; clearCells(s, [...same, rain], events)
    } else { const cells = blast(s.board, rain, other.k); s.board[rain] = { ...s.board[rain], sp: null }; clearCells(s, cells, events) }
  } else if (a.sp && bb.sp) {
    clearCells(s, combo(s, i, j, events), events)
  } else if (a.sp || bb.sp) {
    // 특수 블록은 옆 칸과 바꾸기만 해도 터짐
    s.board = swapped(s.board, i, j)
    clearCells(s, [a.sp ? j : i], events)
  } else {
    s.board = swapped(s.board, i, j)
    if (!groups(s.board).length) return null
  }
  s.moves--
  const r = settle(s, events, [i, j], rand)
  spread(r.state, r.events, rand)
  return r
}
const copy = (state) => ({ ...state, board: [...state.board], dust: [...state.dust], foam: [...(state.foam || [])], collected: [...state.collected], foamHit: false })
// 이번 이동에 거품을 하나도 못 닦으면 거품 하나가 옆 칸으로 번짐
function spread(s, events, rand) {
  if (s.done || s.foamHit || !s.foam?.some(Boolean)) return
  const to = []
  s.foam.forEach((f, i) => { if (!f) return; const [r, c] = rc(i); for (const [y, x] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) { const k = y * N + x; if (y >= 0 && x >= 0 && y < N && x < N && !s.foam[k] && !isFixed(s.board[k])) to.push(k) } })
  if (!to.length) return
  const k = to[Math.floor(rand() * to.length)]; s.foam[k] = 1; events.push({ type: 'grow', i: k })
}

// 터진 뒤 떨어지고 연쇄, 끝났는지 판정
function settle(s, events, prefer, rand) {
  for (let chain = 0; chain < 30; chain++) {
    fall(s, rand)
    const gs = groups(s.board, prefer); if (!gs.length) break
    for (const g of gs) {
      const keep = g.sp ? g.at : -1
      const made = keep >= 0 ? { k: g.k, sp: g.sp } : null
      clearCells(s, g.cells.filter((c) => c !== keep), events)
      if (made) { s.board[keep] = made; events.push({ type: 'make', i: keep, sp: g.sp }); s.collected[g.k]++; if (s.dust[keep]) { s.dust[keep]--; events.push({ type: 'dust', i: keep }) } } // 특수 블록이 생긴 칸의 먼지도 닦임
    }
    if (chain) events.push({ type: 'chain', n: chain + 1 })
    prefer = []
  }
  fall(s, rand)
  for (let k = 0; k < 10 && rescue(s, events); k++) { fall(s, rand); for (let chain = 0; chain < 30; chain++) { const gs = groups(s.board); if (!gs.length) break; for (const g of gs) clearCells(s, g.cells, events); fall(s, rand) } }
  if (!hasMove(s.board)) s.board = deal(s.board.map((t) => (isLocked(t) || t?.drop ? t : null)), rand)
  s.done = won(s) ? 'win' : s.moves <= 0 ? 'lose' : null
  if (s.done === 'win') {
    // 남은 이동마다 로켓 한 발씩 보너스
    s.stars = s.moves >= STAGES[s.stage].moves * 0.3 ? 3 : s.moves >= STAGES[s.stage].moves * 0.1 ? 2 : 1
    for (let m = 0; m < s.moves; m++) { const x = Math.floor(rand() * N * N); if (isLocked(s.board[x]) || s.board[x]?.drop) continue; s.board[x] = { ...s.board[x], sp: m % 2 ? 'row' : 'col' }; clearCells(s, [x], events); fall(s, rand) }
    events.push({ type: 'bonus', n: s.moves })
  }
  return { state: s, events }
}

// 아이템: 망치(한 칸 깨기, 이동 안 씀), 섞기
export function smash(state, i, rand = Math.random) {
  if (state.done || state.board[i]?.fix === 'hole') return null
  const s = copy(state)
  const events = [{ type: 'smash', i }]
  clearCells(s, [i], events)
  return settle(s, events, [], rand)
}
// 빗자루(별로만 삼): 누른 칸의 가로 한 줄(col이면 세로 한 줄)을 통째로 치움
export function sweep(state, i, rand = Math.random, col = false) {
  if (state.done || i < 0 || i >= N * N) return null
  const s = copy(state)
  const r = Math.floor(i / N), cells = Array.from({ length: N }, (_, c) => (col ? c * N + (i % N) : r * N + c)).filter((x) => s.board[x]?.fix !== 'hole')
  const events = [{ type: 'smash', i }]
  clearCells(s, cells, events)
  return settle(s, events, [], rand)
}
// 지우개(별로만 삼): 판에서 한 종류를 모두 지움
export function erase(state, k, rand = Math.random) {
  if (state.done || k < 0) return null
  const s = copy(state)
  const cells = s.board.map((t, x) => (t && t.k === k ? x : -1)).filter((x) => x >= 0)
  if (!cells.length) return null
  const events = [{ type: 'smash', i: cells[0] }]
  clearCells(s, cells, events)
  return settle(s, events, [], rand)
}
export function shuffle(state, rand = Math.random) {
  if (state.done) return null
  return { ...state, board: deal(state.board.map((t) => (isLocked(t) || t.sp || t.drop ? t : null)), rand) }
}

export function goals(s) {
  const st = STAGES[s.stage]; const out = []
  if (st.drops) out.push({ kind: 'drop', left: Math.max(0, st.drops - (s.dropped || 0)) })
  if (st.boxes) out.push({ kind: 'box', left: s.board.filter((t) => t?.fix === 'box').length })
  if (st.ice.length) out.push({ kind: 'ice', left: s.board.filter((t) => t?.ice).length })
  if (st.foam.length) out.push({ kind: 'foam', left: (s.foam || []).filter(Boolean).length })
  if (st.dust) out.push({ kind: 'dust', left: s.dust.reduce((n, d) => n + d, 0) })
  for (const [k, n] of st.collect || []) out.push({ kind: k, left: Math.max(0, n - s.collected[k]) })
  return out
}
export const won = (s) => goals(s).every((g) => g.left === 0)

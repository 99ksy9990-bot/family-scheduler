// 우리집 대청소: 단계별 목표(먼지 닦기·물건 모으기)를 정해진 이동 안에 끝내는 셋 맞추기.
// 판: N×N, 칸 = { k: 0~5 종류, sp: null|'row'|'col'|'bomb'|'rainbow' }, dust[i] = 먼지 남은 횟수(0~2)
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
export const STAGES = [...BASE, ...HARD].map((st) => ({ ...st, ...(st.dust && { dust: { ...st.dust, rows: [Math.max(0, st.dust.rows[0] - 1), N - 1] } }), moves: Math.round(st.moves * 1.5), ...(st.collect && { collect: st.collect.map(([k, n]) => [k, Math.round(n * 0.7)]) }) }))

const rc = (i) => [Math.floor(i / N), i % N]
const kindAt = (b, r, c) => (r < 0 || c < 0 || r >= N || c >= N || !b[r * N + c] ? -1 : b[r * N + c].k)
const pick = (rand) => Math.floor(rand() * KINDS)

export function begin(stageIndex, rand = Math.random) {
  const st = STAGES[stageIndex]
  let board
  do {
    board = []
    for (let i = 0; i < N * N; i++) {
      const [r, c] = rc(i)
      let k
      do k = pick(rand); while ((c >= 2 && board[i - 1].k === k && board[i - 2].k === k) || (r >= 2 && board[i - N].k === k && board[i - 2 * N].k === k))
      board.push({ k, sp: null })
    }
  } while (!hasMove(board))
  const dust = Array.from({ length: N * N }, (_, i) => (st.dust && rc(i)[0] >= st.dust.rows[0] && rc(i)[0] <= st.dust.rows[1] ? st.dust.hp : 0))
  return { stage: stageIndex, board, dust, moves: st.moves, collected: Array(KINDS).fill(0), score: 0, done: null }
}

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
    for (const j of [i + 1, i + N]) if (j < N * N && adjacent(i, j) && (b[i]?.sp || b[j]?.sp || runs(swapped(b, i, j)).length)) return [i, j]
  }
  return null
}
export const hasMove = (b) => !!findMove(b)

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
  if (sp === 'rainbow') { const k = target ?? b.find((t) => t && !t.sp)?.k; return b.map((t, x) => (t && t.k === k ? x : -1)).filter((x) => x >= 0).concat(i) }
  return [i]
}

// 칸들을 지우면서 그 안의 특수 블록도 연쇄로 터뜨림
function clearCells(s, cells, events) {
  const queue = [...cells]; const gone = new Set()
  while (queue.length) {
    const i = queue.pop(); if (gone.has(i) || !s.board[i]) continue
    gone.add(i)
    if (s.board[i].sp) { events.push({ type: s.board[i].sp, i }); for (const x of blast(s.board, i, null, s)) if (!gone.has(x)) queue.push(x) }
  }
  for (const i of gone) {
    s.collected[s.board[i].k]++
    if (s.dust[i]) { s.dust[i]--; events.push({ type: 'dust', i }) }
    s.board[i] = null
  }
  s.score += gone.size * 10
  return gone
}

function fall(s, rand) {
  for (let c = 0; c < N; c++) {
    const col = []; for (let r = N - 1; r >= 0; r--) if (s.board[r * N + c]) col.push(s.board[r * N + c])
    for (let r = N - 1, x = 0; r >= 0; r--, x++) s.board[r * N + c] = col[x] || { k: pick(rand), sp: null }
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
  events.push({ type: 'combo', i: j, kinds })
  s.board[i] = { ...s.board[i], sp: null }; s.board[j] = { ...s.board[j], sp: null }
  return [...new Set(cells)]
}

// 바꾸기 한 번. 무효면 null. → 새 상태 + events(효과용)
export function play(state, i, j, rand = Math.random) {
  if (state.done || !adjacent(i, j)) return null
  const s = { ...state, board: [...state.board], dust: [...state.dust], collected: [...state.collected] }
  const events = []
  const a = s.board[i]; const bb = s.board[j]
  if (a.sp === 'rainbow' || bb.sp === 'rainbow') {
    const [rain, other] = a.sp === 'rainbow' ? [i, bb] : [j, a]
    events.push({ type: 'rainbow', i: rain })
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
  let prefer = [i, j]
  for (let chain = 0; chain < 30; chain++) {
    fall(s, rand)
    const gs = groups(s.board, prefer); if (!gs.length) break
    for (const g of gs) {
      const keep = g.sp ? g.at : -1
      const made = keep >= 0 ? { k: g.k, sp: g.sp } : null
      clearCells(s, g.cells.filter((c) => c !== keep), events)
      if (made) { s.board[keep] = made; events.push({ type: 'make', i: keep, sp: g.sp }); s.collected[g.k]++ }
    }
    if (chain) events.push({ type: 'chain', n: chain + 1 })
    prefer = []
  }
  fall(s, rand)
  if (!hasMove(s.board)) s.board = begin(s.stage, rand).board
  s.done = won(s) ? 'win' : s.moves <= 0 ? 'lose' : null
  if (s.done === 'win') {
    // 남은 이동마다 로켓 한 발씩 보너스
    s.stars = s.moves >= STAGES[s.stage].moves * 0.3 ? 3 : s.moves >= STAGES[s.stage].moves * 0.1 ? 2 : 1
    for (let m = 0; m < s.moves; m++) { const x = Math.floor(rand() * N * N); s.board[x] = { ...s.board[x], sp: m % 2 ? 'row' : 'col' }; clearCells(s, [x], events); fall(s, rand) }
    events.push({ type: 'bonus', n: s.moves })
  }
  return { state: s, events }
}

export function goals(s) {
  const st = STAGES[s.stage]; const out = []
  if (st.dust) out.push({ kind: 'dust', left: s.dust.reduce((n, d) => n + d, 0) })
  for (const [k, n] of st.collect || []) out.push({ kind: k, left: Math.max(0, n - s.collected[k]) })
  return out
}
export const won = (s) => goals(s).every((g) => g.left === 0)

// 같은 그림 셋 맞추기 순수 로직. 판: N×N 배열(행 우선), 값 0~5(조각 종류) 또는 -1(빈칸)
export const N = 7
export const TILES = ['star', 'heart', 'sun', 'ribbon', 'pencil', 'house']
export const MODES = { easy: {}, normal: { moves: 30 }, hard: { seconds: 60 } }
const at = (b, r, c) => (r < 0 || c < 0 || r >= N || c >= N ? -2 : b[r * N + c])

export function fresh(rand = Math.random) {
  for (;;) {
    const b = []
    for (let i = 0; i < N * N; i += 1) {
      const r = Math.floor(i / N); const c = i % N
      let v
      do v = Math.floor(rand() * 6); while ((c >= 2 && b[i - 1] === v && b[i - 2] === v) || (r >= 2 && b[i - N] === v && b[i - 2 * N] === v))
      b.push(v)
    }
    if (hasMove(b)) return b
  }
}

export function findMatches(b) {
  const hit = new Set()
  for (let r = 0; r < N; r += 1) for (let c = 0; c < N; c += 1) {
    const v = at(b, r, c); if (v < 0) continue
    if (at(b, r, c + 1) === v && at(b, r, c + 2) === v) { let k = c; while (at(b, r, k) === v) hit.add(r * N + k++) }
    if (at(b, r + 1, c) === v && at(b, r + 2, c) === v) { let k = r; while (at(b, k, c) === v) hit.add(k++ * N + c) }
  }
  return hit
}

const swapped = (b, i, j) => { const n = [...b]; [n[i], n[j]] = [n[j], n[i]]; return n }
export const adjacent = (i, j) => (Math.abs(i - j) === 1 && Math.floor(i / N) === Math.floor(j / N)) || Math.abs(i - j) === N

export function hasMove(b) {
  for (let i = 0; i < N * N; i += 1) for (const j of [i + 1, i + N]) if (j < N * N && adjacent(i, j) && findMatches(swapped(b, i, j)).size) return true
  return false
}

// 맞는 줄이 생길 때만 바꿈. 연쇄 끝까지 처리. → { board, gained, chains } 또는 null(무효)
export function swap(b, i, j, rand = Math.random) {
  if (!adjacent(i, j)) return null
  let board = swapped(b, i, j)
  let hits = findMatches(board)
  if (!hits.size) return null
  let gained = 0; let chains = 0
  while (hits.size) {
    chains += 1
    gained += hits.size * 10 * chains
    board = board.map((v, k) => (hits.has(k) ? -1 : v))
    for (let c = 0; c < N; c += 1) { // 아래로 떨어뜨리고 위를 채움
      const col = []
      for (let r = N - 1; r >= 0; r -= 1) if (board[r * N + c] >= 0) col.push(board[r * N + c])
      for (let r = N - 1, k = 0; r >= 0; r -= 1, k += 1) board[r * N + c] = k < col.length ? col[k] : Math.floor(rand() * 6)
    }
    hits = findMatches(board)
  }
  if (!hasMove(board)) board = fresh(rand)
  return { board, gained, chains }
}

// 가족 얼굴 톡톡 순수 로직. holes: 9칸, 각 칸 { kind: null|'dad'..|'cloud', until }
export const FACES = ['dad', 'mom', 'big', 'little']
export const RULES = {
  easy: { every: 1100, stay: 1400, many: 1, cloud: 0 },
  normal: { every: 800, stay: 1000, many: 1, cloud: 0.15 },
  hard: { every: 600, stay: 750, many: 2, cloud: 0.2 },
}
export const DURATION = 30000

export const empty = () => Array.from({ length: 9 }, () => ({ kind: null, until: 0 }))

// 시간 t에 얼굴 내보내기 (빈 칸에만)
export function spawn(holes, level, t, rand = Math.random) {
  const r = RULES[level]
  const next = holes.map((h) => (h.kind && h.until <= t ? { kind: null, until: 0 } : h))
  for (let n = 0; n < r.many; n += 1) {
    const free = next.map((h, i) => (h.kind ? -1 : i)).filter((i) => i >= 0)
    if (!free.length) break
    const i = free[Math.floor(rand() * free.length)]
    const kind = rand() < r.cloud ? 'cloud' : FACES[Math.floor(rand() * 4)]
    next[i] = { kind, until: t + r.stay }
  }
  return next
}

// 칸 누르기 → { holes, delta }
export function hit(holes, i, level) {
  const h = holes[i]
  if (!h?.kind) return { holes, delta: 0 }
  const delta = h.kind === 'cloud' ? (level === 'easy' ? 0 : -2) : 1
  return { holes: holes.map((x, j) => (j === i ? { kind: null, until: 0 } : x)), delta }
}

// 하늘 선물 받기 순수 로직. 좌표는 0~1 비율(가로 x, 세로 y)
export const RULES = { easy: { speed: 0.25, every: 900, cloud: 0 }, normal: { speed: 0.35, every: 700, cloud: 0.15 }, hard: { speed: 0.45, every: 520, cloud: 0.25 } }
export const KINDS = ['star', 'heart', 'sun']
export const BASKET = { y: 0.62, half: 0.11 } // 바구니 높이·반폭

export const begin = () => ({ items: [], score: 0, lives: 3, t: 0, last: 0, nextId: 1, over: false, bigUntil: 0, slowUntil: 0 })
export const STAGE_EVERY = 20 // 20점마다 다음 단계
export const stageOf = (score) => 1 + Math.floor(score / STAGE_EVERY)
export const BIG = 1.6 // 큰 바구니 배율
export const halfOf = (s) => BASKET.half * (s.t < s.bigUntil ? BIG : 1)

// dt(ms)만큼 진행. x: 바구니 중심
export function step(s, dt, x, level, rand = Math.random) {
  if (s.over) return s
  const r = RULES[level]
  const t = s.t + dt
  const speed = r.speed * (1 + t / 60000) * (1 + (stageOf(s.score) - 1) * 0.08) * (t < s.slowUntil ? 0.5 : 1) // 1분마다 2배 쪽으로, 느림 시계면 절반
  const half = halfOf(s)
  let { score, lives, nextId } = s
  const items = []
  for (const it of s.items) {
    const y = it.y + speed * dt / 1000
    if (y >= BASKET.y && it.y < BASKET.y && Math.abs(it.x - x) <= half) {
      if (it.kind === 'cloud') lives -= 1; else score += (it.kind === 'sun' ? 3 : 1) * (s.mul || 1)
      continue
    }
    if (y < 1.05) items.push({ ...it, y })
  }
  let last = s.last
  if (t - last >= r.every) {
    last = t
    items.push({ id: nextId, x: 0.08 + rand() * 0.84, y: -0.05, kind: rand() < r.cloud ? 'cloud' : KINDS[Math.floor(rand() * 3)] })
    nextId += 1
  }
  return { ...s, items, score, lives, t, last, nextId, over: lives <= 0 }
}

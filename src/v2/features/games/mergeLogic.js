// 우리집 합치기: 같은 단계 둘이 닿으면 다음 단계 하나로. 좌표는 가로 1 기준, 세로 h, y는 아래로.
export const STAGES = [
  { img: '/game/tiles/seed.png', r: 0.05, color: '#ffdcb0', name: '씨앗' },
  { img: '/game/tiles/sprout.png', r: 0.065, color: '#d4f5c4', name: '새싹' },
  { img: '/game/tiles/flower.png', r: 0.082, color: '#ffd0da', name: '꽃' },
  { img: '/game/tiles/tree.png', r: 0.1, color: '#cfe6ff', name: '나무' },
  { img: '/game/tiles/house.png', r: 0.12, color: '#bfe0ff', name: '집' },
  { img: '/characters/little_done.png', r: 0.14, color: '#c8f0d8', name: '연두' },
  { img: '/characters/big_done.png', r: 0.162, color: '#e6d4ff', name: '초롱' },
  { img: '/characters/mom_done.png', r: 0.188, color: '#ffd6cc', name: '엄마' },
  { img: '/characters/dad_done.png', r: 0.215, color: '#cfd8ff', name: '아빠' },
]
export const LINE = 0.16 // 이 선 위로 쌓이면 끝 (세로 비율)
const G = 2.2; const SUB = 4

export const begin = (h = 1.4, rnd = Math.random) => ({ h, balls: [], next: pick(rnd), after: pick(rnd), score: 0, over: false, id: 1, events: [] })
const pick = (rnd) => Math.floor(rnd() * 4)

export function drop(s, x, rnd = Math.random) {
  if (s.over) return s
  const r = STAGES[s.next].r
  const cx = Math.min(1 - r, Math.max(r, x + (rnd() - 0.5) * 0.004)) // 아주 조금 흔들어 탑처럼 곧게 서지 않게
  return { ...s, balls: [...s.balls, { id: s.id, stage: s.next, x: cx, y: r + 0.01, vx: 0, vy: 0, age: 0 }], id: s.id + 1, next: s.after, after: pick(rnd), events: [] }
}

export function step(s, dt) {
  if (s.over) return s
  const t = Math.min(dt, 0.04) / SUB
  let balls = s.balls.map((b) => ({ ...b, age: b.age + dt }))
  let { score, id } = s
  const events = []
  for (let k = 0; k < SUB; k++) {
    for (const b of balls) { b.vy += G * t; b.x += b.vx * t; b.y += b.vy * t }
    const gone = new Set(); const born = []
    for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i]; const b = balls[j]
      if (gone.has(a.id) || gone.has(b.id)) continue
      const ra = STAGES[a.stage].r; const rb = STAGES[b.stage].r
      const dx = b.x - a.x; const dy = b.y - a.y; const d = Math.hypot(dx, dy) || 1e-6
      if (d >= ra + rb) continue
      if (a.stage === b.stage) {
        gone.add(a.id); gone.add(b.id)
        const x = (a.x + b.x) / 2; const y = (a.y + b.y) / 2
        score += 2 ** (a.stage + 1)
        if (a.stage + 1 < STAGES.length) born.push({ id: id++, stage: a.stage + 1, x, y, vx: 0, vy: 0, age: 1 })
        else score += 500 // 아빠 둘 = 우리 가족 완성
        events.push({ x, y, stage: a.stage + 1 })
        continue
      }
      const push = (ra + rb - d) / 2; const nx = dx / d; const ny = dy / d
      a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push
      const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
      if (rel < 0) { const imp = rel * 0.6; a.vx += imp * nx; a.vy += imp * ny; b.vx -= imp * nx; b.vy -= imp * ny }
    }
    if (gone.size) balls = [...balls.filter((b) => !gone.has(b.id)), ...born]
    for (const b of balls) {
      const r = STAGES[b.stage].r
      if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx) * 0.3 }
      if (b.x > 1 - r) { b.x = 1 - r; b.vx = -Math.abs(b.vx) * 0.3 }
      if (b.y > s.h - r) { b.y = s.h - r; b.vy = -Math.abs(b.vy) * 0.2; b.vx *= 0.9 }
      b.vx *= 0.995
    }
  }
  const over = balls.some((b) => b.age > 1.2 && b.y - STAGES[b.stage].r < LINE * s.h && Math.abs(b.vy) < 0.3)
  return { ...s, balls, score, id, over, events }
}

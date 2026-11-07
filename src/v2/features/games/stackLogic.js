// 우리집 쌓기: 좌우로 움직이는 층을 눌러 떨어뜨려 높이 쌓기. 좌표는 판 폭 기준 0~1.
export const LEVELS = { easy: { speed: 0.45, perfect: 0.04 }, normal: { speed: 0.65, perfect: 0.03 }, hard: { speed: 0.9, perfect: 0.02 } }
export const begin = () => ({ floors: [{ x: 0.2, w: 0.6 }], moving: { x: 0, w: 0.6, dir: 1 }, combo: 0, over: false, last: null })

// 움직이는 층을 dt(ms)만큼 이동 (벽에서 튕김). 층이 높아질수록 조금씩 빨라짐.
export function move(s, dt, level) {
  if (s.over) return s
  const speed = LEVELS[level].speed * (1 + Math.min(s.floors.length, 30) * 0.02)
  let x = s.moving.x + s.moving.dir * speed * dt / 1000
  let dir = s.moving.dir
  if (x + s.moving.w > 1) { x = 1 - s.moving.w; dir = -1 }
  if (x < 0) { x = 0; dir = 1 }
  return { ...s, moving: { ...s.moving, x, dir } }
}

// 내려놓기 → 겹친 부분만 남김. 거의 딱 맞으면 '딱 맞음'(폭 유지, 콤보).
export function drop(s, level) {
  if (s.over) return s
  const top = s.floors.at(-1); const m = s.moving
  const offset = m.x - top.x
  if (Math.abs(offset) <= LEVELS[level].perfect) {
    const floor = { x: top.x, w: top.w }
    const combo = s.combo + 1
    const w = Math.min(0.6, floor.w + (combo >= 3 ? 0.03 : 0)) // 3번 연속 딱 맞으면 조금 넓어짐
    return { ...s, floors: [...s.floors, { ...floor, w }], moving: { x: s.floors.length % 2 ? 1 - w : 0, w, dir: s.floors.length % 2 ? -1 : 1 }, combo, last: { perfect: true, cut: 0 } }
  }
  const left = Math.max(top.x, m.x); const right = Math.min(top.x + top.w, m.x + m.w)
  const w = right - left
  if (w <= 0.005) return { ...s, over: true, last: { perfect: false, cut: m.w } }
  return { ...s, floors: [...s.floors, { x: left, w }], moving: { x: s.floors.length % 2 ? 1 - w : 0, w, dir: s.floors.length % 2 ? -1 : 1 }, combo: 0, last: { perfect: false, cut: m.w - w, cutX: m.x < top.x ? m.x : right, cutSide: m.x < top.x ? 'left' : 'right' } }
}

export const height = (s) => s.floors.length - 1
export const STAGE_FLOORS = 10 // 10층마다 다음 단계
export const stageOf = (s) => 1 + Math.floor(height(s) / STAGE_FLOORS)

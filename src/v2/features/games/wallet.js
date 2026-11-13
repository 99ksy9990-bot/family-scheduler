// 별 지갑 하나: 대청소 별 + 다른 게임에서 번 별 - 방 꾸미기·아이템에 쓴 별
import { STAGES } from './cleanLogic.js'
import { ROOMS } from './cleanRooms.js'

export const GIFT_EVERY = 10, GIFT = 5, COMP = 50
export const DAILY = 2 // 다른 게임은 게임마다 하루 별 2개까지
const dayId = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
// 오늘의 게임: 날마다 하나, 별 2배
export const TODAY_GAMES = ['pairs', 'catch', 'tap', 'sequence', 'stack', 'merge', 'match']
export const dailyGame = (d = new Date()) => TODAY_GAMES[Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5) % TODAY_GAMES.length]
export const arcadeOf = (p) => ({ earned: 0, spent: 0, day: { id: '', by: {} }, ...p?.arcade })

export function walletOf(p) {
  if (!p) return 0
  const a = arcadeOf(p)
  const comp = p.comp || ((p.unlocked || 0) > 0 ? COMP : 0)
  const earned = Object.entries(p.stars || {}).reduce((s, [i, n]) => s + n * (STAGES[i]?.hard ? 2 : 1), 0) + GIFT * Math.floor((p.unlocked || 0) / GIFT_EVERY) + (p.bonus || 0) + comp + a.earned
  const done = p.done || []
  const spent = ROOMS.flatMap((r) => r.tasks).filter((t) => done.includes(t.id)).reduce((s, t) => s + t.cost, 0) + (p.econ === 2 ? p.bought || 0 : 0) + a.spent
  return Math.max(0, earned - spent)
}

// 게임 한 판 끝 → 오늘 그 게임 한도 안이면 별 1개. { progress, got }
export const homeBonus = (p) => Math.min(5, ROOMS.filter((r) => r.tasks.every((t) => (p?.done || []).includes(t.id))).length)
// 오늘 별 받은 판 수 (오늘 1등 정할 때)
export const todayStars = (p, d = new Date()) => { const a = arcadeOf(p); return a.day.id === dayId(d) ? Object.values(a.day.by || {}).reduce((s, n) => s + n, 0) : 0 }
export function earnStar(p, game, d = new Date()) {
  const a = arcadeOf(p); const id = dayId(d)
  const by = a.day.id === id ? a.day.by : {}
  if ((by[game] || 0) >= DAILY + homeBonus(p)) return { progress: p, got: 0 } // 다 꾸민 방 하나마다 +1 (최대 5)
  const got = game === dailyGame(d) ? 2 : 1
  return { got, progress: { ...p, arcade: { ...a, earned: a.earned + got, day: { ...(a.day.id === id ? a.day : {}), id, by: { ...by, [game]: (by[game] || 0) + 1 } } } } }
}
// 게임마다 하루 첫 판은 점수와 상관없이 고마움 별 (하루 한 번)
export const FIRST_PLAY = 2
export function firstPlayBonus(p, game, d = new Date()) {
  const a = arcadeOf(p); const id = dayId(d)
  const day = a.day.id === id ? a.day : { id, by: {} }
  if (day.first?.[game]) return { progress: p, got: 0 }
  return { got: FIRST_PLAY, progress: { ...p, arcade: { ...a, earned: a.earned + FIRST_PLAY, day: { ...day, first: { ...day.first, [game]: 1 } } } } }
}
export const spendStars = (p, n) => ({ ...p, arcade: { ...arcadeOf(p), spent: arcadeOf(p).spent + n } })

// 두 기기 값 합치기: 번 별·쓴 별은 큰 쪽, 오늘 기록은 최근 날
export function mergeArcade(a, b) {
  if (!a || !b) return a || b
  const t = (x) => (x?.day?.id ? new Date(x.day.id.replace(/-/g, '/')).getTime() : 0)
  const day = t(a) === t(b) ? { id: a.day.id, ...((a.day.first || b.day.first) && { first: { ...a.day.first, ...b.day.first } }), by: Object.fromEntries([...new Set([...Object.keys(a.day.by || {}), ...Object.keys(b.day.by || {})])].map((k) => [k, Math.max(a.day.by?.[k] || 0, b.day.by?.[k] || 0)])) } : (t(a) > t(b) ? a : b).day
  return { earned: Math.max(a.earned || 0, b.earned || 0), spent: Math.max(a.spent || 0, b.spent || 0), day }
}

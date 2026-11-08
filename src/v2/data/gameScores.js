import { iso } from '../../lib/dates'

export function todayPlays(scores = {}, today) {
  return Object.values(scores || {}).flatMap((members) => Object.values(members || {})).reduce((sum, record) => sum + (iso(new Date(record?.playedAt)) === iso(today) ? record.playsToday || 1 : 0), 0)
}

export function recordGameScore(scores = {}, gameId, memberId, result, now) {
  const metric = gameId === 'pairs' ? result.seconds : gameId === 'sequence' ? result.stage : result.score
  if (!Number.isFinite(metric) || metric < 0) return scores
  const previous = scores?.[gameId]?.[memberId]
  const better = !Number.isFinite(previous?.best) || (gameId === 'pairs' ? metric < previous.best || (metric === previous.best && result.moves < previous.moves) : metric > previous.best)
  // 5등까지 언제 세웠는지 보관 (구성원별 top, 가족 순위는 rankGameScores에서 합침)
  const lower = gameId === 'pairs'
  const top = [...(previous?.top || (Number.isFinite(previous?.best) ? [{ value: previous.best, level: previous.level, at: previous.playedAt }] : [])), { value: metric, level: result.level, at: now.toISOString() }].sort((a, b) => lower ? a.value - b.value : b.value - a.value).slice(0, 5)
  const mon = mondayKey(now), wk = previous?.week
  const week = wk?.mon === mon ? { mon, best: (lower ? metric < wk.best : metric > wk.best) ? metric : wk.best } : { mon, best: metric }
  const prevWeek = wk && wk.mon !== mon ? wk : previous?.prevWeek
  const record = { ...previous, top, week, ...(prevWeek && { prevWeek }), ...(better ? { best: metric, level: result.level, ...(gameId === 'pairs' ? { moves: result.moves } : {}) } : {}),
    playedAt: now.toISOString(), playsToday: (previous && iso(new Date(previous.playedAt)) === iso(now) ? previous.playsToday || 1 : 0) + 1 }
  return { ...scores, [gameId]: { ...scores?.[gameId], [memberId]: record } }
}

// 1등 구성원 id (기록 없으면 null)
export const gameLeader = (scores, gameId) => rankGameScores(scores, gameId)[0]?.member || null

// profiles를 주면 '1등 아빠 34초'처럼 누가 1등인지도 보여 줌
export function bestGameLabel(scores, gameId, profiles) {
  const rows = Object.entries(scores?.[gameId] || {}).filter(([, record]) => Number.isFinite(record?.best))
  if (!rows.length) return '기록 없음'
  const [member, { best }] = rows.reduce((a, b) => ((gameId === 'pairs' ? b[1].best < a[1].best : b[1].best > a[1].best) ? b : a))
  const name = profiles?.find((p) => p.id === member)?.name
  return `${name || '최고'} ${best.toLocaleString('ko-KR')}${unitOf(gameId)}`
}

export const unitOf = (gameId) => gameId === 'pairs' ? '초' : ['sequence', 'clean'].includes(gameId) ? '단계' : gameId === 'stack' ? '층' : '점'

export function rankGameScores(scores, gameId) {
  const lower = gameId === 'pairs'
  // 가족 순위: 사람마다 최고 기록 하나씩
  return Object.entries(scores?.[gameId] || {}).map(([member, record]) => ({ ...((record?.top || [])[0] || { value: record?.best, level: record?.level, at: record?.playedAt }), member }))
    .filter((item) => Number.isFinite(item.value)).sort((a, b) => lower ? a.value - b.value : b.value - a.value)
}

// 이번 주(월요일 0시부터) 1등 — 왕관은 월요일마다 새로 다툼
export const mondayKey = (now = new Date()) => iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)))
const lastMonday = (now = new Date()) => mondayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7))
// 그 주(월요일 key) 기록: 주간 기록 → 없으면 5등 기록 중 그 주에 세운 것
const weekValue = (record, key, lower) => {
  const vals = [record?.week, record?.prevWeek].filter((w) => w?.mon === key).map((w) => w.best)
  for (const t of record?.top || []) if (t?.at && mondayKey(new Date(t.at)) === key && Number.isFinite(t.value)) vals.push(t.value)
  return vals.length ? (lower ? Math.min(...vals) : Math.max(...vals)) : null
}
// 그 주 1등 { member, value } — 왕관은 월요일마다 새로 다툼
export function weekWinner(scores, gameId, key) {
  const lower = gameId === 'pairs'; let best = null
  for (const [member, record] of Object.entries(scores?.[gameId] || {})) {
    const v = weekValue(record, key, lower); if (v === null) continue
    if (!best || (lower ? v < best.value : v > best.value)) best = { member, value: v }
  }
  return best
}
export const weeklyLeader = (scores, gameId, now = new Date()) => weekWinner(scores, gameId, mondayKey(now))?.member || null
// 대청소: 그 주에 깬 단계 수가 가장 많은 사람
export function cleanWeekWinner(progress, key) {
  const rows = Object.entries(progress || {}).map(([m, p]) => [m, [p?.week, p?.prevWeek].find((w) => w?.mon === key)?.n || 0]).filter(([, n]) => n > 0)
  if (!rows.length) return null
  const [member, value] = rows.reduce((a, b) => (b[1] > a[1] ? b : a))
  return { member, value }
}
export const weeklyCleanLeader = (progress, now = new Date()) => cleanWeekWinner(progress, mondayKey(now))?.member || null
export { lastMonday }

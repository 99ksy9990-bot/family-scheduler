import { iso } from '../../lib/dates'

export function todayPlays(scores = {}, today) {
  return Object.values(scores || {}).flatMap((members) => Object.values(members || {})).reduce((sum, record) => sum + (iso(new Date(record?.playedAt)) === iso(today) ? record.playsToday || 1 : 0), 0)
}

export function recordGameScore(scores = {}, gameId, memberId, result, now) {
  const metric = gameId === 'pairs' ? result.seconds : gameId === 'sequence' ? result.stage : result.score
  if (!Number.isFinite(metric) || metric < 0) return scores
  const previous = scores?.[gameId]?.[memberId]
  const better = !Number.isFinite(previous?.best) || (gameId === 'pairs' ? metric < previous.best || (metric === previous.best && result.moves < previous.moves) : metric > previous.best)
  const record = { ...previous, ...(better ? { best: metric, level: result.level, ...(gameId === 'pairs' ? { moves: result.moves } : {}) } : {}),
    playedAt: now.toISOString(), playsToday: (previous && iso(new Date(previous.playedAt)) === iso(now) ? previous.playsToday || 1 : 0) + 1 }
  return { ...scores, [gameId]: { ...scores?.[gameId], [memberId]: record } }
}

export function bestGameLabel(scores, gameId) {
  const values = Object.values(scores?.[gameId] || {}).map((record) => record?.best).filter(Number.isFinite)
  if (!values.length) return '기록 없음'
  const best = gameId === 'pairs' ? Math.min(...values) : Math.max(...values)
  return `최고 ${best.toLocaleString('ko-KR')}${gameId === 'pairs' ? '초' : gameId === 'sequence' ? '단계' : gameId === 'stack' ? '층' : '점'}`
}

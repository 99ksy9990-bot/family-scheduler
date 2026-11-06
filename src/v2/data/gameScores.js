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
  const record = { ...previous, top, ...(better ? { best: metric, level: result.level, ...(gameId === 'pairs' ? { moves: result.moves } : {}) } : {}),
    playedAt: now.toISOString(), playsToday: (previous && iso(new Date(previous.playedAt)) === iso(now) ? previous.playsToday || 1 : 0) + 1 }
  return { ...scores, [gameId]: { ...scores?.[gameId], [memberId]: record } }
}

// profiles를 주면 '1등 아빠 34초'처럼 누가 1등인지도 보여 줌
export function bestGameLabel(scores, gameId, profiles) {
  const rows = Object.entries(scores?.[gameId] || {}).filter(([, record]) => Number.isFinite(record?.best))
  if (!rows.length) return '기록 없음'
  const [member, { best }] = rows.reduce((a, b) => ((gameId === 'pairs' ? b[1].best < a[1].best : b[1].best > a[1].best) ? b : a))
  const name = profiles?.find((p) => p.id === member)?.name
  return `${name ? `1등 ${name}` : '최고'} ${best.toLocaleString('ko-KR')}${unitOf(gameId)}`
}

export const unitOf = (gameId) => gameId === 'pairs' ? '초' : ['sequence', 'clean'].includes(gameId) ? '단계' : gameId === 'stack' ? '층' : '점'

export function rankGameScores(scores, gameId) {
  const lower = gameId === 'pairs'
  return Object.entries(scores?.[gameId] || {}).flatMap(([member, record]) => (record?.top || (Number.isFinite(record?.best) ? [{ value: record.best, level: record.level, at: record.playedAt }] : [])).map((item) => ({ ...item, member })))
    .sort((a, b) => lower ? a.value - b.value : b.value - a.value).slice(0, 5)
}

import { test, expect } from '@playwright/test'
import { recordGameScore, todayPlays, bestGameLabel } from '../../src/v2/data/gameScores.js'

test('게임별 최고 기록·짝맞추기 동률 횟수·하루 판수·다음 날 초기화', () => {
  const now = new Date('2026-11-06T10:00:00+09:00')
  let scores = recordGameScore({}, 'pairs', 'dad', { level: 'easy', seconds: 12, moves: 8 }, now)
  const original = structuredClone(scores)
  scores = recordGameScore(scores, 'pairs', 'dad', { level: 'easy', seconds: 15, moves: 6 }, now)
  expect(scores.pairs.dad).toMatchObject({ best: 12, moves: 8, playsToday: 2 })
  expect(original.pairs.dad.playsToday).toBe(1)
  scores = recordGameScore(scores, 'pairs', 'dad', { level: 'easy', seconds: 12, moves: 7 }, now)
  expect(scores.pairs.dad.moves).toBe(7)
  scores = recordGameScore(scores, 'sequence', 'mom', { level: 'normal', stage: 4 }, now)
  scores = recordGameScore(scores, 'sequence', 'mom', { level: 'normal', stage: 2 }, now)
  scores = recordGameScore(scores, 'tap', 'mom', { level: 'hard', score: 30 }, now)
  expect(scores.sequence.mom.best).toBe(4)
  expect(scores.tap.mom.best).toBe(30)
  expect(todayPlays(scores, now)).toBe(6)
  expect(bestGameLabel(scores, 'pairs')).toBe('최고 12초')
  expect(bestGameLabel(scores, 'sequence')).toBe('최고 4단계')
  expect(bestGameLabel(scores, 'catch')).toBe('기록 없음')
  const nextDay = new Date('2026-11-07T10:00:00+09:00')
  expect(todayPlays(scores, nextDay)).toBe(0)
  scores = recordGameScore(scores, 'tap', 'mom', { score: 10 }, nextDay)
  expect(scores.tap.mom).toMatchObject({ best: 30, playsToday: 1 })
  expect(recordGameScore(scores, 'tap', 'mom', { score: NaN }, now)).toBe(scores)
})

test('5등까지 날짜와 함께 보관, 가족 순위로 합침', async () => {
  const { recordGameScore, rankGameScores } = await import('../../src/v2/data/gameScores.js')
  let s = {}
  for (const [i, v] of [3, 9, 1, 7, 5, 8].entries()) s = recordGameScore(s, 'stack', 'a', { score: v }, new Date(2026, 10, 6, 10, i))
  s = recordGameScore(s, 'stack', 'b', { score: 10 }, new Date(2026, 10, 6, 11))
  expect(s.stack.a.top.map((t) => t.value)).toEqual([9, 8, 7, 5, 3])
  const r = rankGameScores(s, 'stack')
  expect(r.map((t) => [t.member, t.value])).toEqual([['b', 10], ['a', 9], ['a', 8], ['a', 7], ['a', 5]])
  expect(r[0].at).toBe(new Date(2026, 10, 6, 11).toISOString())
})

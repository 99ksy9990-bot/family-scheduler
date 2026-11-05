import { useEffect, useState } from 'react'
import { LEVELS, closeMismatch, flip, isDone, newDeck } from './pairs'
import './games.css'

const freshGame = (lv) => ({ deck: newDeck(lv), open: [], moves: 0, startedAt: Date.now() })
const LEVEL_NAMES = { easy: '쉬움', normal: '보통', hard: '어려움' }

export default function Pairs({ onFinish }) {
  const [level, setLevel] = useState(null)
  const [game, setGame] = useState(null)
  const [now, setNow] = useState(0)
  const done = game && isDone(game)

  useEffect(() => {
    if (!game || done) return undefined
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [game, done])

  useEffect(() => {
    if (game?.open.length !== 2) return undefined
    const t = setTimeout(() => setGame(closeMismatch), 700)
    return () => clearTimeout(t)
  }, [game])

  useEffect(() => { if (done) onFinish?.({ level, seconds: Math.round((Date.now() - game.startedAt) / 1000), moves: game.moves }) }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  const start = (lv) => { const g = freshGame(lv); setLevel(lv); setGame(g); setNow(g.startedAt) }

  if (!game) return <div className="game-levels">{Object.keys(LEVELS).map((lv) => <button key={lv} className="game-level" onClick={() => start(lv)}>{LEVEL_NAMES[lv]}<small>{LEVELS[lv].pairs}쌍</small></button>)}</div>

  const seconds = Math.max(0, Math.round((now - game.startedAt) / 1000))
  return <div className="pairs">
    <div className="game-stats"><span>{seconds}초</span><span>{game.moves}번</span></div>
    <div className="pairs-grid" style={{ '--cols': LEVELS[level].cols }}>
      {game.deck.map((c) => {
        const up = c.matched || game.open.includes(c.id)
        return <button key={c.id} className={`pairs-card${up ? ' up' : ''}${c.matched ? ' matched' : ''}`} aria-label={up ? c.face : '뒤집힌 카드'} disabled={c.matched} onClick={() => setGame((g) => flip(g, c.id))}>
          <span className="pairs-back" /><img className="pairs-face" src={`/characters/${c.face}.png`} alt="" />
        </button>
      })}
    </div>
    {done && <div className="game-done"><b>다 찾았어요</b><span>{seconds}초, {game.moves}번 만에</span><button className="game-level" onClick={() => setGame(null)}>다시 하기</button></div>}
  </div>
}

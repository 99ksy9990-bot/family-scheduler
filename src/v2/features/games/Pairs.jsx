import { useEffect, useRef, useState } from 'react'
import { bounce, burst, buzz, center, confetti, pop, shake } from './fx'
import { LEVELS, closeMismatch, flip, isDone, newDeck } from './pairsLogic'
import './games.css'

const freshGame = (lv) => ({ deck: newDeck(lv), open: [], moves: 0, startedAt: Date.now() })
const LEVEL_NAMES = { easy: '쉬움', normal: '보통', hard: '어려움' }

export default function Pairs({ onFinish }) {
  const [level, setLevel] = useState(null)
  const [game, setGame] = useState(null)
  const [now, setNow] = useState(0)
  const done = game && isDone(game)
  const host = useRef(null)
  const cards = useRef({})

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

  useEffect(() => { if (done) confetti(host.current) }, [done])
  useEffect(() => { if (done) onFinish?.({ level, seconds: Math.round((Date.now() - game.startedAt) / 1000), moves: game.moves }) }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  const start = (lv) => { const g = freshGame(lv); setLevel(lv); setGame(g); setNow(g.startedAt) }

  if (!game) return <div className="game-levels">{Object.keys(LEVELS).map((lv) => <button key={lv} className="game-level" onClick={() => start(lv)}>{LEVEL_NAMES[lv]}<small>{LEVELS[lv].pairs}쌍</small></button>)}</div>

  const seconds = Math.max(0, Math.round((now - game.startedAt) / 1000))
  const choose = (id) => {
    const next = flip(game, id)
    if (next === game) return
    setGame(next)
    if (next.moves === game.moves) return
    const [a, b] = [game.open[0], id].map((i) => cards.current[i])
    if (next.open.length === 0) {
      ;[a, b].forEach((el) => { bounce(el); const p = center(host.current, el); burst(host.current, p.x, p.y, 8) })
      const p = center(host.current, b); pop(host.current, p.x, p.y, '짝!', 'gold'); buzz(20)
    } else { setTimeout(() => { shake(a); shake(b) }, 150) }
  }

  return <div className="pairs fx-host" ref={host}>
    <div className="game-stats"><span>{seconds}초</span><span>{game.moves}번</span></div>
    <div className="pairs-grid" style={{ '--cols': LEVELS[level].cols }}>
      {game.deck.map((c) => {
        const up = c.matched || game.open.includes(c.id)
        return <button key={c.id} className={`pairs-card${up ? ' up' : ''}${c.matched ? ' matched' : ''}`} aria-label={up ? c.face : '뒤집힌 카드'} disabled={c.matched} ref={(el) => { cards.current[c.id] = el }} onClick={() => choose(c.id)}>
          <span className="pairs-back" /><img className="pairs-face" src={`/characters/${c.face}.png`} alt="" />
        </button>
      })}
    </div>
    {done && <div className="game-done"><b>다 찾았어요</b><span>{seconds}초, {game.moves}번 만에</span><button className="game-level" onClick={() => setGame(null)}>다시 하기</button></div>}
  </div>
}

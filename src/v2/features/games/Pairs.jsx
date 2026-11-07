import { useEffect, useRef, useState } from 'react'
import { bounce, burst, buzz, center, confetti, pop, shake } from './fx'
import { LEVELS, closeMismatch, flip, isDone, newDeck } from './pairsLogic'
import ItemBar from './ItemBar'
import { pickObjects, pickRoom, roomStyle, perkLevel } from './theme'
import './games.css'

// 카드 그림: 방 물건에서 매판 섞어 뽑음, 뒷면은 방 배경
const freshGame = (lv) => { const objs = pickObjects(10); return { deck: newDeck(lv, Math.random, objs.map((o) => o.img)), names: Object.fromEntries(objs.map((o) => [o.img, o.name])), room: pickRoom(), open: [], moves: 0, startedAt: Date.now() } }
const LEVEL_NAMES = { easy: '쉬움', normal: '보통', hard: '어려움' }

export default function Pairs({ onFinish, shop }) {
  const [level, setLevel] = useState(null)
  const [peek, setPeek] = useState(false) // 살짝 보기: 2초 동안 다 보임
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

  const start = (lv) => { const g = freshGame(lv); setLevel(lv); setGame(g); setNow(g.startedAt); const n = perkLevel('pairs'); if (n) { setPeek(true); setTimeout(() => setPeek(false), 2000 * n) } }

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
        const up = peek || c.matched || game.open.includes(c.id)
        return <button key={c.id} className={`pairs-card${up ? ' up' : ''}${c.matched ? ' matched' : ''}`} aria-label={up ? game.names[c.face] : '뒤집힌 카드'} disabled={c.matched} ref={(el) => { cards.current[c.id] = el }} onClick={() => choose(c.id)}>
          <span className="pairs-back room-bg" style={roomStyle(game.room)} /><img className="pairs-face" src={c.face} alt="" />
        </button>
      })}
    </div>
    <ItemBar key={game.startedAt} shop={shop} off={done} items={[
      { id: 'peek', name: '살짝 보기', img: 'room/scope', price: 1, ok: () => !peek && !game.open.length, use: () => { setPeek(true); setTimeout(() => setPeek(false), 2000) } },
      { id: 'pair', name: '짝 찾기', img: 'room/heart', price: 2, ok: () => !game.open.length, use: () => setGame((g) => { const c = g.deck.find((x) => !x.matched); return { ...g, deck: g.deck.map((x) => (x.face === c.face ? { ...x, matched: true } : x)) } }) },
    ]} />
    {done && <div className="game-done"><b>다 찾았어요</b><span>{seconds}초, {game.moves}번 만에</span><button className="game-level" onClick={() => setGame(null)}>다시 하기</button></div>}
  </div>
}

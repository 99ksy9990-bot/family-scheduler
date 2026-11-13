import { face } from './theme'
import { useEffect, useRef, useState } from 'react'
import { bounce, burst, buzz, center, pop, shake } from './fx'
import { PADS, SPEED, press, stage, start } from './sequenceLogic'
import ItemBar from './ItemBar'
import { pickRoom, roomStyle, perkLevel } from './theme'
import './games.css'

const LEVEL_NAMES = { easy: '쉬움', normal: '보통', hard: '어려움' }

export default function Sequence({ onFinish, shop }) {
  const [room] = useState(pickRoom) // 판 뒤 배경 그림
  const [replay, setReplay] = useState(0)
  const [level, setLevel] = useState(null)
  const [game, setGame] = useState(null)
  const [lit, setLit] = useState(-1) // 반짝이는 칸
  const [showing, setShowing] = useState(false)
  const [msg, setMsg] = useState('')
  const host = useRef(null)
  const grid = useRef(null)

  // 새 단계마다 순서 보여주기
  const len = game?.seq.length
  const lives = game?.lives
  useEffect(() => {
    if (!game || game.over) return undefined
    const gap = SPEED[level]
    const timers = []
    timers.push(setTimeout(() => setShowing(true), 0))
    game.seq.forEach((p, i) => {
      timers.push(setTimeout(() => setLit(p), 600 + i * gap))
      timers.push(setTimeout(() => setLit(-1), 600 + i * gap + gap * 0.6))
    })
    timers.push(setTimeout(() => setShowing(false), 600 + game.seq.length * gap))
    return () => timers.forEach(clearTimeout)
  }, [len, lives, replay]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!game) return <div className="game-levels">{Object.keys(SPEED).map((lv) => <button key={lv} className="game-level" onClick={() => { const g = start(); const n = perkLevel('sequence'); setLevel(lv); setGame(n ? (lv === 'easy' ? { ...g, lives: g.lives + n } : { ...g, saved: true }) : g); setMsg('') }}>{LEVEL_NAMES[lv]}<small>{lv === 'easy' ? '한 번 봐줘요' : lv === 'hard' ? '빨라요' : ''}</small></button>)}</div>

  const tap = (i) => {
    if (showing || game.over) return
    const { state, result } = press(game, i, level)
    setGame(state)
    const el = grid.current?.children[i]
    if (result === 'ok' || result === 'round') { bounce(el, 1.08); const p = center(host.current, el); burst(host.current, p.x, p.y, result === 'round' ? 12 : 5) }
    if (result === 'round') { const p = center(host.current, grid.current); pop(host.current, p.x, p.y, `${stage(state)}단계!`, 'gold'); buzz(25) }
    if (result === 'retry' || result === 'over') { shake(grid.current); buzz([60, 40, 60]) }
    setMsg(result === 'retry' ? '다시 한 번 볼게요' : result === 'round' ? '맞았어요' : '')
    if (result === 'over') onFinish?.({ level, stage: stage(state) })
  }

  return <div className="seq fx-host" ref={host}>
    <div className="game-stats"><span>{stage(game)}단계</span><span>{showing ? '잘 보세요' : game.over ? '' : '따라 누르세요'}</span></div>
    <div className="seq-grid room-bg" style={roomStyle(room)} ref={grid}>
      {PADS.map((c, i) => <button key={c} className={`seq-pad glass-icon${lit === i ? ' lit' : ''}`} data-character={c} aria-label={c} disabled={showing || game.over} onClick={() => tap(i)}>
        <img src={face(c, lit === i ? 'done' : 'basic')} alt="" />
      </button>)}
    </div>
    <p className="seq-msg" aria-live="polite">{msg}</p>
    <ItemBar key={level} shop={shop} off={game.over} items={[
      { id: 'again', name: '다시 보기', img: 'room/scope', price: 1, ok: () => !showing, use: () => { setGame((g) => ({ ...g, pos: 0 })); setReplay((n) => n + 1) } },
      { id: 'save', name: '한 번 봐주기', img: 'room/heart', price: 2, ok: () => (level === 'easy' ? game.lives < 1 : !game.saved), use: () => setGame((g) => (level === 'easy' ? { ...g, lives: g.lives + 1 } : { ...g, saved: true })) },
    ]} />
    {game.over && <div className="game-done"><b>{stage(game)}단계까지 했어요</b><button className="game-level" onClick={() => setGame(null)}>다시 하기</button></div>}
  </div>
}

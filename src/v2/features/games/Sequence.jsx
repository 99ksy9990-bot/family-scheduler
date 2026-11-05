import { useEffect, useState } from 'react'
import { PADS, SPEED, press, stage, start } from './sequence'
import './games.css'

const LEVEL_NAMES = { easy: '쉬움', normal: '보통', hard: '어려움' }

export default function Sequence({ onFinish }) {
  const [level, setLevel] = useState(null)
  const [game, setGame] = useState(null)
  const [lit, setLit] = useState(-1) // 반짝이는 칸
  const [showing, setShowing] = useState(false)
  const [msg, setMsg] = useState('')

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
  }, [len, lives]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!game) return <div className="game-levels">{Object.keys(SPEED).map((lv) => <button key={lv} className="game-level" onClick={() => { setLevel(lv); setGame(start()); setMsg('') }}>{LEVEL_NAMES[lv]}<small>{lv === 'easy' ? '한 번 봐줘요' : lv === 'hard' ? '빨라요' : ''}</small></button>)}</div>

  const tap = (i) => {
    if (showing || game.over) return
    const { state, result } = press(game, i, level)
    setGame(state)
    setMsg(result === 'retry' ? '다시 한 번 볼게요' : result === 'round' ? '맞았어요' : '')
    if (result === 'over') onFinish?.({ level, stage: stage(state) })
  }

  return <div className="seq">
    <div className="game-stats"><span>{stage(game)}단계</span><span>{showing ? '잘 보세요' : game.over ? '' : '따라 누르세요'}</span></div>
    <div className="seq-grid">
      {PADS.map((c, i) => <button key={c} className={`seq-pad glass-icon${lit === i ? ' lit' : ''}`} data-character={c} aria-label={c} disabled={showing || game.over} onClick={() => tap(i)}>
        <img src={`/characters/${c}_${lit === i ? 'done' : 'basic'}.png`} alt="" />
      </button>)}
    </div>
    <p className="seq-msg" aria-live="polite">{msg}</p>
    {game.over && <div className="game-done"><b>{stage(game)}단계까지 했어요</b><button className="game-level" onClick={() => setGame(null)}>다시 하기</button></div>}
  </div>
}

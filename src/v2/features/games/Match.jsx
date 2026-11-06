import { useEffect, useRef, useState } from 'react'
import { MODES, N, TILES, adjacent, fresh, swap } from './matchLogic'
import { burst, buzz, center, pop, shake } from './fx'
import './games.css'

const LEVEL_NAMES = { easy: '쉬움', normal: '보통', hard: '어려움' }
const HINT = { easy: '제한 없음', normal: '30번 이동', hard: '60초' }

export default function Match({ onFinish }) {
  const [level, setLevel] = useState(null)
  const [board, setBoard] = useState(null)
  const [pick, setPick] = useState(-1)
  const [score, setScore] = useState(0)
  const [moves, setMoves] = useState(0)
  const [left, setLeft] = useState(60)
  const [cheer, setCheer] = useState(0)
  const startY = useRef(null)
  const host = useRef(null)
  const grid = useRef(null)
  const mode = level ? MODES[level] : {}
  const over = Boolean(level) && ((mode.moves && moves >= mode.moves) || (mode.seconds && left <= 0))

  useEffect(() => {
    if (!mode.seconds || !board) return undefined
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [level, board === null]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (over) onFinish?.({ level, score }) }, [over]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!level) return <div className="game-levels">{Object.keys(MODES).map((lv) => <button key={lv} className="game-level" onClick={() => { setBoard(fresh()); setScore(0); setMoves(0); setLeft(60); setLevel(lv) }}>{LEVEL_NAMES[lv]}<small>{HINT[lv]}</small></button>)}</div>

  const tryMove = (i, j) => {
    if (over) return
    const r = swap(board, i, j)
    setPick(-1)
    const cells = grid.current?.children
    if (!r) { shake(cells?.[i]); shake(cells?.[j]); buzz(30); return }
    setBoard(r.board); setScore((s) => s + r.gained); setMoves((m) => m + 1)
    const p = center(host.current, cells[j])
    burst(host.current, p.x, p.y, 8 + r.chains * 4)
    pop(host.current, p.x, p.y, `+${r.gained}`, r.chains > 1 ? 'gold' : 'good'); buzz(20)
    if (r.chains > 1) { setCheer((c) => c + 1); const g = center(host.current, grid.current); setTimeout(() => pop(host.current, g.x, g.y, `${r.chains}연쇄!`, 'gold'), 180) }
  }
  const tap = (i) => (pick < 0 ? setPick(i) : pick === i ? setPick(-1) : adjacent(pick, i) ? tryMove(pick, i) : setPick(i))
  const down = (i, e) => { startY.current = { i, x: e.clientX, y: e.clientY } }
  const up = (e) => {
    const s = startY.current; startY.current = null
    if (!s) return
    const dx = e.clientX - s.x; const dy = e.clientY - s.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return tap(s.i)
    const j = Math.abs(dx) > Math.abs(dy) ? s.i + Math.sign(dx) : s.i + Math.sign(dy) * N
    if (j >= 0 && j < N * N && adjacent(s.i, j)) tryMove(s.i, j)
  }

  return <div className="match fx-host" ref={host}>
    <div className="game-stats"><span>{score.toLocaleString()}점</span><span>{mode.moves ? `${mode.moves - moves}번 남음` : mode.seconds ? `${left}초` : `${moves}번`}</span></div>
    <div className="match-grid" ref={grid} onPointerUp={up}>
      {board.map((v, i) => <button key={i} className={`match-cell${pick === i ? ' picked' : ''}`} aria-label={TILES[v]} onPointerDown={(e) => down(i, e)} onKeyDown={(e) => e.key === 'Enter' && tap(i)}>
        <img src={`/game/tiles/${TILES[v]}.png`} alt="" draggable="false" />
      </button>)}
    </div>
    {cheer > 0 && <img key={cheer} className="match-cheer" src="/characters/little_done.png" alt="" />}
    {over && <div className="game-done"><b>{score.toLocaleString()}점</b><button className="game-level" onClick={() => setLevel(null)}>다시 하기</button></div>}
  </div>
}

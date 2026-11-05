import { useEffect, useRef, useState } from 'react'
import { DURATION, RULES, empty, hit, spawn } from './tapLogic'
import './games.css'

const LEVEL_NAMES = { easy: '쉬움', normal: '보통', hard: '어려움' }
const clock = () => performance.now()

export default function Tap({ onFinish }) {
  const [level, setLevel] = useState(null)
  const [holes, setHoles] = useState(empty)
  const [score, setScore] = useState(0)
  const [left, setLeft] = useState(DURATION)
  const startRef = useRef(0)
  const scoreRef = useRef(0)
  const running = level && left > 0

  useEffect(() => {
    if (!level) return undefined
    startRef.current = clock()
    const tick = setInterval(() => {
      const t = clock() - startRef.current
      setLeft(Math.max(0, DURATION - t))
      setHoles((h) => (t < DURATION ? spawn(h, level, t) : empty()))
      if (t >= DURATION) { clearInterval(tick); onFinish?.({ level, score: scoreRef.current }) }
    }, RULES[level].every)
    const timer = setInterval(() => setLeft(Math.max(0, DURATION - (clock() - startRef.current))), 250)
    const pause = () => { if (document.hidden) { clearInterval(tick); clearInterval(timer) } }
    document.addEventListener('visibilitychange', pause)
    return () => { clearInterval(tick); clearInterval(timer); document.removeEventListener('visibilitychange', pause) }
  }, [level]) // eslint-disable-line react-hooks/exhaustive-deps

  const begin = (lv) => { setHoles(empty()); setScore(0); scoreRef.current = 0; setLeft(DURATION); setLevel(lv) }
  if (!level) return <div className="game-levels">{Object.keys(RULES).map((lv) => <button key={lv} className="game-level" onClick={() => begin(lv)}>{LEVEL_NAMES[lv]}<small>{lv === 'easy' ? '감점 없음' : lv === 'hard' ? '두 명씩' : '비구름 조심'}</small></button>)}</div>

  const tapHole = (i) => {
    if (!running) return
    const r = hit(holes, i, level)
    setHoles(r.holes)
    scoreRef.current = Math.max(0, scoreRef.current + r.delta)
    setScore(scoreRef.current)
  }

  return <div className="tap">
    <div className="game-stats"><span>{score}점</span><span>{Math.ceil(left / 1000)}초</span></div>
    <div className="tap-grid">
      {holes.map((h, i) => <button key={i} className={`tap-hole${h.kind ? ' up' : ''}`} aria-label={h.kind || '빈 구멍'} onPointerDown={() => tapHole(i)}>
        <img className="tap-bg" src="/game/hole.png" alt="" />
        {h.kind && <img className="tap-face" src={h.kind === 'cloud' ? '/game/cloud.png' : `/characters/${h.kind}_basic.png`} alt="" />}
      </button>)}
    </div>
    {!running && <div className="game-done"><b>{score}점</b><button className="game-level" onClick={() => setLevel(null)}>다시 하기</button></div>}
  </div>
}

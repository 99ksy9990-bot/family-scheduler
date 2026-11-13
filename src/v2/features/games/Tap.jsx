import { FRIEND } from './theme'
import { useEffect, useRef, useState } from 'react'
import { DURATION, RULES, empty, hit, spawn } from './tapLogic'
import { burst, buzz, center, pop, shake } from './fx'
import ItemBar from './ItemBar'
import { pickRoom, roomStyle, perkLevel } from './theme'
import './games.css'

const LEVEL_NAMES = { easy: '쉬움', normal: '보통', hard: '어려움' }
const clock = () => performance.now()

export default function Tap({ onFinish, shop }) {
  const [room] = useState(pickRoom) // 판 뒤 배경 그림
  const [level, setLevel] = useState(null)
  const [holes, setHoles] = useState(empty)
  const [score, setScore] = useState(0)
  const [left, setLeft] = useState(DURATION)
  const startRef = useRef(0)
  const host = useRef(null)
  const grid = useRef(null)
  const scoreRef = useRef(0)
  const running = level && left > 0

  useEffect(() => {
    if (!level) return undefined
    startRef.current = clock() + 6000 * perkLevel('tap') // 거실 효과: 시간 더
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
    const el = grid.current?.children[i]; const p = el && center(host.current, el)
    if (r.delta > 0) { burst(host.current, p.x, p.y, 8); pop(host.current, p.x, p.y - 20, '+1'); buzz(15) }
    if (r.delta < 0) { pop(host.current, p.x, p.y - 20, `${r.delta}`, 'bad'); shake(grid.current); buzz([50, 30, 50]) }
    if (holes[i].kind === 'cloud' && r.delta === 0) shake(el)
    scoreRef.current = Math.max(0, scoreRef.current + r.delta)
    setScore(scoreRef.current)
  }

  return <div className="tap fx-host" ref={host}>
    <div className="game-stats"><span>{score}점</span><span>{Math.ceil(left / 1000)}초</span></div>
    <div className="tap-grid room-bg" style={roomStyle(room)} ref={grid}>
      {holes.map((h, i) => <button key={i} className={`tap-hole${h.kind ? ' up' : ''}`} aria-label={h.kind || '빈 구멍'} onPointerDown={() => tapHole(i)}>
        <img className="tap-bg" src="/game/hole.png" alt="" />
        {h.kind && <img className="tap-face" src={h.kind === 'cloud' ? '/game/cloud.png' : `/characters/${FRIEND[h.kind] || h.kind}_basic.webp`} alt="" />}
      </button>)}
    </div>
    <ItemBar key={level} shop={shop} off={!running} items={[
      { id: 'time', name: '시간 +5초', img: 'room/clock', price: 1, use: () => { startRef.current += 5000 } },
      { id: 'cloud', name: '구름 치우기', img: 'room/broom', price: 1, ok: () => holes.some((h) => h.kind === 'cloud'), use: () => setHoles((h) => h.map((x) => (x.kind === 'cloud' ? { kind: null, until: 0 } : x))) },
    ]} />
    {!running && <div className="game-done"><b>{score}점</b><button className="game-level" onClick={() => setLevel(null)}>다시 하기</button></div>}
  </div>
}

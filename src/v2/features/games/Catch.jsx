import { useEffect, useRef, useState } from 'react'
import { BASKET, RULES, begin, step } from './catchLogic'
import { burst, buzz, pop, shake } from './fx'
import './games.css'

const LEVEL_NAMES = { easy: '쉬움', normal: '보통', hard: '어려움' }
const WHO = ['dad', 'mom', 'big', 'little']

export default function Catch({ onFinish, player = 'little' }) {
  const [level, setLevel] = useState(null)
  const [s, setS] = useState(begin)
  const xRef = useRef(0.5)
  const [x, setX] = useState(0.5)
  const area = useRef(null)
  const who = WHO.includes(player) ? player : 'little'

  useEffect(() => {
    if (!level) return undefined
    let raf = 0; let prev = 0; let cur = begin()
    const loop = (now) => {
      const dt = prev ? Math.min(50, now - prev) : 0
      prev = now
      const before = cur
      cur = step(cur, dt, xRef.current, level)
      const el = area.current
      if (el && cur.score > before.score) {
        const x = xRef.current * el.clientWidth; const y = BASKET.y * el.clientHeight
        const gain = cur.score - before.score
        burst(el, x, y, gain > 1 ? 12 : 6); pop(el, x, y - 10, `+${gain}`, gain > 1 ? 'gold' : 'good'); buzz(15)
      }
      if (el && cur.lives < before.lives) { pop(el, xRef.current * el.clientWidth, BASKET.y * el.clientHeight - 10, '앗!', 'bad'); shake(el); buzz([60, 40, 60]) }
      setS(cur)
      if (cur.over) { onFinish?.({ level, score: cur.score }); return }
      if (!document.hidden) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const resume = () => { if (!document.hidden && !cur.over) { prev = 0; raf = requestAnimationFrame(loop) } }
    document.addEventListener('visibilitychange', resume)
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', resume) }
  }, [level]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!level) return <div className="game-levels">{Object.keys(RULES).map((lv) => <button key={lv} className="game-level" onClick={() => setLevel(lv)}>{LEVEL_NAMES[lv]}<small>{lv === 'easy' ? '비구름 없음' : lv === 'hard' ? '빨라요' : '비구름 조심'}</small></button>)}</div>

  const move = (e) => {
    const r = area.current.getBoundingClientRect()
    const v = Math.min(1 - BASKET.half, Math.max(BASKET.half, (e.clientX - r.left) / r.width))
    xRef.current = v; setX(v)
  }
  const keys = (e) => {
    const d = e.key === 'ArrowLeft' ? -0.06 : e.key === 'ArrowRight' ? 0.06 : 0
    if (!d) return
    const v = Math.min(1 - BASKET.half, Math.max(BASKET.half, xRef.current + d)); xRef.current = v; setX(v)
  }

  return <div className="catch">
    <div className="game-stats"><span>{s.score}점</span><span className="catch-lives">{[0, 1, 2].map((i) => <img key={i} src={`/game/life_${i < s.lives ? 'full' : 'empty'}.png`} alt="" />)}</span></div>
    <div className="catch-area" ref={area} tabIndex={0} aria-label="바구니를 좌우로 움직여요" onPointerDown={move} onPointerMove={(e) => e.buttons && move(e)} onKeyDown={keys}>
      {s.items.map((it) => <img key={it.id} className="catch-item" src={`/game/${it.kind}.png`} alt="" style={{ transform: `translate(calc(${it.x * 100}cqw - 50%), ${it.y * 100}cqh)` }} />)}
      <img className="catch-basket" src={`/game/${who}_basket.png`} alt="" style={{ transform: `translateX(calc(${x * 100}cqw - 50%))` }} />
    </div>
    {s.over && <div className="game-done"><b>{s.score}점</b><button className="game-level" onClick={() => { setS(begin()); setLevel(null) }}>다시 하기</button></div>}
  </div>
}

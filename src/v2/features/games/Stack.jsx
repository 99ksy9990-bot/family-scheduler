import { useEffect, useRef, useState } from 'react'
import { LEVELS, begin, drop, height, move } from './stackLogic'
import { bounce, burst, buzz, confetti, pop, shake } from './fx'
import './games.css'

const LEVEL_NAMES = { easy: '쉬움', normal: '보통', hard: '어려움' }
const FACES = ['dad', 'mom', 'big', 'little']
const COLORS = ['#5e5ce6', '#ff7a59', '#bf5af2', '#30b07a']
const FLOOR = 34 // 층 높이(px)

export default function Stack({ onFinish }) {
  const [level, setLevel] = useState(null)
  const [s, setS] = useState(begin)
  const cur = useRef(s)
  const area = useRef(null)
  const [H, setH] = useState(480)
  useEffect(() => { if (level && area.current) setH(area.current.clientHeight) }, [level])

  useEffect(() => {
    if (!level) return undefined
    let raf = 0; let prev = 0
    const loop = (now) => {
      const dt = prev ? Math.min(40, now - prev) : 0; prev = now
      cur.current = move(cur.current, dt, level); setS(cur.current)
      if (!cur.current.over && !document.hidden) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const resume = () => { if (!document.hidden && !cur.current.over) { prev = 0; raf = requestAnimationFrame(loop) } }
    document.addEventListener('visibilitychange', resume)
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', resume) }
  }, [level])

  if (!level) return <div className="game-levels">{Object.keys(LEVELS).map((lv) => <button key={lv} className="game-level" onClick={() => { cur.current = begin(); setS(cur.current); setLevel(lv) }}>{LEVEL_NAMES[lv]}<small>{lv === 'easy' ? '천천히' : lv === 'hard' ? '빨라요' : ''}</small></button>)}</div>

  const tap = () => {
    if (cur.current.over) return
    const before = cur.current
    const next = drop(before, level)
    cur.current = next; setS(next)
    const el = area.current; if (!el) return
    const W = el.clientWidth; const H = el.clientHeight
    const shift = Math.max(0, (next.floors.length + 1) * FLOOR - H * 0.6)
    const y = H - (next.floors.length - 1) * FLOOR + shift - FLOOR / 2
    if (next.over) { shake(el); buzz([80, 40, 80]); onFinish?.({ level, score: height(next) }); if (height(next) >= 10) confetti(el); return }
    const top = next.floors.at(-1)
    if (next.last.perfect) {
      burst(el, (top.x + top.w / 2) * W, y, 10)
      pop(el, (top.x + top.w / 2) * W, y - 10, next.combo >= 3 ? `딱! ×${next.combo}` : '딱!', 'gold'); buzz(25)
    } else {
      pop(el, (top.x + top.w / 2) * W, y - 10, `${height(next)}층`)
      // 잘려 나간 조각 떨어뜨리기
      const piece = document.createElement('i')
      piece.className = 'stack-cut'; piece.style.left = `${next.last.cutX * W}px`; piece.style.width = `${next.last.cut * W}px`; piece.style.top = `${y - FLOOR / 2}px`; piece.style.background = COLORS[(next.floors.length - 1) % 4]
      el.appendChild(piece)
      piece.animate([{ transform: 'translateY(0) rotate(0)', opacity: 1 }, { transform: `translateY(${H}px) rotate(${next.last.cutSide === 'left' ? -40 : 40}deg)`, opacity: 0.6 }], { duration: 900, easing: 'cubic-bezier(.5,0,.9,.6)' }).onfinish = () => piece.remove()
      buzz(12)
    }
    bounce(el.querySelector('.stack-floor:last-of-type'), 1.04)
  }

  const shift = Math.max(0, (s.floors.length + 1) * FLOOR - H * 0.6)
  const floorStyle = (f, i) => ({ left: `${f.x * 100}%`, width: `${f.w * 100}%`, bottom: `${i * FLOOR - shift}px`, background: COLORS[i % 4] })
  return <div className="stack">
    <div className="game-stats"><span>{height(s)}층</span><span>{s.combo >= 2 ? `딱 ${s.combo}번 연속` : '눌러서 쌓기'}</span></div>
    <div className="stack-area fx-host" ref={area} role="button" tabIndex={0} aria-label="눌러서 층 쌓기" onPointerDown={tap} onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), tap())}>
      {s.floors.map((f, i) => <div key={i} className={`stack-floor${i === 0 ? ' base' : ''}`} style={floorStyle(f, i)}>{i > 0 && <img src={`/characters/${FACES[i % 4]}_${s.last?.perfect && i === s.floors.length - 1 ? 'done' : 'basic'}.png`} alt="" />}</div>)}
      {!s.over && <div className="stack-floor moving" style={floorStyle(s.moving, s.floors.length)}><img src={`/characters/${FACES[s.floors.length % 4]}_busy.png`} alt="" /></div>}
      {s.over && <div className="stack-roof" style={{ bottom: `${s.floors.length * FLOOR - shift}px` }} />}
    </div>
    {s.over && <div className="game-done"><b>{height(s)}층 우리집!</b><button className="game-level" onClick={() => setLevel(null)}>다시 하기</button></div>}
  </div>
}

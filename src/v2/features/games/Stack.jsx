import { useEffect, useRef, useState } from 'react'
import { LEVELS, begin, drop, height, move, stageOf } from './stackLogic'
import { bounce, burst, buzz, confetti, pop, shake } from './fx'
import ItemBar from './ItemBar'
import { pickRoom, roomStyle, perkLevel } from './theme'
import './games.css'

const LEVEL_NAMES = { easy: '쉬움', normal: '보통', hard: '어려움' }
const FACES = ['dad', 'mom', 'big', 'little']
const COLORS = ['#5e5ce6', '#ff7a59', '#bf5af2', '#30b07a']
const FLOOR = 34 // 층 높이(px)

export default function Stack({ onFinish, shop }) {
  const [room] = useState(pickRoom) // 판 뒤 배경 그림
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

  if (!level) return <div className="game-levels">{Object.keys(LEVELS).map((lv) => <button key={lv} className="game-level" onClick={() => { const w = Math.min(0.9, 0.6 + 0.1 * perkLevel('stack')); cur.current = { ...begin(), floors: [{ x: (1 - w) / 2, w }], moving: { x: 0, w, dir: 1 } }; setS(cur.current); setLevel(lv) }}>{LEVEL_NAMES[lv]}<small>{lv === 'easy' ? '천천히' : lv === 'hard' ? '빨라요' : ''}</small></button>)}</div>

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
    if (stageOf(next) > stageOf(before)) { pop(el, W / 2, H * 0.3, `${stageOf(next)}단계!`, 'gold'); confetti(el); buzz(40) }
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
    <div className="game-stats"><span>{stageOf(s)}단계 · {height(s)}층</span><span>{s.combo >= 2 ? `딱 ${s.combo}번 연속` : '눌러서 쌓기'}</span></div>
    <div className="stack-area fx-host room-bg" style={roomStyle(room)} ref={area} role="button" tabIndex={0} aria-label="눌러서 층 쌓기" onPointerDown={tap} onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && (e.preventDefault(), tap())}>
      {s.floors.map((f, i) => <div key={i} className={`stack-floor${i === 0 ? ' base' : ''}`} style={floorStyle(f, i)}>{i > 0 && <img src={`/characters/${FACES[i % 4]}_${s.last?.perfect && i === s.floors.length - 1 ? 'done' : 'basic'}.png`} alt="" />}</div>)}
      {!s.over && <div className="stack-floor moving" style={floorStyle(s.moving, s.floors.length)}><img src={`/characters/${FACES[s.floors.length % 4]}_busy.png`} alt="" /></div>}
      {s.over && <div className="stack-roof" style={{ bottom: `${s.floors.length * FLOOR - shift}px` }} />}
    </div>
    <ItemBar key={level} shop={shop} off={s.over} items={[
      { id: 'fit', name: '딱 맞추기', img: 'room/hammer', price: 1, use: () => { const c = cur.current; cur.current = { ...c, moving: { ...c.moving, x: c.floors.at(-1).x } }; tap() } },
      { id: 'wide', name: '넓히기', img: 'room/rug', price: 2, ok: () => s.floors.at(-1).w < 0.55, use: () => { const c = cur.current; const top = c.floors.at(-1); const x = Math.min(0.4, Math.max(0, top.x - (0.6 - top.w) / 2)); cur.current = { ...c, floors: [...c.floors.slice(0, -1), { x, w: 0.6 }], moving: { ...c.moving, w: 0.6, x: Math.min(c.moving.x, 0.4) } }; setS(cur.current) } },
    ]} />
    {s.over && <div className="game-done"><b>{height(s)}층 우리집!</b><button className="game-level" onClick={() => setLevel(null)}>다시 하기</button></div>}
  </div>
}

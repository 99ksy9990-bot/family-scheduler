import { useEffect, useRef, useState } from 'react'
import { LINE, STAGES, begin, drop, step } from './mergeLogic'
import { burst, buzz, confetti, pop, shake } from './fx'
import ItemBar from './ItemBar'
import { pickRoom, roomStyle } from './theme'
import './games.css'

export default function Merge({ onFinish, shop }) {
  const [room] = useState(pickRoom) // 판 뒤 배경 그림
  const area = useRef(null)
  const cur = useRef(null)
  const [s, setS] = useState(null)
  const [aim, setAim] = useState(0.5)
  const ready = useRef(0)
  const [round, setRound] = useState(0)
  const [W, setW] = useState(1)
  const finish = useRef(onFinish)
  useEffect(() => { finish.current = onFinish })

  useEffect(() => {
    const el = area.current; if (!el) return undefined
    cur.current = begin(el.clientHeight / el.clientWidth); setS(cur.current); setW(el.clientWidth)
    let raf = 0; let prev = 0
    const loop = (now) => {
      const dt = prev ? (now - prev) / 1000 : 0; prev = now
      const next = step(cur.current, dt); cur.current = next; setS(next)
      const W = el.clientWidth
      for (const e of next.events) {
        burst(el, e.x * W, e.y * W, e.stage >= 5 ? 14 : 8)
        if (e.stage >= STAGES.length) { pop(el, e.x * W, e.y * W, '우리 가족 완성!', 'gold'); confetti(el); buzz([40, 30, 40]) }
        else { pop(el, e.x * W, e.y * W, STAGES[e.stage].name || `+${2 ** e.stage}`, e.stage >= 5 ? 'gold' : undefined); buzz(15) }
      }
      if (next.over) { shake(el); buzz([80, 40, 80]); finish.current?.({ level: 'normal', score: next.score }); return }
      if (!document.hidden) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const resume = () => { if (!document.hidden && !cur.current.over) { prev = 0; raf = requestAnimationFrame(loop) } }
    document.addEventListener('visibilitychange', resume)
    return () => { cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', resume) }
  }, [round])

  const toX = (e) => { const r = area.current.getBoundingClientRect(); return (e.clientX - r.left) / r.width }
  const release = (e) => {
    if (!cur.current || cur.current.over || performance.now() < ready.current) return
    ready.current = performance.now() + 450
    cur.current = drop(cur.current, toX(e)); setS(cur.current); buzz(8)
  }
  const ball = (stage, x, y, key, extra = '') => { const r = STAGES[stage].r * W; return <div key={key} className={`merge-ball${extra}`} style={{ width: r * 2, height: r * 2, transform: `translate(${x * W - r}px, ${y * W - r}px)`, background: STAGES[stage].color }}><img src={STAGES[stage].img} alt="" draggable="false" /></div> }

  return <div className="merge">
    <div className="game-stats"><span>{s?.score || 0}점</span><span className="merge-next">다음 {s && <img src={STAGES[s.after].img} alt="" />}</span></div>
    <div className="merge-area fx-host room-bg" style={roomStyle(room)} ref={area} role="application" aria-label="좌우로 옮기고 떼서 떨어뜨리기"
      onPointerDown={(e) => setAim(toX(e))} onPointerMove={(e) => setAim(toX(e))} onPointerUp={release}>
      {s && <div className="merge-line" style={{ top: LINE * s.h * W }} />}
      {s && !s.over && <>{ball(s.next, Math.min(1 - STAGES[s.next].r, Math.max(STAGES[s.next].r, aim)), STAGES[s.next].r + 0.01, 'aim', ' aiming')}<div className="merge-guide" style={{ left: aim * W }} /></>}
      {s?.balls.map((b) => ball(b.stage, b.x, b.y, b.id))}
    </div>
    <ol className="merge-ladder" aria-label="합치는 순서">{STAGES.map((st, i) => <li key={i} style={{ background: st.color }}><img src={st.img} alt={st.name || ''} /></li>)}</ol>
    <ItemBar key={round} shop={shop} off={!s || s.over} items={[
      { id: 'seed', name: '씨앗으로', img: 'tiles/seed', price: 1, ok: () => s?.next > 0, use: () => { cur.current = { ...cur.current, next: 0 } } },
      { id: 'top', name: '맨 위 치우기', img: 'room/broom', price: 2, ok: () => s?.balls.length > 0, use: () => { const b = cur.current.balls; const t = b.reduce((m, x) => (x.y - STAGES[x.stage].r < m.y - STAGES[m.stage].r ? x : m)); cur.current = { ...cur.current, balls: b.filter((x) => x !== t) } } },
    ]} />
    {s?.over && <div className="game-done"><b>{s.score}점!</b><button className="game-level" onClick={() => setRound((n) => n + 1)}>다시 하기</button></div>}
  </div>
}

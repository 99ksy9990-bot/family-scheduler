import { useEffect, useRef, useState } from 'react'
import { BASKET, RULES, begin, halfOf, stageOf, step } from './catchLogic'
import ItemBar from './ItemBar'
import { pickRoom, roomStyle, perkLevel } from './theme'
import { burst, buzz, confetti, pop, shake } from './fx'
import './games.css'

const LEVEL_NAMES = { easy: '쉬움', normal: '보통', hard: '어려움' }
const WHO = ['dad', 'mom', 'big', 'little']

export default function Catch({ onFinish, player = 'little', shop }) {
  const [room] = useState(pickRoom) // 이 방 배경에서 그 방 물건이 떨어짐
  const live = useRef(null) // 지금 판 (아이템이 바꿈)
  const [level, setLevel] = useState(null)
  const [s, setS] = useState(begin)
  const xRef = useRef(0.5)
  const [x, setX] = useState(0.5)
  const area = useRef(null)
  const who = WHO.includes(player) ? player : 'little'

  useEffect(() => {
    if (!level) return undefined
    let raf = 0; let prev = 0; live.current = { ...begin(), bigUntil: 20000 * perkLevel('catch'), mul: room.mine ? 2 : 1 }
    const loop = (now) => {
      let cur = live.current
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
      if (el && stageOf(cur.score) > stageOf(before.score)) { pop(el, el.clientWidth / 2, el.clientHeight * 0.3, `${stageOf(cur.score)}단계!`, 'gold'); confetti(el); buzz(40) }
      if (el && cur.lives < before.lives) { pop(el, xRef.current * el.clientWidth, BASKET.y * el.clientHeight - 10, '앗!', 'bad'); shake(el); buzz([60, 40, 60]) }
      live.current = cur; setS(cur)
      if (cur.over) { onFinish?.({ level, score: cur.score }); return }
      if (!document.hidden) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const resume = () => { if (!document.hidden && !live.current.over) { prev = 0; raf = requestAnimationFrame(loop) } }
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
    <p className="game-room-name">{room.name}에서 선물 받기 · 맨 오른쪽 물건은 3점</p>
    <div className="game-stats"><span>{stageOf(s.score)}단계 · {s.score}점</span><span className="catch-lives">{[0, 1, 2].map((i) => <img key={i} src={`/game/life_${i < s.lives ? 'full' : 'empty'}.png`} alt="" />)}</span></div>
    <div className="catch-area room-bg" style={roomStyle(room)} ref={area} tabIndex={0} aria-label="바구니를 좌우로 움직여요" onPointerDown={move} onPointerMove={(e) => e.buttons && move(e)} onKeyDown={keys}>
      {s.items.map((it) => <img key={it.id} className="catch-item" src={it.kind === 'cloud' ? '/game/cloud.png' : room.imgs[['star', 'heart', 'sun'].indexOf(it.kind)]} alt="" style={{ transform: `translate(calc(${it.x * 100}cqw - 50%), ${it.y * 100}cqh)` }} />)}
      <img className={`catch-basket${halfOf(s) > BASKET.half ? ' big' : ''}`} src={`/game/${who}_basket.png`} alt="" style={{ transform: `translateX(calc(${x * 100}cqw - 50%))` }} />
    </div>
    <ItemBar key={level} shop={shop} off={s.over} items={[
      { id: 'big', name: '큰 바구니', img: 'room/basket', price: 1, use: () => { live.current = { ...live.current, bigUntil: live.current.t + 10000 } } },
      { id: 'slow', name: '느림 시계', img: 'room/clock', price: 1, use: () => { live.current = { ...live.current, slowUntil: live.current.t + 10000 } } },
      { id: 'life', name: '하트 하나', img: 'room/heart', price: 2, ok: () => s.lives < 3, use: () => { live.current = { ...live.current, lives: Math.min(3, live.current.lives + 1) } } },
    ]} />
    {s.over && <div className="game-done"><b>{s.score}점</b><button className="game-level" onClick={() => { setS(begin()); setLevel(null) }}>다시 하기</button></div>}
  </div>
}

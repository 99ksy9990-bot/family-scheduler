import { useEffect, useRef, useState } from 'react'
import { N, STAGES, begin, findMove, goals, play } from './cleanLogic'
import { burst, buzz, confetti, pop, shake } from './fx'
import './games.css'

const IMG = ['star', 'heart', 'sun', 'clock', 'pencil', 'plant'].map((n) => `/game/pieces/${n}.png`) // 배경 없는 물건 그림
const SP_LABEL = { row: '가로 로켓', col: '세로 로켓', bomb: '폭탄', rainbow: '무지개', prop: '프로펠러' }
// 별을 모으면 집 꾸밈이 하나씩 열림 (최대 48단계 × 별 3개 = 144)
const DECOR = [
  ['ribbon', '현관 리본', 5], ['sun', '창가 햇살', 12], ['heart', '하트 쿠션', 20], ['pencil', '연필꽂이', 30],
  ['roof', '지붕 별 장식', 42], ['plant', '화분', 55], ['clock', '벽시계', 68], ['rug', '거실 러그', 82],
  ['lamp', '스탠드 조명', 96], ['frame', '가족 액자', 110], ['bear', '곰인형', 126], ['home', '반짝 우리집', 144],
].map(([img, name, need]) => ({ img: `/game/decor/${img}.png`, name, need }))
const starKey = (player) => `family-scheduler-clean-stars-${player}`
const readStars = (player) => { try { return JSON.parse(localStorage.getItem(starKey(player))) || {} } catch { return {} } }
const progressKey = (player) => `family-scheduler-clean-progress-${player}`
const readProgress = (player) => { try { return Number(localStorage.getItem(progressKey(player))) || 0 } catch { return 0 } }

export default function Clean({ player, onFinish, progress, onProgress }) {
  // 가족 데이터에 저장(폰이 바뀌어도 유지), 예전 폰 저장값은 처음 한 번 가져옴
  const [unlocked, setUnlocked] = useState(() => Math.max(progress?.unlocked || 0, readProgress(player)))
  const [stars, setStars] = useState(() => ({ ...readStars(player), ...progress?.stars }))
  const [s, setS] = useState(null)
  const [sel, setSel] = useState(null)
  const [flash, setFlash] = useState(() => new Set())
  const area = useRef(null)
  const start = useRef(null)
  const [hint, setHint] = useState(null)
  // 5초 동안 안 움직이면 바꿀 수 있는 두 칸을 깜빡여 알려 줌
  useEffect(() => {
    if (!s || s.done) return
    const t = setTimeout(() => setHint(findMove(s.board)), 5000)
    return () => clearTimeout(t)
  }, [s])
  const totalStars = Object.values(stars).reduce((a, b) => a + b, 0)

  if (!s) return <div className="clean-map">
    <p className="quiet">먼지를 닦고 물건을 모아 집을 깨끗하게! 단계를 깨면 다음 단계가 열려요.</p>
    <div className="clean-stages">{STAGES.map((st, i) => <button key={i} className="clean-stage" disabled={i > unlocked} aria-label={`${i + 1}단계${i > unlocked ? ' 잠김' : ''}`} onClick={() => setS(begin(i))}><b>{i + 1}</b><small className="clean-stars">{i < unlocked ? '★'.repeat(stars[i] || 1).padEnd(3, '☆') : i === unlocked ? '도전' : '잠김'}</small></button>)}</div>
    <h3 className="clean-decor-title">우리집 꾸미기 <small>모은 별 ★{totalStars}</small></h3>
    <div className="clean-decor">{DECOR.map((d) => { const open = totalStars >= d.need; return <div key={d.name} className={`clean-decor-item${open ? ' open' : ''}`} aria-label={`${d.name} ${open ? '꾸밈 완료' : `별 ${d.need}개 필요`}`}><img src={d.img} alt="" /><b>{d.name}</b><small>{open ? '완료' : `★${d.need}`}</small></div> })}</div>
  </div>

  const doSwap = (i, j) => {
    const r = play(s, i, j)
    setSel(null); setHint(null)
    const el = area.current
    if (!r) { shake(el?.querySelector(`[data-i="${i}"]`)); buzz(20); return }
    setS(r.state)
    setFlash(new Set(r.events.filter((e) => e.i != null).map((e) => e.i)))
    const cell = el?.clientWidth / N
    for (const e of r.events) {
      if (e.i == null || !el) continue
      const x = (e.i % N + 0.5) * cell; const y = (Math.floor(e.i / N) + 0.5) * cell
      if (e.type === 'make') pop(el, x, y, SP_LABEL[e.sp], 'gold')
      else if (e.type === 'combo') { burst(el, x, y, 24); pop(el, x, y, '합체!', 'gold') }
      else if (['row', 'col', 'bomb', 'rainbow', 'prop'].includes(e.type)) burst(el, x, y, 14)
    }
    const chain = r.events.filter((e) => e.type === 'chain').at(-1)
    if (chain && el) pop(el, el.clientWidth / 2, el.clientWidth / 2, `연쇄 ×${chain.n}`, 'gold')
    buzz(r.events.length > 6 ? [20, 30, 20] : 12)
    if (r.state.done === 'win') {
      const next = Math.max(unlocked, s.stage + 1)
      const nextStars = { ...stars, [s.stage]: Math.max(stars[s.stage] || 0, r.state.stars || 1) }
      setUnlocked(next); setStars(nextStars); onProgress?.({ unlocked: next, stars: nextStars }); try { localStorage.setItem(progressKey(player), String(next)); localStorage.setItem(starKey(player), JSON.stringify(nextStars)) } catch { /* 진행도 저장 못 해도 게임은 계속 */ }
      const bonus = r.events.find((e) => e.type === 'bonus'); if (bonus?.n && el) pop(el, el.clientWidth / 2, el.clientWidth / 3, `남은 이동 ${bonus.n} → 보너스!`, 'gold')
      if (el) confetti(el)
      onFinish?.({ level: 'normal', score: s.stage + 1, tried: s.stage + 1, win: true })
    } else if (r.state.done === 'lose') onFinish?.({ level: 'normal', score: s.stage, tried: s.stage + 1, win: false })
  }

  const tap = (i) => {
    if (s.done) return
    if (sel == null) return setSel(i)
    if (sel === i) return setSel(null)
    const near = Math.abs(sel - i) === N || (Math.abs(sel - i) === 1 && Math.floor(sel / N) === Math.floor(i / N))
    near ? doSwap(sel, i) : setSel(i)
  }
  // 밀어서 바꾸기
  const down = (e, i) => { start.current = { x: e.clientX, y: e.clientY, i } }
  const up = (e) => {
    const st = start.current; start.current = null; if (!st) return
    const dx = e.clientX - st.x; const dy = e.clientY - st.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return tap(st.i)
    const [r, c] = [Math.floor(st.i / N), st.i % N]
    const j = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? (c < N - 1 ? st.i + 1 : -1) : (c > 0 ? st.i - 1 : -1)) : (dy > 0 ? (r < N - 1 ? st.i + N : -1) : (r > 0 ? st.i - N : -1))
    if (j >= 0 && !s.done) doSwap(st.i, j)
  }

  const gs = goals(s)
  return <div className="clean">
    <div className="clean-hud">
      <span className="clean-moves"><b>{s.moves}</b><small>남은 이동</small></span>
      <span className="clean-goals" aria-label="목표">{gs.map((g) => <span key={g.kind} className={g.left ? '' : 'done'}>{g.kind === 'dust' ? <><i className="dust-icon" aria-hidden="true" /><small className="dust-goal">먼지</small></> : <img src={IMG[g.kind]} alt="" />}<b>{g.left || '✓'}</b></span>)}</span>
      <span className="clean-stage-no">{s.stage + 1}단계</span>
    </div>
    <div className="clean-board fx-host" ref={area} role="grid" aria-label="청소 판" onPointerUp={up} onPointerCancel={() => { start.current = null }}>
      {s.board.map((t, i) => <button key={i} data-i={i} className={`clean-cell${sel === i ? ' sel' : ''}${flash.has(i) ? ' flash' : ''}${hint?.includes(i) ? ' hint' : ''}`} data-dust={s.dust[i] || undefined} data-sp={t.sp || undefined} aria-label={`${Math.floor(i / N) + 1}행 ${i % N + 1}열${t.sp ? ` ${SP_LABEL[t.sp]}` : ''}${s.dust[i] ? ' 먼지' : ''}`} onPointerDown={(e) => down(e, i)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), tap(i))}>
        <img src={IMG[t.k]} alt="" draggable="false" />
      </button>)}
    </div>
    <button className="clean-hint-button" disabled={!!s.done} onClick={() => setHint(findMove(s.board))}>힌트</button>
    <ul className="clean-help">
      <li><b>먼지</b> 줄무늬 칸 위에서 맞추면 닦여요</li>
      <li><b>4개 한 줄</b> 로켓: 한 줄을 지워요</li>
      <li><b>네모 4개</b> 프로펠러: 목표로 날아가요</li>
      <li><b>ㄱ·T 모양</b> 폭탄: 주변을 터뜨려요</li>
      <li><b>5개 한 줄</b> 무지개: 같은 그림을 모두 지워요</li>
      <li><b>특수끼리</b> 바꾸면 합체해서 더 크게 터져요</li>
    </ul>
    {s.done && <div className="game-done"><b>{s.done === 'win' ? `${s.stage + 1}단계 깨끗해졌어요! ${'★'.repeat(s.stars || 1)}` : '이동을 다 썼어요'}</b><button className="game-level" onClick={() => { setS(null); setSel(null) }}>단계 고르기</button></div>}
  </div>
}

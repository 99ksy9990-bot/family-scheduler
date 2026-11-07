import { useEffect, useRef, useState } from 'react'
import { N, STAGES, begin, findMove, goals, isFixed, isLocked, play, shuffle, smash, sweep, erase } from './cleanLogic'
import { burst, buzz, confetti, fanfare, playMusic, pop, shake } from './fx'
import { ROOMS } from './cleanRooms'
import { COMP, GIFT, GIFT_EVERY, arcadeOf } from './wallet'
import './games.css'

const TRACKS = ['pairs', 'catch', 'tap', 'sequence', 'stack', 'merge', 'match']

const IMG = ['star', 'heart', 'sun', 'clock', 'pencil', 'plant'].map((n) => `/game/pieces/${n}.png`) // 배경 없는 물건 그림
const SP_LABEL = { row: '가로 로켓', col: '세로 로켓', bomb: '폭탄', rainbow: '무지개', prop: '프로펠러' }
const ITEMS = { hammer: 3, shuffle: 1 } // 단계마다 새로 받는 아이템 수
// 별: 단계마다 받은 별(1~3, 어려운 단계는 2배) + 10단계마다 선물 상자 + 주간 이벤트 보상
// 오늘의 이벤트: 날마다 다른 미션 + 출석 별 (요일·날짜로 돌아감)
const MISSIONS = [
  { type: 'win', goal: 3, reward: 5, text: '단계 3번 깨기' }, { type: 'dust', goal: 40, reward: 4, text: '먼지 40개 닦기' },
  { type: 'make', goal: 10, reward: 4, text: '특수 블록 10개 만들기' }, { type: 'box', goal: 10, reward: 4, text: '상자 10번 치기', need: 'boxes' },
  { type: 'star3', goal: 2, reward: 5, text: '별 3개로 2번 깨기' }, { type: 'combo', goal: 3, reward: 5, text: '특수 블록 3번 합치기' },
  { type: 'drop', goal: 3, reward: 4, text: '오리 3마리 구출', need: 'drops' }, { type: 'ice', goal: 10, reward: 4, text: '얼음 10개 깨기', need: 'ice' },
]
const CHECKIN = 2, WEEK_BONUS = 10 // 출석 별, 7일 연속이면 별 10개 더
const dayId = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
// 그 사람이 지금 할 수 있는 단계(지금 단계까지)에 나오는 방해물 미션만 고름
const firstOf = (need) => STAGES.findIndex((st) => (Array.isArray(st[need]) ? st[need].length : st[need]))
const missionOf = (unlocked, d = new Date()) => { const ok = MISSIONS.filter((m) => !m.need || firstOf(m.need) <= unlocked); return ok[Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 864e5) % ok.length] }
const PRICE = { hammer: 1, shuffle: 1, moves: 2, row: 2, col: 2, eraser: 3 } // 게임 중에 별로 사는 아이템
const STREAK = ['row', 'bomb', 'rainbow'] // 연승 1·2·3번째부터 시작 아이템 하나씩 더
const now = () => Date.now()
// 새 방해물이 처음 나오는 단계에서 한 번 설명
const FIRST = { [STAGES.findIndex((st) => st.ice.length)]: ['ice-icon', '얼음이 나왔어요!', '얼음 속 물건은 못 움직여요. 그 칸에서 맞추면 얼음이 깨져요.'], [STAGES.findIndex((st) => st.foam.length)]: ['foam-icon', '거품이 나왔어요!', '거품 칸에서 맞추면 닦여요. 한 번 움직일 때 하나도 못 닦으면 옆으로 번져요.'] }
const EXTRA_MOVES = 5 // 다 쓰면 별로 사기
// 받은 효과를 종류별로 합쳐서 한 줄로
const START_NAME = { row: '로켓', col: '로켓', bomb: '폭탄', prop: '프로펠러', rainbow: '무지개' }
function perkSummary(perks) {
  const sum = (k) => perks.reduce((a, p) => a + (p[k] || 0), 0)
  const starts = {}
  for (const sp of perks.flatMap((p) => p.start || [])) starts[START_NAME[sp]] = (starts[START_NAME[sp]] || 0) + 1
  return [sum('moves') && `이동 +${sum('moves')}`, sum('hammer') && `망치 +${sum('hammer')}`, sum('shuffle') && `섞기 +${sum('shuffle')}`,
    Object.keys(starts).length && `시작 아이템 ${Object.entries(starts).map(([n, c]) => `${n} ${c}`).join(' · ')}`].filter(Boolean).join(' / ')
}
function addStarts(board, sps) {
  for (const sp of sps) { const free = board.map((t, x) => (!isFixed(t) && !t.sp ? x : -1)).filter((x) => x >= 0); const x = free[Math.floor(Math.random() * free.length)]; board[x] = { ...board[x], sp } }
}
const starKey = (player) => `family-scheduler-clean-stars-${player}`
const readStars = (player) => { try { return JSON.parse(localStorage.getItem(starKey(player))) || {} } catch { return {} } }
const progressKey = (player) => `family-scheduler-clean-progress-${player}`
const readProgress = (player) => { try { return Number(localStorage.getItem(progressKey(player))) || 0 } catch { return 0 } }
// 특수 블록 효과: 실제로 지워지는 칸에 정확히 그림 (로켓=빛줄기, 폭탄=사각 폭발, 무지개=광선, 프로펠러=날아가기)
const FX_COLOR = { row: '#ffb020', col: '#ffb020', bomb: '#ff5a36', rainbow: '#bf5af2', prop: '#30b07a', combo: '#ff2d55' }
const calm = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
function rectOf(host, i) {
  const el = host.querySelector(`[data-i="${i}"]`); if (!el) return null
  const h = host.getBoundingClientRect(); const r = el.getBoundingClientRect()
  return { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height, cx: r.left - h.left + r.width / 2, cy: r.top - h.top + r.height / 2 }
}
function add(host, cls, style) { const n = document.createElement('i'); n.className = cls; for (const [k, v] of Object.entries(style)) n.style.setProperty(k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`), v); host.appendChild(n); return n }
function specialFx(host, e) {
  const o = rectOf(host, e.i); if (!o || !e.cells) return
  const color = FX_COLOR[e.type] || FX_COLOR.combo
  const cells = e.cells.map((c) => [c, rectOf(host, c)]).filter(([, r]) => r)
  // 지워지는 칸마다 색 사각형이 원점에서 퍼지듯 차례로 번쩍
  for (const [, r] of cells) {
    const d = Math.hypot(r.cx - o.cx, r.cy - o.cy)
    const n = add(host, 'fx-cell', { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, background: color })
    n.animate([{ opacity: 0, transform: 'scale(.5)' }, { opacity: .85, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.1)' }], { duration: calm() ? 300 : 420, delay: calm() ? 0 : d * 0.9, easing: 'ease-out', fill: 'backwards' }).onfinish = () => n.remove()
  }
  if (calm()) return
  const W = host.clientWidth; const H = host.clientHeight
  if (e.type === 'row' || e.type === 'col') {
    const row = e.type === 'row'
    const n = add(host, `fx-beam ${row ? 'row' : 'col'}`, row ? { left: '0', top: `${o.cy}px`, width: `${W}px` } : { top: '0', left: `${o.cx}px`, height: `${H}px` })
    n.style.transformOrigin = row ? `${o.cx}px 50%` : `50% ${o.cy}px`
    n.animate([{ transform: `${row ? 'translateY(-50%) scaleX(0)' : 'translateX(-50%) scaleY(0)'}`, opacity: 1 }, { transform: `${row ? 'translateY(-50%) scaleX(1)' : 'translateX(-50%) scaleY(1)'}`, opacity: 1, offset: .5 }, { transform: `${row ? 'translateY(-50%) scaleX(1)' : 'translateX(-50%) scaleY(1)'}`, opacity: 0 }], { duration: 520, easing: 'ease-out' }).onfinish = () => n.remove()
  } else if (e.type === 'bomb' || e.type === 'combo') {
    const xs = cells.map(([, r]) => r); const l = Math.min(...xs.map((r) => r.x)); const t = Math.min(...xs.map((r) => r.y))
    const n = add(host, 'fx-blast', { left: `${l}px`, top: `${t}px`, width: `${Math.max(...xs.map((r) => r.x + r.w)) - l}px`, height: `${Math.max(...xs.map((r) => r.y + r.h)) - t}px`, transformOrigin: `${o.cx - l}px ${o.cy - t}px`, '--c': color })
    n.animate([{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1)', opacity: .9, offset: .4 }, { transform: 'scale(1.06)', opacity: 0 }], { duration: 560, easing: 'ease-out' }).onfinish = () => n.remove()
  } else if (e.type === 'rainbow') {
    cells.forEach(([, r], k) => {
      const len = Math.hypot(r.cx - o.cx, r.cy - o.cy); if (len < 1) return
      const n = add(host, 'fx-ray', { left: `${o.cx}px`, top: `${o.cy}px`, width: `${len}px`, transform: `rotate(${Math.atan2(r.cy - o.cy, r.cx - o.cx)}rad)`, background: `hsl(${(k * 47) % 360} 90% 60%)` })
      n.animate([{ scale: '0 1', opacity: 1 }, { scale: '1 1', opacity: 1, offset: .5 }, { scale: '1 1', opacity: 0 }], { duration: 600, delay: k * 25, easing: 'ease-out', fill: 'backwards' }).onfinish = () => n.remove()
    })
  } else if (e.type === 'prop') {
    const [, t] = cells.at(-1)
    const n = document.createElement('img'); n.src = '/game/room/shuffle.png'; n.alt = ''; n.className = 'fx-prop'; n.style.left = `${o.cx}px`; n.style.top = `${o.cy}px`; host.appendChild(n)
    n.animate([{ transform: 'translate(-50%,-50%) scale(.6) rotate(0)' }, { transform: `translate(calc(-50% + ${(t.cx - o.cx) / 2}px), calc(-50% + ${(t.cy - o.cy) / 2 - 40}px)) scale(1.3) rotate(360deg)`, offset: .5 }, { transform: `translate(calc(-50% + ${t.cx - o.cx}px), calc(-50% + ${t.cy - o.cy}px)) scale(.8) rotate(720deg)`, opacity: 1 }], { duration: 650, easing: 'ease-in-out' }).onfinish = () => n.remove()
  }
}
const Face = ({ player, mood = 'basic', size = 56 }) => <img className="clean-face" src={`/characters/${player}_${mood}.png`} alt="" width={size} height={size} />

export default function Clean({ player, onFinish, progress, onProgress, autoStart, home }) {
  // 가족 데이터에 저장(폰이 바뀌어도 유지), 예전 폰 저장값은 처음 한 번 가져옴
  const [unlocked, setUnlocked] = useState(() => Math.max(progress?.unlocked || 0, readProgress(player)))
  const [stars, setStars] = useState(() => ({ ...readStars(player), ...progress?.stars }))
  const [done, setDone] = useState(() => progress?.done || [])
  const [streak, setStreak] = useState(() => progress?.streak || 0) // 연승
  const [bonus, setBonus] = useState(() => progress?.bonus || 0) // 이벤트로 받은 별
  const [day, setDay] = useState(() => (progress?.day?.id === dayId() ? progress.day : { id: dayId(), n: 0, claimed: false, checkin: false, type: missionOf(Math.max(progress?.unlocked || 0, readProgress(player))).type }))
  // 오늘 미션은 정해지면 그날 안 바뀜 (새 단계가 열려도)
  const mission = MISSIONS.find((m) => m.type === day.type) || missionOf(unlocked)
  const [attend, setAttend] = useState(() => progress?.attend || { last: '', run: 0 }) // 연속 출석
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return dayId(d) })()
  const runNow = attend.last === dayId() || attend.last === yesterday ? attend.run : 0
  const [tip, setTip] = useState(null)
  const [seen, setSeen] = useState(() => progress?.seen || []) // 이미 본 설명 (단계 번호)
  // 별 계산을 바꾸면서 줄어든 별을 한 번 보상 (예전부터 하던 사람만)
  const [comp] = useState(() => progress?.comp || ((progress?.unlocked || 0) > 0 ? COMP : 0))
  const compNew = !progress?.comp && comp > 0
  useEffect(() => { if (compNew) { onProgress?.({ ...progress, comp }) } }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const dustNow = useRef(0)
  const [bought, setBought] = useState(() => (progress?.econ === 2 ? progress.bought || 0 : 0)) // 아이템 사는 데 쓴 별
  const [s, setS] = useState(null)
  const [sel, setSel] = useState(null)
  const [flash, setFlash] = useState(() => new Set())
  const [items, setItems] = useState(ITEMS)
  const [hammer, setHammer] = useState(false)
  const [broom, setBroom] = useState(false) // false | 'row' | 'col'
  const [eraser, setEraser] = useState(false)
  const [hint, setHint] = useState(null)
  const [cheer, setCheer] = useState(() => (compNew ? `그동안 고마워! 보상 별 ${comp}개를 줄게.` : ''))
  const [view, setView] = useState(null) // 고른 방 (없으면 아직 안 끝난 첫 방)
  const [party, setParty] = useState(null) // 방을 다 고치면 축하 화면
  const partyRef = useRef(null)
  useEffect(() => { if (party && partyRef.current) { confetti(partyRef.current); fanfare() } }, [party])
  // 방마다 다른 곡: 지금 꾸미는 방(또는 고른 방)에 맞춰 부드럽게 바꿈
  const musicRoom = view ?? Math.max(0, ROOMS.findIndex((r) => r.tasks.some((t) => !done.includes(t.id))))
  useEffect(() => { playMusic('clean', TRACKS[musicRoom % TRACKS.length]) }, [musicRoom])
  const area = useRef(null)
  const tabs = useRef(null)
  // 고른 방 탭이 화면 밖이면 가운데로 끌어옴 (방이 30개라 옆으로 김)
  useEffect(() => { tabs.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' }) }, [view, done, s, party])
  const start = useRef(null)
  // 5초 동안 안 움직이면 바꿀 수 있는 두 칸을 깜빡여 알려 줌
  useEffect(() => {
    if (!s || s.done) return
    const t = setTimeout(() => setHint(findMove(s.board)), 5000)
    return () => clearTimeout(t)
  }, [s])
  const earned = Object.entries(stars).reduce((a, [i, n]) => a + n * (STAGES[i]?.hard ? 2 : 1), 0) + GIFT * Math.floor(unlocked / GIFT_EVERY) + bonus + comp + arcadeOf(progress).earned - arcadeOf(progress).spent // 다른 게임에서 번 별·쓴 별 포함
  const spent = ROOMS.flatMap((r) => r.tasks).filter((t) => done.includes(t.id)).reduce((a, t) => a + t.cost, 0)
  const wallet = Math.max(0, earned - spent - bought) // 예전 계산으로 쓴 별이 많아도 0 아래로는 안 감
  const save = (next) => { onProgress?.({ unlocked, stars, done, bought, econ: 2, comp, seen, streak, streakAt: now(), bonus, day, attend, ...next }) }
  const perks = ROOMS.filter((r) => r.tasks.every((t) => done.includes(t.id))).map((r) => r.perk)
  const startStage = (i) => {
    const st = begin(i)
    st.moves += perks.reduce((a, p) => a + (p.moves || 0), 0)
    // 시작 특수 블록: 방 효과 + 연승 보너스 + 별로 산 것, 일반 칸 중 아무 데나
    addStarts(st.board, [...perks.flatMap((p) => p.start || []), ...STREAK.slice(0, Math.min(streak, 3))])
    dustNow.current = 0; setTip(FIRST[i] && !seen.includes(i) ? FIRST[i] : null)
    setS(st); setItems({ hammer: ITEMS.hammer + perks.reduce((a, p) => a + (p.hammer || 0), 0), shuffle: ITEMS.shuffle + perks.reduce((a, p) => a + (p.shuffle || 0), 0) }); setHammer(false); setBroom(false); setEraser(false); setCheer('')
  }
  // 결과 화면에서 '다음 단계'를 누르면 방 화면 없이 바로 시작
  useEffect(() => { if (!autoStart || unlocked >= STAGES.length) return; const t = setTimeout(() => startStage(unlocked)); return () => clearTimeout(t) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) {
    const roomIndex = ROOMS.findIndex((r) => r.tasks.some((t) => !done.includes(t.id)))
    const finished = (r) => r.tasks.every((t) => done.includes(t.id))
    const open = (r, k) => k < ROOMS.length - 1 || ROOMS.slice(0, -1).every(finished) // 마지막 '우리집'은 다른 방을 다 꾸미면 열림
    const room = ROOMS[view ?? (roomIndex < 0 ? ROOMS.length - 1 : roomIndex)]
    const fix = (t) => { if (wallet < t.cost) return; const next = [...done, t.id]; setDone(next); save({ done: next }); setCheer(`${t.name} 끝! 고마워!`); if (room.tasks.every((x) => next.includes(x.id))) setParty({ room, last: ROOMS.every((r) => r.tasks.every((x) => next.includes(x.id))) }) }
    if (party) return <div key="party" className="clean-party fx-host" ref={partyRef} role="dialog" aria-label="축하">
      <div className="clean-room on" style={{ backgroundImage: `url(/game/room/${party.room.bg}.jpg)` }}>{party.room.tasks.map((t) => <img key={t.id} className="clean-room-thing on" src={t.img} alt="" style={{ left: `${t.at[0]}%`, top: `${t.at[1]}%`, width: `${t.at[2]}%` }} />)}</div>
      <h3>{party.last ? '우리집 완성!' : `${party.room.name} 완성!`}</h3>
      <p className="clean-perk-new">새 효과: <b>{party.room.perk.text}</b><br />이제 모든 단계에서 받아요</p>
      <div className="clean-talk"><Face player={player} mood="done" /><p>{party.last ? '모든 방이 반짝반짝해! 정말 고마워. 우리 가족 최고!' : `${party.room.name}이(가) 정말 예뻐졌어! 다음 방도 같이 고치자.`}</p></div>
      <button className="primary-button clean-play" onClick={() => { setParty(null); setCheer(''); setView(null) }}>{party.last ? '우리집 보기' : '다음 방으로'}</button>
    </div>
    return <div key="map" className="clean-map">
      <div className="clean-room-tabs" ref={tabs} role="tablist" aria-label="방 고르기">{ROOMS.map((r, k) => <button key={r.name} role="tab" aria-selected={r === room} disabled={!open(r, k)} onClick={() => { setView(k); setCheer('') }}>{r.name}{finished(r) ? ' ✓' : ''}</button>)}</div>
      <section className="clean-room" style={{ backgroundImage: `url(/game/room/${room.bg}.jpg)` }} aria-label={`${room.name} 꾸미기`}>
        <span className="clean-room-name">{room.name}</span>
        <span className="clean-wallet">★ {wallet}</span>
        {room.tasks.map((t) => <img key={t.id} className={`clean-room-thing${done.includes(t.id) ? ' on' : ''}`} src={t.img} alt="" style={{ left: `${t.at[0]}%`, top: `${t.at[1]}%`, width: `${t.at[2]}%` }} />)}
      </section>
      <div className="clean-talk"><Face player={player} mood={cheer ? 'done' : 'basic'} /><p>{roomIndex < 0 ? (home ? '우리집이 다 깨끗해졌어! 게임에서 별을 더 모아 봐.' : '우리집이 다 깨끗해졌어! 단계를 더 깨서 별을 모아 봐.') : cheer || room.say}</p></div>
      {!home && unlocked < STAGES.length && <button className={`primary-button clean-play${STAGES[unlocked].hard ? ' hard' : ''}`} onClick={() => startStage(unlocked)}>{unlocked + 1}단계 도전{STAGES[unlocked].hard ? ' · 어려움 별 2배' : ''}{(unlocked + 1) % GIFT_EVERY === 0 ? ' · 선물 상자' : ''}{streak ? ` · ${streak}연승 보너스` : ''}</button>}
      {!home && <details className="clean-all"><summary>지난 단계 다시 하기</summary>
        <div className="clean-stages">{STAGES.map((st, i) => <button key={i} className={`clean-stage${st.hard ? ' hard' : ''}`} disabled={i > unlocked} aria-label={`${i + 1}단계${i > unlocked ? ' 잠김' : ''}`} onClick={() => startStage(i)}><b>{i + 1}</b><small className="clean-stars">{i < unlocked ? '★'.repeat(stars[i] || 1).padEnd(3, '☆') : i === unlocked ? '도전' : '잠김'}</small></button>)}</div>
      </details>}
      <p className="clean-perk">다 꾸미면: <b>{room.perk.text}</b> (대청소) · <b>다른 게임 아이템 판마다 1번 무료</b> · 게임 배경으로 나와요</p>
      {perks.length > 0 && <p className="clean-perk">지금 받는 효과: {perkSummary(perks)}</p>}
      <ul className="clean-tasks">{room.tasks.map((t) => { const ok = done.includes(t.id); return <li key={t.id}><img src={t.img} alt="" /><span>{t.name}</span>{ok ? <em>완료</em> : <button disabled={wallet < t.cost} onClick={() => fix(t)} aria-label={`${t.name} 별 ${t.cost}개 쓰기`}>★ {t.cost}</button>}</li> })}</ul>
      <div className="clean-week"><span><small>오늘 출석 · 연속 {runNow}일</small><span>매일 별 {CHECKIN}개, 7일째엔 {WEEK_BONUS}개 더 <b className="clean-dots" aria-hidden="true">{'●'.repeat(runNow % 7 || (runNow ? 7 : 0)).padEnd(7, '○')}</b></span></span>{day.checkin ? <em>받았어요</em> : <button onClick={() => { const run = runNow + 1; const extra = run % 7 === 0 ? WEEK_BONUS : 0; const a = { last: dayId(), run }; const d = { ...day, checkin: true }; const b = bonus + CHECKIN + extra; setAttend(a); setDay(d); setBonus(b); save({ day: d, bonus: b, attend: a }); setCheer(extra ? `7일 연속 출석! 별 ${CHECKIN + extra}개!` : `출석 고마워! 별 ${CHECKIN}개!`) }}>★{CHECKIN}{runNow % 7 === 6 ? `+${WEEK_BONUS}` : ''} 받기</button>}</div>
      <div className="clean-week"><span><small>오늘의 이벤트</small><span>{mission.text} <b>{Math.min(day.n, mission.goal)}/{mission.goal}</b></span></span>{day.claimed ? <em>받았어요</em> : <button disabled={day.n < mission.goal} onClick={() => { const d = { ...day, claimed: true }; const b = bonus + mission.reward; setDay(d); setBonus(b); save({ day: d, bonus: b }); setCheer(`이벤트 선물 별 ${mission.reward}개!`) }}>★{mission.reward} 받기</button>}</div>
    </div>
  }

  const show = (r) => {
    const el = area.current
    setS(r.state)
    setFlash(new Set(r.events.filter((e) => e.i != null).map((e) => e.i)))
    const cell = el?.clientWidth / N
    for (const e of r.events) {
      if (e.i == null || !el) continue
      const x = (e.i % N + 0.5) * cell; const y = (Math.floor(e.i / N) + 0.5) * cell
      if (e.type === 'make') pop(el, x, y, SP_LABEL[e.sp], 'gold')
      else if (e.type === 'combo') pop(el, x, y, '합체!', 'gold')
      else if (['smash', 'box', 'ice', 'foam'].includes(e.type)) burst(el, x, y, 10)
      else if (e.type === 'drop') { burst(el, x, y, 16); pop(el, x, y, '오리 구출!', 'gold') }
      if (['row', 'col', 'bomb', 'rainbow', 'prop', 'combo'].includes(e.type)) specialFx(el, e)
    }
    const chain = r.events.filter((e) => e.type === 'chain').at(-1)
    if (chain && el) pop(el, el.clientWidth / 2, el.clientWidth / 2, `연쇄 ×${chain.n}`, 'gold')
    if (chain?.n >= 3) setCheer('우와, 연쇄다!')
    buzz(r.events.length > 6 ? [20, 30, 20] : 12)
    dustNow.current += r.events.filter((e) => e.type === mission.type).length
    if (r.state.done === 'win') {
      const next = Math.max(unlocked, s.stage + 1)
      const nextStars = { ...stars, [s.stage]: Math.max(stars[s.stage] || 0, r.state.stars || 1) }
      const won = mission.type === 'win' ? 1 : mission.type === 'star3' && r.state.stars === 3 ? 1 : 0
      const w = { ...day, n: day.n + dustNow.current + won }; dustNow.current = 0
      r.state.gift = next > unlocked && next % GIFT_EVERY === 0; r.state.streak = streak + 1
      setDay(w); setStreak(streak + 1)
      setUnlocked(next); setStars(nextStars); save({ unlocked: next, stars: nextStars, streak: streak + 1, day: w }); try { localStorage.setItem(progressKey(player), String(next)); localStorage.setItem(starKey(player), JSON.stringify(nextStars)) } catch { /* 진행도 저장 못 해도 게임은 계속 */ }
      const bonus = r.events.find((e) => e.type === 'bonus'); if (bonus?.n && el) pop(el, el.clientWidth / 2, el.clientWidth / 3, `남은 이동 ${bonus.n} → 보너스!`, 'gold')
      if (el) confetti(el)
      onFinish?.({ level: 'normal', score: s.stage + 1, tried: s.stage + 1, win: true })
    }
  }
  // 이동을 다 써도 바로 끝내지 않고 이어하기를 물어봄
  const giveUp = () => {
    const w = { ...day, n: day.n + dustNow.current }; dustNow.current = 0
    setDay(w); setStreak(0); save({ streak: 0, day: w })
    onFinish?.({ level: 'normal', score: s.stage, tried: s.stage + 1, win: false })
    setS(null); setSel(null)
  }
  const keepGoing = () => {
    if (wallet < PRICE.moves) return
    const next = bought + PRICE.moves; setBought(next); save({ bought: next })
    setS((st) => ({ ...st, moves: EXTRA_MOVES, done: null }))
  }
  const doSwap = (i, j) => {
    setSel(null); setHint(null)
    const r = play(s, i, j)
    if (!r) { shake(area.current?.querySelector(`[data-i="${i}"]`)); buzz(20); return }
    show(r)
  }
  const hitWithHammer = (i) => {
    // 망치가 남아 있으면 계속 깰 수 있음 (망치 버튼을 다시 누르면 끝)
    const r = smash(s, i); setHint(null)
    if (!r) return
    if (items.hammer <= 1 || r.state.done) setHammer(false)
    setItems((it) => ({ ...it, hammer: it.hammer - 1 })); show(r)
  }
  const buy = (kind) => {
    if (wallet < PRICE[kind]) return
    const next = bought + PRICE[kind]; setBought(next); save({ bought: next })
    setItems((it) => ({ ...it, [kind]: it[kind] + 1 }))
    pop(area.current, area.current?.clientWidth / 2, area.current?.clientWidth / 2, `${kind === 'hammer' ? '망치' : '섞기'} +1`, 'gold')
  }
  const sweepRow = (i) => {
    const r = sweep(s, i, Math.random, broom === 'col'); const price = PRICE[broom]; setBroom(false); setHint(null)
    if (!r || wallet < price) return
    const next = bought + price; setBought(next); save({ bought: next }); show(r)
  }
  const eraseKind = (i) => {
    const r = s.board[i]?.k >= 0 && wallet >= PRICE.eraser ? erase(s, s.board[i].k) : null; setEraser(false); setHint(null)
    if (!r) return
    const next = bought + PRICE.eraser; setBought(next); save({ bought: next }); show(r)
  }
  const buyMoves = () => {
    if (wallet < PRICE.moves || s.done) return
    const next = bought + PRICE.moves; setBought(next); save({ bought: next })
    setS((st) => ({ ...st, moves: st.moves + EXTRA_MOVES }))
    pop(area.current, area.current?.clientWidth / 2, area.current?.clientWidth / 2, `이동 +${EXTRA_MOVES}`, 'gold')
  }
  const reshuffle = () => { const r = shuffle(s); if (!r) return; setItems((it) => ({ ...it, shuffle: it.shuffle - 1 })); setS(r); setHint(null); setSel(null) }

  const tap = (i) => {
    if (s.done) return
    if (eraser) return eraseKind(i)
    if (broom) return sweepRow(i)
    if (hammer) return hitWithHammer(i)
    if (isLocked(s.board[i])) return
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
    if (hammer || broom || eraser || Math.max(Math.abs(dx), Math.abs(dy)) < 18) return tap(st.i)
    const [r, c] = [Math.floor(st.i / N), st.i % N]
    const j = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? (c < N - 1 ? st.i + 1 : -1) : (c > 0 ? st.i - 1 : -1)) : (dy > 0 ? (r < N - 1 ? st.i + N : -1) : (r > 0 ? st.i - N : -1))
    if (j >= 0 && !s.done) doSwap(st.i, j)
  }

  const gs = goals(s)
  const mood = s.done === 'win' ? 'done' : s.done === 'lose' || s.moves <= 3 ? 'busy' : cheer ? 'done' : 'basic'
  return <div className="clean">
    <div className="clean-hud">
      <div className="clean-panel"><small>목표</small><span className="clean-goals" aria-label="목표">{gs.map((g) => <span key={g.kind} className={g.left ? '' : 'done'}>{g.kind === 'dust' ? <i className="dust-icon" aria-label="먼지" /> : g.kind === 'box' ? <i className="box-icon" aria-label="상자" /> : g.kind === 'drop' ? <img src="/game/room/duck.png" alt="오리" /> : g.kind === 'ice' ? <i className="ice-icon" aria-label="얼음" /> : g.kind === 'foam' ? <i className="foam-icon" aria-label="거품" /> : <img src={IMG[g.kind]} alt="" />}<b>{g.left || '✓'}</b></span>)}</span></div>
      <div className="clean-hero"><Face player={player} mood={mood} size={64} /><b className={`clean-stage-no${STAGES[s.stage].hard ? ' hard' : ''}`}>{s.stage + 1}단계</b>{STAGES[s.stage].hard && <small className="clean-hard-tag">어려움</small>}</div>
      <div className="clean-panel"><small>이동 횟수</small><b className="clean-moves">{s.moves}</b></div>
    </div>
    <div className={`clean-board fx-host${hammer || broom || eraser ? ' aiming' : ''}`} ref={area} role="grid" aria-label="청소 판" onPointerUp={up} onPointerCancel={() => { start.current = null }}>
      {s.board.map((t, i) => t.fix === 'hole' ? <span key={i} className="clean-hole" /> : <button key={i} data-i={i} className={`clean-cell${sel === i ? ' sel' : ''}${flash.has(i) ? ' flash' : ''}${hint?.includes(i) ? ' hint' : ''}`} data-dust={s.dust[i] || undefined} data-sp={t.sp || undefined} data-box={t.fix === 'box' ? t.hp : undefined} data-ice={t.ice || undefined} data-foam={s.foam?.[i] || undefined} aria-label={`${Math.floor(i / N) + 1}행 ${i % N + 1}열${t.fix === 'box' ? ' 상자' : ''}${t.drop ? ' 오리' : ''}${t.ice ? ' 얼음' : ''}${s.foam?.[i] ? ' 거품' : ''}${t.sp ? ` ${SP_LABEL[t.sp]}` : ''}${s.dust[i] ? ` 먼지 ${s.dust[i]}겹` : ''}`} onPointerDown={(e) => down(e, i)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), tap(i))}>
        {t.k >= 0 ? <img src={IMG[t.k]} alt="" draggable="false" /> : t.drop ? <img className="clean-duck" src="/game/room/duck.png" alt="" draggable="false" /> : null}{s.dust[i] > 1 && <i className="dust-badge" aria-hidden="true">{s.dust[i]}</i>}
      </button>)}
    </div>
    <div className="clean-tools">
      {items.hammer ? <button aria-pressed={hammer} disabled={!!s.done} onClick={() => setHammer((h) => !h)} aria-label={`망치: 한 칸 깨기, ${items.hammer}개 남음`}><img src="/game/room/hammer.png" alt="" /><span className="clean-badge">{items.hammer}</span><small>망치</small></button>
        : <button className="buy" disabled={!!s.done || wallet < PRICE.hammer} onClick={() => buy('hammer')} aria-label={`망치 별 ${PRICE.hammer}개로 사기`}><img src="/game/room/hammer.png" alt="" /><small>★ {PRICE.hammer} 사기</small></button>}
      {items.shuffle ? <button disabled={!!s.done} onClick={reshuffle} aria-label={`섞기, ${items.shuffle}개 남음`}><img src="/game/room/shuffle.png" alt="" /><span className="clean-badge">{items.shuffle}</span><small>섞기</small></button>
        : <button className="buy" disabled={!!s.done || wallet < PRICE.shuffle} onClick={() => buy('shuffle')} aria-label={`섞기 별 ${PRICE.shuffle}개로 사기`}><img src="/game/room/shuffle.png" alt="" /><small>★ {PRICE.shuffle} 사기</small></button>}
      <button className="buy" disabled={!!s.done || wallet < PRICE.moves} onClick={buyMoves} aria-label={`이동 ${EXTRA_MOVES}번 더, 별 ${PRICE.moves}개로 사기`}><img src="/game/pieces/clock.png" alt="" /><small>+{EXTRA_MOVES} ★{PRICE.moves}</small></button>
      <button className="buy" aria-pressed={broom === 'row'} disabled={!!s.done || wallet < PRICE.row} onClick={() => { setBroom((b) => (b === 'row' ? false : 'row')); setHammer(false); setEraser(false) }} aria-label={`빗자루: 가로 한 줄 치우기, 별 ${PRICE.row}개`}><img src="/game/room/broom.png" alt="" /><small>가로 ★{PRICE.row}</small></button>
      <button className="buy" aria-pressed={broom === 'col'} disabled={!!s.done || wallet < PRICE.col} onClick={() => { setBroom((b) => (b === 'col' ? false : 'col')); setHammer(false); setEraser(false) }} aria-label={`빗자루: 세로 한 줄 치우기, 별 ${PRICE.col}개`}><img className="rot" src="/game/room/broom.png" alt="" /><small>세로 ★{PRICE.col}</small></button>
      <button className="buy" aria-pressed={eraser} disabled={!!s.done || wallet < PRICE.eraser} onClick={() => { setEraser((b) => !b); setHammer(false); setBroom(false) }} aria-label={`지우개: 한 종류 모두 지우기, 별 ${PRICE.eraser}개`}><img src="/game/room/eraser.png" alt="" /><small>한 색 ★{PRICE.eraser}</small></button>
    </div>
    <p className="clean-purse">가진 별 ★ {wallet}</p>
    {hammer && <p className="clean-aim" role="status">깰 칸을 차례로 누르세요 · 망치 {items.hammer}개 남음 (그만하려면 망치를 다시 눌러요)</p>}
    {eraser && <p className="clean-aim" role="status">지울 종류를 하나 눌러 주세요 (별 {PRICE.eraser}개)</p>}
    {broom && <p className="clean-aim" role="status">치울 {broom === 'col' ? '세로' : '가로'} 줄의 칸을 눌러 주세요 (별 {PRICE[broom]}개)</p>}
    <details key="help" className="clean-all"><summary>블록 설명 보기</summary><ul className="clean-help">
      <li><b>먼지</b> 그 칸에서 맞추기 (숫자 2는 두 번)</li>
      <li><b>상자</b> 옆에서 맞추기</li>
      <li><b>오리</b> 맨 아래 줄까지 내리면 구출</li>
      <li><b>얼음</b> 그 칸에서 맞추면 깨짐 (그 전엔 못 움직임)</li>
      <li><b>거품</b> 그 칸에서 맞추기, 안 닦으면 번짐</li>
      <li><b>4개</b> 로켓 · <b>네모</b> 프로펠러</li>
      <li><b>ㄱ·T</b> 폭탄 · <b>5개</b> 무지개</li>
    </ul></details>
    {tip && !s.done && <div className="game-done clean-tip" role="dialog" aria-label={tip[1]}><i className={tip[0]} /><b>{tip[1]}</b><p>{tip[2]}</p><button className="primary-button clean-play" autoFocus onClick={() => { const n = [...seen, s.stage]; setSeen(n); save({ seen: n }); setTip(null) }}>알겠어요</button></div>}
    {s.done === 'win' && <div className="game-done"><b>{s.stage + 1}단계 깨끗해졌어요! {'★'.repeat((s.stars || 1) * (STAGES[s.stage].hard ? 2 : 1))}{s.gift ? ` · 선물 상자 ★${GIFT}` : ''}{s.streak > 1 ? ` · ${s.streak}연승` : ''}</b><button className="game-level" onClick={() => { setS(null); setSel(null) }}>별 쓰러 집으로</button></div>}
    {s.done === 'lose' && <div className="game-done"><b>이동을 다 썼어요{streak ? ` (지면 ${streak}연승이 끊겨요)` : ''}</b><button className="game-level" disabled={wallet < PRICE.moves} onClick={keepGoing}>이동 +{EXTRA_MOVES} 이어하기 ★{PRICE.moves}</button><button className="game-level" onClick={giveUp}>그만하기</button></div>}
  </div>
}

import { useEffect, useRef, useState } from 'react'
import { N, STAGES, begin, findMove, goals, isFixed, play, shuffle, smash, sweep, erase } from './cleanLogic'
import { burst, buzz, confetti, pop, shake } from './fx'
import './games.css'

const IMG = ['star', 'heart', 'sun', 'clock', 'pencil', 'plant'].map((n) => `/game/pieces/${n}.png`) // 배경 없는 물건 그림
const SP_LABEL = { row: '가로 로켓', col: '세로 로켓', bomb: '폭탄', rainbow: '무지개', prop: '프로펠러' }
const ITEMS = { hammer: 3, shuffle: 1 } // 단계마다 새로 받는 아이템 수
const MOVES_PER_STAR = 4 // 깼을 때 남은 이동 4번마다 별 1개 더
const PRICE = { hammer: 2, shuffle: 1, moves: 3, broom: 4, eraser: 5 } // moves(이동 +5)·broom(한 줄 치우기)은 별로만 살 수 있음
const EXTRA_MOVES = 5 // 다 쓰면 별로 사기
// 이야기: 방마다 할 일 3개, 단계에서 얻은 별을 써서 하나씩 고침
// 방을 다 꾸미면 모든 단계에서 계속 받는 효과
const PERKS = [
  { text: '망치 +1', hammer: 1 }, { text: '이동 +2', moves: 2 }, { text: '섞기 +1', shuffle: 1 }, { text: '이동 +3', moves: 3 },
  { text: '시작할 때 로켓 1개', start: ['row'] }, { text: '시작할 때 폭탄 1개', start: ['bomb'] }, { text: '망치 +1', hammer: 1 },
  { text: '시작할 때 프로펠러 1개', start: ['prop'] }, { text: '이동 +3', moves: 3 }, { text: '섞기 +1', shuffle: 1 }, { text: '시작할 때 로켓 1개 더', start: ['col'] },
  { text: '이동 +2', moves: 2 }, { text: '망치 +1', hammer: 1 }, { text: '시작할 때 폭탄 1개 더', start: ['bomb'] }, { text: '섞기 +1', shuffle: 1 },
  { text: '이동 +3', moves: 3 }, { text: '시작할 때 프로펠러 1개 더', start: ['prop'] }, { text: '망치 +1', hammer: 1 }, { text: '시작할 때 로켓 1개 더', start: ['row'] },
  { text: '이동 +2', moves: 2 }, { text: '섞기 +1', shuffle: 1 }, { text: '망치 +1', hammer: 1 }, { text: '시작할 때 폭탄 1개 더', start: ['bomb'] }, { text: '이동 +3', moves: 3 },
  { text: '시작할 때 로켓 1개 더', start: ['col'] }, { text: '망치 +1', hammer: 1 }, { text: '섞기 +1', shuffle: 1 }, { text: '시작할 때 프로펠러 1개 더', start: ['prop'] }, { text: '이동 +3', moves: 3 },
  { text: '시작할 때 무지개 1개', start: ['rainbow'] },
]
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
const ROOMS = [
  { name: '현관', bg: 'entry', say: '집에 오자마자 현관이 엉망이네! 같이 치워 볼까?', tasks: [['door', '현관문 꾸미기', 1, [50, 54, 30]], ['plant', '화분 놓기', 2, [16, 74, 20]], ['clock', '시계 걸기', 2, [82, 34, 16]]] },
  { name: '거실', bg: 'living', say: '거실에 먼지가 가득해. 가족이 다 같이 쉴 곳을 만들자!', tasks: [['rug', '러그 깔기', 3, [50, 86, 44]], ['lamp', '조명 켜기', 3, [14, 60, 18]], ['frame', '가족 액자 걸기', 4, [54, 34, 26]]] },
  { name: '공부방', bg: 'study', say: '초롱이랑 연두가 공부할 방이야. 깔끔하게 정리해 주자.', tasks: [['window', '창문 달기', 4, [50, 38, 34]], ['pencil', '연필꽂이 정리', 5, [82, 74, 16]], ['heart', '쿠션 놓기', 5, [20, 78, 20]]] },
  { name: '부엌', bg: 'kitchen', say: '배고프다! 부엌을 고쳐서 맛있는 밥을 해 먹자.', tasks: [['stove', '가스레인지 놓기', 5, [22, 70, 26]], ['table', '식탁 차리기', 5, [64, 72, 34]], ['fruit', '과일 바구니', 6, [64, 50, 18]]] },
  { name: '욕실', bg: 'bath', say: '욕실이 미끌미끌해. 깨끗하게 씻을 수 있게 해 줘!', tasks: [['tub', '욕조 놓기', 5, [56, 72, 44]], ['towel', '수건 걸기', 6, [18, 40, 22]], ['duck', '고무 오리', 6, [70, 58, 12]]] },
  { name: '침실', bg: 'bed', say: '오늘 밤엔 푹 자고 싶어. 침실을 포근하게 꾸며 줘.', tasks: [['bedframe', '침대 놓기', 6, [40, 70, 42]], ['closet', '옷장 넣기', 6, [82, 60, 22]], ['starlamp', '별 무드등', 7, [76, 82, 12]]] },
  { name: '마당', bg: 'yard', say: '밖에서도 놀 수 있게 마당을 만들자!', tasks: [['flowers', '꽃밭 가꾸기', 7, [24, 84, 30]], ['swing', '그네 달기', 7, [66, 66, 30]], ['doghouse', '강아지집', 8, [88, 82, 18]]] },
  { name: '놀이방', bg: 'play', say: '장난감이 다 흩어졌어! 신나게 놀 수 있게 정리하자.', tasks: [['blocks', '블록 탑 쌓기', 8, [22, 70, 20]], ['horse', '흔들 목마', 8, [56, 70, 30]], ['toybox', '장난감 상자', 9, [84, 76, 20]]] },
  { name: '세탁실', bg: 'laundry', say: '빨래가 산더미야. 뽀송뽀송하게 만들어 줘!', tasks: [['washer', '세탁기 놓기', 8, [24, 66, 30]], ['basket', '빨래 바구니', 9, [56, 80, 18]], ['dryrack', '건조대 펴기', 9, [80, 66, 26]]] },
  { name: '베란다', bg: 'veranda', say: '햇살 좋은 베란다에서 쉬고 싶어.', tasks: [['shelf', '화분 선반', 9, [20, 66, 26]], ['rocking', '흔들의자', 10, [56, 72, 30]], ['birdcage', '새장 걸기', 10, [84, 36, 16]]] },
  { name: '다락방', bg: 'attic', say: '다락방에 비밀 공간을 만들자! 별도 보일 거야.', tasks: [['starwin', '별 창문', 10, [50, 32, 28]], ['scope', '망원경', 10, [24, 70, 22]], ['chest', '보물 상자', 11, [76, 78, 24]]] },
  { name: '서재', bg: 'library', say: '조용히 책 읽을 곳이 필요해. 서재를 꾸며 보자.', tasks: [['bookcase', '책장 놓기', 11, [22, 60, 28]], ['desk', '책상 놓기', 11, [62, 72, 32]], ['globe', '지구본', 12, [86, 74, 14]]] },
  { name: '옷방', bg: 'dress', say: '옷이 뒤죽박죽이야! 예쁘게 걸어 두자.', tasks: [['mirror', '전신 거울', 11, [18, 60, 18]], ['hanger', '옷걸이 행거', 12, [54, 62, 36]], ['hatbox', '모자 상자', 12, [86, 80, 14]]] },
  { name: '차고', bg: 'garage', say: '아빠 차가 들어갈 자리가 없어. 차고 정리!', tasks: [['car', '자동차 넣기', 12, [46, 74, 46]], ['bike', '자전거 세우기', 12, [86, 72, 22]], ['toolbox', '공구함', 13, [14, 80, 16]]] },
  { name: '옥상', bg: 'roof', say: '옥상에서 별을 보면서 가족 파티를 하자!', tasks: [['garden', '텃밭 가꾸기', 12, [20, 80, 26]], ['parasol', '파라솔 펴기', 13, [56, 64, 34]], ['lights', '별 전구 달기', 13, [50, 20, 42]]] },
  { name: '음악실', bg: 'music', say: '가족 음악회를 열자! 악기를 놓아 볼까?', tasks: [['piano', '피아노 놓기', 14, [26, 66, 40]], ['guitar', '기타 세우기', 14, [66, 66, 16]], ['drum', '북 놓기', 15, [86, 78, 18]]] },
  { name: '온실', bg: 'green', say: '꽃과 채소를 키우는 따뜻한 온실이야.', tasks: [['shelf', '화분 선반', 14, [24, 62, 32]], ['can', '물뿌리개', 14, [56, 82, 14]], ['sunflower', '해바라기 화분', 15, [80, 66, 20]]] },
  { name: '캠핑장', bg: 'camp', say: '오늘 밤은 가족 캠핑! 텐트를 치자.', tasks: [['tent', '텐트 치기', 15, [30, 66, 40]], ['fire', '모닥불 피우기', 15, [64, 80, 18]], ['chair', '캠핑 의자', 16, [86, 78, 18]]] },
  { name: '바닷가', bg: 'beach', say: '바닷가 별장에 놀러 왔어! 쉴 곳을 만들자.', tasks: [['beachchair', '비치 의자', 15, [30, 76, 30]], ['surf', '서핑보드', 16, [70, 62, 14]], ['sandcastle', '모래성 쌓기', 16, [52, 84, 18]]] },
  { name: '수영장', bg: 'pool', say: '더운 날엔 수영이 최고! 수영장을 꾸미자.', tasks: [['tube', '수영 튜브', 16, [24, 80, 22]], ['slide', '미끄럼틀', 16, [72, 62, 30]], ['ball', '비치볼', 17, [48, 82, 14]]] },
  { name: '빵집', bg: 'bakery', say: '고소한 빵 냄새! 우리 가족 빵집을 열자.', tasks: [['oven', '오븐 놓기', 16, [22, 64, 30]], ['bread', '빵 진열대', 17, [62, 66, 36]], ['cakestand', '케이크 스탠드', 17, [88, 76, 14]]] },
  { name: '미술실', bg: 'art', say: '가족 그림 대회를 하자! 미술실을 준비해.', tasks: [['easel', '이젤 세우기', 17, [28, 62, 26]], ['palette', '물감 팔레트', 17, [58, 82, 16]], ['statue', '조각상', 18, [82, 66, 18]]] },
  { name: '우주 방', bg: 'space', say: '별나라 여행을 떠나자! 우주 방을 꾸며 볼까?', tasks: [['telescope', '망원경', 17, [24, 66, 24]], ['rocket', '로켓 모형', 18, [64, 64, 20]], ['planets', '행성 모빌', 18, [50, 20, 40]]] },
  { name: '눈 마당', bg: 'snow', say: '펑펑 눈이 왔어! 겨울 놀이를 하자.', tasks: [['snowman', '눈사람', 18, [26, 68, 24]], ['sled', '썰매', 18, [56, 84, 24]], ['tree', '크리스마스 트리', 19, [80, 60, 24]]] },
  { name: '꽃집', bg: 'flower', say: '꽃을 팔아 볼까? 예쁜 꽃집을 꾸미자.', tasks: [['bucket', '꽃 양동이', 18, [20, 78, 18]], ['bouquet', '꽃다발', 19, [50, 74, 16]], ['cart', '꽃 수레', 19, [76, 66, 32]]] },
  { name: '영화관', bg: 'cinema', say: '온 가족 영화의 밤! 영화관을 만들자.', tasks: [['popcorn', '팝콘 기계', 19, [20, 66, 20]], ['seats', '영화관 의자', 19, [54, 78, 40]], ['projector', '영사기', 20, [84, 70, 16]]] },
  { name: '수족관', bg: 'aqua', say: '물고기 친구들을 만나러 가자!', tasks: [['tank', '어항', 19, [26, 64, 30]], ['coral', '산호', 20, [62, 80, 20]], ['treasure', '보물상자', 20, [86, 82, 16]]] },
  { name: '성', bg: 'castle', say: '오늘은 우리가 왕과 공주! 성을 꾸미자.', tasks: [['throne', '왕좌', 20, [50, 62, 26]], ['crown', '왕관 받침', 20, [20, 74, 14]], ['armor', '기사 갑옷', 21, [82, 64, 16]]] },
  { name: '놀이공원', bg: 'park', say: '마지막 나들이! 놀이공원을 완성하자.', tasks: [['carousel', '회전목마', 21, [34, 62, 40]], ['cotton', '솜사탕 수레', 21, [76, 72, 22]], ['balloons', '풍선', 22, [82, 28, 16]]] },
  { name: '우리집', bg: 'home', say: '마지막이야! 우리집을 반짝반짝하게 완성하자!', tasks: [['garland', '별 장식 달기', 22, [50, 18, 40]], ['bear', '곰인형 앉히기', 22, [24, 72, 22]], ['cake', '집들이 하기', 23, [72, 72, 24]]] },
].map((room, r) => ({ ...room, perk: PERKS[r], tasks: room.tasks.map(([img, name, cost, at], t) => ({ id: `${r}-${t}`, img: `/game/room/${img}.png`, name, cost, at })) }))
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

export default function Clean({ player, onFinish, progress, onProgress }) {
  // 가족 데이터에 저장(폰이 바뀌어도 유지), 예전 폰 저장값은 처음 한 번 가져옴
  const [unlocked, setUnlocked] = useState(() => Math.max(progress?.unlocked || 0, readProgress(player)))
  const [stars, setStars] = useState(() => ({ ...readStars(player), ...progress?.stars }))
  const [done, setDone] = useState(() => progress?.done || [])
  const [extra, setExtra] = useState(() => progress?.extra || {}) // 단계별 남은 이동 보너스 별(최고 기록)
  const [bought, setBought] = useState(() => progress?.bought || 0) // 아이템 사는 데 쓴 별
  const [s, setS] = useState(null)
  const [sel, setSel] = useState(null)
  const [flash, setFlash] = useState(() => new Set())
  const [items, setItems] = useState(ITEMS)
  const [hammer, setHammer] = useState(false)
  const [broom, setBroom] = useState(false)
  const [eraser, setEraser] = useState(false)
  const [hint, setHint] = useState(null)
  const [cheer, setCheer] = useState('')
  const [view, setView] = useState(null) // 고른 방 (없으면 아직 안 끝난 첫 방)
  const [party, setParty] = useState(null) // 방을 다 고치면 축하 화면
  const partyRef = useRef(null)
  useEffect(() => { if (party && partyRef.current) confetti(partyRef.current) }, [party])
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
  const CLEAR_BONUS = 2 // 깰 때마다 받은 별 + 2개 더
  const earned = Object.values(stars).reduce((a, b) => a + b + CLEAR_BONUS, 0) + Object.values(extra).reduce((a, b) => a + b, 0)
  const spent = ROOMS.flatMap((r) => r.tasks).filter((t) => done.includes(t.id)).reduce((a, t) => a + t.cost, 0)
  const wallet = earned - spent - bought
  const save = (next) => { onProgress?.({ unlocked, stars, done, bought, extra, ...next }) }
  const perks = ROOMS.filter((r) => r.tasks.every((t) => done.includes(t.id))).map((r) => r.perk)
  const startStage = (i) => {
    const st = begin(i)
    st.moves += perks.reduce((a, p) => a + (p.moves || 0), 0)
    // 시작 특수 블록: 일반 칸 중 아무 데나
    addStarts(st.board, perks.flatMap((p) => p.start || []))
    setS(st); setItems({ hammer: ITEMS.hammer + perks.reduce((a, p) => a + (p.hammer || 0), 0), shuffle: ITEMS.shuffle + perks.reduce((a, p) => a + (p.shuffle || 0), 0) }); setHammer(false); setBroom(false); setEraser(false); setCheer('')
  }

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
      <div className="clean-talk"><Face player={player} mood={cheer ? 'done' : 'basic'} /><p>{roomIndex < 0 ? '우리집이 다 깨끗해졌어! 단계를 더 깨서 별을 모아 봐.' : cheer || room.say}</p></div>
      <p className="clean-perk">다 꾸미면: <b>{room.perk.text}</b> (모든 단계)</p>
      {perks.length > 0 && <p className="clean-perk">지금 받는 효과: {perkSummary(perks)}</p>}
      <ul className="clean-tasks">{room.tasks.map((t) => { const ok = done.includes(t.id); return <li key={t.id}><img src={t.img} alt="" /><span>{t.name}</span>{ok ? <em>완료</em> : <button disabled={wallet < t.cost} onClick={() => fix(t)} aria-label={`${t.name} 별 ${t.cost}개 쓰기`}>★ {t.cost}</button>}</li> })}</ul>
      {unlocked < STAGES.length && <button className="primary-button clean-play" onClick={() => startStage(unlocked)}>{unlocked + 1}단계 도전하고 별 받기</button>}
      <details className="clean-all"><summary>지난 단계 다시 하기</summary>
        <div className="clean-stages">{STAGES.map((st, i) => <button key={i} className="clean-stage" disabled={i > unlocked} aria-label={`${i + 1}단계${i > unlocked ? ' 잠김' : ''}`} onClick={() => startStage(i)}><b>{i + 1}</b><small className="clean-stars">{i < unlocked ? '★'.repeat(stars[i] || 1).padEnd(3, '☆') : i === unlocked ? '도전' : '잠김'}</small></button>)}</div>
      </details>
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
      else if (['smash', 'box'].includes(e.type)) burst(el, x, y, 10)
      else if (e.type === 'drop') { burst(el, x, y, 16); pop(el, x, y, '오리 구출!', 'gold') }
      if (['row', 'col', 'bomb', 'rainbow', 'prop', 'combo'].includes(e.type)) specialFx(el, e)
    }
    const chain = r.events.filter((e) => e.type === 'chain').at(-1)
    if (chain && el) pop(el, el.clientWidth / 2, el.clientWidth / 2, `연쇄 ×${chain.n}`, 'gold')
    if (chain?.n >= 3) setCheer('우와, 연쇄다!')
    buzz(r.events.length > 6 ? [20, 30, 20] : 12)
    if (r.state.done === 'win') {
      const next = Math.max(unlocked, s.stage + 1)
      const nextStars = { ...stars, [s.stage]: Math.max(stars[s.stage] || 0, r.state.stars || 1) }
      const left = r.events.find((e) => e.type === 'bonus')?.n || 0
      const nextExtra = { ...extra, [s.stage]: Math.max(extra[s.stage] || 0, Math.floor(left / MOVES_PER_STAR)) }
      setExtra(nextExtra); r.state.extra = Math.floor(left / MOVES_PER_STAR)
      setUnlocked(next); setStars(nextStars); save({ unlocked: next, stars: nextStars, extra: nextExtra }); try { localStorage.setItem(progressKey(player), String(next)); localStorage.setItem(starKey(player), JSON.stringify(nextStars)) } catch { /* 진행도 저장 못 해도 게임은 계속 */ }
      const bonus = r.events.find((e) => e.type === 'bonus'); if (bonus?.n && el) pop(el, el.clientWidth / 2, el.clientWidth / 3, `남은 이동 ${bonus.n} → 보너스!`, 'gold')
      if (el) confetti(el)
      onFinish?.({ level: 'normal', score: s.stage + 1, tried: s.stage + 1, win: true })
    } else if (r.state.done === 'lose') onFinish?.({ level: 'normal', score: s.stage, tried: s.stage + 1, win: false })
  }
  const doSwap = (i, j) => {
    setSel(null); setHint(null)
    const r = play(s, i, j)
    if (!r) { shake(area.current?.querySelector(`[data-i="${i}"]`)); buzz(20); return }
    show(r)
  }
  const hitWithHammer = (i) => {
    const r = smash(s, i); setHammer(false); setHint(null)
    if (!r) return
    setItems((it) => ({ ...it, hammer: it.hammer - 1 })); show(r)
  }
  const buy = (kind) => {
    if (wallet < PRICE[kind]) return
    const next = bought + PRICE[kind]; setBought(next); save({ bought: next })
    setItems((it) => ({ ...it, [kind]: it[kind] + 1 }))
    pop(area.current, area.current?.clientWidth / 2, area.current?.clientWidth / 2, `${kind === 'hammer' ? '망치' : '섞기'} +1`, 'gold')
  }
  const sweepRow = (i) => {
    const r = sweep(s, i); setBroom(false); setHint(null)
    if (!r || wallet < PRICE.broom) return
    const next = bought + PRICE.broom; setBought(next); save({ bought: next }); show(r)
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
    if (isFixed(s.board[i])) return
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
      <div className="clean-panel"><small>목표</small><span className="clean-goals" aria-label="목표">{gs.map((g) => <span key={g.kind} className={g.left ? '' : 'done'}>{g.kind === 'dust' ? <i className="dust-icon" aria-label="먼지" /> : g.kind === 'box' ? <i className="box-icon" aria-label="상자" /> : g.kind === 'drop' ? <img src="/game/room/duck.png" alt="오리" /> : <img src={IMG[g.kind]} alt="" />}<b>{g.left || '✓'}</b></span>)}</span></div>
      <div className="clean-hero"><Face player={player} mood={mood} size={64} /><small>{s.stage + 1}단계</small></div>
      <div className="clean-panel"><small>이동 횟수</small><b className="clean-moves">{s.moves}</b></div>
    </div>
    <div className={`clean-board fx-host${hammer || broom || eraser ? ' aiming' : ''}`} ref={area} role="grid" aria-label="청소 판" onPointerUp={up} onPointerCancel={() => { start.current = null }}>
      {s.board.map((t, i) => t.fix === 'hole' ? <span key={i} className="clean-hole" /> : <button key={i} data-i={i} className={`clean-cell${sel === i ? ' sel' : ''}${flash.has(i) ? ' flash' : ''}${hint?.includes(i) ? ' hint' : ''}`} data-dust={s.dust[i] || undefined} data-sp={t.sp || undefined} data-box={t.fix === 'box' ? t.hp : undefined} aria-label={`${Math.floor(i / N) + 1}행 ${i % N + 1}열${t.fix === 'box' ? ' 상자' : ''}${t.drop ? ' 오리' : ''}${t.sp ? ` ${SP_LABEL[t.sp]}` : ''}${s.dust[i] ? ` 먼지 ${s.dust[i]}겹` : ''}`} onPointerDown={(e) => down(e, i)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), tap(i))}>
        {t.k >= 0 ? <img src={IMG[t.k]} alt="" draggable="false" /> : t.drop ? <img className="clean-duck" src="/game/room/duck.png" alt="" draggable="false" /> : null}{s.dust[i] > 1 && <i className="dust-badge" aria-hidden="true">{s.dust[i]}</i>}
      </button>)}
    </div>
    <div className="clean-tools">
      {items.hammer ? <button aria-pressed={hammer} disabled={!!s.done} onClick={() => setHammer((h) => !h)} aria-label={`망치: 한 칸 깨기, ${items.hammer}개 남음`}><img src="/game/room/hammer.png" alt="" /><span className="clean-badge">{items.hammer}</span><small>망치</small></button>
        : <button className="buy" disabled={!!s.done || wallet < PRICE.hammer} onClick={() => buy('hammer')} aria-label={`망치 별 ${PRICE.hammer}개로 사기`}><img src="/game/room/hammer.png" alt="" /><small>★ {PRICE.hammer} 사기</small></button>}
      {items.shuffle ? <button disabled={!!s.done} onClick={reshuffle} aria-label={`섞기, ${items.shuffle}개 남음`}><img src="/game/room/shuffle.png" alt="" /><span className="clean-badge">{items.shuffle}</span><small>섞기</small></button>
        : <button className="buy" disabled={!!s.done || wallet < PRICE.shuffle} onClick={() => buy('shuffle')} aria-label={`섞기 별 ${PRICE.shuffle}개로 사기`}><img src="/game/room/shuffle.png" alt="" /><small>★ {PRICE.shuffle} 사기</small></button>}
      <button className="buy" disabled={!!s.done || wallet < PRICE.moves} onClick={buyMoves} aria-label={`이동 ${EXTRA_MOVES}번 더, 별 ${PRICE.moves}개로 사기`}><img src="/game/pieces/clock.png" alt="" /><small>+{EXTRA_MOVES} ★{PRICE.moves}</small></button>
      <button className="buy" aria-pressed={broom} disabled={!!s.done || wallet < PRICE.broom} onClick={() => { setBroom((b) => !b); setHammer(false); setEraser(false) }} aria-label={`빗자루: 한 줄 치우기, 별 ${PRICE.broom}개`}><img src="/game/room/broom.png" alt="" /><small>한 줄 ★{PRICE.broom}</small></button>
      <button className="buy" aria-pressed={eraser} disabled={!!s.done || wallet < PRICE.eraser} onClick={() => { setEraser((b) => !b); setHammer(false); setBroom(false) }} aria-label={`지우개: 한 종류 모두 지우기, 별 ${PRICE.eraser}개`}><img src="/game/room/eraser.png" alt="" /><small>한 색 ★{PRICE.eraser}</small></button>
    </div>
    <p className="clean-purse">가진 별 ★ {wallet} · 이동 +5·한 줄·한 색은 별로만 살 수 있어요</p>
    {hammer && <p className="clean-aim" role="status">깰 칸을 눌러 주세요 (이동은 줄지 않아요)</p>}
    {eraser && <p className="clean-aim" role="status">지울 종류를 하나 눌러 주세요 (별 {PRICE.eraser}개)</p>}
    {broom && <p className="clean-aim" role="status">치울 줄의 칸을 눌러 주세요 (별 {PRICE.broom}개)</p>}
    <details key="help" className="clean-all"><summary>블록 설명 보기</summary><ul className="clean-help">
      <li><b>먼지</b> 그 칸에서 맞추기 (숫자 2는 두 번)</li>
      <li><b>상자</b> 옆에서 맞추기</li>
      <li><b>오리</b> 맨 아래 줄까지 내리면 구출</li>
      <li><b>4개</b> 로켓 · <b>네모</b> 프로펠러</li>
      <li><b>ㄱ·T</b> 폭탄 · <b>5개</b> 무지개</li>
    </ul></details>
    {s.done && <div className="game-done"><b>{s.done === 'win' ? `${s.stage + 1}단계 깨끗해졌어요! ${'★'.repeat(s.stars || 1)} + 보너스 ★2${s.extra ? ` + 남은 이동 ★${s.extra}` : ''}` : '이동을 다 썼어요'}</b><button className="game-level" onClick={() => { setS(null); setSel(null) }}>{s.done === 'win' ? '별 쓰러 집으로' : '집으로'}</button></div>}
  </div>
}

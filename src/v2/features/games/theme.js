// 게임마다 대청소 방 하나를 골라 배경·물건 그림으로 씀
import { ROOMS, roomGame } from './cleanRooms.js'
export { roomGame }

let homeDone = []
// 놀이 시작할 때 그 사람이 꾸민 물건 목록을 알려 줌
export const setHome = (done) => { homeDone = done || [] }
export const finishedRooms = (done = []) => ROOMS.filter((r) => r.tasks.every((t) => done.includes(t.id)))
export const GAME_NAMES = { catch: '선물 비가 내려요', tap: '두더지 가족 톡톡', sequence: '따라쟁이 챌린지', match: '달콤 3매치', pairs: '짝꿍 카드 찾기', stack: '하늘 끝까지 집 쌓기', merge: '쑥쑥 나무 키우기', clean: '우리집 대청소' }
export const PERK_TEXT = { catch: '처음 20초 큰 바구니', tap: '시간 +6초', sequence: '틀려도 한 번 봐줌 (쉬움은 하트 +1)', match: '이동 +5 (시간 모드 +10초)', pairs: '시작할 때 3초 카드 보기', stack: '첫 층 넓게', merge: '처음 5번 씨앗' }
const gameRooms = (game) => ROOMS.filter((r, k) => roomGame(k) === game)
// 그 게임을 맡은 방 중 다 꾸민 방 수 (효과가 그만큼 커짐)
export const perkLevel = (game, done = homeDone) => gameRooms(game).filter((r) => r.tasks.every((t) => done.includes(t.id))).length
export const nextPerkRoom = (game, done = homeDone) => gameRooms(game).find((r) => r.tasks.some((t) => !done.includes(t.id)))?.name
// 하나라도 꾸민 방이 있으면 그중 하나 (꾸민 물건만 보임), 없으면 아무 방
export const pickRoom = (rand = Math.random) => {
  const started = ROOMS.filter((r) => r.tasks.some((t) => homeDone.includes(t.id))); const list = started.length ? started : ROOMS
  const room = list[Math.floor(rand() * list.length)]
  return { mine: finishedRooms(homeDone).includes(room), things: room.tasks.filter((t) => homeDone.includes(t.id)), name: room.name, bg: `/game/room/${room.bg}.jpg`, imgs: room.tasks.map((t) => t.img), names: room.tasks.map((t) => t.name) }
}
// 여러 방 물건을 섞어 n개 (겹치지 않게)
export const pickObjects = (n, rand = Math.random) => {
  const all = [...new Map(ROOMS.flatMap((r) => r.tasks).map((t) => [t.img, t])).values()]
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [all[i], all[j]] = [all[j], all[i]] }
  all.sort((a, b) => homeDone.includes(b.id) - homeDone.includes(a.id)) // 꾸민 물건 먼저
  const friends = [['bear', '아기곰'], ['cat', '아기 고양이'], ['bunny', '노란 토끼'], ['sing', '아기 인어'], ['knight', '아기 검사']].map(([k, name]) => ({ img: `/friends/${k}.webp`, name }))
  return [...friends.sort(() => rand() - 0.5).slice(0, Math.floor(n / 3)), ...all].slice(0, n).map((t) => ({ img: t.img, name: t.name })) // 친구 캐릭터 몇 장 섞음
}
// 꾸민 물건을 배경 위에 겹쳐 그림 (대청소 방 자리와 대략 같은 곳)
const thing = (t) => { const w = t.at[2] / 100; return `url(${t.img}) ${Math.min(100, t.at[0] / Math.max(0.01, 1 - w))}% ${t.at[1]}% / ${t.at[2]}% auto no-repeat, ` }
export const roomStyle = (room) => ({ '--room': `url(${room.bg})`, '--things': (room.things || []).map(thing).join('') })

// 게임마다 대청소 방 하나를 골라 배경·물건 그림으로 씀
import { ROOMS } from './cleanRooms.js'

let homeDone = []
// 놀이 시작할 때 그 사람이 꾸민 물건 목록을 알려 줌
export const setHome = (done) => { homeDone = done || [] }
export const finishedRooms = (done = []) => ROOMS.filter((r) => r.tasks.every((t) => done.includes(t.id)))
// 방마다 게임 하나를 맡음: 현관→선물 비, 거실→두더지, 공부방→따라쟁이, 부엌→3매치, 욕실→짝꿍, 침실→집 쌓기, 마당→나무 (그 뒤 방도 같은 순서로 돌아감)
export const ROOM_GAMES = ['catch', 'tap', 'sequence', 'match', 'pairs', 'stack', 'merge']
export const PERK_TEXT = { catch: '처음 10초 큰 바구니', tap: '시간 +3초', sequence: '틀려도 한 번 봐줌', match: '이동 +3 (시간 모드 +5초)', pairs: '시작할 때 2초 카드 보기', stack: '첫 층 넓게', merge: '처음 3번 씨앗' }
const gameRooms = (game) => ROOMS.filter((r, k) => k < ROOMS.length - 1 && ROOM_GAMES[k % ROOM_GAMES.length] === game)
// 그 게임을 맡은 방 중 다 꾸민 방 수 (효과가 그만큼 커짐)
export const perkLevel = (game, done = homeDone) => gameRooms(game).filter((r) => r.tasks.every((t) => done.includes(t.id))).length
export const nextPerkRoom = (game, done = homeDone) => gameRooms(game).find((r) => r.tasks.some((t) => !done.includes(t.id)))?.name
// 다 꾸민 방이 있으면 그중 하나, 없으면 아무 방
export const pickRoom = (rand = Math.random) => {
  const mine = finishedRooms(homeDone); const list = mine.length ? mine : ROOMS
  const room = list[Math.floor(rand() * list.length)]
  return { mine: mine.includes(room), name: room.name, bg: `/game/room/${room.bg}.jpg`, imgs: room.tasks.map((t) => t.img), names: room.tasks.map((t) => t.name) }
}
// 여러 방 물건을 섞어 n개 (겹치지 않게)
export const pickObjects = (n, rand = Math.random) => {
  const all = [...new Map(ROOMS.flatMap((r) => r.tasks).map((t) => [t.img, t])).values()]
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [all[i], all[j]] = [all[j], all[i]] }
  all.sort((a, b) => homeDone.includes(b.id) - homeDone.includes(a.id)) // 꾸민 물건 먼저
  return all.slice(0, n).map((t) => ({ img: t.img, name: t.name }))
}
export const roomStyle = (room) => ({ '--room': `url(${room.bg})` })

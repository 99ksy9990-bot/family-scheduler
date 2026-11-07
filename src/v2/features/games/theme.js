// 게임마다 대청소 방 하나를 골라 배경·물건 그림으로 씀
import { ROOMS } from './cleanRooms'

let homeDone = []
// 놀이 시작할 때 그 사람이 꾸민 물건 목록을 알려 줌
export const setHome = (done) => { homeDone = done || [] }
export const finishedRooms = (done = []) => ROOMS.filter((r) => r.tasks.every((t) => done.includes(t.id)))
// 다 꾸민 방이 있으면 그중 하나, 없으면 아무 방
export const pickRoom = (rand = Math.random) => {
  const mine = finishedRooms(homeDone); const list = mine.length ? mine : ROOMS
  const room = list[Math.floor(rand() * list.length)]
  return { name: room.name, bg: `/game/room/${room.bg}.jpg`, imgs: room.tasks.map((t) => t.img), names: room.tasks.map((t) => t.name) }
}
// 여러 방 물건을 섞어 n개 (겹치지 않게)
export const pickObjects = (n, rand = Math.random) => {
  const all = [...new Map(ROOMS.flatMap((r) => r.tasks).map((t) => [t.img, t])).values()]
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [all[i], all[j]] = [all[j], all[i]] }
  return all.slice(0, n).map((t) => ({ img: t.img, name: t.name }))
}
export const roomStyle = (room) => ({ '--room': `url(${room.bg})` })

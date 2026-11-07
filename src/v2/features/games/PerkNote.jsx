import { PERK_TEXT, nextPerkRoom, perkLevel } from './theme'

// 게임 고르는 화면 아래: 지금 받는 방 효과와 다음 효과
export default function PerkNote({ game }) {
  const n = perkLevel(game); const next = nextPerkRoom(game)
  return <p className="perk-note">{n ? <>우리집 효과: <b>{PERK_TEXT[game]}{n > 1 ? ` ×${n}` : ''}</b></> : next ? <>{next}{(next.charCodeAt(next.length - 1) - 0xac00) % 28 ? '을' : '를'} 다 꾸미면: <b>{PERK_TEXT[game]}</b></> : null}</p>
}

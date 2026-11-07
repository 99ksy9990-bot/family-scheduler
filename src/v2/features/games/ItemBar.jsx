import { useState } from 'react'

export const PER_ROUND = 3 // 아이템마다 한 판에 3번까지
// 게임 아래 아이템 줄: 누르면 별을 내고 바로 씀. items: [{ id, name, img, price, use, ok? }]
export default function ItemBar({ shop, items, off }) {
  const [used, setUsed] = useState({})
  return <div className="item-bar">
    {items.map((it) => {
      const n = used[it.id] || 0
      const ok = !off && shop && n < PER_ROUND && shop.wallet >= it.price && (!it.ok || it.ok())
      return <button key={it.id} className="item-btn" disabled={!ok} onClick={() => { if (!ok || !shop.buy(it.price)) return; setUsed((u) => ({ ...u, [it.id]: n + 1 })); it.use() }}>
        <img src={`/game/${it.img}.png`} alt="" /><span>{it.name}</span><small>★{it.price}{n ? ` · ${PER_ROUND - n}번 남음` : ''}</small>
      </button>
    })}
    <span className="item-wallet" aria-label={`별 ${shop?.wallet ?? 0}개`}>★ {shop?.wallet ?? 0}</span>
  </div>
}

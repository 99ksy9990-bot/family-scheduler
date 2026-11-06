import { useState } from 'react'
import { MEMBER_COLORS } from '../../../lib/colors'
import CharacterAvatar from '../../components/CharacterAvatar'
import Sheet from '../../components/Sheet'

const CHARACTERS = ['dad', 'mom', 'big', 'little']

// 구성원 추가: 이름·어른/아이·캐릭터·대표색만. 저장하면 그 사람 화면으로.
export default function AddMember({ state, updateState, onClose }) {
  const used = state.profiles.filter((p) => p.active !== false).map((p) => p.color)
  const [name, setName] = useState('')
  const [type, setType] = useState('child')
  const [characterId, setCharacterId] = useState('little')
  const [color, setColor] = useState(() => (MEMBER_COLORS.find((c) => !used.includes(c.color)) || MEMBER_COLORS[0]).id)
  const submit = (event) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const palette = MEMBER_COLORS.find((c) => c.id === color)
    const id = crypto.randomUUID()
    const profile = { id, name: trimmed, initials: trimmed.slice(0, 1), type, relation: type === 'child' ? '자녀' : trimmed, characterId, active: true, color: palette.color, tone: palette.tone, colorCustomized: true }
    if (updateState((current) => ({ ...current, profiles: [...current.profiles, profile] }))) onClose(id)
  }
  return <Sheet title="구성원 추가" onClose={() => onClose(null)} submitForm="add-member" submitLabel="추가">
    <form id="add-member" className="member-add-form" onSubmit={submit}>
      <ul className="grouped-list"><li className="grouped-row"><input className="member-name wide" placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} required aria-label="이름" /></li></ul>
      <div className="ui-segments" role="group" aria-label="어른 또는 아이">{[['adult', '어른'], ['child', '아이']].map(([v, l]) => <button type="button" key={v} aria-pressed={type === v} onClick={() => setType(v)}>{l}</button>)}</div>
      <h3 className="house-section-title">캐릭터</h3>
      <div className="member-pick big" role="group" aria-label="캐릭터">{CHARACTERS.map((id) => <button type="button" key={id} aria-pressed={characterId === id} aria-label={id} onClick={() => setCharacterId(id)}><CharacterAvatar profile={{ characterId: id }} size={56} /></button>)}</div>
      <h3 className="house-section-title">대표 색</h3>
      <div className="member-pick" role="group" aria-label="대표 색">{MEMBER_COLORS.slice(0, 6).map((c) => <button type="button" key={c.id} className="member-color" style={{ '--swatch': c.color }} aria-pressed={color === c.id} aria-label={`대표색 ${c.id}`} disabled={used.includes(c.color)} onClick={() => setColor(c.id)} />)}</div>
    </form>
  </Sheet>
}

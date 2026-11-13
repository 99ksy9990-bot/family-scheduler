import { useState } from 'react'

// 치이카와 그림은 표정 6가지만 있음 → 나머지 표정은 가까운 것으로
export const MINI = ['chiikawa', 'usagi', 'siren', 'knight']
export const READY = ['dad', 'mom', 'big', 'little', 'chiikawa', 'usagi', 'siren', 'knight'] // 그림 있는 것만 고르기에 보임
const MINI_MOOD = { basic: 'basic', busy: 'busy', mask: 'busy', study: 'busy', worried: 'busy', done: 'done', party: 'party', sleepy: 'sleepy', rest: 'sleepy', sick: 'sick', cold: 'sick' }
export const CHARACTERS = ['dad', 'mom', 'big', 'little', ...MINI]

export default function CharacterAvatar({ profile, expression = 'basic', small = false, size: requestedSize, glass = false }) {
  const [failed, setFailed] = useState(false)
  const known = CHARACTERS.includes(profile.characterId)
  if (MINI.includes(profile.characterId)) expression = MINI_MOOD[expression] || 'basic'
  const size = requestedSize || (small ? 24 : 72)
  return <div className={`character${MINI.includes(profile.characterId) ? ' mini' : ''}${small ? ' character-small' : ''}${requestedSize ? ` character-size-${requestedSize}` : ''}${glass ? ' glass-icon' : ''}`} style={{ ...(profile.colorCustomized ? { '--character-color': profile.color } : {}), ...(requestedSize ? { '--avatar-size': `${size}px` } : {}) }} data-character={profile.characterId || 'unknown'}>
    {known && !failed ? <picture><source srcSet={`/characters/${profile.characterId}_${expression}.webp`} type="image/webp" /><img src={`/characters/${profile.characterId}_${expression}.png`} alt="" onError={() => setFailed(true)} width={size} height={size} /></picture>
      : <span className="character-initial">{profile.name?.slice(0, 1) || '가'}</span>}
  </div>
}

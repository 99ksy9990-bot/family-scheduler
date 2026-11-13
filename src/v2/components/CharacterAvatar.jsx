import { useState } from 'react'

// 치이카와 그림은 표정 6가지만 있음 → 나머지 표정은 가까운 것으로
export const MINI = ['chiikawa', 'usagi', 'siren', 'knight']
export const READY = ['dad', 'mom', 'big', 'little', 'chiikawa', 'usagi', 'siren', 'knight'] // 그림 있는 것만 고르기에 보임
const MINI_MOOD = { basic: 'basic', busy: 'busy', mask: 'busy', study: 'study', worried: 'worried', done: 'done', party: 'party', sleepy: 'sleepy', rest: 'sleepy', sick: 'sick', cold: 'cold', snow: 'cold', windy: 'cold', rain: 'rain', hot: 'hot', dust: 'worried', sunny: 'sunny', cloudy: 'basic' }
// 치이카와 그림을 골라도 원래 역할(아빠·엄마…)은 유지: 색·근무 그림에 씀
const BY_NAME = { 아빠: 'dad', 엄마: 'mom', 초롱: 'big', 연두: 'little' }
export const roleOf = (profile = {}) => !MINI.includes(profile.characterId) ? profile.characterId : profile.baseCharacter || BY_NAME[profile.name] || String(profile.id || '').replace(/^demo-/, '')
// 캐릭터마다 그림 속 크기가 달라서 동그라미 안에서 같은 크기·가운데로 맞춤 [배율, 위아래 이동%]
const FIT = { usagi: [1.12, -4], usagi_old: [1.32, -9], chiikawa: [1.12, -3], siren: [1.08, -2], knight: [1.08, -2] }
const fitOf = (id, mood) => FIT[id === 'usagi' && ['basic', 'busy', 'done', 'sleepy', 'party', 'sick'].includes(mood) ? 'usagi_old' : id] // 우사기 첫 6장은 귀가 길게 그려져 얼굴이 작음
export const CHARACTERS = ['dad', 'mom', 'big', 'little', ...MINI]

export default function CharacterAvatar({ profile, expression = 'basic', small = false, size: requestedSize, glass = false }) {
  const [failed, setFailed] = useState(false)
  const known = CHARACTERS.includes(profile.characterId)
  if (MINI.includes(profile.characterId)) expression = profile.characterId === 'siren' && expression === 'mask' ? 'mask' : profile.characterId === 'siren' && expression === 'study' ? 'busy' : profile.characterId === 'knight' && expression === 'sunny' ? 'basic' : MINI_MOOD[expression] || 'basic'
  const size = requestedSize || (small ? 24 : 72)
  return <div className={`character${MINI.includes(profile.characterId) ? ' mini' : ''}${small ? ' character-small' : ''}${requestedSize ? ` character-size-${requestedSize}` : ''}${glass ? ' glass-icon' : ''}`} style={{ ...(MINI.includes(profile.characterId) && roleOf(profile) ? { '--ring-w': '1.5px', '--ring': profile.colorCustomized ? profile.color : `var(--color-${roleOf(profile)}, #ccc)` } : {}), ...(profile.colorCustomized ? { '--character-color': profile.color } : {}), ...(requestedSize ? { '--avatar-size': `${size}px` } : {}) }} data-character={profile.characterId || 'unknown'}>
    {known && !failed ? <picture><source srcSet={`/characters/${profile.characterId}_${expression}.webp`} type="image/webp" /><img src={`/characters/${profile.characterId}_${expression}.png`} style={fitOf(profile.characterId, expression) ? { transform: `translateY(${fitOf(profile.characterId, expression)[1]}%) scale(${fitOf(profile.characterId, expression)[0]})` } : undefined} alt="" onError={() => setFailed(true)} width={size} height={size} /></picture>
      : <span className="character-initial">{profile.name?.slice(0, 1) || '가'}</span>}
  </div>
}

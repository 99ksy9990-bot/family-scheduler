import { useState } from 'react'

export default function CharacterAvatar({ profile, expression = 'basic', small = false, size: requestedSize }) {
  const [failed, setFailed] = useState(false)
  const known = ['dad', 'mom', 'big', 'little'].includes(profile.characterId)
  const size = requestedSize || (small ? 24 : 72)
  return <div className={`character${small ? ' character-small' : ''}${requestedSize ? ` character-size-${requestedSize}` : ''}`} style={profile.colorCustomized ? { '--character-color': profile.color } : undefined} data-character={profile.characterId || 'unknown'}>
    {known && !failed ? <picture><source srcSet={`/characters/${profile.characterId}_${expression}.webp`} type="image/webp" /><img src={`/characters/${profile.characterId}_${expression}.png`} alt="" onError={() => setFailed(true)} width={size} height={size} /></picture>
      : <span className="character-initial">{profile.name?.slice(0, 1) || '가'}</span>}
  </div>
}

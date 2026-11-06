import { Suspense, useEffect, useState } from 'react'
import Sheet from '../../components/Sheet'
import CharacterAvatar from '../../components/CharacterAvatar'
import { GAMES } from '../games'
import { bestGameLabel, recordGameScore, rankGameScores, unitOf } from '../../data/gameScores'

export default function Play({ state, updateState }) {
  const [selected, setSelected] = useState(null)
  const [player, setPlayer] = useState(null)
  const [message, setMessage] = useState('')
  // 게임이 끝나면 기록 순위로 바로 내려가기
  useEffect(() => { if (message) setTimeout(() => document.querySelector('.game-sheet .game-ranks')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 600) }, [message])
  const game = GAMES.find((item) => item.id === selected)
  const Game = game?.component
  const profiles = state.profiles.filter((profile) => profile.active !== false)
  const finish = (result) => {
    const saved = updateState((current) => ({ ...current, gameScores: recordGameScore(current.gameScores, selected, player, result, new Date()) }))
    setMessage(saved ? '기록을 남겼어요.' : '기록을 저장할 권한이 없어요. 가족 연결을 확인해 주세요.')
  }
  return <section className="play-page" aria-label="가족 놀이"><h2 className="house-section-title">게임</h2><div className="house-grid">{GAMES.map(({ id, name, image }) => <button className="house-tile game-tile" key={id} onClick={() => { setSelected(id); setPlayer(null); setMessage('') }}><span className="glass-icon game-orb"><img src={`/game/${image}.png`} alt="" /></span><strong>{name}</strong><small>{bestGameLabel(state.gameScores, id)}</small></button>)}</div>
    {game && <Sheet title={game.name} onClose={() => setSelected(null)} className="game-sheet">
      {!Game ? <div className="empty-state"><h3>준비 중</h3><p>가족과 함께할 놀이를 준비하고 있어요.</p></div> : !player ? <><h3>누가 해요?</h3><div className="player-options">{profiles.map((profile) => <button key={profile.id} onClick={() => setPlayer(profile.id)}><CharacterAvatar profile={profile} size={56} /><span>{profile.name}</span></button>)}</div>{!profiles.length && <p>가족 탭에서 구성원을 먼저 등록해 주세요.</p>}<GameRanks scores={state.gameScores} gameId={selected} profiles={state.profiles} /></>
        : <><p className="game-player">{profiles.find((profile) => profile.id === player)?.name}의 놀이</p><Suspense fallback={<p role="status">게임을 불러오고 있어요…</p>}><Game player={profiles.find((profile) => profile.id === player)?.characterId || 'dad'} onFinish={finish} /></Suspense>{message && <><p role="status">{message}</p><GameRanks scores={state.gameScores} gameId={selected} profiles={state.profiles} /></>}</>}
    </Sheet>}
  </section>
}

function GameRanks({ scores, gameId, profiles }) {
  const ranks = rankGameScores(scores, gameId)
  if (!ranks.length) return null
  const when = (at) => { const d = new Date(at); return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
  return <section className="game-ranks"><h3>기록</h3><ol className="grouped-list" aria-label="기록 순위">{ranks.map((item, index) => { const profile = profiles.find((p) => p.id === item.member); return <li className="grouped-row" key={`${item.member}-${item.at}-${index}`}><b className="rank-no">{index + 1}</b>{profile && <CharacterAvatar profile={profile} size={32} />}<span className="grouped-body"><strong>{profile?.name || '가족'}</strong><small>{when(item.at)}</small></span><b className="rank-value">{item.value.toLocaleString('ko-KR')}{unitOf(gameId)}</b></li> })}</ol></section>
}

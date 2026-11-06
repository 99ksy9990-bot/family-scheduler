import { Suspense, useRef, useState } from 'react'
import Sheet from '../../components/Sheet'
import CharacterAvatar from '../../components/CharacterAvatar'
import { GAMES } from '../games'
import { bestGameLabel, recordGameScore, rankGameScores, unitOf } from '../../data/gameScores'

export default function Play({ state, updateState }) {
  const [selected, setSelected] = useState(null)
  const [player, setPlayer] = useState(null)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null) // 끝난 판: 결과 화면으로 바로 전환
  const [round, setRound] = useState(0)
  const timer = useRef(0)
  const stop = () => { clearTimeout(timer.current); setResult(null) }
  // 게임이 끝나면 기록 순위로 바로 내려가기
  const game = GAMES.find((item) => item.id === selected)
  const Game = game?.component
  const profiles = state.profiles.filter((profile) => profile.active !== false)
  const finish = (res) => {
    const now = new Date()
    const saved = updateState((current) => ({ ...current, gameScores: recordGameScore(current.gameScores, selected, player, res, now) }))
    setMessage(saved ? '기록을 남겼어요.' : '기록을 저장할 권한이 없어요. 가족 연결을 확인해 주세요.')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setResult({ at: now.toISOString(), res }), 1400) // 끝나는 장면을 잠깐 보여 준 뒤
  }
  return <section className="play-page" aria-label="가족 놀이"><h2 className="house-section-title">게임</h2><div className="house-grid">{GAMES.map(({ id, name, image }) => <button className="house-tile game-tile" key={id} onClick={() => { stop(); setSelected(id); setPlayer(null); setMessage('') }}><span className="glass-icon game-orb"><img src={`/game/${image}.png`} alt="" /></span><strong>{name}</strong><small>{bestGameLabel(state.gameScores, id)}</small></button>)}</div>
    {game && <Sheet title={game.name} onClose={() => { stop(); setSelected(null) }} className="game-sheet">
      {!Game ? <div className="empty-state"><h3>준비 중</h3><p>가족과 함께할 놀이를 준비하고 있어요.</p></div> : !player ? <><h3>누가 해요?</h3><div className="player-options">{profiles.map((profile) => <button key={profile.id} onClick={() => setPlayer(profile.id)}><CharacterAvatar profile={profile} size={56} /><span>{profile.name}</span></button>)}</div>{!profiles.length && <p>가족 탭에서 구성원을 먼저 등록해 주세요.</p>}<GameRanks scores={state.gameScores} gameId={selected} profiles={state.profiles} /></>
        : <><p className="game-player">{profiles.find((profile) => profile.id === player)?.name}의 놀이</p>{result ? <div className="game-result"><p className="game-score-now">이번 기록 <b>{(selected === 'pairs' ? result.res.seconds : selected === 'sequence' ? result.res.stage : result.res.score)?.toLocaleString('ko-KR')}{unitOf(selected)}</b></p><p role="status" className="quiet">{message}</p><GameRanks scores={state.gameScores} gameId={selected} profiles={state.profiles} highlight={result.at} /><div className="game-result-actions"><button className="primary-button" onClick={() => { setResult(null); setRound((n) => n + 1) }}>다시 하기</button><button onClick={() => { setResult(null); setPlayer(null) }}>다른 사람</button></div></div>
          : <Suspense fallback={<p role="status">게임을 불러오고 있어요…</p>}><Game key={round} player={profiles.find((profile) => profile.id === player)?.characterId || 'dad'} onFinish={finish} /></Suspense>}{!result && message && <p role="status">{message}</p>}</>}
    </Sheet>}
  </section>
}

function GameRanks({ scores, gameId, profiles, highlight }) {
  const ranks = rankGameScores(scores, gameId)
  if (!ranks.length) return null
  const when = (at) => { const d = new Date(at); return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
  return <section className="game-ranks"><h3>기록</h3><ol className="grouped-list" aria-label="기록 순위">{ranks.map((item, index) => { const profile = profiles.find((p) => p.id === item.member); return <li className={`grouped-row${item.at === highlight ? ' is-new' : ''}`} key={`${item.member}-${item.at}-${index}`}><b className="rank-no">{index + 1}</b>{profile && <CharacterAvatar profile={profile} size={32} />}<span className="grouped-body"><strong>{profile?.name || '가족'}{item.at === highlight && <em className="rank-new">방금</em>}</strong><small>{when(item.at)}</small></span><b className="rank-value">{item.value.toLocaleString('ko-KR')}{unitOf(gameId)}</b></li> })}</ol></section>
}

import { Suspense, useEffect, useRef, useState } from 'react'
import Sheet from '../../components/Sheet'
import CharacterAvatar from '../../components/CharacterAvatar'
import { GAMES, HOME } from '../games'
import { mergeProgress } from '../../data/cleanProgress'
import { getMe } from '../../data/me'
import { finishedRooms, pickRoom, roomStyle, setHome } from '../games/theme'
import { earnStar, firstPlayBonus, homeBonus, spendStars, walletOf, DAILY, dailyGame } from '../games/wallet'
import PerkNote from '../games/PerkNote'
import { isMusicOn, isSoundOn, playMusic, setMusic, setSfx, setSound, stopMusic } from '../games/fx'

// 효과음·음악 켜고 끄기 (놀이 제목 줄 오른쪽)
export function SoundToggles() {
  const [sound, setSoundState] = useState(isSoundOn)
  const [music, setMusicState] = useState(isMusicOn)
  return <div className="sound-toggles"><button className="sound-toggle" aria-pressed={sound} aria-label={sound ? '효과음 켜짐' : '효과음 꺼짐'} title="효과음" onClick={() => { setSound(!sound); setSoundState(!sound) }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />{sound ? <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" /> : <path d="M16.5 9.5l5 5m0-5l-5 5" />}</svg></button><button className="sound-toggle" aria-pressed={music} aria-label={music ? '음악 켜짐' : '음악 꺼짐'} title="음악" onClick={() => { setMusic(!music); setMusicState(!music) }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l11-2v12" /><circle cx="6.5" cy="18" r="2.5" fill="currentColor" /><circle cx="17.5" cy="16" r="2.5" fill="currentColor" />{!music && <path d="M3 3l18 18" />}</svg></button></div>
}
import { weeklyLeader, weeklyCleanLeader, weekWinner, cleanWeekWinner, mondayKey, lastMonday, bestGameLabel, recordGameScore, rankGameScores, unitOf } from '../../data/gameScores'

const CROWN_STARS = 3
// 이번 주·지난주 게임별 1등
function CrownBoard({ state }) {
  const now = new Date()
  const row = (key) => GAMES.map(({ id, name }) => { const w = id === 'clean' ? cleanWeekWinner(state.cleanProgress, key) : weekWinner(state.gameScores, id, key); return { id, name, w, p: w && state.profiles.find((x) => x.id === w.member) } })
  const list = (key) => <ul className="crown-list">{row(key).map(({ id, name, w, p }) => <li key={id}><span>{name}</span>{p ? <span className="crown-who"><CharacterAvatar profile={p} size={28} />{p.name} <small>{id === 'clean' ? `${w.value}단계` : `${w.value.toLocaleString('ko-KR')}${unitOf(id)}`}</small></span> : <small>아직 없음</small>}</li>)}</ul>
  return <details className="crown-board"><summary>이번 주 왕관 순위 <small>월요일마다 새로 · 지난주 1등은 왕관마다 별 {CROWN_STARS}개</small></summary><h3>이번 주</h3>{list(mondayKey(now))}<h3>지난주</h3>{list(lastMonday(now))}</details>
}

export default function Play({ state, updateState }) {
  const [selected, setSelected] = useState(null)
  const [player, setPlayer] = useState(null)
  const me = getMe()
  const mine = state.profiles.some((p) => p.id === me && p.active !== false) ? me : null // 이 폰 주인이 정해져 있으면 고르기 없이 그 사람
  const choose = (id, game) => {
    setGo(false); setPlayer(id)
    if (!id) return
    setSfx(game); setHome(state.cleanProgress?.[id]?.done); if (!['clean', 'home'].includes(game)) playMusic(game)
  }
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null) // 끝난 판: 결과 화면으로 바로 전환
  const [round, setRound] = useState(0)
  useEffect(() => stopMusic, []) // 놀이 탭을 떠나면 음악 끔
  // 지난주 왕관 하나마다 별 3개 (월요일 이후 처음 들어올 때 한 번)
  useEffect(() => {
    if (!mine) return
    const now = new Date(), key = lastMonday(now), mon = mondayKey(now)
    const n = GAMES.filter(({ id }) => (id === 'clean' ? cleanWeekWinner(state.cleanProgress, key) : weekWinner(state.gameScores, id, key))?.member === mine).length
    const p = state.cleanProgress?.[mine] || {}
    if (!n || p.crownMon === mon) return
    if (updateState((current) => { const q = current.cleanProgress?.[mine] || {}; return q.crownMon === mon ? current : { ...current, cleanProgress: { ...current.cleanProgress, [mine]: { ...q, bonus: (q.bonus || 0) + CROWN_STARS * n, crownMon: mon } } } })) setMessage(`지난주 왕관 ${n}개! 별 ${CROWN_STARS * n}개를 받았어요.`) // eslint-disable-line react-hooks/set-state-in-effect
  }, [mine]) // eslint-disable-line react-hooks/exhaustive-deps
  const [go, setGo] = useState(false) // 대청소: 다음 단계 바로 시작
  const timer = useRef(0)
  const stop = () => { clearTimeout(timer.current); setResult(null) }
  // 게임이 끝나면 기록 순위로 바로 내려가기
  const game = [HOME, ...GAMES].find((item) => item.id === selected)
  const Game = game?.component
  const profiles = state.profiles.filter((profile) => profile.active !== false)
  // 별 지갑: 아이템을 사면 별을 바로 씀
  const shop = player && { wallet: walletOf(state.cleanProgress?.[player]), free: finishedRooms(state.cleanProgress?.[player]?.done).length, buy: (n) => updateState((current) => (walletOf(current.cleanProgress?.[player]) < n ? current : { ...current, cleanProgress: { ...current.cleanProgress, [player]: spendStars(current.cleanProgress?.[player] || {}, n) } })) }
  const finish = (res) => {
    const now = new Date()
    let got = 0, first = 0
    const saved = updateState((current) => {
      const next = { ...current, gameScores: recordGameScore(current.gameScores, selected, player, res, now) }
      // 게임마다 하루 첫 판은 점수와 상관없이 별 (해 주면 고마워서)
      const f = firstPlayBonus(current.cleanProgress?.[player] || {}, selected, now); first = f.got
      const withFirst = f.got ? { ...next, cleanProgress: { ...current.cleanProgress, [player]: f.progress } } : next
      if (selected === 'clean' || !((res.score ?? res.stage ?? 1) > 0)) return withFirst // 0점 판은 보통 별 없음
      // 다른 게임도 한 판 끝내면 별 1개 (게임마다 하루 DAILY개까지), 대청소 별과 같은 지갑
      const r = earnStar(f.progress, selected, now); got = r.got
      return r.got ? { ...next, cleanProgress: { ...current.cleanProgress, [player]: r.progress } } : withFirst
    })
    const thanks = first ? `오늘 첫 판 고마워요! 별 ${first}개. ` : ''
    setMessage(!saved ? '기록을 저장할 권한이 없어요. 가족 연결을 확인해 주세요.' : thanks + (selected === 'clean' ? '' : !((res.score ?? res.stage ?? 1) > 0) ? '1점 이상이면 별을 받아요' : got ? `별 ${got}개를 받았어요${got > 1 ? ' (오늘의 게임 2배)' : ''}. 방 꾸미기에 쓸 수 있어요.` : `오늘 이 게임 별은 다 받았어요 (하루 ${DAILY + homeBonus(state.cleanProgress?.[player])}개)`))
    clearTimeout(timer.current)
    if (selected === 'clean') return // 대청소는 자기 깨끗해졌어요 화면을 그대로 보여 줌 (결과 화면으로 넘기지 않음)
    timer.current = setTimeout(() => setResult({ at: now.toISOString(), res, room: pickRoom() }), 1400) // 끝나는 장면을 잠깐 보여 준 뒤
  }
  return <section className="play-page" aria-label="가족 놀이"><div className="play-head"><h2 className="house-section-title">게임</h2><img className="play-sing" src="/friends/sing.webp" alt="" width={56} height={56} /></div><button className="home-tile" onClick={() => { stop(); setGo(false); setSelected('home'); choose(mine, 'home'); setMessage('') }}><img src="/game/icons/home.png" alt="" /><span><b>우리집 꾸미기</b><small>모은 별로 방을 꾸며요</small>{profiles.length > 0 && <em className="home-stats" aria-label={profiles.map((p) => `${p.name} 별 ${walletOf(state.cleanProgress?.[p.id])}개 방 ${finishedRooms(state.cleanProgress?.[p.id]?.done).length}개`).join(', ')}><span className="home-faces">{profiles.map((p) => <CharacterAvatar key={p.id} profile={p} size={24} />)}</span>★ {profiles.reduce((n, p) => n + walletOf(state.cleanProgress?.[p.id]), 0)} · 방 {profiles.reduce((n, p) => n + finishedRooms(state.cleanProgress?.[p.id]?.done).length, 0)}개</em>}</span></button><div className="house-grid">{GAMES.map(({ id, name, image }) => <button className="house-tile game-tile" key={id} onClick={() => { stop(); setGo(false); setSelected(id); choose(mine, id); setMessage('') }}><img className="game-icon" src={`/game/${image}.png`} alt="" width="60" height="60" />{id === dailyGame() && <span className="game-today">오늘 별 2배</span>}{(() => { const top = state.profiles.find((p) => p.id === (id === 'clean' ? weeklyCleanLeader(state.cleanProgress) : weeklyLeader(state.gameScores, id))); return top && <span className="game-leader" aria-hidden="true"><CharacterAvatar profile={top} size={36} /><img className="game-crown" src="/game/crown.png" alt="" /></span> })()}<strong>{name}</strong><small>{id === 'clean' ? cleanLeader(state.cleanProgress, state.profiles) : bestGameLabel(state.gameScores, id, state.profiles)}</small></button>)}</div><CrownBoard state={state} />
    {game && <Sheet title={game.name} onClose={() => { stop(); stopMusic(); setSelected(null) }} className="game-sheet">
      {!Game ? <div className="empty-state"><h3>준비 중</h3><p>가족과 함께할 놀이를 준비하고 있어요.</p></div> : !player ? <><h3>누가 해요?</h3><div className="player-options">{profiles.map((profile) => <button key={profile.id} onClick={() => choose(profile.id, selected)}><CharacterAvatar profile={profile} size={56} /><span>{profile.name}</span></button>)}</div>{!profiles.length && <p>가족 탭에서 구성원을 먼저 등록해 주세요.</p>}<GameRanks scores={state.gameScores} gameId={selected} profiles={state.profiles} /></>
        : <><p className="game-player">{profiles.find((profile) => profile.id === player)?.name}의 놀이</p>{!result && !['clean', 'home'].includes(selected) && <PerkNote game={selected} />}{result ? <div className="game-result"><div className="result-hero room-bg" style={roomStyle(result.room)}><CharacterAvatar profile={profiles.find((profile) => profile.id === player) || {}} expression={selected !== 'clean' || result.res.win ? 'done' : 'busy'} size={96} /></div>{selected === 'clean' && result.res.tried ? <p className="game-score-now">{result.res.tried}단계 <b>{result.res.win ? '성공!' : '실패'}</b>{!result.res.win && <small> 깬 단계 {result.res.score}단계로 기록</small>}</p> : <p className="game-score-now">이번 기록 <b>{(selected === 'pairs' ? result.res.seconds : selected === 'sequence' ? result.res.stage : result.res.score)?.toLocaleString('ko-KR')}{unitOf(selected)}</b></p>}<p role="status" className="quiet">{message}</p>{selected === 'clean' ? <CleanRanks progress={state.cleanProgress} profiles={state.profiles} me={player} /> : <GameRanks scores={state.gameScores} gameId={selected} profiles={state.profiles} highlight={result.at} />}<div className="game-result-actions">{selected === 'clean' ? <><button className="primary-button" onClick={() => { setGo(true); setResult(null); setRound((n) => n + 1) }}>{result.res.win ? `${result.res.tried + 1}단계 도전` : `${result.res.tried}단계 다시 도전`}</button><button onClick={() => { setGo(false); setResult(null); setRound((n) => n + 1) }}>방 꾸미기</button></> : <button className="primary-button" onClick={() => { setResult(null); setRound((n) => n + 1) }}>다시 하기</button>}<button onClick={() => { setGo(false); setResult(null); setPlayer(null) }}>다른 사람</button>{selected !== 'clean' && <button onClick={() => { stop(); setSelected('home'); setRound((n) => n + 1) }}>우리집 꾸미러 가기</button>}</div></div>
          : <Suspense fallback={<p role="status">게임을 불러오고 있어요…</p>}><Game key={round} autoStart={selected === 'clean' && go} player={profiles.find((profile) => profile.id === player)?.characterId || 'dad'} onFinish={finish} shop={shop} progress={state.cleanProgress?.[player]} onProgress={(value) => updateState((current) => ({ ...current, cleanProgress: { ...current.cleanProgress, [player]: mergeProgress(current.cleanProgress?.[player], value) } }))} /></Suspense>}{!result && message && <p role="status">{message}</p>}</>}
    </Sheet>}
  </section>
}

function GameRanks({ scores, gameId, profiles, highlight }) {
  const ranks = rankGameScores(scores, gameId)
  if (!ranks.length) return null
  const when = (at) => { const d = new Date(at); return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
  return <section className="game-ranks"><h3>가족 순위</h3><ol className="grouped-list" aria-label="가족 순위">{ranks.map((item, index) => { const profile = profiles.find((p) => p.id === item.member); return <li className={`grouped-row${item.at === highlight ? ' is-new' : ''}`} key={`${item.member}-${item.at}-${index}`}><b className="rank-no">{index + 1}</b>{profile && <CharacterAvatar profile={profile} size={40} />}<span className="grouped-body"><strong>{profile?.name || '가족'}{item.at === highlight && <em className="rank-new">방금</em>}</strong><small>{when(item.at)}</small></span><b className="rank-value">{item.value.toLocaleString('ko-KR')}{unitOf(gameId)}</b></li> })}</ol></section>
}

// 대청소는 한 판 기록 대신 가족 순위: 깬 단계 → 꾸민 물건 순
const cleanRows = (progress = {}, profiles) => Object.entries(progress || {}).map(([member, p]) => ({ member, profile: profiles.find((x) => x.id === member), stage: p?.unlocked || 0, things: p?.done?.length || 0 }))
  .filter((r) => r.profile && r.stage).sort((a, b) => b.stage - a.stage || b.things - a.things)
function cleanLeader(progress, profiles) {
  const top = cleanRows(progress, profiles)[0]
  return top ? `${top.profile.name} ${top.stage}단계` : '기록 없음'
}
function CleanRanks({ progress, profiles, me }) {
  const rows = cleanRows(progress, profiles)
  if (!rows.length) return null
  return <section className="game-ranks"><h3>가족 순위</h3><ol className="grouped-list" aria-label="가족 순위">{rows.map((r, index) => <li className={`grouped-row${r.member === me ? ' is-new' : ''}`} key={r.member}><b className="rank-no">{index + 1}</b><CharacterAvatar profile={r.profile} size={40} /><span className="grouped-body"><strong>{r.profile.name}{r.member === me && <em className="rank-new">나</em>}</strong><small>꾸민 물건 {r.things}개</small></span><b className="rank-value">{r.stage}단계</b></li>)}</ol></section>
}

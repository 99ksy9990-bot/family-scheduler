import { encodeConnect } from '../../data/connectLink'
import CharacterAvatar from '../../components/CharacterAvatar'
import { useState } from 'react'

const statusLabels = { local: '아직 가족방에 연결되지 않았어요. 로그인하면 가족 일정을 불러올 수 있어요.', connecting: '가족 연결 중', saving: '저장 중', synced: '가족과 동기화됨', readonly: '보기 전용', offline: '오프라인', conflict: '변경 충돌', error: '연결 확인 필요' }

// 우리 가족 네 명 중에서 고르기 (가족 탭에 등록한 구성원, 없으면 기본 네 명)
const FAMILY = [['아빠', 'dad', 'adult'], ['엄마', 'mom', 'adult'], ['초롱', 'big', 'child'], ['연두', 'little', 'child']].map(([name, characterId, type]) => ({ id: characterId, name, characterId, type }))

export default function Connection({ sync, state, updateState, canEdit }) {
  const listed = state.profiles.filter((p) => p.active !== false)
  const whoList = listed.length ? listed : FAMILY
  const [mode, setMode] = useState('signin')
  const [familyMode, setFamilyMode] = useState('join')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  // 로그인 전에 받은 초대 코드를 적어 두면, 로그인 뒤 참여 칸에 미리 채움 (이메일 확인 후 돌아와도 유지)
  const [pendingCode, setPendingCode] = useState(() => { try { return localStorage.getItem('family-scheduler-pending-invite') || '' } catch { return '' } })
  const keepCode = (value) => { const code = value.trim().toUpperCase(); setPendingCode(code); try { if (code) localStorage.setItem('family-scheduler-pending-invite', code); else localStorage.removeItem('family-scheduler-pending-invite') } catch { /* 저장 못 해도 이번 화면에서는 유지 */ } }
  const run = async (action) => {
    setBusy(true); setMessage(''); setFailed(false)
    try {
      if (!sync.enabled) throw new Error('가족 연결 설정이 없는 미리보기예요. 연결 설정 후 다시 시도해 주세요.')
      const result = await action()
      setMessage(typeof result === 'string' ? result : '요청을 처리했어요.')
    } catch (error) { setFailed(true); setMessage(error.message || '연결하지 못했어요. 다시 확인해 주세요.') }
    finally { setBusy(false) }
  }
  const authenticate = (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    keepCode(data.get('inviteCode') || '')
    if (mode === 'code') { const who = whoList.find((p) => p.name === data.get('who')); run(() => sync.joinWithCode({ inviteCode: String(data.get('inviteCode')).trim().toUpperCase(), displayName: who.name, memberRole: who.type === 'child' ? 'child' : 'parent' })); return }
    run(() => mode === 'signin' ? sync.signIn(data.get('email').trim(), data.get('password')) : sync.signUp(data.get('email').trim(), data.get('password')))
  }
  const connect = (event) => {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    run(() => familyMode === 'create' ? sync.createFamily(data) : sync.joinFamily({ ...data, inviteCode: data.inviteCode.trim().toUpperCase() }).then((r) => { keepCode(''); return r }))
  }
  const owner = sync.session?.user.id === sync.family?.household.owner_id
  return <div className="settings-content">
    <p className="connection-state" role="status">{statusLabels[sync.syncStatus] || '연결 상태 확인 중'}{sync.family ? ` · ${sync.family.household.name}` : ''}</p>
    <p>같은 가족 계정으로 로그인하면 저장된 가족 일정을 불러와요. 가족 폰은 관리자 폰에서 보낸 '연결 링크'를 누르면 바로 들어와요.</p>
    {sync.error && <p className="error" role="alert">{sync.error}</p>}
    {!sync.session ? <><div className="segmented"><button aria-pressed={mode === 'signin'} onClick={() => setMode('signin')}>로그인</button><button aria-pressed={mode === 'signup'} onClick={() => setMode('signup')}>회원가입</button></div>
      <form className="event-form" onSubmit={authenticate}>{mode === 'code' ? <><label>초대 코드<input name="inviteCode" defaultValue={pendingCode} required minLength={8} maxLength={8} autoCapitalize="characters" placeholder="8자리" /></label><fieldset className="who-pick"><legend>나는 누구예요?</legend>{whoList.map((p) => <label key={p.name} className="who-option"><input type="radio" name="who" value={p.name} required /><CharacterAvatar profile={p} size={52} /><span>{p.name}</span></label>)}</fieldset><button className="primary-button" disabled={busy}>{busy ? '들어가는 중…' : '가족방 들어가기'}</button><p className="quiet">이 기기에서만 로그인돼요. 앱을 지우거나 다른 폰에서는 코드를 다시 넣으면 돼요.</p></> : <><label>이메일<input name="email" type="email" autoComplete="email" required /></label><label>비밀번호<input name="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={6} /></label><label>초대 코드<input name="inviteCode" defaultValue={pendingCode} placeholder="있으면 입력 (8자리)" maxLength={8} autoCapitalize="characters" /></label><button className="primary-button" disabled={busy}>{busy ? '처리 중…' : mode === 'signin' ? '로그인' : '회원가입'}</button></>}</form></>
      : !sync.family ? <><p>로그인됨: {sync.session.user.email}</p><div className="segmented"><button aria-pressed={familyMode === 'join'} onClick={() => setFamilyMode('join')}>초대 코드로 참여</button><button aria-pressed={familyMode === 'create'} onClick={() => setFamilyMode('create')}>가족 만들기</button></div>
        <form className="event-form" onSubmit={connect}>{familyMode === 'create' ? <label>가족방 이름<input name="householdName" defaultValue="우리 가족" required /></label> : <label>초대 코드<input name="inviteCode" defaultValue={pendingCode} required minLength={8} maxLength={8} autoCapitalize="characters" /></label>}<label>내 이름<input name="displayName" required /></label><label>역할<select name="memberRole"><option value="parent">부모</option><option value="child">자녀</option></select></label><button disabled={busy} className="primary-button">연결하기</button></form></>
        : <><div className="data-message"><p>초대 코드 <strong>{sync.family.household.invite_code}</strong></p><button disabled={busy} onClick={() => run(async () => { await navigator.clipboard.writeText(sync.family.household.invite_code); return '초대 코드를 복사했어요.' })}>코드 복사</button></div>
          {owner && <section className="child-link"><h3>가족 폰 연결 링크</h3><p className="quiet">링크를 카톡으로 보내면 그 폰이 이 계정으로 바로 로그인돼요. 링크에는 로그인 정보가 들어 있으니 가족에게만 보내세요.</p>
            <form className="event-form" onSubmit={(event) => { event.preventDefault(); const pw = new FormData(event.currentTarget).get('confirmPassword'); run(async () => { await sync.signIn(sync.session.user.email, pw); const link = `${window.location.origin}/#connect=${encodeConnect(sync.session.user.email, pw)}`; if (navigator.share) { try { await navigator.share({ title: '우리집 연결', text: '우리집 앱 연결 링크예요', url: link }); return '링크를 보냈어요.' } catch { /* 공유 취소 시 복사로 */ } } await navigator.clipboard.writeText(link); return '링크를 복사했어요. 카톡에 붙여 넣어 보내세요.' }) }}><label>비밀번호 확인<input name="confirmPassword" type="password" autoComplete="current-password" required /></label><button className="primary-button" disabled={busy}>링크 만들어 보내기</button></form></section>}
          <h3>연결된 가족과 권한</h3>{sync.family.members.map((member) => <article className="settings-card" key={member.user_id}><strong>{member.display_name}</strong><p>{member.can_edit ? '편집 가능' : '보기 전용'}</p>{owner && member.user_id !== sync.session.user.id && <button disabled={busy} onClick={() => run(() => sync.updatePermission(member.user_id, !member.can_edit))}>{member.can_edit ? '보기 전용으로 변경' : '편집 허용'}</button>}<label>일정 프로필 연결<select disabled={!canEdit} value={state.profileLinks?.[member.user_id] || ''} onChange={(event) => updateState((current) => ({ ...current, profileLinks: { ...current.profileLinks, [member.user_id]: event.target.value } }))}><option value="">연결 안 함</option>{state.profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name}</option>)}</select></label></article>)}</>}
    {sync.conflict && <div role="alert" className="settings-card"><p>다른 기기에서 같은 내용을 바꿨어요. 유지할 내용을 선택해 주세요.</p><button disabled={busy} onClick={() => run(sync.acceptRemote)}>가족 서버 내용 사용</button>{canEdit && <button disabled={busy} onClick={() => run(sync.keepLocal)}>이 기기 내용 사용</button>}</div>}
    {sync.remoteChange && <p role="status">다른 가족이 일정을 업데이트했어요.</p>}
    {sync.session && <button disabled={busy} onClick={() => run(sync.signOut)}>로그아웃</button>}
    {message && <p className={failed ? 'error' : ''} role={failed ? 'alert' : 'status'}>{message}</p>}
  </div>
}

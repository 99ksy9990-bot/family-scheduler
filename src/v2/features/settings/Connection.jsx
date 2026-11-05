import { useState } from 'react'

const statusLabels = { local: '아직 가족방에 연결되지 않았어요. 로그인하면 가족 일정을 불러올 수 있어요.', connecting: '가족 연결 중', saving: '저장 중', synced: '가족과 동기화됨', readonly: '보기 전용', offline: '오프라인', conflict: '변경 충돌', error: '연결 확인 필요' }

export default function Connection({ sync, state, updateState, canEdit }) {
  const [mode, setMode] = useState('signin')
  const [familyMode, setFamilyMode] = useState('join')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
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
    run(() => mode === 'signin' ? sync.signIn(data.get('email').trim(), data.get('password')) : sync.signUp(data.get('email').trim(), data.get('password')))
  }
  const connect = (event) => {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    run(() => familyMode === 'create' ? sync.createFamily(data) : sync.joinFamily({ ...data, inviteCode: data.inviteCode.trim().toUpperCase() }))
  }
  const owner = sync.session?.user.id === sync.family?.household.owner_id
  return <div className="settings-content">
    <p className="connection-state" role="status">{statusLabels[sync.syncStatus] || '연결 상태 확인 중'}{sync.family ? ` · ${sync.family.household.name}` : ''}</p>
    <p>같은 가족 계정으로 로그인하면 저장된 가족 일정을 불러와요. 새로 참여하면 기본적으로 보기 전용이에요.</p>
    {sync.error && <p className="error" role="alert">{sync.error}</p>}
    {!sync.session ? <><div className="segmented"><button aria-pressed={mode === 'signin'} onClick={() => setMode('signin')}>로그인</button><button aria-pressed={mode === 'signup'} onClick={() => setMode('signup')}>회원가입</button></div>
      <form className="event-form" onSubmit={authenticate}><label>이메일<input name="email" type="email" autoComplete="email" required /></label><label>비밀번호<input name="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={6} /></label><button className="primary-button" disabled={busy}>{busy ? '처리 중…' : mode === 'signin' ? '로그인' : '회원가입'}</button></form></>
      : !sync.family ? <><p>로그인됨: {sync.session.user.email}</p><div className="segmented"><button aria-pressed={familyMode === 'join'} onClick={() => setFamilyMode('join')}>초대 코드로 참여</button><button aria-pressed={familyMode === 'create'} onClick={() => setFamilyMode('create')}>가족 만들기</button></div>
        <form className="event-form" onSubmit={connect}>{familyMode === 'create' ? <label>가족방 이름<input name="householdName" defaultValue="우리 가족" required /></label> : <label>초대 코드<input name="inviteCode" required minLength={8} maxLength={8} autoCapitalize="characters" /></label>}<label>내 이름<input name="displayName" required /></label><label>역할<select name="memberRole"><option value="parent">부모</option><option value="child">자녀</option></select></label><button disabled={busy} className="primary-button">연결하기</button></form></>
        : <><div className="data-message"><p>초대 코드 <strong>{sync.family.household.invite_code}</strong></p><button disabled={busy} onClick={() => run(async () => { await navigator.clipboard.writeText(sync.family.household.invite_code); return '초대 코드를 복사했어요.' })}>코드 복사</button></div>
          <h3>연결된 가족과 권한</h3>{sync.family.members.map((member) => <article className="settings-card" key={member.user_id}><strong>{member.display_name}</strong><p>{member.can_edit ? '편집 가능' : '보기 전용'}</p>{owner && member.user_id !== sync.session.user.id && <button disabled={busy} onClick={() => run(() => sync.updatePermission(member.user_id, !member.can_edit))}>{member.can_edit ? '보기 전용으로 변경' : '편집 허용'}</button>}<label>일정 프로필 연결<select disabled={!canEdit} value={state.profileLinks?.[member.user_id] || ''} onChange={(event) => updateState((current) => ({ ...current, profileLinks: { ...current.profileLinks, [member.user_id]: event.target.value } }))}><option value="">연결 안 함</option>{state.profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name}</option>)}</select></label></article>)}</>}
    {sync.conflict && <div role="alert" className="settings-card"><p>다른 기기에서 같은 내용을 바꿨어요. 유지할 내용을 선택해 주세요.</p><button disabled={busy} onClick={() => run(sync.acceptRemote)}>가족 서버 내용 사용</button>{canEdit && <button disabled={busy} onClick={() => run(sync.keepLocal)}>이 기기 내용 사용</button>}</div>}
    {sync.remoteChange && <p role="status">다른 가족이 일정을 업데이트했어요.</p>}
    {sync.session && <button disabled={busy} onClick={() => run(sync.signOut)}>로그아웃</button>}
    {message && <p className={failed ? 'error' : ''} role={failed ? 'alert' : 'status'}>{message}</p>}
  </div>
}

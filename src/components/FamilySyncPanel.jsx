import { useState } from 'react'
import { Check, Cloud, Copy, Download, History, LogOut, Share2, ShieldCheck, Smartphone, Upload, Users, X } from 'lucide-react'
import { useModalAccessibility } from '../hooks/useModalAccessibility'
import { useAppDialog } from '../hooks/useAppDialog'

const STATUS_LABELS = {
  local: '이 기기에 저장 중',
  connecting: '가족 데이터 연결 중',
  saving: '변경사항 저장 중',
  synced: '가족과 동기화됨',
  readonly: '보기 전용으로 연결됨',
  error: '동기화 확인 필요',
  offline: '오프라인 저장 중',
  conflict: '다른 기기 변경과 충돌',
}

const formatSyncTime = (value) => value ? new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit',
}).format(new Date(value)) : '아직 동기화되지 않음'

export default function FamilySyncPanel({ open, onClose, sync, onExport, onImport, profiles = [], profileLinks = {}, onLinkProfile }) {
  const { confirm } = useAppDialog()
  const dialogRef = useModalAccessibility(open, onClose)
  const [authMode, setAuthMode] = useState('signin')
  const [familyMode, setFamilyMode] = useState('create')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [householdName, setHouseholdName] = useState('우리 가족')
  const [displayName, setDisplayName] = useState('')
  const [memberRole, setMemberRole] = useState('parent')
  const [inviteCode, setInviteCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  if (!open) return null

  const run = async (action) => {
    setBusy(true)
    setMessage('')
    try {
      const result = await action()
      if (typeof result === 'string') setMessage(result)
    } catch (actionError) {
      setMessage(actionError.message || '요청을 처리하지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const copyCode = async () => {
    await navigator.clipboard.writeText(sync.family.household.invite_code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const shareCode = async () => {
    const code = sync.family.household.invite_code
    const shareData = { title: 'Family Scheduler 가족 연결', text: `가족 연결 코드: ${code}`, url: window.location.origin }
    if (navigator.share) return navigator.share(shareData)
    await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const isOwner = sync.session?.user?.id === sync.family?.household?.owner_id

  return (
    <div className="modal-backdrop family-sync-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex="-1" className="modal family-sync-panel" role="dialog" aria-modal="true" aria-labelledby="family-sync-title">
        <div className="modal-heading">
          <div><span className="eyebrow">가족 계정과 안전한 백업</span><h2 id="family-sync-title">가족 연결</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="가족 연결 닫기"><X /></button>
        </div>

        <div className={`sync-state sync-${sync.syncStatus}`}><Cloud /><span><strong>{STATUS_LABELS[sync.syncStatus] || '연결 상태 확인 중'}</strong>{sync.error || '각 기기에서 같은 가족 일정을 확인할 수 있습니다.'}{sync.family && <small>마지막 동기화 {formatSyncTime(sync.lastSyncedAt)}</small>}</span></div>
        <div className="family-persistence-note"><ShieldCheck /><span><strong>가족방은 한 번만 연결하면 됩니다.</strong><small>로그아웃하기 전까지 연결이 유지되고, 앱을 다시 열면 같은 가족 일정을 자동으로 불러옵니다.</small></span></div>

        {!sync.session ? <>
          <div className="segmented wide sync-tabs">
            <button className={authMode === 'signin' ? 'active' : ''} aria-pressed={authMode === 'signin'} onClick={() => setAuthMode('signin')}>로그인</button>
            <button className={authMode === 'signup' ? 'active' : ''} aria-pressed={authMode === 'signup'} onClick={() => setAuthMode('signup')}>가족 계정 만들기</button>
          </div>
          <form className="sync-form" onSubmit={(event) => {
            event.preventDefault()
            run(() => authMode === 'signin' ? sync.signIn(email, password) : sync.signUp(email, password))
          }}>
            <label>이메일<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
            <label>비밀번호<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} minLength="6" required /></label>
            <button className="primary-button" disabled={busy}>{busy ? '처리 중…' : authMode === 'signin' ? '로그인' : '계정 만들기'}</button>
          </form>
        </> : !sync.family ? <>
          <div className="signed-in-copy"><ShieldCheck /><span><strong>{sync.session.user.email}</strong>로그인되었습니다. 새 가족방을 만들거나 연결 코드를 입력하세요.</span></div>
          <div className="segmented wide sync-tabs">
            <button className={familyMode === 'create' ? 'active' : ''} aria-pressed={familyMode === 'create'} onClick={() => setFamilyMode('create')}>새 가족방</button>
            <button className={familyMode === 'join' ? 'active' : ''} aria-pressed={familyMode === 'join'} onClick={() => setFamilyMode('join')}>코드로 참여</button>
          </div>
          <form className="sync-form" onSubmit={(event) => {
            event.preventDefault()
            run(() => familyMode === 'create'
              ? sync.createFamily({ householdName, displayName, memberRole })
              : sync.joinFamily({ inviteCode, displayName, memberRole }))
          }}>
            {familyMode === 'create' && <label>가족방 이름<input value={householdName} onChange={(event) => setHouseholdName(event.target.value)} required /></label>}
            {familyMode === 'join' && <label>가족 연결 코드<input className="invite-code-input" value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} maxLength="8" required /></label>}
            <div className="field-row">
              <label>내 이름<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="예: 엄마, 초롱" required /></label>
              <label>역할<select value={memberRole} onChange={(event) => setMemberRole(event.target.value)}><option value="parent">부모</option><option value="child">자녀</option></select></label>
            </div>
            <button className="primary-button" disabled={busy}>{busy ? '연결 중…' : familyMode === 'create' ? '가족방 만들기' : '가족방 참여하기'}</button>
          </form>
        </> : <>
          <div className="family-code-card">
            <div><Users /><span><small>{sync.family.household.name} · 8자리 초대 코드</small><strong>{sync.family.household.invite_code}</strong></span></div>
            <div className="family-code-actions"><button className="secondary-button" onClick={copyCode}>{copied ? <Check /> : <Copy />}{copied ? '복사됨' : '코드 복사'}</button><button className="secondary-button" onClick={() => run(shareCode)}><Share2 /> 코드 공유</button></div>
          </div>
          <p className="family-code-help">가족이 각자 계정을 만든 뒤 이 짧은 코드를 입력하면 같은 캘린더를 볼 수 있습니다. 새로 참여한 가족은 기본적으로 보기 전용입니다.</p>

          <div className="new-device-guide"><Smartphone /><div><strong>새 휴대폰에서 기존 데이터 불러오기</strong><ol><li>Family Scheduler에서 같은 계정으로 로그인</li><li>처음 연결할 때만 위 초대 코드 입력</li><li>가족 일정이 자동으로 내려오면 연결 완료</li></ol></div></div>

          <div className="family-member-list">
            <div className="section-heading"><h3>연결된 가족</h3><span>{sync.family.members.length}명</span></div>
            {sync.family.members.map((member) => (
              <div className="family-member-row" key={member.user_id}>
                <span className="member-initial">{member.display_name.slice(0, 1)}</span>
                <span><strong>{member.display_name}{member.user_id === sync.session.user.id ? ' · 나' : ''}</strong><small>{member.member_role === 'parent' ? '부모' : '자녀'} · {member.can_edit ? '수정 가능' : '보기 전용'}</small><select className="profile-link-select" aria-label={`${member.display_name} 일정 프로필 연결`} value={profileLinks[member.user_id] || ''} onChange={(event) => onLinkProfile?.(member.user_id, event.target.value)} disabled={!sync.family.membership.can_edit}><option value="">일정 프로필 연결 안 함</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></span>
                {isOwner && member.user_id !== sync.session.user.id && <button className={`permission-toggle ${member.can_edit ? 'active' : ''}`} aria-pressed={member.can_edit} disabled={busy} onClick={() => run(() => sync.updatePermission(member.user_id, !member.can_edit))}>{member.can_edit ? '수정 허용' : '보기 전용'}</button>}
              </div>
            ))}
          </div>

          <div className="backup-actions">
            <button className="secondary-button" onClick={onExport}><Download /> 백업 파일 저장</button>
            <label className="secondary-button upload-button"><Upload /> 백업 불러오기<input type="file" accept="application/json,.json" onChange={(event) => event.target.files?.[0] && onImport(event.target.files[0])} /></label>
          </div>
          {sync.family.history?.length > 0 && <div className="backup-history">
            <div className="section-heading"><h3>자동 백업 기록</h3><span>최근 {sync.family.history.length}개</span></div>
            {sync.family.history.map((backup) => <div className="backup-history-row" key={backup.id}><span><strong>버전 {backup.version}</strong><small>{new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(backup.created_at))}</small></span>{sync.family.membership.can_edit && <button disabled={busy} onClick={async () => { if (await confirm('이 시점의 가족 일정으로 복원할까요? 현재 상태도 자동 백업됩니다.')) run(() => sync.restoreVersion(backup.id)) }}><History /> 복원</button>}</div>)}
          </div>}
          <button className="sign-out-button" onClick={() => run(sync.signOut)}><LogOut /> 로그아웃</button>
        </>}

        {message && <p className="sync-message" role="status">{message}</p>}
      </section>
    </div>
  )
}

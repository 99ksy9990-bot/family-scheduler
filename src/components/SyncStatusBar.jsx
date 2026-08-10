import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Cloud, CloudOff, RefreshCw, X } from 'lucide-react'

const formatSyncTime = (value) => value ? new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit',
}).format(new Date(value)) : '아직 동기화되지 않음'

export default function SyncStatusBar({ sync }) {
  const offline = sync.syncStatus === 'offline'
  const saving = sync.syncStatus === 'saving' || sync.syncStatus === 'connecting'
  const hasError = sync.syncStatus === 'error'
  const isSynced = sync.syncStatus === 'synced' || sync.syncStatus === 'readonly'
  const transientKey = sync.remoteChange
    ? `remote-${sync.remoteChange.updatedAt || ''}`
    : isSynced ? `${sync.syncStatus}-${sync.lastSyncedAt || ''}` : ''
  const [hiddenTransientKey, setHiddenTransientKey] = useState('')
  const showTransient = Boolean(transientKey && hiddenTransientKey !== transientKey)

  useEffect(() => {
    if (!transientKey) return undefined

    const timer = window.setTimeout(() => setHiddenTransientKey(transientKey), 3000)
    return () => window.clearTimeout(timer)
  }, [transientKey])

  if (!sync.family && !(sync.session && offline)) return null

  if (sync.conflict) return (
    <aside className="sync-banner conflict" role="alert">
      <AlertTriangle />
      <span><strong>다른 기기의 변경과 겹쳤습니다</strong><small>어느 내용을 유지할지 선택하면 안전하게 다시 저장합니다.</small></span>
      <div><button onClick={sync.acceptRemote}>다른 기기 내용 사용</button><button className="primary" onClick={sync.keepLocal}>이 기기 내용 유지</button></div>
    </aside>
  )

  if (offline || saving || hasError) return (
    <aside className={`sync-banner compact ${offline ? 'offline' : saving ? 'saving' : 'error'}`} role={hasError ? 'alert' : 'status'}>
      {offline ? <CloudOff /> : saving ? <RefreshCw className="spin" /> : <AlertTriangle />}
      <span>
        <strong>{offline ? '오프라인 저장 중' : saving ? '가족 일정 동기화 중' : '동기화 확인 필요'}</strong>
        <small>{offline ? '인터넷이 연결되면 이 기기의 변경을 다시 저장합니다.' : sync.error || '연결 상태를 확인한 뒤 다시 시도해 주세요.'}</small>
      </span>
    </aside>
  )

  if (!showTransient) return null

  if (sync.remoteChange) return (
    <aside className="sync-banner remote" role="status">
      <RefreshCw />
      <span><strong>다른 기기에서 변경됨</strong><small>{formatSyncTime(sync.remoteChange.updatedAt)}에 자동 반영했습니다.</small></span>
      <button className="dismiss" onClick={() => { setHiddenTransientKey(transientKey); sync.dismissRemoteChange() }} aria-label="알림 닫기"><X /></button>
    </aside>
  )

  if (isSynced) return (
    <aside className="sync-banner compact synced" role="status">
      <Cloud />
      <span>
        <strong><Check /> 가족 일정 동기화됨</strong>
        <small>마지막 동기화 {formatSyncTime(sync.lastSyncedAt)}</small>
      </span>
    </aside>
  )

  return null
}

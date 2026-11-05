import { useState } from 'react'
import { inspectV2Backup } from '../../data/backup'
import { fromLegacy, toLegacy } from '../../data/migrate'
import { upgradeSharedState } from '../../../lib/legacyState'

export default function Backup({ state, updateState, canEdit, sync }) {
  const [preview, setPreview] = useState(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [restoring, setRestoring] = useState(null)
  const exportFile = () => {
    const file = new Blob([JSON.stringify({ ...toLegacy(state), exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a'); link.href = url; link.download = `오늘우리-${new Date().toISOString().slice(0, 10)}.json`; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const inspect = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setMessage(''); setPreview(null)
    try {
      const value = JSON.parse(await file.text())
      const summary = inspectV2Backup(value)
      setPreview({ value, summary, name: file.name })
    } catch (error) { setMessage(error.message || '백업 파일을 읽지 못했어요.') }
  }
  const apply = () => {
    if (!canEdit || !preview) return
    if (updateState((current) => fromLegacy(upgradeSharedState({ ...current, ...preview.value })))) {
      setPreview(null); setMessage('백업 내용을 불러왔어요.')
    }
  }
  const restore = async () => {
    setBusy(true); setMessage('')
    try { await sync.restoreVersion(restoring); setMessage('선택한 버전으로 복원했어요.'); setRestoring(null) }
    catch (error) { setMessage(error.message || '복원하지 못했어요.') }
    finally { setBusy(false) }
  }
  return <div className="settings-content"><button onClick={exportFile}>JSON 백업 저장</button><p>가족 개인정보가 들어 있는 파일이에요. 안전한 곳에 보관해 주세요.</p>
    <label className="file-input">백업 파일 선택<input type="file" accept=".json,application/json" disabled={!canEdit} onChange={inspect} /></label>
    {preview && <section className="settings-card" aria-label="백업 미리보기"><h3>{preview.name}</h3><p>아래 내용을 확인한 뒤 적용해 주세요. 파일에 포함된 항목은 현재 내용을 대체해요.</p><ul>{preview.summary.counts.map((item) => <li key={item.key}>{item.label} {item.count}개</li>)}</ul><button className="primary-button" onClick={apply} disabled={!canEdit}>이 백업 불러오기</button><button onClick={() => setPreview(null)}>취소</button></section>}
    <h3>최근 버전 복원</h3>{!sync.family?.history?.length && <p>가족 연결 후 저장된 버전을 확인할 수 있어요.</p>}
    {sync.family?.history?.map((item) => <article className="settings-card" key={item.id}><p>버전 {item.version} · {new Date(item.created_at).toLocaleString('ko-KR')}</p><button disabled={!canEdit || busy} onClick={() => setRestoring(item.id)}>이 버전 복원</button></article>)}
    {restoring && <div className="data-message"><p>선택한 버전으로 복원할까요? 현재 상태도 자동 백업돼요.</p><button disabled={busy} onClick={restore}>복원 확인</button><button disabled={busy} onClick={() => setRestoring(null)}>취소</button></div>}
    {message && <p role="status">{message}</p>}
  </div>
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, CheckSquare, Download, FileText, Image, MessageCircle, Paperclip, Plus, Send, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const formatDateTime = (value) => new Intl.DateTimeFormat('ko-KR', {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
}).format(new Date(value))

const safeSegment = (value) => value.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 100)

export default function EventCollaborationPanel({ event, family, session, canEdit, onClose }) {
  const [comments, setComments] = useState([])
  const [checklist, setChecklist] = useState([])
  const [attachments, setAttachments] = useState([])
  const [comment, setComment] = useState('')
  const [checkItem, setCheckItem] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const householdId = family?.household?.id
  const eventKey = event?.id
  const member = family?.members?.find((item) => item.user_id === session?.user?.id)
  const authorName = member?.display_name || session?.user?.email?.split('@')[0] || '가족'

  const load = useCallback(async () => {
    if (!supabase || !householdId || !eventKey) return
    setError('')
    const [commentsResult, checklistResult, attachmentsResult] = await Promise.all([
      supabase.from('event_comments').select('*').eq('household_id', householdId).eq('event_key', eventKey).order('created_at'),
      supabase.from('event_checklist_items').select('*').eq('household_id', householdId).eq('event_key', eventKey).order('created_at'),
      supabase.from('event_attachments').select('*').eq('household_id', householdId).eq('event_key', eventKey).order('created_at', { ascending: false }),
    ])
    const failure = commentsResult.error || checklistResult.error || attachmentsResult.error
    if (failure) {
      setError(failure.message)
      return
    }
    const files = await Promise.all((attachmentsResult.data || []).map(async (file) => {
      const { data } = await supabase.storage.from('event-attachments').createSignedUrl(file.storage_path, 3600)
      return { ...file, signedUrl: data?.signedUrl || '' }
    }))
    setComments(commentsResult.data || [])
    setChecklist(checklistResult.data || [])
    setAttachments(files)
  }, [eventKey, householdId])

  useEffect(() => {
    const initialLoad = window.setTimeout(load, 0)
    if (!supabase || !householdId || !eventKey) return undefined
    const channel = supabase.channel(`event-collaboration-${eventKey}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_comments', filter: `household_id=eq.${householdId}` }, ({ new: next, old }) => {
        if (next?.event_key === eventKey || old?.event_key === eventKey) load()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_checklist_items', filter: `household_id=eq.${householdId}` }, ({ new: next, old }) => {
        if (next?.event_key === eventKey || old?.event_key === eventKey) load()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_attachments', filter: `household_id=eq.${householdId}` }, ({ new: next, old }) => {
        if (next?.event_key === eventKey || old?.event_key === eventKey) load()
      })
      .subscribe()
    return () => { window.clearTimeout(initialLoad); supabase.removeChannel(channel) }
  }, [eventKey, householdId, load])

  const run = async (action) => {
    setBusy(true)
    setError('')
    try { await action() } catch (actionError) { setError(actionError.message || '요청을 처리하지 못했습니다.') }
    finally { setBusy(false) }
  }

  const addComment = async (submitEvent) => {
    submitEvent.preventDefault()
    const body = comment.trim()
    if (!body) return
    await run(async () => {
      const { error: insertError } = await supabase.from('event_comments').insert({
        household_id: householdId, event_key: eventKey, body, author_name: authorName, created_by: session.user.id,
      })
      if (insertError) throw insertError
      setComment('')
      await load()
    })
  }

  const addCheckItem = async (submitEvent) => {
    submitEvent.preventDefault()
    const label = checkItem.trim()
    if (!label) return
    await run(async () => {
      const { error: insertError } = await supabase.from('event_checklist_items').insert({
        household_id: householdId, event_key: eventKey, label, created_by: session.user.id, updated_by: session.user.id,
      })
      if (insertError) throw insertError
      setCheckItem('')
      await load()
    })
  }

  const toggleCheckItem = (item) => run(async () => {
    const { error: updateError } = await supabase.from('event_checklist_items')
      .update({ done: !item.done, updated_by: session.user.id, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (updateError) throw updateError
    await load()
  })

  const removeCheckItem = (item) => run(async () => {
    const { error: deleteError } = await supabase.from('event_checklist_items').delete().eq('id', item.id)
    if (deleteError) throw deleteError
    await load()
  })

  const upload = (file) => run(async () => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) throw new Error('첨부파일은 10MB까지 올릴 수 있습니다.')
    const path = `${householdId}/${safeSegment(eventKey)}/${crypto.randomUUID()}-${safeSegment(file.name)}`
    const { error: uploadError } = await supabase.storage.from('event-attachments').upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) throw uploadError
    const { error: insertError } = await supabase.from('event_attachments').insert({
      household_id: householdId,
      event_key: eventKey,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
      uploader_name: authorName,
      uploaded_by: session.user.id,
    })
    if (insertError) {
      await supabase.storage.from('event-attachments').remove([path])
      throw insertError
    }
    await load()
  })

  const removeAttachment = (file) => run(async () => {
    const { error: storageError } = await supabase.storage.from('event-attachments').remove([file.storage_path])
    if (storageError) throw storageError
    const { error: metadataError } = await supabase.from('event_attachments').delete().eq('id', file.id)
    if (metadataError) throw metadataError
    await load()
  })

  const completed = useMemo(() => checklist.filter((item) => item.done).length, [checklist])
  if (!event) return null

  return (
    <div className="modal-backdrop collaboration-backdrop" role="presentation" onMouseDown={(click) => click.target === click.currentTarget && onClose()}>
      <section className="modal collaboration-panel" role="dialog" aria-modal="true" aria-labelledby="collaboration-title">
        <div className="modal-heading">
          <div><span className="eyebrow">일정별 대화와 준비</span><h2 id="collaboration-title">{event.title}</h2><small>{event.date} · {event.time || '종일'}{event.location ? ` · ${event.location}` : ''}</small></div>
          <button className="icon-button" onClick={onClose} aria-label="닫기"><X /></button>
        </div>

        {!family || !session ? <div className="collaboration-connect"><MessageCircle /><strong>가족 연결 후 사용할 수 있습니다</strong><span>댓글과 자료는 연결된 가족만 안전하게 공유합니다.</span></div> : <div className="collaboration-grid">
          <section className="collaboration-section checklist-section">
            <div className="collaboration-heading"><span><CheckSquare /> 준비물 체크리스트</span><small>{completed}/{checklist.length}</small></div>
            <div className="checklist-list">
              {checklist.map((item) => <div className={`checklist-item ${item.done ? 'done' : ''}`} key={item.id}>
                <button className="check-toggle" disabled={!canEdit || busy} onClick={() => toggleCheckItem(item)} aria-label={`${item.label} ${item.done ? '미완료로 변경' : '완료'}`}>{item.done && <Check />}</button>
                <span>{item.label}</span>
                {canEdit && <button className="subtle-delete" disabled={busy} onClick={() => removeCheckItem(item)} aria-label={`${item.label} 삭제`}><Trash2 /></button>}
              </div>)}
              {!checklist.length && <p className="collaboration-empty">등록된 준비물이 없습니다.</p>}
            </div>
            {canEdit && <form className="inline-add-form" onSubmit={addCheckItem}><input value={checkItem} onChange={(change) => setCheckItem(change.target.value)} placeholder="예: 체육복, 물통" maxLength="300" /><button disabled={busy || !checkItem.trim()} aria-label="준비물 추가"><Plus /></button></form>}
          </section>

          <section className="collaboration-section attachment-section">
            <div className="collaboration-heading"><span><Paperclip /> 사진·자료</span><small>{attachments.length}</small></div>
            <div className="attachment-list">
              {attachments.map((file) => <div className="attachment-item" key={file.id}>
                {file.mime_type.startsWith('image/') ? <Image /> : <FileText />}
                <span><strong>{file.file_name}</strong><small>{file.uploader_name} · {Math.max(1, Math.round(file.size_bytes / 1024))}KB</small></span>
                {file.signedUrl && <a href={file.signedUrl} target="_blank" rel="noreferrer" aria-label={`${file.file_name} 열기`}><Download /></a>}
                {canEdit && <button className="subtle-delete" disabled={busy} onClick={() => removeAttachment(file)} aria-label={`${file.file_name} 삭제`}><Trash2 /></button>}
              </div>)}
              {!attachments.length && <p className="collaboration-empty">사진이나 안내문을 첨부해 보세요.</p>}
            </div>
            {canEdit && <label className="attachment-upload"><Paperclip /> 파일 첨부<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,text/plain" onChange={(change) => { const file = change.target.files?.[0]; change.target.value = ''; if (file) upload(file) }} /></label>}
          </section>

          <section className="collaboration-section comment-section">
            <div className="collaboration-heading"><span><MessageCircle /> 가족 대화</span><small>{comments.length}</small></div>
            <div className="comment-list">
              {comments.map((item) => <article className="comment-item" key={item.id}><div><strong>{item.author_name}</strong><time>{formatDateTime(item.created_at)}</time></div><p>{item.body}</p></article>)}
              {!comments.length && <p className="collaboration-empty">“누가 데려가?”처럼 일정에 바로 남겨 보세요.</p>}
            </div>
            {canEdit && <form className="comment-form" onSubmit={addComment}><textarea value={comment} onChange={(change) => setComment(change.target.value)} placeholder="가족에게 남길 말을 입력하세요" maxLength="1000" rows="2" /><button disabled={busy || !comment.trim()}><Send /> 보내기</button></form>}
          </section>
        </div>}
        {error && <p className="collaboration-error" role="alert">{error}</p>}
      </section>
    </div>
  )
}

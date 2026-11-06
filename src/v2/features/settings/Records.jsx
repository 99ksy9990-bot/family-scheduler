import { seasonOf } from '../../../lib/schedule'
import { FieldChip } from '../../components/EventForm'
import { useState } from 'react'
import { clock } from '../../data/schedule'

export default function Records({ title, collection, fields, state, updateState, canEdit, identity = 'id', initialRecord, editorOnly = false, onSaved, onCancel }) {
  const [editing, setEditing] = useState(initialRecord || null)
  const [undo, setUndo] = useState(null)
  const [error, setError] = useState('')
  const keyOf = (row) => typeof identity === 'function' ? identity(row) : row?.[identity]
  const rows = state[collection] || []
  const submit = (event) => {
    event.preventDefault(); setError('')
    const values = Object.fromEntries(new FormData(event.currentTarget))
    for (const field of fields) {
      if (field.type === 'number') values[field.key] = Number(values[field.key])
      if (field.type === 'checkbox') values[field.key] = values[field.key] === 'on'
      if (field.type === 'weekdays') values.weekdays = new FormData(event.currentTarget).getAll('weekdays').map(Number)
    }
    if (values.weekdays) { if (!values.weekdays.length) { setError('요일을 하나 이상 선택해 주세요.'); return }; values.weekday = values.weekdays[0] }
    if (values.start && values.end && collection === 'schedulePeriods' && values.end < values.start) { setError('종료일을 확인해 주세요.'); return }
    if (values.calendarType !== 'lunar' && values.month && values.day > new Date(2000, values.month, 0).getDate()) { setError('존재하는 날짜를 선택해 주세요.'); return }
    if (values.calendarType === 'lunar' && values.day > 30) { setError('음력 날짜는 30일까지 선택해 주세요.'); return }
    // 학년·구분을 고르면 옛 앱이 읽는 season(학기/방학)도 맞춰 저장
    if (values.term) values.season = values.term.endsWith('방학') ? '방학' : '학기'
    // 특정 기간을 고르면 구분(학기/방학)도 그 기간에 맞춤 → 옛 앱에서도 같은 구분으로 보임
    if (values.periodId) { const period = state.schedulePeriods.find((p) => p.id === values.periodId); if (period) values.season = period.season }
    if ('periodId' in values && !values.periodId) delete values.periodId
    const record = { ...editing, ...values }
    if (!values.periodId && 'periodId' in editing && fields.some((f) => f.key === 'periodId')) delete record.periodId
    if (identity === 'id') record.id ||= crypto.randomUUID()
    const previousId = keyOf(editing)
    const saved = updateState((current) => ({ ...current, [collection]: previousId
      ? current[collection].filter((item) => keyOf(item) === previousId || keyOf(item) !== keyOf(record)).map((item) => keyOf(item) === previousId ? record : item)
      : [...current[collection].filter((item) => keyOf(item) !== keyOf(record)), record] }))
    if (saved) { setEditing(null); onSaved?.() }
  }
  const remove = (row) => {
    if (updateState((current) => ({ ...current, [collection]: current[collection].filter((item) => keyOf(item) !== keyOf(row)) }))) setUndo(row)
  }
  return <section className="settings-content">{!editorOnly && <h3>{title}</h3>}
    {!editorOnly && rows.map((row) => <article className="settings-card" key={keyOf(row)}><p>{row.title || row.name || state.profiles.find((profile) => profile.id === row.member)?.name || '가족'} {row.date || row.start || row.school || ''}{row.month ? ` ${row.month}월 ${row.day}일` : ''}</p><p className="quiet">{row.season === 'vacation' ? '방학' : row.season === 'term' ? '학기' : ''} {clock(row.time)} {row.end || ''}</p><button disabled={!canEdit} onClick={() => setEditing(row)}>수정</button><button disabled={!canEdit} onClick={() => remove(row)}>삭제</button></article>)}
    {!editorOnly && !rows.length && <p>등록된 내용이 없어요.</p>}
    {!editorOnly && canEdit && <button onClick={() => setEditing({})}>새로 추가</button>}
    {undo && <div role="status" className="undo-toast">삭제했어요.<button onClick={() => { updateState((current) => ({ ...current, [collection]: [...current[collection].filter((row) => keyOf(row) !== keyOf(undo)), undo] })); setUndo(null) }}>되돌리기</button></div>}
    {editing && <form className="event-form settings-card" key={editing[identity] || 'new'} onSubmit={submit}>
      {fields.map((field) => {
        if (field.type === 'weekdays') return <fieldset key={field.key}><legend>{field.label}</legend>{['일', '월', '화', '수', '목', '금', '토'].map((name, day) => <label className="check-label" key={day}><input type="checkbox" name="weekdays" value={day} defaultChecked={(editing.weekdays || [editing.weekday]).includes(day)} />{name}</label>)}</fieldset>
        const raw = editing[field.key] ?? field.defaultValue ?? ''
        const value = field.key === 'season' ? seasonOf(raw) : raw
        return <label key={field.key} className={field.type === 'checkbox' ? 'check-label' : ''}>{field.label}{['date', 'time'].includes(field.type) ? <FieldChip name={field.key} label={field.label} type={field.type} defaultValue={field.type === 'time' ? clock(value) : value} required={Boolean(field.required)} /> : field.options ? <select name={field.key} defaultValue={value} required={field.required}>{field.options.map(([key, name]) => <option value={key} key={key}>{name}</option>)}</select> : <input name={field.key} type={field.type || 'text'} defaultValue={field.type === 'time' ? clock(value) : field.type === 'checkbox' ? undefined : value} defaultChecked={field.type === 'checkbox' ? Boolean(value) : undefined} min={field.min} max={field.max} required={field.required} placeholder={!field.type || field.type === 'text' ? '입력' : undefined} />}</label>
      })}
      {error && <p role="alert" className="error">{error}</p>}<button className="primary-button" disabled={!canEdit}>저장</button><button type="button" onClick={() => { setEditing(null); onCancel?.() }}>취소</button>{editorOnly && keyOf(editing) && rows.some((row) => keyOf(row) === keyOf(editing)) && <button type="button" className="danger-button" disabled={!canEdit} onClick={() => { remove(editing); setEditing(null); onSaved?.() }}>삭제</button>}
    </form>}
  </section>
}

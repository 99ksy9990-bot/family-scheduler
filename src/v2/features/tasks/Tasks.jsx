import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { taskRows, toggleTask, renameCategory } from '../../data/tasks'
import { assignedMemberIds } from '../../../lib/legacyState'
import CharacterAvatar from '../../components/CharacterAvatar'
import TaskForm from './TaskForm'

export default function Tasks({ state, updateState, canEdit, today, formOpen, onCloseForm }) {
  const [category, setCategory] = useState('all')
  const [completed, setCompleted] = useState(false)
  const [editing, setEditing] = useState(null)
  const [undo, setUndo] = useState(null)
  const [celebrating, setCelebrating] = useState(null)
  const [editCategories, setEditCategories] = useState(false)
  const [message, setMessage] = useState('')
  const categories = [...new Set([...state.taskCategories, ...state.tasks.map((task) => task.category).filter(Boolean)])]
  const profilesFor = (task) => {
    const ids = assignedMemberIds(task, 'assignees', 'assignee')
    if (ids.includes('family')) return state.profiles.filter((profile) => profile.active !== false).length ? state.profiles.filter((profile) => profile.active !== false) : [{ id: 'family', name: '가족 모두' }]
    return [...new Set(ids)].map((id) => state.profiles.find((profile) => profile.id === id) || { id, name: '가족' })
  }
  const rows = taskRows(state.tasks, today, category, completed)
  useEffect(() => {
    if (!celebrating) return
    const timer = window.setTimeout(() => setCelebrating(null), 1400)
    return () => window.clearTimeout(timer)
  }, [celebrating])
  const toggle = (row) => {
    if (updateState((current) => ({ ...current, tasks: toggleTask(current.tasks, row, today) })) && !row.done) setCelebrating(row)
  }
  const remove = (row) => {
    const source = state.tasks.find((task) => task.id === row.sourceTaskId)
    if (!source) return
    if (updateState((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== source.id) }))) setUndo(source)
  }
  return <section className="settings-content" aria-label="할 일 목록"><div className="filter-chips"><button aria-pressed={category === 'all'} onClick={() => setCategory('all')}>전체</button>{categories.map((name) => <button key={name} aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>)}</div>
    <div className="section-heading"><h2>할 일 <span className="count" data-testid="task-count">{rows.length}</span></h2><button disabled={!canEdit} onClick={() => setEditCategories(!editCategories)}>분류 편집</button></div>
    <label className="check-label"><input type="checkbox" checked={completed} onChange={(event) => setCompleted(event.target.checked)} />완료한 할 일도 보기</label><p className="quiet">반복 할 일은 오늘부터 이달 말까지 보여요.</p>
    {editCategories && <div className="settings-card">{categories.map((name) => <form key={name} className="category-form" onSubmit={(event) => { event.preventDefault(); const next = String(new FormData(event.currentTarget).get('name')).trim(); if (!next || (next !== name && categories.includes(next))) { setMessage('다른 분류 이름을 입력해 주세요.'); return }; updateState((current) => renameCategory({ ...current, taskCategories: categories }, name, next)); if (category === name) setCategory(next) }}><input name="name" aria-label={`${name} 분류 이름`} defaultValue={name} required /><button disabled={!canEdit}>이름 저장</button><button type="button" disabled={!canEdit || state.tasks.some((task) => task.category === name) || categories.length < 2} onClick={() => { updateState((current) => ({ ...current, taskCategories: categories.filter((value) => value !== name) })); if (category === name) setCategory('all') }}>삭제</button></form>)}<form className="category-form" onSubmit={(event) => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get('name')).trim(); if (!value || categories.includes(value)) { setMessage('새 분류 이름을 입력해 주세요.'); return }; updateState((current) => ({ ...current, taskCategories: [...categories, value] })); event.currentTarget.reset() }}><input name="name" aria-label="새 분류" required /><button disabled={!canEdit}>분류 추가</button></form></div>}
    {!rows.length && <div className="empty-state">할 일이 없어요. 오른쪽 + 버튼으로 추가해 보세요.</div>}
    <ul className="task-list">{rows.map((row) => <li className="settings-card task-row" key={row.id}><label className="task-check"><input type="checkbox" aria-label={`${row.title} 완료`} checked={row.done} disabled={!canEdit} onChange={() => toggle(row)} /></label><div className="task-body"><strong className={row.done ? 'task-done' : ''}>{row.title}</strong><p className="quiet">{row.dueDate || '날짜 없음'} · {row.category}{row.occurrenceDate ? ' · 반복' : ''}</p><div className="timeline-meta">{profilesFor(row).map((profile) => { return <span className="timeline-member" key={profile.id}><CharacterAvatar small profile={profile} expression={celebrating?.id === row.id ? 'done' : 'basic'} /><span>{profile.name}</span></span> })}</div></div><button className="icon-button" aria-label={`${row.title} 수정`} disabled={!canEdit} onClick={() => setEditing(state.tasks.find((task) => task.id === row.sourceTaskId))}><Pencil size={18} /></button><button className="icon-button" aria-label={`${row.title} 삭제${row.occurrenceDate ? ' (반복 전체)' : ''}`} disabled={!canEdit} onClick={() => remove(row)}><Trash2 size={18} /></button></li>)}</ul>
    {celebrating && <div role="status" className="timeline-member">{profilesFor(celebrating).map((profile) => <CharacterAvatar key={profile.id} profile={profile} small expression="done" />)}잘했어요! 할 일을 마쳤어요.</div>}
    {undo && <div className="undo-toast" role="status">할 일을 삭제했어요.<button onClick={() => { updateState((current) => ({ ...current, tasks: [...current.tasks.filter((task) => task.id !== undo.id), undo] })); setUndo(null) }}>되돌리기</button><button aria-label="삭제 알림 닫기" onClick={() => setUndo(null)}>닫기</button></div>}
    {message && <p role="status">{message}</p>}
    {(formOpen || editing) && <TaskForm task={editing} state={state} updateState={updateState} today={today} onClose={() => { setEditing(null); onCloseForm() }} />}
  </section>
}

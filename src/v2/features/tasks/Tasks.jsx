import { useEffect, useState } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import Sheet from '../../components/Sheet'
import { GroupedList } from '../../components/GroupedList'
import { iso } from '../../../lib/dates'
import { taskRows, toggleTask, renameCategory } from '../../data/tasks'
import { assignedMemberIds } from '../../../lib/legacyState'
import CharacterAvatar from '../../components/CharacterAvatar'
import TaskForm from './TaskForm'

// 2026-11-05 → 11/5(목)
const shortDate = (d) => { if (!d) return ''; const t = new Date(`${d}T00:00:00`); return `${t.getMonth() + 1}/${t.getDate()}(${'일월화수목금토'[t.getDay()]})` }

export default function Tasks({ state, updateState, canEdit, today }) {
  const [category, setCategory] = useState('all')
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)
  const [undo, setUndo] = useState(null)
  const [celebrating, setCelebrating] = useState(null)
  const [editCategories, setEditCategories] = useState(false)
  const [message, setMessage] = useState('')
  const categories = [...new Set([...state.taskCategories, ...state.tasks.map((task) => task.category).filter(Boolean)])]
  const profilesFor = (task) => {
    const ids = assignedMemberIds(task, 'assignees', 'assignee')
    if (ids.includes('family')) return state.profiles.filter((profile) => profile.active !== false).length ? state.profiles.filter((profile) => profile.active !== false) : [{ id: 'family', name: '가족' }]
    return [...new Set(ids)].map((id) => state.profiles.find((profile) => profile.id === id) || { id, name: '가족' })
  }
  const q = '' // 찾기는 위쪽 검색으로 (중복 삭제)
  const rows = taskRows(state.tasks, today, category, true).filter((row) => !q || [row.title, row.category].join(' ').toLowerCase().includes(q))
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
  const weekAgo = iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7))
  const doneOn = (row) => row.occurrenceDate || row.completedDate || ''
  // 두 묶음: 남은 일(날짜 있는 것 먼저, 없는 것 아래), 끝낸 일(7일 안, 오래된 건 검색으로)
  const groups = [
    ['할 일', rows.filter((row) => !row.done).sort((x, y) => (x.dueDate || '9') .localeCompare(y.dueDate || '9'))],
    ['끝낸 일', rows.filter((row) => row.done && (q || doneOn(row) >= weekAgo)).sort((x, y) => doneOn(y).localeCompare(doneOn(x)))],
  ]
  return <section className="home-tasks" aria-label="할 일 목록">
    <div className="task-section-heading"><h2 className="house-section-title">할 일 <small data-testid="task-count">{rows.filter((row) => !row.done).length ? `${rows.filter((row) => !row.done).length}개 남음` : '다 끝냈어요'}</small></h2><button className="text-button" disabled={!canEdit} onClick={() => setEditCategories(true)}>분류 편집</button></div>
    <div className="task-chips"><button aria-pressed={category === 'all'} onClick={() => setCategory('all')}>전체</button>{categories.map((name) => <button key={name} aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>)}</div>
    <p className="quiet task-hint">반복 할 일은 오늘부터 이달 말까지 보여요.</p>
    {groups.map(([title, items]) => <details className="task-group" key={title} open={(title === '할 일' && items.length > 0) || (q && items.length) ? true : undefined}><summary>{title}<span>{items.length}<ChevronRight size={16} /></span></summary>
      {items.length ? <GroupedList label={title}>{items.map((row) => <li className="todo-row" key={row.id}>
        <label className="round-check"><input type="checkbox" aria-label={`${row.title} 완료`} checked={row.done} disabled={!canEdit} onChange={() => toggle(row)} /><span aria-hidden="true">{row.done && <Check size={16} />}</span></label>
        <button className="todo-body" onClick={() => setSelected(row)}><strong className={row.done ? 'task-done' : row.dueDate && row.dueDate < iso(today) ? 'task-late' : ''}>{row.title}</strong><small>{row.done ? `끝냄${row.completedDate && row.completedDate !== iso(today) ? ` · ${row.completedDate.slice(5).replace('-', '/')}` : ''}` : [row.time || shortDate(row.dueDate), row.category, row.occurrenceDate ? '반복' : ''].filter(Boolean).join(' · ')}</small></button>
        <span className="todo-members">{profilesFor(row).map((profile) => <CharacterAvatar key={profile.id} profile={profile} size={40} expression={row.done ? 'done' : 'basic'} />)}</span>
      </li>)}</GroupedList> : <div className="empty-state">{title.includes('끝낸') ? (q ? '찾는 할 일이 없어요.' : '아직 끝낸 일이 없어요.') : '할 일이 없어요.'}</div>}
    </details>)}
{editCategories && <Sheet title="분류 편집" onClose={() => setEditCategories(false)}><div className="settings-content">{categories.map((name) => <form key={name} className="category-form" onSubmit={(event) => { event.preventDefault(); const next = String(new FormData(event.currentTarget).get('name')).trim(); if (!next || (next !== name && categories.includes(next))) { setMessage('다른 분류 이름을 입력해 주세요.'); return }; updateState((current) => renameCategory({ ...current, taskCategories: categories }, name, next)); if (category === name) setCategory(next) }}><input name="name" aria-label={`${name} 분류 이름`} defaultValue={name} required /><button disabled={!canEdit}>이름 저장</button><button type="button" disabled={!canEdit || categories.length < 2} onClick={() => { const rest = categories.filter((value) => value !== name); const used = state.tasks.filter((task) => task.category === name).length; if (used && !window.confirm(`'${name}' 할 일 ${used}개는 '${rest[0]}'(으)로 옮겨요. 삭제할까요?`)) return; updateState((current) => ({ ...current, taskCategories: rest, tasks: current.tasks.map((task) => task.category === name ? { ...task, category: rest[0] } : task) })); if (category === name) setCategory('all') }}>삭제</button></form>)}<form className="category-form" onSubmit={(event) => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get('name')).trim(); if (!value || categories.includes(value)) { setMessage('새 분류 이름을 입력해 주세요.'); return }; updateState((current) => ({ ...current, taskCategories: [...categories, value] })); event.currentTarget.reset() }}><input name="name" aria-label="새 분류" required /><button disabled={!canEdit}>분류 추가</button></form></div></Sheet>}
    {selected && <Sheet title={selected.title} onClose={() => setSelected(null)}><div className="settings-content"><p>{selected.category} · {selected.dueDate || '날짜 없음'}</p><button disabled={!canEdit} onClick={() => { setEditing(state.tasks.find((task) => task.id === selected.sourceTaskId)); setSelected(null) }}>할 일 수정</button><button disabled={!canEdit} onClick={() => { remove(selected); setSelected(null) }}>할 일 삭제{selected.occurrenceDate ? ' (반복 전체)' : ''}</button></div></Sheet>}
    {celebrating && <div role="status" className="task-celebration">{profilesFor(celebrating).map((profile) => <CharacterAvatar key={profile.id} profile={profile} size={40} expression="done" />)}잘했어요! 할 일을 마쳤어요.</div>}
    {undo && <div className="undo-toast" role="status">할 일을 삭제했어요.<button onClick={() => { updateState((current) => ({ ...current, tasks: [...current.tasks.filter((task) => task.id !== undo.id), undo] })); setUndo(null) }}>되돌리기</button><button aria-label="삭제 알림 닫기" onClick={() => setUndo(null)}>닫기</button></div>}
    {message && <p role="status">{message}</p>}
    {editing && <TaskForm task={editing} state={state} updateState={updateState} today={today} onClose={() => { setEditing(null) }} />}
  </section>
}

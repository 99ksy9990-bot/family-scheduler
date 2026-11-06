import CharacterAvatar from '../../components/CharacterAvatar'
import MemberAvatars from '../../components/MemberAvatars'
import { useState } from 'react'
import Sheet from '../../components/Sheet'
import { iso } from '../../../lib/dates'
import { clock } from '../../data/schedule'

export default function TaskForm({ task, state, updateState, today, onClose, onModeChange }) {
  const [frequency, setFrequency] = useState(task?.recurrence?.frequency || 'none')
  const categories = state.taskCategories.length ? state.taskCategories : ['집안일']
  const [error, setError] = useState('')
  const submit = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const values = Object.fromEntries(form)
    if (!values.title.trim()) { setError('할 일을 입력해 주세요.'); return }
    if (values.startDate && values.dueDate && values.dueDate < values.startDate) { setError('마감일은 시작일보다 빠를 수 없어요.'); return }
    if (frequency !== 'none' && !values.dueDate) { setError('반복할 첫 날짜를 선택해 주세요.'); return }
    if (values.until && values.until < values.dueDate) { setError('반복 종료일을 확인해 주세요.'); return }
    const assignees = form.getAll('assignees')
    const reminders = form.getAll('reminders')
    const item = { ...task, id: task?.id || crypto.randomUUID(), title: values.title.trim(), category: values.category,
      assignee: assignees[0] || 'family', assignees: assignees.length ? assignees : ['family'],
      startDate: values.startDate, dueDate: values.dueDate, time: values.time || '', end: values.end || '',
      recurrence: frequency === 'none' ? undefined : { frequency, interval: Number(values.interval) || 1, until: values.until || '' },
      reminder: reminders[0] || 'none', reminders, done: Boolean(task?.done), completedDates: task?.completedDates || [], skippedDates: task?.skippedDates || [], createdDate: task?.createdDate || iso(today) }
    if (updateState((current) => ({ ...current, tasks: task ? current.tasks.map((value) => value.id === task.id ? item : value) : [...current.tasks, item] }))) onClose()
  }
  return <Sheet title={task ? '할 일 수정' : '새 할 일'} onClose={onClose} className="event-sheet task-add-sheet" submitForm="new-task-form" submitLabel={task ? '저장' : '추가'}>{!task && <div className="add-mode"><button type="button" onClick={() => onModeChange?.('event')}>일정</button><button type="button" aria-pressed="true">할 일</button></div>}<form id="new-task-form" className="task-add-form" onSubmit={submit}>
    <ul className="grouped-list task-form-group">
      <li className="grouped-row"><input className="schedule-title" name="title" aria-label="할 일" placeholder="할 일" defaultValue={task?.title || ''} required data-autofocus /></li>
      <li className="grouped-row task-row-stack"><span className="task-row-label">분류</span><span className="chip-choices" role="radiogroup" aria-label="분류">{[...new Set([...categories, ...(task?.category ? [task.category] : [])])].map((category) => <label className="choice-chip" key={category}><input type="radio" name="category" value={category} defaultChecked={(task?.category || categories[0]) === category} /><span>{category}</span></label>)}</span></li>
    </ul>
    <ul className="grouped-list task-form-group">
      <li className="grouped-row task-row-stack"><span className="task-row-label">누가</span><span className="chip-choices" role="group" aria-label="담당 가족">{[{ id: 'family', name: '가족' }, ...state.profiles.filter((profile) => profile.active !== false)].map((profile) => <label className="choice-chip" key={profile.id}><input type="checkbox" name="assignees" value={profile.id} defaultChecked={(task?.assignees || [task?.assignee || 'family']).includes(profile.id)} /><span className="face-chip">{profile.id === 'family' ? <MemberAvatars item={{ member: 'family', members: ['family'] }} profiles={state.profiles.filter((p) => p.active !== false)} /> : <CharacterAvatar profile={profile} size={32} />}<small>{profile.name}</small></span></label>)}</span></li>
    </ul>
    <ul className="grouped-list task-form-group">
      <li className="grouped-row"><label className="task-line">시작일<input className="input-chip" type="date" name="startDate" defaultValue={task?.startDate || (task ? '' : iso(today))} /></label></li>
      <li className="grouped-row"><label className="task-line">마감일<input className="input-chip" type="date" name="dueDate" defaultValue={task?.dueDate || ''} /></label></li>
      <li className="grouped-row"><label className="task-line">시작 시간<input className="input-chip" type="time" name="time" defaultValue={clock(task?.time)} /></label></li>
      <li className="grouped-row"><label className="task-line">종료 시간<input className="input-chip" type="time" name="end" defaultValue={clock(task?.end)} /></label></li>
    </ul>
    <ul className="grouped-list task-form-group">
      <li className="grouped-row task-row-stack"><span className="task-row-label">반복</span><span className="chip-choices" role="group" aria-label="반복">{[['none', '안 함'], ['daily', '매일'], ['weekly', '매주'], ['monthly', '매월'], ['yearly', '매년']].map(([value, label]) => <button type="button" className="choice-chip as-button" key={value} aria-pressed={frequency === value} onClick={() => setFrequency(value)}>{label}</button>)}</span></li>
      {frequency !== 'none' && <><li className="grouped-row"><label className="task-line">반복 간격<input className="input-chip" name="interval" type="number" min={1} defaultValue={task?.recurrence?.interval || 1} /></label></li><li className="grouped-row"><label className="task-line">반복 종료일<input className="input-chip" type="date" name="until" defaultValue={task?.recurrence?.until || ''} /></label></li></>}
      <li className="grouped-row task-row-stack"><span className="task-row-label">알림</span><span className="chip-choices" role="group" aria-label="알림">{[['same-day', '당일'], ['30-minutes', '30분 전'], ['10-minutes', '10분 전']].map(([value, label]) => <label className="choice-chip" key={value}><input type="checkbox" name="reminders" value={value} defaultChecked={(task?.reminders || [task?.reminder]).includes(value)} /><span>{label}</span></label>)}</span></li>
    </ul>
    {error && <p role="alert" className="error">{error}</p>}
  </form></Sheet>
}

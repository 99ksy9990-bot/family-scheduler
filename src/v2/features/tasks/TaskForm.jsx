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
  return <Sheet title={task ? '할 일 수정' : '새 할 일'} onClose={onClose} className="event-sheet task-add-sheet" submitForm="new-task-form" submitLabel={task ? '저장' : '추가'}>{!task && <div className="add-mode"><button type="button" onClick={() => onModeChange?.('event')}>일정</button><button type="button" aria-pressed="true">할 일</button></div>}<form id="new-task-form" className="event-form task-add-form" onSubmit={submit}>
    <label>할 일<input name="title" defaultValue={task?.title || ''} required data-autofocus /></label>
    <label>분류<select name="category" defaultValue={task?.category || categories[0]}>{[...new Set([...categories, ...(task?.category ? [task.category] : [])])].map((category) => <option key={category}>{category}</option>)}</select></label>
    <fieldset><legend>담당 가족</legend>{[{ id: 'family', name: '가족 모두' }, ...state.profiles.filter((profile) => profile.active !== false)].map((profile) => <label className="check-label" key={profile.id}><input type="checkbox" name="assignees" value={profile.id} defaultChecked={(task?.assignees || [task?.assignee || 'family']).includes(profile.id)} />{profile.name}</label>)}</fieldset>
    <div className="form-pair"><label>시작일<input type="date" name="startDate" defaultValue={task?.startDate || (task ? '' : iso(today))} /></label><label>마감일<input type="date" name="dueDate" defaultValue={task?.dueDate || ''} /></label></div>
    <div className="form-pair"><label>시작 시간<input type="time" name="time" defaultValue={clock(task?.time)} /></label><label>종료 시간<input type="time" name="end" defaultValue={clock(task?.end)} /></label></div>
    <label>반복<select value={frequency} onChange={(event) => setFrequency(event.target.value)}><option value="none">반복 안 함</option><option value="daily">매일</option><option value="weekly">매주</option><option value="monthly">매월</option><option value="yearly">매년</option></select></label>
    {frequency !== 'none' && <div className="form-pair"><label>반복 간격<input name="interval" type="number" min={1} defaultValue={task?.recurrence?.interval || 1} /></label><label>반복 종료일<input type="date" name="until" defaultValue={task?.recurrence?.until || ''} /></label></div>}
    <fieldset><legend>알림</legend>{[['same-day', '당일'], ['30-minutes', '30분 전'], ['10-minutes', '10분 전']].map(([value, label]) => <label className="check-label" key={value}><input type="checkbox" name="reminders" value={value} defaultChecked={(task?.reminders || [task?.reminder]).includes(value)} />{label}</label>)}</fieldset>
    {error && <p role="alert" className="error">{error}</p>}
  </form></Sheet>
}

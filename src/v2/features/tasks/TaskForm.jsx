import CharacterAvatar, { roleOf } from '../../components/CharacterAvatar'
import { useState } from 'react'
import Sheet from '../../components/Sheet'
import { NativeChip } from '../../components/EventForm'
const frequencies = [['none', '안 함'], ['daily', '매일'], ['weekly', '매주'], ['monthly', '매월'], ['yearly', '매년']]
const remindersList = [['10-minutes', '10분 전'], ['30-minutes', '30분 전'], ['same-day', '당일']]
import { oneHourLater } from '../../data/eventTime'
import { iso } from '../../../lib/dates'
import { clock } from '../../data/schedule'

export default function TaskForm({ task, state, updateState, today, onClose, onModeChange }) {
  const [frequency, setFrequency] = useState(task?.recurrence?.frequency || 'none')
  const [reminders, setReminders] = useState((task?.reminders || [task?.reminder]).filter((r) => r && r !== 'none'))
  const categories = state.taskCategories.length ? state.taskCategories : ['집안일']
  const [error, setError] = useState('')
  const [category, setCategory] = useState(task?.category || categories[0])
  const [startDate, setStartDate] = useState(task?.startDate || (task ? '' : iso(today)))
  const [dueDate, setDueDate] = useState(task?.dueDate || '')
  const [time, setTime] = useState(task ? clock(task.time) : '09:00')
  const [end, setEnd] = useState(clock(task?.end))
  const [allDay, setAllDay] = useState(task ? !clock(task.time) : false) // 새 할 일은 일정처럼 시간 있음으로 시작
  const active = state.profiles.filter((profile) => profile.active !== false)
  const dad = active.find((profile) => roleOf(profile) === 'dad') // 치이카와 캐릭터를 골라도 아빠로
  const initial = task ? task.assignees || [task.assignee || 'family'] : [dad?.id || 'family'] // 새 할 일은 아빠 기본
  // 일정 추가의 '누구'와 같은 방식. 모두 고르거나 아무도 안 고르면 '가족'으로 저장
  const [members, setMembers] = useState(initial.includes('family') ? active.map((profile) => profile.id) : initial)
  const toggleMember = (id) => setMembers((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  const submit = (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const values = { ...Object.fromEntries(form), startDate, dueDate }
    if (!values.title.trim()) { setError('할 일을 입력해 주세요.'); return }
    if (values.startDate && values.dueDate && values.dueDate < values.startDate) { setError('마감일은 시작일보다 빠를 수 없어요.'); return }
    if (frequency !== 'none' && !values.dueDate) { setError('반복할 첫 날짜를 선택해 주세요.'); return }
    if (values.until && values.until < values.dueDate) { setError('반복 종료일을 확인해 주세요.'); return }
    const assignees = !members.length || active.every((profile) => members.includes(profile.id)) ? [] : members
        const item = { ...task, id: task?.id || crypto.randomUUID(), title: values.title.trim(), category,
      assignee: assignees[0] || 'family', assignees: assignees.length ? assignees : ['family'],
      startDate, dueDate, time: allDay ? '' : time, end: allDay ? '' : end,
      recurrence: frequency === 'none' ? undefined : { frequency, interval: Number(values.interval) || 1, until: values.until || '' },
      reminder: reminders[0] || 'none', reminders, done: Boolean(task?.done), completedDates: task?.completedDates || [], skippedDates: task?.skippedDates || [], createdDate: task?.createdDate || iso(today) }
    if (updateState((current) => ({ ...current, tasks: task ? current.tasks.map((value) => value.id === task.id ? item : value) : [...current.tasks, item] }))) onClose()
  }
  return <Sheet title={task ? '할 일 수정' : '새 할 일'} onClose={onClose} className="event-sheet task-add-sheet" submitForm="new-task-form" submitLabel={task ? '저장' : '추가'}>{!task && <div className="add-mode"><button type="button" onClick={() => onModeChange?.('event')}>일정</button><button type="button" aria-pressed="true">할 일</button></div>}<form id="new-task-form" className="schedule-form" onSubmit={submit}><div className="schedule-fields">
    <div className="form-group"><input className="schedule-title" name="title" aria-label="할 일" placeholder="제목" defaultValue={task?.title || ''} required data-autofocus /></div>
    <div className="form-group"><div className="schedule-field owners-row"><span id="task-owners">누구</span><div className="schedule-owners" role="group" aria-labelledby="task-owners">{active.map((profile) => <button type="button" key={profile.id} aria-label={profile.name} aria-pressed={members.includes(profile.id)} onClick={() => toggleMember(profile.id)}><CharacterAvatar profile={profile} size={40} /></button>)}</div></div></div>
    <div className="form-group">
      <div className="schedule-field"><span>시간 없음</span><button type="button" className="switch-control" role="switch" aria-label="시간 없음" aria-checked={allDay} onClick={() => { if (allDay && !time) setTime('09:00'); setAllDay(!allDay) }}><span aria-hidden="true" /></button></div>
      <div className="schedule-field"><span>시작</span>{startDate ? <NativeChip label="시작일" type="date" value={startDate} onChange={setStartDate} /> : <button type="button" className="end-add" onClick={() => setStartDate(iso(today))}>+ 날짜</button>}{!allDay && <NativeChip label="시작 시간" type="time" value={time} onChange={setTime} />}</div>
      <div className="schedule-field"><span>종료</span>{dueDate ? <><NativeChip label="마감일" type="date" value={dueDate} onChange={setDueDate} /><button type="button" className="end-clear" aria-label="마감일 빼기" onClick={() => setDueDate('')}>×</button></> : <button type="button" className="end-add" onClick={() => setDueDate(startDate || iso(today))}>+ 마감일</button>}{!allDay && (end ? <><NativeChip label="종료 시간" type="time" value={end} onChange={setEnd} /><button type="button" className="end-clear" aria-label="종료 시각 빼기" onClick={() => setEnd('')}>×</button></> : <button type="button" className="end-add" onClick={() => setEnd(oneHourLater(time || '09:00', startDate || iso(today)).time)}>+ 종료 시각</button>)}</div>
    </div>
    <div className="form-group">
      <details className="form-disclosure"><summary>반복<span>{frequencies.find(([value]) => value === frequency)[1]} ›</span></summary><div className="ui-segments" role="group" aria-label="반복">{frequencies.map(([value, label]) => <button type="button" key={value} aria-pressed={frequency === value} onClick={() => setFrequency(value)}>{label}</button>)}</div>{frequency !== 'none' && <div className="schedule-repeat"><label>반복 간격<input name="interval" type="number" min={1} max={365} defaultValue={task?.recurrence?.interval || 1} /></label><label>반복 종료일<input name="until" type="date" defaultValue={task?.recurrence?.until || ''} /></label></div>}</details>
      <details className="form-disclosure"><summary>알림<span>{reminders.length ? reminders.map((value) => remindersList.find(([id]) => id === value)?.[1]).join(' · ') : '없음'} ›</span></summary><div className="ui-segments" role="group" aria-label="알림"><button type="button" aria-pressed={!reminders.length} onClick={() => setReminders([])}>없음</button>{remindersList.map(([value, label]) => <button type="button" key={value} aria-pressed={reminders.includes(value)} onClick={() => setReminders((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])}>{label}</button>)}</div></details>
    </div>
    <div className="form-group"><details className="form-disclosure"><summary>분류<span>{category} ›</span></summary><div className="ui-segments" role="group" aria-label="분류">{[...new Set([...categories, ...(task?.category ? [task.category] : [])])].map((value) => <button type="button" key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}</div></details></div>
    {error && <p role="alert" className="error">{error}</p>}
  </div></form></Sheet>
}

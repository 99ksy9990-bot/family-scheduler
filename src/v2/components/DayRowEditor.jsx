import Sheet from './Sheet'
import EventForm from './EventForm'
import TaskForm from '../features/tasks/TaskForm'
import Family from '../features/settings/Family'
import { editTarget } from '../data/personDay'

export default function DayRowEditor({ row, state, updateState, canEdit, today, onClose }) {
  const target = editTarget(row, state)
  if (!target.record) return <Sheet title="일정 정보" onClose={onClose}><p>이 일정의 원본을 찾지 못했어요.</p></Sheet>
  if (target.type === 'task') return <TaskForm task={target.record} state={state} updateState={updateState} today={today} onClose={onClose} />
  if (target.type === 'event') return <EventForm event={target.record} date={target.record.date} profiles={state.profiles} onClose={onClose} onSave={(event) => updateState((current) => ({ ...current, events: current.events.map((item) => item.id === target.record.id ? event : item) }))} />
  return <Sheet title={target.type === 'shifts' ? '근무 수정' : '시간표 수정'} onClose={onClose}><Family state={state} updateState={updateState} canEdit={canEdit} initialSection={target.type} initialRecord={target.record} editorOnly onSaved={onClose} onCancel={onClose} /></Sheet>
}

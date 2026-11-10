import Sheet from './Sheet'
import EventForm from './EventForm'
import TaskForm from '../features/tasks/TaskForm'
import Family from '../features/settings/Family'
import { editTarget } from '../data/personDay'
import { LEAVES } from '../data/schedule'

export default function DayRowEditor({ row, state, updateState, canEdit, today, onClose }) {
  if (row.regular) { // 상주 근무 줄: 그날 근무·연차·반차를 바로 고름
    const profile = state.profiles.find((p) => p.id === row.member)
    const cur = profile?.regularWork?.leaves?.[row.date] || ''
    const pick = (kind) => { updateState((current) => ({ ...current, profiles: current.profiles.map((p) => { if (p.id !== row.member || !p.regularWork) return p; const leaves = { ...p.regularWork.leaves }; if (kind) leaves[row.date] = kind; else delete leaves[row.date]; return { ...p, regularWork: { ...p.regularWork, leaves } } }) })); onClose() }
    return <Sheet title={`${profile?.name || ''} ${Number(row.date.slice(5, 7))}월 ${Number(row.date.slice(8))}일 근무`} onClose={onClose}><div className="leave-pick" role="group" aria-label="근무 종류">{[['', '근무'], ...Object.entries(LEAVES).map(([k, v]) => [k, v.label])].map(([k, label]) => <button key={k || 'work'} type="button" disabled={!canEdit} aria-pressed={cur === k} onClick={() => pick(k)}>{label}</button>)}</div></Sheet>
  }
  const target = editTarget(row, state)
  if (!target.record) return <Sheet title="일정 정보" onClose={onClose}><p>이 일정의 원본을 찾지 못했어요.</p></Sheet>
  if (target.type === 'task') return <TaskForm task={target.record} state={state} updateState={updateState} today={today} onClose={onClose} />
  if (target.type === 'event') return <EventForm event={target.record} date={target.record.date} profiles={state.profiles} onClose={onClose} onSave={(event) => updateState((current) => ({ ...current, events: current.events.map((item) => item.id === target.record.id ? event : item) }))} onDelete={() => updateState((current) => ({ ...current, events: current.events.filter((item) => item.id !== target.record.id), scheduleExceptions: (current.scheduleExceptions || []).filter((x) => x.scheduleId !== target.record.id) }))} />
  return <Sheet title={target.type === 'shifts' ? '근무 수정' : '시간표 수정'} onClose={onClose}><Family state={state} updateState={updateState} canEdit={canEdit} initialSection={target.type} initialRecord={target.record} editorOnly onSaved={onClose} onCancel={onClose} /></Sheet>
}

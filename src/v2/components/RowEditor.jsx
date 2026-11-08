import Sheet from './Sheet'
import DayRowEditor from './DayRowEditor'
import { editTarget } from '../data/personDay'

// 목록에서 일정을 눌렀을 때: 반복이면 '이 날만 빼기 / 전체 수정' 고르고, 아니면 바로 수정 (홈·달력 공용)
export default function RowEditor({ row, state, updateState, canEdit, today, onChange, onSkip }) {
  return row && (row.recurrence || row.recurrenceType === 'child') && !row.whole
      ? <Sheet title={row.title} onClose={() => onChange(null)}><div className="settings-content repeat-choice">
          <p className="quiet">반복 일정이에요. 어떻게 할까요?</p>
          <button type="button" onClick={() => { const scheduleId = row.recurrenceType === 'child' ? row.scheduleId : editTarget(row, state).record?.id; if (scheduleId) { const exception = { id: crypto.randomUUID(), scheduleId, date: row.date, type: 'skip' }; if (updateState((current) => ({ ...current, scheduleExceptions: [...(current.scheduleExceptions || []), exception] }))) onSkip?.(exception, row.title) } onChange(null) }}>이 날만 빼기</button>
          <button type="button" onClick={() => onChange({ ...row, whole: true })}>반복 전체 수정</button>
        </div></Sheet>
      : row && <DayRowEditor row={row} state={state} updateState={updateState} canEdit={canEdit} today={today} onClose={() => onChange(null)} />
}

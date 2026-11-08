import { setClip } from '../data/clip'
import { useState } from 'react'
import Sheet from './Sheet'
import CharacterAvatar from './CharacterAvatar'
import { oneHourLater } from '../data/eventTime'
import { assignedMemberIds } from '../../lib/legacyState'
import { clock } from '../data/schedule'
import { addDays, iso } from '../../lib/dates'

export function NativeChip({ type, value, onChange, label, name, required = true }) {
  const text = type === 'date' && value ? new Date(`${value}T00:00:00`).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }) : value
  return <label className="input-chip native-chip"><span aria-hidden="true">{text || '선택'}</span><input name={name} aria-label={label} type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} /></label>
}

// 폼 안에서 값만 넘기는 칩(시간은 24시간, 날짜는 '11월 6일 (금)')
export function FieldChip({ defaultValue = '', ...props }) {
  const [value, setValue] = useState(defaultValue)
  return <NativeChip {...props} value={value} onChange={setValue} />
}

const frequencies = [['none', '안 함'], ['daily', '매일'], ['weekly', '매주'], ['monthly', '매월'], ['yearly', '매년']]
const remindersList = [['10-minutes', '10분 전'], ['30-minutes', '30분 전'], ['same-day', '당일']]

export default function EventForm({ date, profiles, onSave, onClose, onModeChange, event: initialEvent }) {
  const active = profiles.filter((profile) => profile.active !== false)
  const [allDay, setAllDay] = useState(Boolean(initialEvent && !clock(initialEvent.time)))
  const [multipleDays, setMultipleDays] = useState(Boolean(initialEvent?.endDate && initialEvent.endDate > initialEvent.date))
  const [eventDate, setEventDate] = useState(initialEvent?.date || date)
  const [endDate, setEndDate] = useState(initialEvent?.endDate || initialEvent?.date || date)
  const [time, setTime] = useState(clock(initialEvent?.time) || '09:00')
  const [end, setEnd] = useState(clock(initialEvent?.end) || '') // 새 일정은 종료 시각 없음(사용자 2026-11-06), 필요할 때만 추가
  const [scope, setScope] = useState(initialEvent?.calendarScope || 'family')
  const [kind, setKind] = useState(initialEvent?.kind || '학원')
  const [members, setMembers] = useState(initialEvent ? assignedMemberIds(initialEvent).includes('family') && active.length ? active.map((profile) => profile.id) : assignedMemberIds(initialEvent) : [active[0]?.id || 'family'])
  const [frequency, setFrequency] = useState(initialEvent?.recurrence?.frequency || 'none')
  const [reminders, setReminders] = useState((initialEvent?.reminders || [initialEvent?.reminder]).filter((value) => value && value !== 'none'))
  const [error, setError] = useState('')
  const updateTime = (value) => {
    setTime(value)
    if (!value || !eventDate) return
    if (!end) return
    const next = oneHourLater(value, eventDate)
    setEnd(next.time)
    if (next.endDate > eventDate) { setMultipleDays(true); setEndDate((current) => current > next.endDate ? current : next.endDate) }
    else if (!multipleDays) setEndDate(eventDate)
  }
  const updateDate = (value) => {
    setEventDate(value)
    if (!multipleDays || endDate < value) setEndDate(value)
  }
  const toggleMember = (id) => setMembers((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  const submit = (event) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    const finishDate = multipleDays ? endDate : eventDate
    if (!values.title.trim()) { setError('일정 이름을 입력해 주세요.'); return }
    if (!members.length) { setError('누구 일정인지 한 명 이상 선택해 주세요.'); return }
    if (finishDate < eventDate) { setError('종료일은 시작일보다 빠를 수 없어요.'); return }
    if (!allDay && eventDate === finishDate && end && end <= time) { setError('종료 시간은 시작 시간보다 늦게 선택해 주세요.'); return }
    if (frequency !== 'none' && values.until && values.until < eventDate) { setError('반복 종료일을 확인해 주세요.'); return }
    const storedMembers = initialEvent && assignedMemberIds(initialEvent).includes('family') && active.every((profile) => members.includes(profile.id)) ? ['family'] : members
    const saved = onSave({ ...initialEvent, title: values.title.trim(), date: eventDate, endDate: finishDate,
      time: allDay ? '종일' : time, end: allDay ? '' : end, location: values.location || '',
      member: storedMembers[0], members: storedMembers, type: scope === 'children' ? 'child' : 'family', calendarScope: scope,
      ...(scope === 'children' ? { kind } : {}), reminder: reminders[0] || 'none', reminders,
      recurrence: frequency !== 'none' ? { ...initialEvent?.recurrence, frequency, interval: Number(values.interval) || 1, until: values.until || '' } : undefined })
    if (saved) onClose()
    else setError('일정을 저장할 권한이 없어요. 가족 설정을 확인해 주세요.')
  }
  return <Sheet title={initialEvent ? '일정 수정' : '새 일정'} onClose={onClose} className="event-sheet" submitForm="new-event-form" submitLabel={initialEvent ? '저장' : '추가'}>
    {!initialEvent && <div className="add-mode"><button type="button" aria-pressed="true">일정</button><button type="button" onClick={() => onModeChange?.('task')}>할 일</button></div>}
    <form id="new-event-form" className="schedule-form" onSubmit={submit}>
      <div className="schedule-fields">
        <div className="form-group"><input className="schedule-title" name="title" aria-label="무슨 일정인가요?" placeholder="제목" defaultValue={initialEvent?.title || ''} required maxLength={200} data-autofocus /><label className="schedule-field"><input name="location" aria-label="장소" placeholder="장소" defaultValue={initialEvent?.location || ''} /></label></div>
        <div className="form-group">
          <div className="schedule-field"><span>시간 없음</span><button type="button" className="switch-control" role="switch" aria-label="시간 없음" aria-checked={allDay} onClick={() => setAllDay(!allDay)}><span aria-hidden="true" /></button></div>
          <div className="schedule-field"><span>{allDay && !multipleDays ? '날짜' : '시작'}</span><NativeChip name="date" label="날짜" type="date" value={eventDate} onChange={updateDate} />{!allDay && <NativeChip name="time" label="시작 시간" type="time" value={time} onChange={updateTime} />}</div>
          {!(allDay && !multipleDays) &&           <div className="schedule-field"><span>종료</span>{multipleDays && <NativeChip name="endDate" label="종료일" type="date" value={endDate} onChange={setEndDate} />}{allDay ? <span className="quiet">{multipleDays ? '' : '같은 날'}</span> : end ? <><NativeChip name="end" label="종료 시간" type="time" value={end} onChange={setEnd} /><button type="button" className="end-clear" aria-label="종료 시각 빼기" onClick={() => setEnd('')}>×</button></> : <button type="button" className="end-add" onClick={() => { const next = oneHourLater(time || '09:00', eventDate); setEnd(next.time); if (next.endDate > eventDate) { setMultipleDays(true); setEndDate(next.endDate) } }}>+ 종료 시각</button>}</div>}
          <div className="schedule-field"><span>여러 날</span><button type="button" className="switch-control" role="switch" aria-label="여러 날" aria-checked={multipleDays} onClick={() => { setMultipleDays(!multipleDays); setEndDate(multipleDays ? eventDate : iso(addDays(new Date(`${eventDate}T00:00:00`), 1))) }}><span aria-hidden="true" /></button></div>
        </div>
        <div className="form-group">
          <div className="schedule-field owners-row"><span id="schedule-owners">누구</span><div className="schedule-owners" role="group" aria-labelledby="schedule-owners">{(active.length ? active : [{ id: 'family', name: '가족' }]).map((profile) => <button type="button" key={profile.id} aria-label={profile.name} aria-pressed={members.includes(profile.id)} onClick={() => toggleMember(profile.id)}><CharacterAvatar profile={profile} size={40} /></button>)}</div></div>
          <details className="form-disclosure"><summary>반복<span>{frequencies.find(([value]) => value === frequency)[1]} ›</span></summary><div className="ui-segments" role="group" aria-label="반복">{frequencies.map(([value, label]) => <button type="button" key={value} aria-pressed={frequency === value} onClick={() => setFrequency(value)}>{label}</button>)}</div>{frequency !== 'none' && <div className="schedule-repeat"><label>반복 간격<input name="interval" type="number" min={1} max={365} defaultValue={initialEvent?.recurrence?.interval || 1} /></label><label>반복 종료일<input name="until" type="date" defaultValue={initialEvent?.recurrence?.until || ''} /></label></div>}</details>
          <details className="form-disclosure"><summary>알림<span>{reminders.length ? reminders.map((value) => remindersList.find(([id]) => id === value)[1]).join(' · ') : '없음'} ›</span></summary><div className="ui-segments" role="group" aria-label="알림"><button type="button" aria-pressed={!reminders.length} onClick={() => setReminders([])}>없음</button>{remindersList.map(([value, label]) => <button type="button" key={value} aria-pressed={reminders.includes(value)} onClick={() => setReminders((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])}>{label}</button>)}</div></details>
        </div>
        <div className="form-group"><details className="form-disclosure"><summary>일정 분류<span>{scope === 'family' ? '가족' : `자녀 · ${kind}`} ›</span></summary><div className="ui-segments" role="group" aria-label="일정 분류"><button type="button" aria-pressed={scope === 'family'} onClick={() => setScope('family')}>가족</button><button type="button" aria-pressed={scope === 'children'} disabled={!active.some((profile) => profile.type === 'child')} onClick={() => setScope('children')}>자녀</button></div>{scope === 'children' && <div className="ui-segments" role="group" aria-label="자녀 일정 종류">{['학교', '학원'].map((value) => <button type="button" key={value} aria-pressed={kind === value} onClick={() => setKind(value)}>{value}</button>)}</div>}</details></div>
        {error && <p className="error" role="alert">{error}</p>}
        {initialEvent && <button type="button" className="copy-event" onClick={() => { setClip(initialEvent); onClose() }}>이 일정 복사하기</button>}
      </div>
    </form>
  </Sheet>
}

import { useState } from 'react'
import Sheet from './Sheet'
import CharacterAvatar from './CharacterAvatar'
import { oneHourLater } from '../data/eventTime'

function NativeChip({ type, value, onChange, label, name }) {
  const text = type === 'date' && value ? new Date(`${value}T00:00:00`).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }) : value
  return <label className="input-chip native-chip"><span aria-hidden="true">{text || '선택'}</span><input name={name} aria-label={label} type={type} value={value} onChange={(event) => onChange(event.target.value)} required /></label>
}

const frequencies = [['none', '안 함'], ['daily', '매일'], ['weekly', '매주'], ['monthly', '매월'], ['yearly', '매년']]
const remindersList = [['10-minutes', '10분 전'], ['30-minutes', '30분 전'], ['same-day', '당일']]

export default function EventForm({ date, profiles, onSave, onClose }) {
  const active = profiles.filter((profile) => profile.active !== false)
  const [allDay, setAllDay] = useState(false)
  const [multipleDays, setMultipleDays] = useState(false)
  const [eventDate, setEventDate] = useState(date)
  const [endDate, setEndDate] = useState(date)
  const [time, setTime] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [scope, setScope] = useState('family')
  const [kind, setKind] = useState('학원')
  const [members, setMembers] = useState([active[0]?.id || 'family'])
  const [frequency, setFrequency] = useState('none')
  const [reminders, setReminders] = useState([])
  const [error, setError] = useState('')
  const updateTime = (value) => {
    setTime(value)
    if (!value || !eventDate) return
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
    const saved = onSave({ title: values.title.trim(), date: eventDate, endDate: finishDate,
      time: allDay ? '종일' : time, end: allDay ? '' : end, location: values.location || '',
      member: members[0], members, type: scope === 'children' ? 'child' : 'family', calendarScope: scope,
      ...(scope === 'children' ? { kind } : {}), reminder: reminders[0] || 'none', reminders,
      ...(frequency !== 'none' ? { recurrence: { frequency, interval: Number(values.interval) || 1, until: values.until || '' } } : {}) })
    if (saved) onClose()
    else setError('일정을 저장할 권한이 없어요. 가족 설정을 확인해 주세요.')
  }
  return <Sheet title="일정 추가" onClose={onClose} className="event-sheet" handle>
    <form className="schedule-form" onSubmit={submit}>
      <div className="schedule-fields">
        <input className="schedule-title" name="title" aria-label="무슨 일정인가요?" placeholder="무슨 일정인가요?" required maxLength={200} data-autofocus />
        <div className="schedule-field"><span>날짜</span><NativeChip name="date" label="날짜" type="date" value={eventDate} onChange={updateDate} /></div>
        {!allDay && <div className="schedule-field"><span>시간</span><NativeChip name="time" label="시작 시간" type="time" value={time} onChange={updateTime} /><span className="time-between">~</span><NativeChip name="end" label="종료 시간" type="time" value={end} onChange={setEnd} /></div>}
        <div className="schedule-field"><span>하루 종일</span><button type="button" className="switch-control" role="switch" aria-label="하루 종일" aria-checked={allDay} onClick={() => setAllDay(!allDay)}><span aria-hidden="true" /></button></div>
        <div className="schedule-field"><span>여러 날</span><button type="button" className="switch-control" role="switch" aria-label="여러 날" aria-checked={multipleDays} onClick={() => { setMultipleDays(!multipleDays); setEndDate(eventDate) }}><span aria-hidden="true" /></button></div>
        {multipleDays && <div className="schedule-field"><span>종료일</span><NativeChip name="endDate" label="종료일" type="date" value={endDate} onChange={setEndDate} /></div>}
        <p className="schedule-label" id="schedule-owners">누구 일정인가요?</p><div className="schedule-owners" role="group" aria-labelledby="schedule-owners">{(active.length ? active : [{ id: 'family', name: '가족 모두' }]).map((profile) => <button type="button" key={profile.id} aria-label={profile.name} aria-pressed={members.includes(profile.id)} onClick={() => toggleMember(profile.id)}><CharacterAvatar profile={profile} size={48} /><span>{profile.name}</span></button>)}</div>
        <label className="schedule-field"><span>장소</span><input name="location" aria-label="장소" placeholder="선택 사항" /></label>
        <div className="schedule-field"><span>반복</span><div className="ui-segments" role="group" aria-label="반복">{frequencies.map(([value, label]) => <button type="button" key={value} aria-pressed={frequency === value} onClick={() => setFrequency(value)}>{label}</button>)}</div></div>
        {frequency !== 'none' && <div className="schedule-repeat"><label>반복 간격<input className="input-chip" name="interval" type="number" min={1} max={365} defaultValue={1} /></label><label>반복 종료일<input className="input-chip" name="until" type="date" /></label></div>}
        <div className="schedule-field"><span>알림</span><div className="ui-segments" role="group" aria-label="알림"><button type="button" aria-pressed={!reminders.length} onClick={() => setReminders([])}>없음</button>{remindersList.map(([value, label]) => <button type="button" key={value} aria-pressed={reminders.includes(value)} onClick={() => setReminders((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])}>{label}</button>)}</div></div>
        <div className="schedule-field"><span>분류</span><div className="ui-segments" role="group" aria-label="일정 분류"><button type="button" aria-pressed={scope === 'family'} onClick={() => setScope('family')}>가족</button><button type="button" aria-pressed={scope === 'children'} disabled={!active.some((profile) => profile.type === 'child')} onClick={() => setScope('children')}>자녀</button></div></div>
        {scope === 'children' && <div className="schedule-field"><span>종류</span><div className="ui-segments" role="group" aria-label="자녀 일정 종류">{['학교', '학원'].map((value) => <button type="button" key={value} aria-pressed={kind === value} onClick={() => setKind(value)}>{value}</button>)}</div></div>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
      <footer className="schedule-save"><button type="submit" className="primary-button">저장</button></footer>
    </form>
  </Sheet>
}

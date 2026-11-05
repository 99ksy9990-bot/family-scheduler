import { useState } from 'react'
import Sheet from './Sheet'

export default function EventForm({ date, profiles, onSave, onClose }) {
  const [allDay, setAllDay] = useState(true)
  const [scope, setScope] = useState('family')
  const [members, setMembers] = useState(['family'])
  const [frequency, setFrequency] = useState('none')
  const [error, setError] = useState('')
  const children = profiles.filter((profile) => profile.type === 'child')
  const toggle = (id) => setMembers((current) => id === 'family' ? ['family'] : current.includes(id)
    ? current.length > 1 ? current.filter((member) => member !== id) : current
    : [...current.filter((member) => member !== 'family'), id])
  const submit = (event) => {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    if (!values.title.trim()) { setError('일정 이름을 입력해 주세요.'); return }
    if (values.endDate < values.date) { setError('종료일은 시작일보다 빠를 수 없어요.'); return }
    if (!allDay && values.end && values.date === values.endDate && values.end <= values.time) {
      setError('종료 시간은 시작 시간보다 늦게 선택해 주세요.'); return
    }
    const reminders = new FormData(event.currentTarget).getAll('reminders')
    const saved = onSave({ title: values.title.trim(), date: values.date, endDate: values.endDate,
      time: allDay ? '종일' : values.time, end: allDay ? '' : values.end, location: values.location,
      member: members[0] || 'family', members, type: scope === 'children' ? 'child' : 'family',
      calendarScope: scope, ...(scope === 'children' ? { kind: values.kind } : {}),
      reminder: reminders[0] || 'none', reminders,
      ...(frequency !== 'none' ? { recurrence: { frequency, interval: Number(values.interval) || 1, until: values.until || '' } } : {}) })
    if (saved) onClose()
    else setError('일정을 저장할 권한이 없어요. 가족 설정을 확인해 주세요.')
  }
  return <Sheet title="일정 추가" onClose={onClose}>
    <form className="event-form" onSubmit={submit}>
      <label>무슨 일정인가요?<input name="title" required maxLength={200} placeholder="가족 저녁 식사" data-autofocus /></label>
      <div className="form-pair"><label>시작일<input name="date" type="date" defaultValue={date} required /></label><label>종료일<input name="endDate" type="date" defaultValue={date} required /></label></div>
      <label className="check-label"><input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} /> 종일 일정</label>
      {!allDay && <div className="form-pair"><label>시작 시간<input name="time" type="time" defaultValue="09:00" required /></label><label>종료 시간<input name="end" type="time" defaultValue="10:00" /></label></div>}
      <label>장소<input name="location" placeholder="장소를 남겨 주세요" /></label>
      <fieldset><legend>함께할 가족</legend><div className="member-options">{[{ id: 'family', name: '가족 모두' }, ...profiles.filter((profile) => profile.active !== false)].map((profile) => <button type="button" key={profile.id} aria-pressed={members.includes(profile.id)} onClick={() => toggle(profile.id)}>{profile.name}</button>)}</div></fieldset>
      <details><summary>일정 분류·반복·알림</summary>
        <label>달력 분류<select value={scope} onChange={(event) => { setScope(event.target.value); if (event.target.value === 'children') setMembers([children[0].id]) }}><option value="family">가족 일정</option>{children.length > 0 && <option value="children">자녀 일정</option>}</select></label>
        {scope === 'children' && <label>자녀 일정 종류<select name="kind"><option>학원</option><option>학교</option></select></label>}
        <label>반복<select value={frequency} onChange={(event) => setFrequency(event.target.value)}><option value="none">반복 안 함</option><option value="daily">매일</option><option value="weekly">매주</option><option value="monthly">매월</option><option value="yearly">매년</option></select></label>
        {frequency !== 'none' && <div className="form-pair"><label>반복 간격<input name="interval" type="number" min="1" max="365" defaultValue="1" /></label><label>반복 종료일<input name="until" type="date" /></label></div>}
        <fieldset><legend>알림</legend>{[['same-day', '당일'], ['30-minutes', '30분 전'], ['10-minutes', '10분 전']].map(([value, label]) => <label key={value} className="check-label"><input name="reminders" type="checkbox" value={value} />{label}</label>)}<p className="quiet">알림 설정은 저장되며, 푸시 연결은 설정 화면에서 준비할 예정이에요.</p></fieldset>
      </details>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary-button" type="submit">일정 저장</button>
    </form>
  </Sheet>
}

import { NativeChip } from '../../components/EventForm'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, iso } from '../../../lib/dates'
import { holidaysForYear } from '../../../lib/holidays'
import { DEFAULT_SHIFT_TYPES } from '../../../lib/legacyState'
import { LEAVES } from '../../data/schedule'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

// 상주 근무: 요일·시간·공휴일 쉼. 프로필 regularWork 필드(추가 필드)에 저장.
export function RegularWorkEditor({ profile, canEdit, onSave, onCancel }) {
  const init = profile.regularWork || { weekdays: [1, 2, 3, 4, 5], start: '08:00', end: '17:00', skipHolidays: true }
  const [w, setW] = useState(init)
  const toggle = (d) => setW((v) => ({ ...v, weekdays: v.weekdays.includes(d) ? v.weekdays.filter((x) => x !== d) : [...v.weekdays, d].sort() }))
  return <div className="work-editor">
    <ul className="grouped-list form-like">
      <li className="grouped-row"><span className="grouped-body"><strong>요일</strong></span><span className="day-pick" role="group" aria-label="근무 요일">{DAYS.map((n, d) => <button type="button" key={d} aria-pressed={w.weekdays.includes(d)} onClick={() => toggle(d)}>{n}</button>)}</span></li>
      <li className="grouped-row"><span className="grouped-body"><strong>시작</strong></span><NativeChip label="시작" type="time" value={w.start} onChange={(v) => setW({ ...w, start: v })} /></li>
      <li className="grouped-row"><span className="grouped-body"><strong>끝</strong></span><NativeChip label="끝" type="time" value={w.end} onChange={(v) => setW({ ...w, end: v })} /></li>
      <li className="grouped-row"><label className="grouped-body switch-row"><strong>공휴일은 쉬어요</strong><input type="checkbox" role="switch" className="ios-switch" checked={w.skipHolidays !== false} onChange={(e) => setW({ ...w, skipHolidays: e.target.checked })} /></label></li>
    </ul>
    <div className="work-actions">
      <button className="primary-button" disabled={!canEdit || !w.weekdays.length || !w.start || !w.end} onClick={() => onSave(w)}>저장</button>
      {profile.regularWork && <button className="danger-button" disabled={!canEdit} onClick={() => onSave(null)}>상주 근무 끄기</button>}
      <button onClick={onCancel}>취소</button>
    </div>
  </div>
}

// 교대 근무표: 근무 종류를 고르고 날짜를 톡톡 눌러 칠하기. shifts 컬렉션(옛 앱과 같은 형식)에 바로 저장.
export function ShiftMonthEditor({ profile, state, updateState, canEdit }) {
  const types = state.workSettings.shiftTypes?.length ? state.workSettings.shiftTypes : DEFAULT_SHIFT_TYPES
  const [brush, setBrush] = useState(types[0]?.id)
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const mine = new Map(state.shifts.filter((s) => s.member === profile.id).map((s) => [s.date, s.shift]))
  const start = addDays(month, -month.getDay())
  const weeks = Math.ceil((month.getDay() + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7)
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i))
  const holidays = holidaysForYear(month.getFullYear())
  const paint = (date) => {
    if (!canEdit) return
    const key = iso(date)
    const next = mine.get(key) === brush ? null : brush // 같은 걸 다시 누르면 지움
    updateState((current) => ({ ...current, shifts: [...current.shifts.filter((s) => !(s.member === profile.id && s.date === key)), ...(next ? [{ id: crypto.randomUUID(), member: profile.id, date: key, shift: next }] : [])] }))
  }
  const code = (id) => id === 'off' ? 'OFF' : types.find((t) => t.id === id)?.code || ''
  // 한 번에 넣기: "D D E N N OFF ..." 처럼 1일부터 차례로. 연·교육·공가 등 모르는 글자는 OFF로
  const [bulk, setBulk] = useState('')
  const applyBulk = () => {
    const tokens = bulk.trim().split(/[\s,]+/).filter(Boolean)
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    if (!tokens.length || !canEdit) return
    if (!window.confirm(`${month.getMonth() + 1}월 1일부터 ${Math.min(tokens.length, last)}일까지 덮어쓸까요?`)) return
    const idFor = (t) => types.find((x) => x.code?.toUpperCase() === t.toUpperCase())?.id || 'off'
    const rows = tokens.slice(0, last).map((t, i) => ({ id: crypto.randomUUID(), member: profile.id, date: iso(new Date(month.getFullYear(), month.getMonth(), i + 1)), shift: idFor(t) }))
    const keys = new Set(rows.map((r) => r.date))
    updateState((current) => ({ ...current, shifts: [...current.shifts.filter((x) => !(x.member === profile.id && keys.has(x.date))), ...rows] }))
    setBulk('')
  }
  return <div className="work-editor">
    <div className="shift-brush" role="group" aria-label="근무 종류">{types.map((t) => <button type="button" key={t.id} data-shift={t.id} aria-pressed={brush === t.id} onClick={() => setBrush(t.id)}><b>{t.id === 'off' ? 'OFF' : t.code}</b><small>{t.id === 'off' ? '휴무' : t.start}</small></button>)}</div>
    <p className="quiet">근무 종류를 고르고 날짜를 누르세요. 같은 날을 다시 누르면 지워져요.</p>
    <div className="shift-month-head month-arrows"><button aria-label="이전 달" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={18} /></button><b>{month.getFullYear()}년 {month.getMonth() + 1}월</b><button aria-label="다음 달" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={18} /></button></div>
    <div className="shift-grid">
      {DAYS.map((d) => <span key={d} className="shift-wd">{d}</span>)}
      {cells.map((d) => { const key = iso(d); const s = mine.get(key); return <button type="button" key={key} className={`shift-cell${d.getMonth() !== month.getMonth() ? ' other' : ''}${d.getDay() === 0 || holidays.has(key) ? ' sun' : ''}`} data-shift={s || ''} aria-label={`${d.getMonth() + 1}월 ${d.getDate()}일 ${s ? code(s) : '비어 있음'}`} onClick={() => paint(d)}><span>{d.getDate()}</span><b>{s ? code(s) : ''}</b></button> })}
    </div>
    {canEdit && <details className="form-disclosure bulk-shift"><summary>한 달 한 번에 넣기 ›</summary>
      <p className="quiet">1일부터 차례로 코드를 띄어 쓰세요. 예: D D E N N OFF OFF … (연차·교육은 OFF)</p>
      <textarea aria-label="한 달 근무 코드" rows={3} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder="D D E N N OFF OFF" />
      <button type="button" className="primary-button" disabled={!bulk.trim()} onClick={applyBulk}>{month.getMonth() + 1}월에 넣기</button>
    </details>}
  </div>
}

// 연차·반차: 종류를 고르고 날짜를 눌러 표시. profile.regularWork.leaves에 저장.
export function LeaveMonthEditor({ profile, canEdit, onSave }) {
  const [brush, setBrush] = useState('full')
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const leaves = profile.regularWork?.leaves || {}
  const start = addDays(month, -month.getDay())
  const weeks = Math.ceil((month.getDay() + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7)
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i))
  const holidays = holidaysForYear(month.getFullYear())
  const paint = (date) => {
    if (!canEdit) return
    const key = iso(date)
    const next = { ...leaves }
    if (next[key] === brush) delete next[key]; else next[key] = brush
    onSave({ ...profile.regularWork, leaves: next })
  }
  return <div className="work-editor">
    <div className="shift-brush" role="group" aria-label="휴가 종류">{Object.entries(LEAVES).map(([id, t]) => <button type="button" key={id} data-shift="off" aria-pressed={brush === id} onClick={() => setBrush(id)}><b>{t.code}</b><small>{t.off}</small></button>)}</div>
    <p className="quiet">종류를 고르고 날짜를 누르세요. 같은 날을 다시 누르면 지워져요.</p>
    <div className="shift-month-head month-arrows"><button aria-label="이전 달" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={18} /></button><b>{month.getFullYear()}년 {month.getMonth() + 1}월</b><button aria-label="다음 달" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={18} /></button></div>
    <div className="shift-grid">
      {DAYS.map((d) => <span key={d} className="shift-wd">{d}</span>)}
      {cells.map((d) => { const key = iso(d); const l = LEAVES[leaves[key]]; return <button type="button" key={key} className={`shift-cell${d.getMonth() !== month.getMonth() ? ' other' : ''}${d.getDay() === 0 || holidays.has(key) ? ' sun' : ''}`} data-shift={l ? 'off' : ''} data-leave={leaves[key] || undefined} aria-label={`${d.getMonth() + 1}월 ${d.getDate()}일 ${l ? l.label : '비어 있음'}`} onClick={() => paint(d)}><span>{d.getDate()}</span><b>{l ? l.code : ''}</b></button> })}
    </div>
  </div>
}

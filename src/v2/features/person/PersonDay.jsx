import ArrowText from '../../components/ArrowText'
import DayIcon from '../../components/DayIcon'
import { kindOf, personColor } from '../../data/kinds'
import { useState } from 'react'
import { BriefcaseBusiness, CalendarDays, GraduationCap, Check } from 'lucide-react'
import { addDays } from '../../../lib/dates'
import Sheet from '../../components/Sheet'
import CharacterAvatar from '../../components/CharacterAvatar'
import RowEditor from '../../components/RowEditor'
import TimeCell from '../../components/TimeCell'
import { houseStatus } from '../../data/house'
import { scheduleForDate } from '../../data/schedule'
import { personDayRows, editTarget } from '../../data/personDay'
import { toggleTask } from '../../data/tasks'


export default function PersonDay({ memberId, state, today, now, updateState, canEdit, onClose }) {
  const [editing, setEditing] = useState(null)
  const [skipped, setSkipped] = useState(null)
  const profile = state.profiles.find((item) => item.id === memberId)
  if (!profile) return null
  if (editing) return <RowEditor row={editing} state={state} today={today} updateState={updateState} canEdit={canEdit} onChange={setEditing} onSkip={(exception, title) => setSkipped({ exception, title })} />
  const status = houseStatus(profile, scheduleForDate(state, today), state.tasks, today, now, state.shifts)
  const renderRow = (row, label, date, grouped = false) => {
    return <div className={`person-row${row.carryover ? ' is-carryover' : ''}${grouped ? ' is-grouped' : ''}`} key={row.id}>
      {!grouped && (row.task ? <label className="round-check"><input type="checkbox" aria-label={`${label} ${row.title} 완료`} checked={Boolean(row.done)} disabled={!canEdit} onChange={() => updateState((current) => ({ ...current, tasks: toggleTask(current.tasks, row, date) }))} /><span aria-hidden="true">{row.done && <Check size={16} />}</span></label>
        : <DayIcon kind={kindOf(row)} />)}
      <button className="person-row-body" disabled={!canEdit || !editTarget(row, state).record} onClick={() => setEditing(row)}><strong className={row.done ? 'task-done' : ''}>{row.title}</strong>{(row.task || row.kind || row.location) && <small>{row.task ? '할 일' : [row.kind, row.location].filter(Boolean).join(' · ')}</small>}</button><TimeCell row={row} />
    </div>
  }
  return <Sheet title={`${profile.name}의 하루`} onClose={onClose} className="person-sheet" closeText>
    <div className="person-hero" data-character={profile.characterId || 'unknown'}><CharacterAvatar profile={profile} expression={status.expression} size={96} glass /><h2>{profile.name}</h2><p>{status.badge ? `${status.badge} · ${<ArrowText text={status.detail} />}` : status.detail}</p></div>
    {[['오늘', today], ['내일', addDays(today, 1)]].map(([label, date]) => {
      const rows = personDayRows(state, memberId, date, today)
      return <section className="person-section" key={label} style={{ '--pc': personColor(profile) }}><h3 className="house-section-title">{label}</h3>{rows.length ? <ul className="grouped-list" aria-label={`${label}의 일정과 할 일`}>{rows.map((row) => [row]).map((group) => <li className={group.length > 1 ? 'person-shift-group' : 'person-item'} key={group[0].id}>{group.length > 1 ? <><DayIcon kind="shift" /><div>{group.map((row) => renderRow(row, label, date, true))}</div></> : renderRow(group[0], label, date)}</li>)}</ul> : <div className="empty-state">{label} 일정과 할 일이 없어요.</div>}</section>
    })}
    {skipped && <div role="status" className="undo-toast">{skipped.title}을(를) 이 날만 뺐어요.<button onClick={() => { updateState((current) => ({ ...current, scheduleExceptions: current.scheduleExceptions.filter((item) => item.id !== skipped.exception.id) })); setSkipped(null) }}>되돌리기</button></div>}
  </Sheet>
}

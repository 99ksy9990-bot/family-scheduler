import { useState } from 'react'
import { Briefcase, CalendarDays, ChevronLeft, ChevronRight, GraduationCap, Plus } from 'lucide-react'
import { MEMBER_COLORS } from '../../../lib/colors'
import { DEFAULT_SHIFT_TYPES } from '../../../lib/legacyState'
import CharacterAvatar from '../../components/CharacterAvatar'
import { GroupedList, GroupedRow } from '../../components/GroupedList'
import { clock } from '../../data/schedule'
import Family from './Family'

const CHARACTERS = ['dad', 'mom', 'big', 'little']
const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const icon = (Icon, tone) => <span className="settings-color-icon" data-tone={tone}><Icon size={19} /></span>
const md = (date) => `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`
const days = (row) => (row.weekdays || [row.weekday]).filter((d) => d !== undefined).map((d) => DAYS[d]).join('·')

// 구성원 한 사람 화면. 각 행은 그 항목만 편집하는 화면(Family editorOnly)을 연다.
export default function MemberDetail({ profile, state, updateState, canEdit, onBack }) {
  const [edit, setEdit] = useState(null) // { section, record, title }
  const [undo, setUndo] = useState(false)
  const child = profile.type === 'child'
  const works = state.workSettings.workerIds?.includes(profile.id)
  const mine = (row) => row.member === profile.id || row.members?.includes(profile.id)
  const lessons = state.childSchedules.filter(mine).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  const school = state.childProfiles.find((row) => row.member === profile.id)
  const periods = state.schedulePeriods.filter((row) => row.member === profile.id || row.member === 'all')
  const shifts = state.shifts.filter((row) => row.member === profile.id).sort((a, b) => b.date.localeCompare(a.date))
  const types = state.workSettings.shiftTypes?.length ? state.workSettings.shiftTypes : DEFAULT_SHIFT_TYPES
  const set = (patch) => updateState((current) => ({ ...current, profiles: current.profiles.map((item) => item.id === profile.id ? { ...item, ...patch } : item) }))
  const usedColors = state.profiles.filter((p) => p.id !== profile.id && p.active !== false).map((p) => p.color)
  const open = (section, title, record = {}) => canEdit && setEdit({ section, title, record: { member: profile.id, ...record } })
  const hide = () => { set({ active: false }); setUndo(true) }

  if (edit) return <div className="member-page">
    <nav className="member-nav"><button className="text-button" onClick={() => setEdit(null)}><ChevronLeft size={20} />{profile.name}</button></nav>
    <h2 className="member-edit-title">{edit.title}</h2>
    <Family state={state} updateState={updateState} canEdit={canEdit} editorOnly initialSection={edit.section} initialRecord={edit.record} onSaved={() => setEdit(null)} onCancel={() => setEdit(null)} />
  </div>

  const row = (key, ic, title, subtitle, onClick) => <GroupedRow key={key} icon={ic} title={title} subtitle={subtitle} value={<ChevronRight size={18} />} onClick={onClick} />
  const addRow = (key, label, onClick) => <GroupedRow key={key} className="member-add" icon={<span className="settings-color-icon" data-tone="add"><Plus size={19} /></span>} title={label} onClick={onClick} />

  return <div className="member-page">
    <nav className="member-nav"><button className="text-button" onClick={onBack}><ChevronLeft size={20} />가족</button></nav>
    <header className="member-hero">
      <CharacterAvatar profile={profile} size={92} glass />
      <h2>{profile.name}</h2>
      <p>{[child ? '아이' : '어른', school && [school.school, school.grade && `${school.grade}학년`].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}</p>
    </header>

    {!child && <section><h3 className="house-section-title">근무</h3><GroupedList label="근무">
      {works ? <>
        {row('types', icon(Briefcase, 'work'), '근무 유형', types.filter((t) => t.id !== 'off').map((t) => `${t.code} ${clock(t.start)}`).join(' · '), () => open('work', '근무 유형'))}
        {row('shifts', icon(CalendarDays, 'orange'), '근무표', shifts[0] ? `${shifts.length}일 입력 · 최근 ${md(shifts[0].date)}` : '아직 없음', () => open('shifts', '근무 추가'))}
      </> : addRow('work-on', '근무표 쓰기', () => canEdit && updateState((current) => ({ ...current, workSettings: { ...current.workSettings, enabled: true, workerIds: [...new Set([...(current.workSettings.workerIds || []), profile.id])] } })))}
    </GroupedList></section>}

    {child && <><section><h3 className="house-section-title">학교</h3><GroupedList label="학교">
      {row('school', icon(GraduationCap, 'green'), '학교 정보', school ? [school.school, school.grade && `${school.grade}학년 ${school.classNumber || ''}반`].filter(Boolean).join(' ') : '아직 없음', () => open('schools', '학교 정보', school))}
      {periods.map((p) => row(p.id, icon(CalendarDays, 'orange'), p.season === 'vacation' ? '방학' : '학기', `${p.start} – ${p.end}`, () => open('periods', '학기·방학', p)))}
      {addRow('period-add', '학기·방학 추가', () => open('periods', '학기·방학 추가', { member: profile.id }))}
    </GroupedList></section>
    <section><h3 className="house-section-title">시간표</h3><GroupedList label="시간표">
      {lessons.map((l) => row(l.id, <span className={`kind-chip${l.kind === '학원' ? ' academy' : ''}`}>{l.kind || '학원'}</span>, l.title, `${days(l)} ${clock(l.time)}${l.end ? `–${clock(l.end)}` : ''}${l.season === 'vacation' ? ' · 방학' : ''}`, () => open('schedules', l.title, l)))}
      {addRow('lesson-add', '수업·학원 추가', () => open('schedules', '수업·학원 추가'))}
    </GroupedList></section></>}

    {works && shifts.length > 0 && <section><h3 className="house-section-title">최근 근무</h3><GroupedList label="최근 근무">
      {shifts.slice(0, 5).map((s) => { const t = types.find((x) => x.id === s.shift); return row(s.date, icon(Briefcase, 'work'), md(s.date), t ? `${t.code} ${t.id === 'off' ? '' : `${clock(t.start)}–${clock(t.end)}`}` : s.shift, () => open('shifts', '근무 바꾸기', s)) })}
    </GroupedList></section>}

    <section><h3 className="house-section-title">모습</h3><GroupedList label="모습">
      <GroupedRow title="캐릭터" value={<span className="member-pick" role="group" aria-label="캐릭터">{CHARACTERS.map((id) => <button key={id} aria-pressed={profile.characterId === id} aria-label={id} disabled={!canEdit} onClick={() => set({ characterId: id })}><CharacterAvatar profile={{ characterId: id }} size={36} /></button>)}</span>} />
      <GroupedRow title="대표 색" value={<span className="member-pick" role="group" aria-label="대표 색">{MEMBER_COLORS.slice(0, 6).map((c) => <button key={c.id} className="member-color" style={{ '--swatch': c.color }} aria-pressed={profile.color === c.color} aria-label={`대표색 ${c.id}`} disabled={!canEdit || usedColors.includes(c.color)} onClick={() => set({ color: c.color, tone: c.tone, colorCustomized: true })} />)}</span>} />
      <GroupedRow title="이름" value={<input className="member-name" defaultValue={profile.name} disabled={!canEdit} aria-label="이름" onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== profile.name && set({ name: e.target.value.trim(), initials: e.target.value.trim().slice(0, 1) })} />} />
    </GroupedList></section>

    {canEdit && <GroupedList label="숨기기"><li className="grouped-row"><button className="grouped-action member-hide" onClick={hide}>구성원 숨기기</button></li></GroupedList>}
    {undo && <div role="status" className="undo-toast">{profile.name}님을 숨겼어요. 일정은 그대로 남아요.<button onClick={() => { set({ active: true }); setUndo(false) }}>되돌리기</button></div>}
  </div>
}

import DayIcon from '../../components/DayIcon'
import { periodName, periodParts } from '../../data/periods'
import { iso } from '../../../lib/dates'
import { scheduleInPeriod, seasonOf } from '../../../lib/schedule'
import { useState } from 'react'
import { Briefcase, CalendarDays, ChevronRight, GraduationCap, Plus, Ruler, X } from 'lucide-react'
import { MEMBER_COLORS } from '../../../lib/colors'
import { DEFAULT_SHIFT_TYPES } from '../../../lib/legacyState'
import CharacterAvatar, { CHARACTERS, MINI, READY, roleOf } from '../../components/CharacterAvatar'
import { GroupedList, GroupedRow } from '../../components/GroupedList'
import { clock } from '../../data/schedule'
import Family from './Family'
import GrowthChart from '../../components/GrowthChart'
import { compareToPeers, medianAt } from '../../data/growth'
import { RegularWorkEditor, ShiftMonthEditor, LeaveMonthEditor } from './WorkEditors'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const PIC = new Map([[Briefcase, 'work'], [CalendarDays, 'event'], [GraduationCap, 'school']]) // 손그림 아이콘
const icon = (Icon, tone) => PIC.has(Icon) ? <span className="day-icon" data-tone={PIC.get(Icon)} style={{ width: 40, height: 40 }}><img src={`/icons/kind/${PIC.get(Icon)}.png`} alt="" width={26} height={26} /></span> : <span className="settings-color-icon" data-tone={tone}><Icon size={19} /></span>
const md = (date) => `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`
const days = (row) => (row.weekdays || [row.weekday]).filter((d) => d !== undefined).map((d) => DAYS[d]).join('·')

// 구성원 한 사람 화면. 각 행은 그 항목만 편집하는 화면(Family editorOnly)을 연다.
// 폴더 경로처럼: 가족 › 아빠 › 상주 근무 (앞 칸을 누르면 그 단계로)
const crumbs = (items) => <nav className="crumbs" aria-label="위치">{items.map(([label, go], i) => <span key={i} className="crumb">{i > 0 && <ChevronRight size={18} aria-hidden="true" className="crumb-sep" />}{go ? <button type="button" onClick={go}>{label}</button> : <strong aria-current="page">{label}</strong>}</span>)}</nav>

export default function MemberDetail({ profile, state, updateState, canEdit, onBack }) {
  const [showPast, setShowPast] = useState(false) // 지난 학기는 접어 둠
  const [edit, setEdit] = useState(null) // { section, record, title }
  const [addingGrowth, setAddingGrowth] = useState(false)
  const [showAllGrowth, setShowAllGrowth] = useState(false)
  const works = state.workSettings.workerIds?.includes(profile.id)
  const mode = profile.regularWork ? 'regular' : works ? 'shift' : null
  // 근무가 있으면 근무만, 학교·수업이 있으면 학교만, 둘 다 없으면 둘 다 보여 고르게
  const hasSchool = state.childProfiles.some((row) => row.member === profile.id) || state.childSchedules.some((row) => row.member === profile.id || row.members?.includes(profile.id))
  // 상주 ↔ 교대 바꾸기. 교대 기록(shifts)은 지우지 않고 근무자 목록만 바꿈
  const setMode = (next) => {
    if (next === mode) return
    const workerIds = (state.workSettings.workerIds || []).filter((id) => id !== profile.id)
    updateState((current) => ({ ...current,
      profiles: current.profiles.map((p) => p.id === profile.id ? { ...p, regularWork: next === 'regular' ? { weekdays: [1, 2, 3, 4, 5], start: '08:00', end: '17:00', skipHolidays: true } : undefined } : p),
      workSettings: { ...current.workSettings, enabled: next === 'shift' ? true : current.workSettings.enabled, workerIds: next === 'shift' ? [...workerIds, profile.id] : workerIds } }))
  }
  const mine = (row) => row.member === profile.id || row.members?.includes(profile.id)
  const lessons = state.childSchedules.filter(mine).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  const school = state.childProfiles.find((row) => row.member === profile.id)
  const periods = state.schedulePeriods.filter((row) => row.member === profile.id || row.member === 'all').toSorted((a, b) => { // 지금 학기 → 앞으로 → 지난 것(최근 먼저)
    const t = iso(new Date()), rank = (p) => (p.start <= t && t <= p.end ? 0 : p.start > t ? 1 : 2)
    return rank(a) - rank(b) || (rank(a) === 2 ? (b.start || '').localeCompare(a.start || '') : (a.start || '').localeCompare(b.start || ''))
  })
  const todayKey = iso(new Date())
  const dot = (d) => (d || '').slice(2).replaceAll('-', '.')
  const shifts = state.shifts.filter((row) => row.member === profile.id).sort((a, b) => b.date.localeCompare(a.date))
  const types = state.workSettings.shiftTypes?.length ? state.workSettings.shiftTypes : DEFAULT_SHIFT_TYPES
  const set = (patch) => updateState((current) => ({ ...current, profiles: current.profiles.map((item) => item.id === profile.id ? { ...item, ...patch } : item) }))
  const usedColors = state.profiles.filter((p) => p.id !== profile.id && p.active !== false).map((p) => p.color)
  // 키·몸무게 기록은 구성원 프로필에 날짜별로 (최근 먼저)
  const growth = [...(profile.growth || [])].sort((a, b) => b.date.localeCompare(a.date))
  const setGrowth = (list) => set({ growth: list })
  // 최근 기록을 2017 성장도표 또래(같은 나이·성별)와 비교. 만 19세가 되면 비교 안 함
  const peerReady = Boolean(profile.birthDate && profile.sex)
  const latestOf = (k) => growth.find((g) => g[k])
  const peer = !peerReady ? [] : [['height', '키', 'cm'], ['weight', '몸무게', 'kg']].map(([k, label, unit]) => { const g = latestOf(k); const c = g && compareToPeers(k, profile.sex, profile.birthDate, g.date, g[k]); return c && `${label} ${g[k]}${unit} · 또래 평균 ${c.median}${unit} · ${c.top <= 3 ? '상위 3% 이내' : c.top >= 97 ? '하위 3% 이내' : `상위 ${c.top}%`}` }).filter(Boolean)
  const open = (section, title, record = {}) => canEdit && setEdit({ section, title, record: { member: profile.id, ...record } })

  if (edit) return <div className="member-page">
    {crumbs([['가족', onBack], [profile.name, () => setEdit(null)], [edit.title]])}
    {edit.section === 'regular' ? <RegularWorkEditor profile={profile} canEdit={canEdit} onCancel={() => setEdit(null)} onSave={(regularWork) => { set({ regularWork }); setEdit(null) }} />
      : edit.section === 'leave' ? <LeaveMonthEditor profile={profile} canEdit={canEdit} onSave={(regularWork) => set({ regularWork })} />
      : edit.section === 'month' ? <ShiftMonthEditor profile={profile} state={state} updateState={updateState} canEdit={canEdit} />
        : <Family state={state} updateState={updateState} canEdit={canEdit} editorOnly initialSection={edit.section} initialRecord={edit.record} onSaved={() => setEdit(null)} onCancel={() => setEdit(null)} />}
  </div>

  const row = (key, ic, title, subtitle, onClick) => <GroupedRow key={key} icon={ic} title={title} subtitle={subtitle} value={<ChevronRight size={18} />} onClick={onClick} />
  const addRow = (key, label, onClick) => <GroupedRow key={key} className="member-add" icon={<span className="settings-color-icon" data-tone="add"><Plus size={19} /></span>} title={label} onClick={onClick} />

  return <div className="member-page">
    {crumbs([['가족', onBack], [profile.name]])}
    <header className="member-hero">
      <CharacterAvatar profile={profile} size={92} glass />
      <h2 className="visually-hidden">{profile.name}</h2>
      <p>{[school && [school.school, school.grade && `${school.grade}학년`].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}</p>
    </header>

    {!hasSchool && <section><h3 className="house-section-title">근무</h3>
      <div className="ui-segments work-mode" role="group" aria-label="근무 방식">{[['regular', '상주 근무'], ['shift', '교대 근무'], [null, '근무 없음']].map(([id, label]) => <button type="button" key={label} aria-pressed={mode === id} disabled={!canEdit} onClick={() => setMode(id)}>{label}</button>)}</div>
      {mode && <GroupedList label="근무">
      {mode === 'regular' ? <>
      {row('regular', icon(Briefcase, 'work'), '상주 근무', profile.regularWork ? `${profile.regularWork.weekdays.map((d) => DAYS[d]).join('·')} ${profile.regularWork.start}–${profile.regularWork.end}${profile.regularWork.skipHolidays !== false ? ' · 공휴일 쉼' : ''}` : '요일과 시간을 정해요', () => open('regular', '상주 근무'))}
      {row('leave', icon(CalendarDays, 'green'), '연차·반차', (() => { const n = Object.keys(profile.regularWork.leaves || {}).length; return n ? `${n}일 입력` : '쉬는 날을 달력에서 골라요' })(), () => open('leave', '연차·반차'))}
      </> : <>
      {row('month', icon(CalendarDays, 'orange'), '교대 근무표', shifts.length ? `${shifts.length}일 입력 · 최근 ${md(shifts[0].date)}` : '날짜를 눌러 D·E·N을 넣어요', () => { if (!canEdit) return; if (!works) updateState((current) => ({ ...current, workSettings: { ...current.workSettings, enabled: true, workerIds: [...new Set([...(current.workSettings.workerIds || []), profile.id])] } })); setEdit({ section: 'month', title: '교대 근무표' }) })}
      {row('types', icon(Briefcase, 'work'), '근무 종류·시간', types.filter((t) => t.id !== 'off').map((t) => `${t.code} ${clock(t.start)}`).join(' · '), () => open('work', '근무 종류·시간'))}
      </>}
    </GroupedList>}</section>}

    {!mode && <><section><h3 className="house-section-title">학교</h3><GroupedList label="학교">
      {row('school', icon(GraduationCap, 'green'), '학교 정보', school ? [school.school, school.grade && `${school.grade}학년 ${school.classNumber || ''}반`].filter(Boolean).join(' ') : '아직 없음', () => open('schools', '학교 정보', school))}
      {periods.filter((p) => showPast || !(p.end < todayKey)).map((p) => row(p.id, icon(CalendarDays, seasonOf(p.season) === '방학' ? 'blue' : 'orange'), `${periodName(p, school)}${p.start <= todayKey && todayKey <= p.end ? ' (지금)' : ''}`, `${dot(p.start)} – ${dot(p.end)}`, () => { const parts = periodParts(p, school); open('periods', '학기·방학', { ...p, term: parts.term, grade: parts.grade ? String(parts.grade) : p.grade }) }))}
      {periods.some((p) => p.end < todayKey) && <GroupedRow key="past-toggle" className="past-toggle" title={showPast ? '지난 학기 접기' : `지난 학기 ${periods.filter((p) => p.end < todayKey).length}개 보기`} onClick={() => setShowPast((v) => !v)} />}
      {addRow('period-add', '학기·방학 추가', () => open('periods', '학기·방학 추가', { member: profile.id }))}
    </GroupedList></section>
    {[...periods.filter((p) => showPast || !(p.end < todayKey)).map((p) => ({ key: p.id, title: `${periodName(p, school)}${p.start <= todayKey && todayKey <= p.end ? ' (지금)' : ''}`, list: lessons.filter((l) => scheduleInPeriod(l, p)), add: { season: p.season, periodId: p.id } })),
      ...(periods.length ? [] : [{ key: 'none', title: '시간표', list: lessons, add: { season: '학기' } }])].map((g) => <section key={g.key}><h3 className="house-section-title">{g.title}</h3><GroupedList label={g.title}>
      {g.list.map((l) => row(`${g.key}-${l.id}`, <DayIcon kind={l.kind || '학원'} />, l.title, `${days(l)} ${clock(l.time)}${l.end ? `–${clock(l.end)}` : ''}${l.toDate ? ` · ${dot(l.toDate)}까지` : l.periodId ? '' : ` · ${seasonOf(l.season) || '학기'} 전체`}`, () => open('schedules', l.title, l)))}
      {addRow(`add-${g.key}`, '수업·학원 추가', () => open('schedules', '수업·학원 추가', g.add))}
    </GroupedList></section>)}</>}

    {works && shifts.length > 0 && <section><h3 className="house-section-title">최근 근무</h3><GroupedList label="최근 근무">
      {shifts.slice(0, 5).map((s) => { const t = types.find((x) => x.id === s.shift); return row(s.date, icon(Briefcase, 'work'), md(s.date), t ? `${t.code} ${t.id === 'off' ? '' : `${clock(t.start)}–${clock(t.end)}`}` : s.shift, () => canEdit && setEdit({ section: 'month', title: '교대 근무표' })) })}
    </GroupedList></section>}

    <section><h3 className="house-section-title">키·몸무게</h3>{growth.length > 0 && <GrowthChart records={growth} median={peerReady ? (kind, date) => medianAt(kind, profile.sex, profile.birthDate, date) : null} />}
      {peer.length > 0 && <p className="growth-peer">{peer.map((line) => <span key={line}>{line}</span>)}</p>}
      {profile.type === 'child' && <GroupedList label="또래 비교 정보">
        <GroupedRow title="생일" subtitle={peerReady ? '' : '생일·성별을 넣으면 또래와 비교해요'} value={<input className="member-name" type="date" aria-label="생일" defaultValue={profile.birthDate || ''} disabled={!canEdit} onChange={(e) => e.target.value && set({ birthDate: e.target.value })} />} />
        <GroupedRow title="성별" value={<span className="ui-segments growth-sex" role="group" aria-label="성별">{[['M', '남'], ['F', '여']].map(([id, label]) => <button key={id} type="button" aria-pressed={profile.sex === id} disabled={!canEdit} onClick={() => set({ sex: id })}>{label}</button>)}</span>} />
      </GroupedList>}
      <GroupedList label="키·몸무게">
      {growth.slice(0, showAllGrowth ? undefined : 5).map((g, i) => { const prev = growth[i + 1]; const diff = prev && g.height && prev.height ? Math.round((g.height - prev.height) * 10) / 10 : null
        return <GroupedRow key={g.date} icon={icon(Ruler, 'green')} title={[g.height && `${g.height}cm`, g.weight && `${g.weight}kg`].filter(Boolean).join(' · ')} subtitle={[dot(g.date), diff ? `지난번보다 ${diff > 0 ? '+' : ''}${diff}cm` : ''].filter(Boolean).join(' · ')} value={canEdit && <button type="button" className="growth-del" aria-label={`${dot(g.date)} 기록 지우기`} onClick={() => window.confirm(`${dot(g.date)} 기록을 지울까요?`) && setGrowth(growth.filter((x) => x.date !== g.date))}><X size={16} /></button>} /> })}
      {growth.length > 5 && <GroupedRow key="growth-more" className="past-toggle" title={showAllGrowth ? '접기' : `지난 기록 ${growth.length - 5}개 더 보기`} onClick={() => setShowAllGrowth((v) => !v)} />}
      {addingGrowth ? <li className="grouped-row"><form className="growth-form" onSubmit={(e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); const height = Number(f.height) || undefined, weight = Number(f.weight) || undefined; if (!f.date || (!height && !weight)) return; setGrowth([{ date: f.date, height, weight }, ...growth.filter((x) => x.date !== f.date)]); setAddingGrowth(false) }}>
        <label>날짜<input name="date" type="date" defaultValue={todayKey} required /></label>
        <label>키(cm)<input name="height" type="number" inputMode="decimal" step="0.1" min="30" max="250" defaultValue={growth[0]?.height || ''} /></label>
        <label>몸무게(kg)<input name="weight" type="number" inputMode="decimal" step="0.1" min="1" max="250" defaultValue={growth[0]?.weight || ''} /></label>
        <div className="growth-actions"><button type="button" onClick={() => setAddingGrowth(false)}>취소</button><button className="primary-button">저장</button></div>
      </form></li> : canEdit && addRow('growth-add', '키·몸무게 기록', () => setAddingGrowth(true))}
    </GroupedList></section>

    <section><h3 className="house-section-title">모습</h3><GroupedList label="모습">
      <GroupedRow title="캐릭터" value={<span className="member-pick" role="group" aria-label="캐릭터">{CHARACTERS.slice(0, 4).map((id) => <button key={id} aria-pressed={profile.characterId === id} aria-label={id} disabled={!canEdit} onClick={() => set({ characterId: id })}><CharacterAvatar profile={{ characterId: id }} size={36} /></button>)}</span>} />
      <GroupedRow title="치이카와" value={<span className="member-pick" role="group" aria-label="치이카와 캐릭터">{MINI.filter((id) => READY.includes(id)).map((id) => <button key={id} aria-pressed={profile.characterId === id} aria-label={id} disabled={!canEdit} onClick={() => set({ characterId: id, baseCharacter: roleOf(profile) })}><CharacterAvatar profile={{ characterId: id }} size={36} /></button>)}</span>} />
      <GroupedRow title="대표 색" value={<span className="member-pick" role="group" aria-label="대표 색">{MEMBER_COLORS.slice(0, 6).map((c) => <button key={c.id} className="member-color" style={{ '--swatch': c.color }} aria-pressed={profile.color === c.color} aria-label={`대표색 ${c.id}`} disabled={!canEdit || usedColors.includes(c.color)} onClick={() => set({ color: c.color, tone: c.tone, colorCustomized: true })} />)}</span>} />
      <GroupedRow title="이름" value={<input className="member-name" defaultValue={profile.name} disabled={!canEdit} aria-label="이름" onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== profile.name && set({ name: e.target.value.trim(), initials: e.target.value.trim().slice(0, 1) })} />} />
    </GroupedList></section>

  </div>
}

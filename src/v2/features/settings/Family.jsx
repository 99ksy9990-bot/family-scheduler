import { periodName } from '../../data/periods'
import { clock } from '../../data/schedule'
import { NativeChip } from '../../components/EventForm'
import { useState } from 'react'
import { MEMBER_COLORS } from '../../../lib/colors'
import CharacterAvatar from '../../components/CharacterAvatar'
import Records from './Records'
import { DEFAULT_SHIFT_TYPES } from '../../../lib/legacyState'

const characters = [['dad', '아빠'], ['mom', '엄마'], ['big', '큰딸'], ['little', '작은딸']]

export default function Family({ state, updateState, canEdit, initialProfile, initialSection = 'profiles', initialRecord, editorOnly = false, onSaved, onCancel }) {
  const [section, setSection] = useState(initialSection)
  const [editing, setEditing] = useState(() => state.profiles.find((profile) => profile.id === initialProfile) || null)
  const [message, setMessage] = useState('')
  const profiles = state.profiles
  const members = [['family', '가족'], ...profiles.map((profile) => [profile.id, profile.name])]
  const memberField = { key: 'member', label: '담당 가족', options: members, defaultValue: members[0]?.[0] }
  const childMember = { ...memberField, options: profiles.filter((profile) => profile.active !== false).map((profile) => [profile.id, profile.name]), defaultValue: profiles.find((profile) => profile.active !== false)?.id, required: true }
  const periodMember = { ...childMember, options: [['all', '모든 자녀'], ...childMember.options], defaultValue: 'all' }
  const season = { key: 'season', label: '기간 구분', options: [['학기', '학기'], ['방학', '방학']], defaultValue: '학기' }
  const dot = (d) => (d || '').slice(2).replaceAll('-', '.')
  const periodField = { key: 'periodId', label: '기간', options: [['', '구분 전체'], ...state.schedulePeriods.toSorted((a, b) => (a.start || '').localeCompare(b.start || '')).map((p) => [p.id, `${periodName(p, state.childProfiles.find((c) => c.member === p.member))} (${dot(p.start)}–${dot(p.end)})`])], defaultValue: '' }
  // 초등학교 6학년, 중·고등학교 3학년까지
  const kidSchool = state.childProfiles.find((c) => c.member === initialRecord?.member) || state.childProfiles[0]
  const maxGrade = /중|고/.test(kidSchool?.school || '') ? 3 : 6
  const collections = {
    schedules: ['자녀 시간표', 'childSchedules', [{ key: 'title', label: '수업 이름', required: true }, childMember, season, periodField, { key: 'kind', label: '종류', options: [['학교', '학교'], ['학원', '학원']], defaultValue: '학원' }, { key: 'time', label: '시작 시간', type: 'time', required: true }, { key: 'end', label: '종료 시간', type: 'time', required: true }, { key: 'weekdays', label: '요일', type: 'weekdays' }]],
    periods: ['학기·방학 기간', 'schedulePeriods', [periodMember, { key: 'grade', label: '학년', options: Array.from({ length: maxGrade }, (_, i) => [String(i + 1), `${i + 1}학년`]), defaultValue: String(kidSchool?.grade || 1) }, { key: 'term', label: '구분', options: ['1학기', '2학기', '여름방학', '겨울방학'].map((t) => [t, t]), defaultValue: '1학기' }, { key: 'start', label: '시작일', type: 'date', required: true }, { key: 'end', label: '종료일', type: 'date', required: true }]],
    schools: ['자녀 학교 정보', 'childProfiles', [childMember, ...[['school', '학교'], ['grade', '학년'], ['classNumber', '반'], ['studentNumber', '번호'], ['teacherName', '담임 선생님'], ['teacherPhone', '연락처']].map(([key, label]) => ({ key, label }))]],
    anniversaries: ['기념일', 'anniversaries', [{ key: 'name', label: '이름', required: true }, { key: 'member', label: '누구', options: [['', '가족 밖(친척·친구)'], ...childMember.options], defaultValue: '' }, { key: 'kind', label: '종류', options: [['생일', '생일'], ['기념일', '기념일']], defaultValue: '생일' }, { key: 'calendarType', label: '달력', options: [['solar', '양력'], ['lunar', '음력']], defaultValue: 'solar' }, { key: 'baseYear', label: '연도', type: 'number', min: 1900, max: 2100 }, { key: 'month', label: '월', type: 'number', min: 1, max: 12, required: true }, { key: 'day', label: '일', type: 'number', min: 1, max: 31, required: true }, { key: 'leapMonth', label: '윤달', type: 'checkbox' }]],
    shifts: ['날짜별 근무', 'shifts', [memberField, { key: 'date', label: '날짜', type: 'date', required: true }, { key: 'shift', label: '근무 유형', options: (state.workSettings.shiftTypes?.length ? state.workSettings.shiftTypes : DEFAULT_SHIFT_TYPES).map((item) => [item.id, item.label]), defaultValue: 'day' }]],
    exceptions: ['반복 예외', 'scheduleExceptions', [{ key: 'scheduleId', label: '반복 일정', options: [...state.childSchedules, ...state.events].map((item) => [item.id, item.title]), required: true }, { key: 'date', label: '제외일', type: 'date', required: true }, { key: 'type', label: '처리', options: [['skip', '이 날 제외']], defaultValue: 'skip' }]],
  }
  const saveProfile = (event) => {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    if (!data.name.trim()) return
    const palette = MEMBER_COLORS.find((entry) => entry.id === data.palette) || MEMBER_COLORS[0]
    const others = profiles.filter((profile) => profile.id !== editing.id && profile.active !== false)
    if (others.length < MEMBER_COLORS.length && others.some((profile) => profile.color === palette.color)) { setMessage('다른 가족이 쓰지 않는 대표색을 선택해 주세요.'); return }
    const id = editing.id || crypto.randomUUID()
    const profile = { ...editing, id, name: data.name.trim(), initials: data.name.trim().slice(0, 1), relation: data.relation, characterId: editing.characterId || null, active: true,
      color: palette.color, tone: palette.tone, colorCustomized: Boolean(editing.colorCustomized || palette.color !== editing.color || !editing.id) }
    updateState((current) => ({ ...current, profiles: current.profiles.some((item) => item.id === id) ? current.profiles.map((item) => item.id === id ? profile : item) : [...current.profiles, profile],
      workSettings: { ...current.workSettings, workerIds: data.usesShift ? [...new Set([...(current.workSettings.workerIds || []), id])] : (current.workSettings.workerIds || []).filter((value) => value !== id), enabled: data.usesShift ? true : current.workSettings.enabled } }))
    setEditing(null); setMessage('구성원을 저장했어요.')
  }
  const updateShift = (id, field, value) => updateState((current) => ({ ...current, workSettings: { ...current.workSettings, shiftTypes: (current.workSettings.shiftTypes?.length ? current.workSettings.shiftTypes : DEFAULT_SHIFT_TYPES).map((item) => item.id === id ? { ...item, [field]: value } : item) } }))
  return <div className="settings-content">{!editorOnly && <div className="filter-chips">{[['profiles', '구성원'], ['work', '근무 유형'], ...Object.entries(collections).map(([key, value]) => [key, value[0]])].map(([key, label]) => <button key={key} aria-pressed={section === key} onClick={() => { setSection(key); setEditing(null) }}>{label}</button>)}</div>}
    {section === 'profiles' && <><div>{profiles.map((profile) => <article className="settings-card profile-row" key={profile.id}><CharacterAvatar profile={profile} small /><strong>{profile.name}{profile.active === false ? ' (숨김)' : ''}</strong><button disabled={!canEdit} onClick={() => setEditing(profile)}>수정</button><button disabled={!canEdit} onClick={() => updateState((current) => ({ ...current, profiles: current.profiles.map((item) => item.id === profile.id ? { ...item, active: item.active === false } : item), workSettings: { ...current.workSettings, workerIds: (current.workSettings.workerIds || []).filter((id) => id !== profile.id) } }))}>{profile.active === false ? '다시 표시' : '숨기기'}</button></article>)}</div><p className="quiet">구성원을 숨겨도 기존 일정은 보존돼요.</p><button disabled={!canEdit} onClick={() => setEditing({ name: '', characterId: 'dad' })}>구성원 추가</button>
      {editing && <form className="event-form settings-card" key={editing.id || 'new'} onSubmit={saveProfile}><label>이름<input name="name" defaultValue={editing.name} required /></label><label>관계·호칭<input name="relation" defaultValue={editing.relation || ''} /></label><fieldset><legend>캐릭터</legend><div className="character-options">{characters.map(([id, label]) => <button type="button" key={id} aria-label={label} aria-pressed={editing.characterId === id} onClick={() => setEditing((current) => ({ ...current, characterId: id }))}><CharacterAvatar profile={{ characterId: id }} /><span>{label}</span></button>)}</div></fieldset><label>대표색<select name="palette" defaultValue={MEMBER_COLORS.find((entry) => entry.color === editing.color)?.id || MEMBER_COLORS.find((entry) => !profiles.some((profile) => profile.active !== false && profile.id !== editing.id && profile.color === entry.color))?.id || MEMBER_COLORS[0].id}>{MEMBER_COLORS.map((entry, index) => <option value={entry.id} key={entry.id} disabled={profiles.filter((profile) => profile.active !== false && profile.id !== editing.id).length < MEMBER_COLORS.length && profiles.some((profile) => profile.active !== false && profile.id !== editing.id && profile.color === entry.color)}>대표색 {index + 1} · {entry.id}</option>)}</select></label><label className="check-label"><input name="usesShift" type="checkbox" defaultChecked={state.workSettings.workerIds?.includes(editing.id)} />근무표 사용</label><button disabled={!canEdit} className="primary-button">구성원 저장</button><button type="button" onClick={() => setEditing(null)}>취소</button></form>}</>}
    {section === 'work' && (state.workSettings.shiftTypes?.length ? state.workSettings.shiftTypes : DEFAULT_SHIFT_TYPES).map((shift) => <section key={shift.id} className="work-type"><h3 className="house-section-title">{shift.label}</h3><ul className="grouped-list"><li className="grouped-row"><label className="task-line">코드<input className="plain-input" value={shift.code} maxLength={5} disabled={!canEdit} onChange={(event) => updateShift(shift.id, 'code', event.target.value)} /></label></li><li className="grouped-row"><label className="task-line">이름<input className="plain-input" value={shift.label} disabled={!canEdit} onChange={(event) => updateShift(shift.id, 'label', event.target.value)} /></label></li>{shift.id !== 'off' && <><li className="grouped-row"><div className="schedule-field task-field"><span>시작</span><NativeChip label={`${shift.label} 시작 시간`} type="time" value={clock(shift.start)} onChange={(v) => updateShift(shift.id, 'start', v)} /></div></li><li className="grouped-row"><div className="schedule-field task-field"><span>끝</span><NativeChip label={`${shift.label} 종료 시간`} type="time" value={clock(shift.end)} onChange={(v) => updateShift(shift.id, 'end', v)} /></div></li></>}</ul></section>)}
    {collections[section] && <Records key={section} title={collections[section][0]} collection={collections[section][1]} fields={collections[section][2]} identity={section === 'schools' ? 'member' : section === 'shifts' ? (row) => row?.member && row.date ? `${row.member}:${row.date}` : null : 'id'} initialRecord={initialRecord} editorOnly={editorOnly} onSaved={onSaved} onCancel={onCancel} state={state} updateState={updateState} canEdit={canEdit} />}
    {message && <p role="status">{message}</p>}
  </div>
}

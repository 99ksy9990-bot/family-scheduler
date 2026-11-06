import { useState } from 'react'
import { MEMBER_COLORS } from '../../../lib/colors'
import CharacterAvatar from '../../components/CharacterAvatar'
import Records from './Records'
import { DEFAULT_SHIFT_TYPES } from '../../../lib/legacyState'

const characters = [['dad', '아빠'], ['mom', '엄마'], ['big', '큰딸'], ['little', '작은딸']]

export default function Family({ state, updateState, canEdit, initialProfile }) {
  const [section, setSection] = useState('profiles')
  const [editing, setEditing] = useState(() => state.profiles.find((profile) => profile.id === initialProfile) || null)
  const [message, setMessage] = useState('')
  const profiles = state.profiles
  const members = [['family', '가족 모두'], ...profiles.map((profile) => [profile.id, profile.name])]
  const memberField = { key: 'member', label: '담당 가족', options: members, defaultValue: members[0]?.[0] }
  const childMember = { ...memberField, options: profiles.filter((profile) => profile.type === 'child').map((profile) => [profile.id, profile.name]), defaultValue: profiles.find((profile) => profile.type === 'child')?.id, required: true }
  const periodMember = { ...childMember, options: [['all', '모든 자녀'], ...childMember.options], defaultValue: 'all' }
  const season = { key: 'season', label: '기간 구분', options: [['term', '학기'], ['vacation', '방학']], defaultValue: 'term' }
  const collections = {
    schedules: ['자녀 시간표', 'childSchedules', [{ key: 'title', label: '수업 이름', required: true }, childMember, season, { key: 'kind', label: '종류', options: [['학교', '학교'], ['학원', '학원']], defaultValue: '학원' }, { key: 'time', label: '시작 시간', type: 'time', required: true }, { key: 'end', label: '종료 시간', type: 'time', required: true }, { key: 'weekdays', label: '요일', type: 'weekdays' }]],
    periods: ['학기·방학 기간', 'schedulePeriods', [periodMember, season, { key: 'start', label: '시작일', type: 'date', required: true }, { key: 'end', label: '종료일', type: 'date', required: true }]],
    schools: ['자녀 학교 정보', 'childProfiles', [childMember, ...[['school', '학교'], ['grade', '학년'], ['classNumber', '반'], ['studentNumber', '번호'], ['teacherName', '담임 선생님'], ['teacherPhone', '연락처']].map(([key, label]) => ({ key, label }))]],
    anniversaries: ['기념일', 'anniversaries', [{ key: 'name', label: '이름', required: true }, { key: 'kind', label: '종류', options: [['생일', '생일'], ['기념일', '기념일']], defaultValue: '생일' }, { key: 'calendarType', label: '달력', options: [['solar', '양력'], ['lunar', '음력']], defaultValue: 'solar' }, { key: 'month', label: '월', type: 'number', min: 1, max: 12, required: true }, { key: 'day', label: '일', type: 'number', min: 1, max: 31, required: true }, { key: 'baseYear', label: '기준 연도', type: 'number', min: 1900, max: 2100 }, { key: 'leapMonth', label: '윤달', type: 'checkbox' }]],
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
    const profile = { ...editing, id, name: data.name.trim(), initials: data.name.trim().slice(0, 1), relation: data.relation, type: data.type, characterId: editing.characterId || null, active: true,
      color: palette.color, tone: palette.tone, colorCustomized: Boolean(editing.colorCustomized || palette.color !== editing.color || !editing.id) }
    updateState((current) => ({ ...current, profiles: current.profiles.some((item) => item.id === id) ? current.profiles.map((item) => item.id === id ? profile : item) : [...current.profiles, profile],
      workSettings: { ...current.workSettings, workerIds: data.usesShift ? [...new Set([...(current.workSettings.workerIds || []), id])] : (current.workSettings.workerIds || []).filter((value) => value !== id), enabled: data.usesShift ? true : current.workSettings.enabled } }))
    setEditing(null); setMessage('구성원을 저장했어요.')
  }
  const updateShift = (id, field, value) => updateState((current) => ({ ...current, workSettings: { ...current.workSettings, shiftTypes: (current.workSettings.shiftTypes?.length ? current.workSettings.shiftTypes : DEFAULT_SHIFT_TYPES).map((item) => item.id === id ? { ...item, [field]: value } : item) } }))
  return <div className="settings-content"><div className="filter-chips">{[['profiles', '구성원'], ['work', '근무 유형'], ...Object.entries(collections).map(([key, value]) => [key, value[0]])].map(([key, label]) => <button key={key} aria-pressed={section === key} onClick={() => { setSection(key); setEditing(null) }}>{label}</button>)}</div>
    {section === 'profiles' && <><div>{profiles.map((profile) => <article className="settings-card profile-row" key={profile.id}><CharacterAvatar profile={profile} small /><strong>{profile.name}{profile.active === false ? ' (숨김)' : ''}</strong><button disabled={!canEdit} onClick={() => setEditing(profile)}>수정</button><button disabled={!canEdit} onClick={() => updateState((current) => ({ ...current, profiles: current.profiles.map((item) => item.id === profile.id ? { ...item, active: item.active === false } : item), workSettings: { ...current.workSettings, workerIds: (current.workSettings.workerIds || []).filter((id) => id !== profile.id) } }))}>{profile.active === false ? '다시 표시' : '숨기기'}</button></article>)}</div><p className="quiet">구성원을 숨겨도 기존 일정은 보존돼요.</p><button disabled={!canEdit} onClick={() => setEditing({ name: '', type: 'adult', characterId: 'dad' })}>구성원 추가</button>
      {editing && <form className="event-form settings-card" key={editing.id || 'new'} onSubmit={saveProfile}><label>이름<input name="name" defaultValue={editing.name} required /></label><label>구분<select name="type" defaultValue={editing.type}><option value="adult">성인</option><option value="child">자녀</option><option value="other">기타 가족</option></select></label><label>관계·호칭<input name="relation" defaultValue={editing.relation || ''} /></label><fieldset><legend>캐릭터</legend><div className="character-options">{characters.map(([id, label]) => <button type="button" key={id} aria-label={label} aria-pressed={editing.characterId === id} onClick={() => setEditing((current) => ({ ...current, characterId: id }))}><CharacterAvatar profile={{ characterId: id }} /><span>{label}</span></button>)}</div></fieldset><label>대표색<select name="palette" defaultValue={MEMBER_COLORS.find((entry) => entry.color === editing.color)?.id || MEMBER_COLORS.find((entry) => !profiles.some((profile) => profile.active !== false && profile.id !== editing.id && profile.color === entry.color))?.id || MEMBER_COLORS[0].id}>{MEMBER_COLORS.map((entry, index) => <option value={entry.id} key={entry.id} disabled={profiles.filter((profile) => profile.active !== false && profile.id !== editing.id).length < MEMBER_COLORS.length && profiles.some((profile) => profile.active !== false && profile.id !== editing.id && profile.color === entry.color)}>대표색 {index + 1} · {entry.id}</option>)}</select></label><label className="check-label"><input name="usesShift" type="checkbox" defaultChecked={state.workSettings.workerIds?.includes(editing.id)} />근무표 사용</label><button disabled={!canEdit} className="primary-button">구성원 저장</button><button type="button" onClick={() => setEditing(null)}>취소</button></form>}</>}
    {section === 'work' && <><label className="check-label"><input type="checkbox" checked={Boolean(state.workSettings.enabled)} disabled={!canEdit} onChange={(event) => updateState((current) => ({ ...current, workSettings: { ...current.workSettings, enabled: event.target.checked } }))} />근무표 사용</label>{(state.workSettings.shiftTypes?.length ? state.workSettings.shiftTypes : DEFAULT_SHIFT_TYPES).map((shift) => <fieldset className="event-form settings-card" key={shift.id} disabled={!canEdit}><legend>{shift.label}</legend><label>코드<input value={shift.code} maxLength={5} onChange={(event) => updateShift(shift.id, 'code', event.target.value)} /></label><label>유형 이름<input value={shift.label} onChange={(event) => updateShift(shift.id, 'label', event.target.value)} /></label>{shift.id !== 'off' && <><label>시작 시간<input type="time" value={shift.start} onChange={(event) => updateShift(shift.id, 'start', event.target.value)} /></label><label>종료 시간<input type="time" value={shift.end} onChange={(event) => updateShift(shift.id, 'end', event.target.value)} /></label></>}</fieldset>)}</>}
    {collections[section] && <Records key={section} title={collections[section][0]} collection={collections[section][1]} fields={collections[section][2]} identity={section === 'schools' ? 'member' : 'id'} state={state} updateState={updateState} canEdit={canEdit} />}
    {message && <p role="status">{message}</p>}
  </div>
}

import { useMemo, useState } from 'react'
import { Check, Pencil, Plus, RotateCcw, Settings2, Trash2, UserRoundCheck, X } from 'lucide-react'
import { useModalAccessibility } from '../hooks/useModalAccessibility'
import { useAppDialog } from '../hooks/useAppDialog'
import { MEMBER_COLORS, memberColorFor } from '../lib/colors'

const EMPTY_FORM = { id: '', name: '', type: 'adult', relation: '', color: MEMBER_COLORS[0].color, tone: MEMBER_COLORS[0].tone, usesShift: false }
const SHIFT_HOURS = Array.from({ length: 12 }, (_, index) => index + 1)
const SHIFT_MINUTES = ['00', '10', '20', '30', '40', '50']

const shiftTimeParts = (value) => {
  const [hourValue = '9', minuteValue = '00'] = (value || '09:00').split(':')
  const hour24 = Number(hourValue)
  return {
    meridiem: hour24 < 12 ? '오전' : '오후',
    hour: hour24 % 12 || 12,
    minute: SHIFT_MINUTES.includes(minuteValue) ? minuteValue : String(Math.round(Number(minuteValue) / 10) * 10 % 60).padStart(2, '0'),
  }
}

const joinShiftTime = ({ meridiem, hour, minute }) => {
  let hour24 = Number(hour) % 12
  if (meridiem === '오후') hour24 += 12
  return `${String(hour24).padStart(2, '0')}:${minute}`
}

function ShiftTimePicker({ label, value, onChange, disabled }) {
  const parts = shiftTimeParts(value)
  const update = (field, nextValue) => onChange(joinShiftTime({ ...parts, [field]: nextValue }))
  return (
    <div className="shift-time-picker" role="group" aria-label={label}>
      <select aria-label={`${label} 오전 오후`} value={parts.meridiem} onChange={(event) => update('meridiem', event.target.value)} disabled={disabled}><option>오전</option><option>오후</option></select>
      <select aria-label={`${label} 시`} value={parts.hour} onChange={(event) => update('hour', event.target.value)} disabled={disabled}>{SHIFT_HOURS.map((hour) => <option key={hour} value={hour}>{hour}시</option>)}</select>
      <select aria-label={`${label} 분`} value={parts.minute} onChange={(event) => update('minute', event.target.value)} disabled={disabled}>{SHIFT_MINUTES.map((minute) => <option key={minute} value={minute}>{minute}분</option>)}</select>
    </div>
  )
}

const profileLabel = (profile) => profile.type === 'child' ? '자녀' : profile.type === 'adult' ? '성인' : '가족'

export default function FamilySettingsPanel({ open, onClose, profiles, setProfiles, workSettings, setWorkSettings, canEdit }) {
  const { confirm } = useAppDialog()
  const dialogRef = useModalAccessibility(open, onClose)
  const [form, setForm] = useState(EMPTY_FORM)
  const [message, setMessage] = useState('')
  const activeProfiles = useMemo(() => profiles.filter((profile) => profile.active !== false), [profiles])

  if (!open) return null

  const closePanel = () => {
    setForm(EMPTY_FORM)
    setMessage('')
    onClose()
  }

  const startEdit = (profile) => {
    const selectedColor = memberColorFor(profile.color) || MEMBER_COLORS[0]
    setForm({
      ...profile,
      color: selectedColor.color,
      tone: selectedColor.tone,
      relation: profile.relation || '',
      usesShift: workSettings.workerIds.includes(profile.id),
    })
  }

  const resetForm = () => setForm(EMPTY_FORM)

  const saveProfile = (event) => {
    event.preventDefault()
    if (!canEdit || !form.name.trim()) return
    const selectedColor = memberColorFor(form.color) || MEMBER_COLORS[0]
    const id = form.id || crypto.randomUUID()
    const nextProfile = {
      id,
      name: form.name.trim(),
      type: form.type,
      relation: form.relation.trim(),
      initials: form.name.trim().slice(0, 1),
      color: selectedColor.color,
      tone: selectedColor.tone,
      active: true,
    }
    setProfiles((current) => current.some((profile) => profile.id === id)
      ? current.map((profile) => profile.id === id ? nextProfile : profile)
      : [...current, nextProfile])
    setWorkSettings((current) => ({
      ...current,
      enabled: form.usesShift ? true : current.enabled && current.workerIds.some((workerId) => workerId !== id),
      workerIds: form.usesShift
        ? [...new Set([...current.workerIds, id])]
        : current.workerIds.filter((workerId) => workerId !== id),
    }))
    setMessage(`${nextProfile.name} 정보를 저장했습니다.`)
    resetForm()
  }

  const archiveProfile = async (profile) => {
    if (!canEdit || !await confirm(`‘${profile.name}’을 가족 목록에서 숨길까요? 기존 일정은 보존됩니다.`)) return
    setProfiles((current) => current.map((item) => item.id === profile.id ? { ...item, active: false } : item))
    setWorkSettings((current) => ({ ...current, workerIds: current.workerIds.filter((id) => id !== profile.id) }))
    if (form.id === profile.id) resetForm()
  }

  const restoreProfile = (profile) => {
    if (!canEdit) return
    setProfiles((current) => current.map((item) => item.id === profile.id ? { ...item, active: true } : item))
  }

  const updateShiftType = (id, field, value) => {
    setWorkSettings((current) => ({
      ...current,
      shiftTypes: current.shiftTypes.map((shift) => shift.id === id ? { ...shift, [field]: value } : shift),
    }))
  }

  return (
    <div className="modal-backdrop family-settings-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closePanel()}>
      <section ref={dialogRef} tabIndex="-1" className="modal family-settings-panel" role="dialog" aria-modal="true" aria-labelledby="family-settings-title">
        <div className="modal-heading">
          <div><span className="eyebrow">가족별 맞춤 설정</span><h2 id="family-settings-title">가족 구성원 관리</h2></div>
          <button className="icon-button" onClick={closePanel} aria-label="가족 구성원 설정 닫기"><X /></button>
        </div>

        <p className="settings-intro">일정에 표시할 사람을 등록하고 자녀표와 근무표 사용 여부를 정합니다. 로그인 계정 연결과는 별도로 관리됩니다.</p>

        <div className="family-profile-layout">
          <section className="family-profile-list-section">
            <div className="section-heading"><div><span className="eyebrow">일정 대상</span><h3>등록된 구성원</h3></div><span>{activeProfiles.length}명</span></div>
            <div className="settings-profile-list">
              {activeProfiles.map((profile) => (
                <article className="settings-profile-row" key={profile.id}>
                  <span className="settings-profile-avatar" style={{ '--profile': profile.color, '--profile-tone': profile.tone }}>{profile.initials}</span>
                  <span><strong>{profile.name}</strong><small>{profile.relation || profileLabel(profile)}{workSettings.workerIds.includes(profile.id) ? ' · 근무표 사용' : ''}</small></span>
                  {canEdit && <div className="event-actions">
                    <button onClick={() => startEdit(profile)} aria-label={`${profile.name} 수정`}><Pencil /></button>
                    <button className="delete" onClick={() => archiveProfile(profile)} aria-label={`${profile.name} 숨기기`}><Trash2 /></button>
                  </div>}
                </article>
              ))}
              {!activeProfiles.length && <div className="settings-empty"><UserRoundCheck /><strong>첫 구성원을 등록해 주세요</strong><span>본인부터 등록한 뒤 필요한 가족을 추가하면 됩니다.</span></div>}
            </div>
            {profiles.some((profile) => profile.active === false) && <details className="archived-profiles">
              <summary>숨긴 구성원</summary>
              {profiles.filter((profile) => profile.active === false).map((profile) => <button key={profile.id} onClick={() => restoreProfile(profile)} disabled={!canEdit}><RotateCcw /> {profile.name} 다시 표시</button>)}
            </details>}
          </section>

          <form className="family-profile-form" onSubmit={saveProfile}>
            <div className="section-heading"><div><span className="eyebrow">{form.id ? '정보 변경' : '새 구성원'}</span><h3>{form.id ? `${form.name} 수정` : '구성원 추가'}</h3></div>{form.id && <button className="text-button" type="button" onClick={resetForm}>새로 추가</button>}</div>
            <label>이름<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="예: 지영, 민준" required disabled={!canEdit} /></label>
            <div className="field-row">
              <label>구분<select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} disabled={!canEdit}><option value="adult">성인</option><option value="child">자녀</option><option value="other">기타 가족</option></select></label>
              <label>관계 또는 호칭<input value={form.relation} onChange={(event) => setForm((current) => ({ ...current, relation: event.target.value }))} placeholder="예: 엄마, 할머니" disabled={!canEdit} /></label>
            </div>
            <fieldset className="profile-color-field"><legend>표시 색상</legend><div>{MEMBER_COLORS.map((entry) => {
              const owners = activeProfiles.filter((profile) => profile.id !== form.id && String(profile.color).toLowerCase() === entry.color.toLowerCase())
              const paletteExhausted = activeProfiles.filter((profile) => profile.id !== form.id).length >= MEMBER_COLORS.length
              const disabled = !canEdit || (owners.length > 0 && !paletteExhausted)
              const usage = owners.length ? `${owners[0].name}과 같은 색` : ''
              const isSelected = String(form.color).toLowerCase() === entry.color.toLowerCase()
              return <span className="profile-color-option" key={entry.id}>
                <button type="button" className={isSelected ? 'active' : ''} style={{ background: entry.color }} aria-label={`${entry.id} 색상${owners.length ? `, ${owners[0].name} 사용 중` : ''}`} aria-pressed={isSelected} onClick={() => setForm((current) => ({ ...current, color: entry.color, tone: entry.tone }))} disabled={disabled}>{isSelected && <Check />}</button>
                {usage && <small>{paletteExhausted ? usage : `${owners[0].name} 사용 중`}</small>}
              </span>
            })}</div></fieldset>
            <label className="check-row"><input type="checkbox" checked={form.usesShift} onChange={(event) => setForm((current) => ({ ...current, usesShift: event.target.checked }))} disabled={!canEdit} /><span><strong>근무표 사용</strong><small>이 구성원의 교대·일반 근무를 달력에 입력합니다.</small></span></label>
            <button className="primary-button" disabled={!canEdit}><Plus /> {form.id ? '변경사항 저장' : '구성원 추가'}</button>
          </form>
        </div>

        <section className="shift-settings-section">
          <div className="section-heading"><div><span className="eyebrow">선택 기능</span><h3>근무표 설정</h3></div><label className="compact-toggle"><input type="checkbox" checked={workSettings.enabled} onChange={(event) => setWorkSettings((current) => ({ ...current, enabled: event.target.checked }))} disabled={!canEdit || !workSettings.workerIds.length} /> 사용</label></div>
          <p>근무표 사용 구성원이 있을 때만 홈과 캘린더에 근무표가 표시됩니다.</p>
          <div className="shift-type-settings">
            {workSettings.shiftTypes.map((shift) => <div className="shift-type-row" key={shift.id}>
              <input className="shift-code-input" aria-label={`${shift.label} 코드`} value={shift.code} maxLength="5" onChange={(event) => updateShiftType(shift.id, 'code', event.target.value.toUpperCase())} disabled={!canEdit} />
              <input className="shift-name-input" aria-label={`${shift.label} 이름`} value={shift.label} onChange={(event) => updateShiftType(shift.id, 'label', event.target.value)} disabled={!canEdit} />
              {shift.id !== 'off' && <div className="shift-time-range">
                <label><small>시작</small><ShiftTimePicker label={`${shift.label} 시작 시간`} value={shift.start} onChange={(value) => updateShiftType(shift.id, 'start', value)} disabled={!canEdit} /></label>
                <span aria-hidden="true">→</span>
                <label><small>종료</small><ShiftTimePicker label={`${shift.label} 종료 시간`} value={shift.end} onChange={(value) => updateShiftType(shift.id, 'end', value)} disabled={!canEdit} /></label>
              </div>}
            </div>)}
          </div>
        </section>

        {message && <p className="sync-message" role="status">{message}</p>}
        <div className="modal-actions settings-actions"><button className="primary-button" onClick={closePanel}><Settings2 /> 설정 완료</button></div>
      </section>
    </div>
  )
}

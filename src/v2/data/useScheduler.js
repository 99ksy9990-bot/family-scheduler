import { useCallback, useEffect, useState } from 'react'
import { useFamilySync } from '../../hooks/useFamilySync'
import { upgradeSharedState } from '../../lib/legacyState'
import { readLegacyStorage, fromLegacy, toLegacy } from './migrate'

const keys = {
  profiles: 'profiles-v1', events: 'events', tasks: 'tasks', shifts: 'shifts',
  childSchedules: 'child-schedules-v1', childProfiles: 'child-profiles-v1', schedulePeriods: 'periods-v1',
  anniversaries: 'anniversaries-v1', scheduleExceptions: 'schedule-exceptions-v1',
  workSettings: 'work-settings-v1', profileLinks: 'profile-links-v1',
}
const load = () => {
  try {
    const extra = JSON.parse(localStorage.getItem('family-scheduler-v2-metadata') || '{}')
    if (!extra || typeof extra !== 'object' || Array.isArray(extra)) throw new Error('invalid metadata')
    const metadata = Object.fromEntries(Object.entries(extra).filter(([field]) => !Object.hasOwn(keys, field)))
    return { state: { schemaVersion: 7, recoveryVersion: 2, ...readLegacyStorage(localStorage), ...metadata }, error: '' }
  }
  catch { return { state: null, error: '저장된 가족 정보를 읽지 못했어요. 원본 데이터는 그대로 있어요.' } }
}

export function useScheduler() {
  const [loaded, setLoaded] = useState(load)
  const [saveError, setSaveError] = useState('')
  const onRemoteState = useCallback((incoming) => {
    setLoaded((current) => ({ state: fromLegacy({ ...current.state, ...upgradeSharedState(incoming) }), error: '' }))
  }, [])
  const sync = useFamilySync({ localState: loaded.state, onRemoteState })
  // 관리자 기기에서 앱을 열면, 초대 코드로 들어온 가족에게 편집 권한을 자동으로 줌 (서버 기본값이 '보기 전용'이라서)
  const ownerId = sync.family?.household.owner_id
  const viewOnly = sync.session?.user.id === ownerId ? (sync.family?.members || []).filter((m) => !m.can_edit).map((m) => m.user_id).join(',') : ''
  useEffect(() => {
    if (!viewOnly) return
    ;(async () => { for (const id of viewOnly.split(',')) { try { await sync.updatePermission(id, true) } catch { /* 다음에 다시 시도 */ } } })()
  }, [viewOnly]) // eslint-disable-line react-hooks/exhaustive-deps
  const canEdit = !sync.family || Boolean(sync.family.membership?.can_edit)
  useEffect(() => {
    if (!loaded.state || !sync.session) return
    const timer = window.setTimeout(() => {
      try {
        const state = toLegacy(loaded.state)
        for (const [field, key] of Object.entries(keys)) localStorage.setItem(`family-scheduler-${key}`, JSON.stringify(state[field]))
        localStorage.setItem('family-scheduler-v2-metadata', JSON.stringify(Object.fromEntries(Object.entries(state).filter(([field]) => !Object.hasOwn(keys, field)))))
        setSaveError('')
      } catch { setSaveError('기기에 저장하지 못했어요. 저장 공간을 확인해 주세요.') }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [loaded.state, sync.session])
  const updateState = (update) => {
    if (!canEdit || !loaded.state) return false
    setLoaded((current) => ({ ...current, state: typeof update === 'function' ? update(current.state) : update }))
    return true
  }
  const addEvent = (event) => {
    if (!canEdit || !loaded.state) return false
    setLoaded((current) => ({ ...current, state: { ...current.state,
      events: [...current.state.events, { ...event, id: `event-${crypto.randomUUID()}` }] } }))
    return true
  }
  return { state: loaded.state, error: loaded.error || saveError || sync.error, sync, canEdit, addEvent, updateState,
    retry: () => {
      setLoaded((current) => current.state ? { ...current, state: { ...current.state } } : load())
      Promise.resolve(sync.refresh()).catch(() => setSaveError('가족 연결을 다시 확인해 주세요.'))
    } }
}

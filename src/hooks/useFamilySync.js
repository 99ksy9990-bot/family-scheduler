import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, supabaseEnabled } from '../lib/supabase'
import { mergeSharedShiftChanges } from '../lib/shiftSyncMerge'

const hasSharedState = (value) => value && typeof value === 'object' && Object.keys(value).length > 0
const isConflictError = (error) => error?.code === '40001' || error?.message?.includes('SYNC_CONFLICT')
const isNetworkError = (error) => {
  const description = [error?.name, error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return ['failed to fetch', 'fetch failed', 'networkerror', 'network request failed', 'load failed']
    .some((message) => description.includes(message))
}
const stableStringify = (value) => JSON.stringify(value, (_key, nestedValue) => {
  if (!nestedValue || typeof nestedValue !== 'object' || Array.isArray(nestedValue)) return nestedValue
  return Object.keys(nestedValue).sort().reduce((ordered, key) => {
    ordered[key] = nestedValue[key]
    return ordered
  }, {})
})
const parseSharedState = (serialized) => {
  if (!serialized) return null
  try { return JSON.parse(serialized) }
  catch { return null }
}

const cachedFamilyKey = (userId) => `family-scheduler-last-sync-family:${userId}`
const draftKey = (userId, householdId) => `family-scheduler-pending-sync:${userId}:${householdId}`

export function useFamilySync({ localState, onRemoteState }) {
  const [session, setSession] = useState(null)
  const [family, setFamily] = useState(null)
  const [syncStatus, setSyncStatus] = useState('local')
  const [error, setError] = useState('')
  const [draftError, setDraftError] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [remoteChange, setRemoteChange] = useState(null)
  const [conflict, setConflict] = useState(null)
  const [saveRevision, setSaveRevision] = useState(0)
  const localStateRef = useRef(localState)
  const remoteStateRef = useRef('')
  const versionRef = useRef(0)
  const adoptRemoteRef = useRef(false) // 서버에서 받은 걸 화면에 넣은 직후엔 다시 저장하지 않음 (기기끼리 주고받기 무한 반복 방지)
  const resaveCountRef = useRef(0)
  const scopeRef = useRef(null)
  const userRef = useRef(null)
  const draftRef = useRef(null)
  const inFlightSaveRef = useRef(null)
  const saveTimerRef = useRef(null)
  const wasOfflineRef = useRef(false)

  useEffect(() => { localStateRef.current = localState }, [localState])

  const markConnectionFailure = useCallback((connectionError) => {
    const offline = isNetworkError(connectionError)
    setError(connectionError?.message || '동기화 연결을 확인해 주세요.')
    if (offline) {
      wasOfflineRef.current = true
      setIsOnline(false)
    }
    setSyncStatus(offline ? 'offline' : 'error')
  }, [])

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => {
      wasOfflineRef.current = true
      setIsOnline(false)
    }
    if (!navigator.onLine) goOffline()
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const setVersion = useCallback((version) => {
    versionRef.current = Number(version || 0)
    setFamily((current) => current ? { ...current, version: versionRef.current } : current)
  }, [])

  const storeDraft = useCallback((draft) => {
    draftRef.current = draft
    if (!scopeRef.current) return
    try {
      const { key } = scopeRef.current
      if (draft) localStorage.setItem(key, JSON.stringify(draft))
      else localStorage.removeItem(key)
      setDraftError('')
    } catch {
      setDraftError('이 기기에 저장 대기 중인 수정을 보관하지 못했어요.')
    }
  }, [])

  const applyStored = useCallback((stored, { prefer, retry = false, seed } = {}) => {
    const scope = scopeRef.current
    if (!scope || Number(stored.version) < versionRef.current) return
    window.clearTimeout(saveTimerRef.current)
    const remote = stored.state || {}
    const draft = draftRef.current
    const merged = draft && scope.canEdit
      ? mergeSharedShiftChanges(draft.baseState, draft.localState, remote, prefer)
      : seed || remote

    setVersion(stored.version)
    setLastSyncedAt(stored.updated_at)
    if (!merged) {
      if (stableStringify(localStateRef.current) !== stableStringify(draft.localState)) {
        localStateRef.current = draft.localState
        onRemoteState(draft.localState)
      }
      setConflict({ remoteState: remote, remoteVersion: stored.version, updatedAt: stored.updated_at })
      setSyncStatus('conflict')
      return
    }

    const serialized = stableStringify(remote)
    const pending = stableStringify(merged) !== serialized
    remoteStateRef.current = serialized
    if (scope.canEdit) storeDraft(pending ? { baseState: remote, localState: merged } : null)
    setConflict(null)
    adoptRemoteRef.current = !pending
    localStateRef.current = merged
    onRemoteState(merged)

    // 저장 직후에도 서버 버전이 앞서면 연속 재저장은 세 번까지만 시도한다.
    resaveCountRef.current = pending && retry ? resaveCountRef.current + 1 : 0
    if (resaveCountRef.current > 3) {
      setSyncStatus('error')
      setError('다른 기기의 수정이 계속 들어오고 있어요. 잠시 후 다시 시도해 주세요.')
      return
    }
    setSyncStatus(pending ? 'saving' : scope.canEdit ? 'synced' : 'readonly')
    if (pending) setSaveRevision((current) => current + 1)
  }, [onRemoteState, setVersion, storeDraft])

  const buildConflict = useCallback(async (scope) => {
    const { data: stored, error: stateError } = await supabase
      .from('household_states')
      .select('state, version, updated_at, updated_by')
      .eq('household_id', scope.householdId)
      .single()
    if (scope !== scopeRef.current) return
    if (stateError) throw stateError
    wasOfflineRef.current = false
    setIsOnline(true)
    applyStored(stored, { retry: true })
  }, [applyStored])

  const openScope = useCallback((userId, membership) => {
    const householdId = membership.household_id
    const key = draftKey(userId, householdId)
    if (scopeRef.current?.key !== key) {
      scopeRef.current = { key, householdId, canEdit: membership.can_edit }
      versionRef.current = 0
      remoteStateRef.current = ''
      inFlightSaveRef.current = null
      draftRef.current = null
      try {
        const draft = parseSharedState(localStorage.getItem(key))
        if (draft?.baseState && draft?.localState) draftRef.current = draft
        setDraftError('')
      } catch {
        setDraftError('이 기기에 보관한 수정을 읽지 못했어요.')
      }
    }
    scopeRef.current.canEdit = membership.can_edit
  }, [])

  const handleInitialLoadFailure = useCallback((userId, connectionError) => {
    if (userRef.current !== userId) return
    markConnectionFailure(connectionError)
    if (scopeRef.current || !isNetworkError(connectionError)) return
    try {
      // 앱에 이미 보관된 가족 일정으로 오프라인 상태에서 다시 시작한다.
      const cached = parseSharedState(localStorage.getItem(cachedFamilyKey(userId)))
      if (!cached?.household?.id || !hasSharedState(localStateRef.current)) return
      openScope(userId, cached.membership)
      const draft = draftRef.current
      remoteStateRef.current = stableStringify(draft?.baseState || localStateRef.current)
      versionRef.current = Number(cached.version)
      setFamily({ ...cached, members: [], history: [] })
      if (draft) {
        localStateRef.current = draft.localState
        onRemoteState(draft.localState)
      }
    } catch {
      setDraftError('이 기기에 보관한 가족 정보를 읽지 못했어요.')
    }
  }, [markConnectionFailure, onRemoteState, openScope])

  const loadFamilyContext = useCallback(async (userId, preferredHouseholdId) => {
    if (!supabase || !userId) return null
    setSyncStatus('connecting')
    setError('')

    let membershipQuery = supabase
      .from('household_members')
      .select('household_id, user_id, display_name, member_role, can_edit, joined_at')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true })
    if (preferredHouseholdId) membershipQuery = membershipQuery.eq('household_id', preferredHouseholdId)
    const { data: memberships, error: membershipError } = await membershipQuery.limit(1)
    if (userRef.current !== userId) return null
    if (membershipError) throw membershipError

    const membership = memberships?.[0]
    if (!membership) {
      setFamily(null)
      setSyncStatus('local')
      return null
    }

    const [{ data: household, error: householdError }, { data: members, error: membersError }, { data: stored, error: stateError }, { data: history, error: historyError }] = await Promise.all([
      supabase.from('households').select('id, name, invite_code, owner_id').eq('id', membership.household_id).single(),
      supabase.from('household_members').select('household_id, user_id, display_name, member_role, can_edit, joined_at').eq('household_id', membership.household_id).order('joined_at'),
      supabase.from('household_states').select('household_id, state, version, updated_at, updated_by').eq('household_id', membership.household_id).single(),
      supabase.from('household_state_history').select('id, version, created_at, changed_by').eq('household_id', membership.household_id).order('created_at', { ascending: false }).limit(5),
    ])
    if (householdError) throw householdError
    if (membersError) throw membersError
    if (stateError) throw stateError
    if (historyError) throw historyError

    if (userRef.current !== userId) return null
    openScope(userId, membership)
    const nextFamily = { household, membership, members: members || [], version: stored.version, history: history || [] }
    try {
      localStorage.setItem(cachedFamilyKey(userId), JSON.stringify({
        household: { id: household.id, name: household.name }, membership, version: stored.version,
      }))
    } catch { /* 대기 중인 수정 저장 오류는 storeDraft에서 표시한다. */ }
    wasOfflineRef.current = false
    setIsOnline(true)
    setFamily({ ...nextFamily, version: Math.max(versionRef.current, Number(stored.version)) })
    if (inFlightSaveRef.current || Number(stored.version) < versionRef.current) {
      if (inFlightSaveRef.current) inFlightSaveRef.current.refresh = true
      setSyncStatus(inFlightSaveRef.current || draftRef.current ? 'saving' : membership.can_edit ? 'synced' : 'readonly')
      return nextFamily
    }

    const seed = membership.can_edit && !hasSharedState(stored.state) ? localStateRef.current : undefined
    applyStored(stored, { seed })
    return nextFamily
  }, [applyStored, openScope])

  useEffect(() => {
    if (!supabase) return undefined
    let active = true

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) {
        setError(sessionError.message)
        setSyncStatus('error')
        return
      }
      userRef.current = data.session?.user?.id || null
      setSession(data.session)
      if (data.session?.user) loadFamilyContext(data.session.user.id).catch((contextError) => {
        handleInitialLoadFailure(data.session.user.id, contextError)
      })
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      const userId = nextSession?.user?.id || null
      if (userId !== userRef.current) {
        scopeRef.current = null
        draftRef.current = null
        inFlightSaveRef.current = null
        adoptRemoteRef.current = false
        window.clearTimeout(saveTimerRef.current)
        setFamily(null)
        setConflict(null)
      }
      userRef.current = userId
      setSession(nextSession)
      if (!nextSession?.user) {
        setFamily(null)
        setSyncStatus('local')
        return
      }
      window.setTimeout(() => {
        loadFamilyContext(nextSession.user.id).catch((contextError) => {
          handleInitialLoadFailure(nextSession.user.id, contextError)
        })
      }, 0)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [handleInitialLoadFailure, loadFamilyContext])

  useEffect(() => {
    if (!supabase || !family?.household?.id) return undefined
    const householdId = family.household.id
    const channel = supabase
      .channel(`family-state-${householdId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'household_states', filter: `household_id=eq.${householdId}`,
      }, ({ new: changed }) => {
        if (!hasSharedState(changed?.state) || scopeRef.current?.householdId !== householdId
          || Number(changed.version) <= versionRef.current) return
        // 저장 요청이 진행 중이면 응답 또는 버전 충돌 조회가 최신 서버 상태를 처리한다.
        const request = inFlightSaveRef.current
        if (request) {
          if (!request.remote || Number(changed.version) > Number(request.remote.version)) request.remote = changed
        } else {
          applyStored(changed)
        }
        if (changed.updated_by && changed.updated_by !== session?.user?.id) {
          setRemoteChange({ updatedAt: changed.updated_at, updatedBy: changed.updated_by })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [applyStored, family?.household?.id, session?.user?.id])

  useEffect(() => {
    const scope = scopeRef.current
    if (!scope?.canEdit || scope.householdId !== family?.household?.id || !hasSharedState(localState)) return
    const serialized = stableStringify(localState)
    if (adoptRemoteRef.current) {
      adoptRemoteRef.current = false
      remoteStateRef.current = serialized
      return
    }

    const draft = draftRef.current
    if (draft || serialized !== remoteStateRef.current) {
      const baseState = draft?.baseState || parseSharedState(remoteStateRef.current)
      if (!baseState) return
      storeDraft(serialized === stableStringify(baseState) && !inFlightSaveRef.current
        ? null : { baseState, localState })
    }
    if (conflict || inFlightSaveRef.current || resaveCountRef.current > 3) return
    if (!draftRef.current) {
      if (draft && isOnline && !wasOfflineRef.current) setSyncStatus('synced')
      return
    }
    if (!isOnline || wasOfflineRef.current) {
      setSyncStatus('offline')
      return
    }

    setSyncStatus('saving')
    const timer = window.setTimeout(async () => {
      const snapshot = draftRef.current?.localState
      if (!snapshot || scope !== scopeRef.current) return
      const request = { snapshot, version: versionRef.current }
      inFlightSaveRef.current = request
      const { data: saved, error: saveError } = await supabase.rpc('save_household_state_v2', {
        target_household_id: scope.householdId,
        next_state: snapshot,
        expected_version: request.version,
      }).single()
      if (inFlightSaveRef.current !== request || scope !== scopeRef.current) return
      inFlightSaveRef.current = null
      if (saveError) {
        if (isConflictError(saveError)) {
          try { await buildConflict(scope) }
          catch (loadError) { markConnectionFailure(loadError) }
        } else {
          markConnectionFailure(saveError)
        }
        return
      }
      if (Number(saved.version) < versionRef.current) {
        setSaveRevision((current) => current + 1)
        return
      }
      const latest = draftRef.current?.localState || localStateRef.current
      if (stableStringify(latest) === stableStringify(snapshot)) storeDraft(null)
      else storeDraft({ baseState: snapshot, localState: latest })
      setError('')
      applyStored(saved)
      if (request.remote && Number(request.remote.version) > Number(saved.version)) applyStored(request.remote)
      if (request.refresh) loadFamilyContext(session?.user?.id, scope.householdId).catch(markConnectionFailure)
    }, 650)
    saveTimerRef.current = timer
    return () => window.clearTimeout(timer)
  }, [applyStored, buildConflict, conflict, family?.household?.id, family?.membership?.can_edit,
    isOnline, loadFamilyContext, localState, markConnectionFailure, saveRevision, session?.user?.id, storeDraft])

  useEffect(() => {
    if (!isOnline || !wasOfflineRef.current || !session?.user) return
    loadFamilyContext(session.user.id, scopeRef.current?.householdId).catch(markConnectionFailure)
  }, [isOnline, loadFamilyContext, markConnectionFailure, session?.user])

  const resolveConflict = (prefer) => {
    if (!conflict) return
    setError('')
    applyStored({
      state: conflict.remoteState,
      version: conflict.remoteVersion,
      updated_at: conflict.updatedAt,
    }, { prefer })
  }
  const acceptRemote = () => resolveConflict('remote')
  const keepLocal = () => resolveConflict('local')

  const signIn = async (email, password) => {
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) throw authError
  }
  const signUp = async (email, password) => {
    setError('')
    const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
    if (authError) throw authError
    return data.session ? '가입과 로그인이 완료되었습니다.' : '확인 메일을 보냈습니다. 메일 인증 후 로그인해 주세요.'
  }
  const signOut = async () => {
    const { error: authError } = await supabase.auth.signOut()
    if (authError) throw authError
  }
  const createFamily = async ({ householdName, displayName, memberRole }) => {
    const { data, error: rpcError } = await supabase.rpc('create_household', { household_name: householdName, display_name: displayName, member_role: memberRole }).single()
    if (rpcError) throw rpcError
    return loadFamilyContext(session.user.id, data.household_id)
  }
  const joinFamily = async ({ inviteCode, displayName, memberRole }) => {
    const { data: householdId, error: rpcError } = await supabase.rpc('join_household', { household_code: inviteCode, display_name: displayName, member_role: memberRole })
    if (rpcError) throw rpcError
    return loadFamilyContext(session.user.id, householdId)
  }
  // 초대 코드만으로 참여: 이 기기에 손님 계정을 만들고 바로 가족방에 들어감 (Supabase '익명 로그인'이 켜져 있어야 함)
  const joinWithCode = async ({ inviteCode, displayName, memberRole }) => {
    setError('')
    const { data, error: authError } = await supabase.auth.signInAnonymously()
    if (authError) throw new Error(/anonymous/i.test(authError.message) ? '초대 코드 바로 참여가 아직 꺼져 있어요. 관리자에게 Supabase 설정을 켜 달라고 해 주세요.' : authError.message)
    const { data: householdId, error: rpcError } = await supabase.rpc('join_household', { household_code: inviteCode, display_name: displayName, member_role: memberRole })
    if (rpcError) { await supabase.auth.signOut(); throw rpcError }
    return loadFamilyContext(data.user.id, householdId)
  }
  const updatePermission = async (userId, canEdit) => {
    const { error: rpcError } = await supabase.rpc('set_household_member_permission', { target_household_id: family.household.id, target_user_id: userId, allow_edit: canEdit })
    if (rpcError) throw rpcError
    return loadFamilyContext(session.user.id, family.household.id)
  }
  const restoreVersion = async (historyId) => {
    const { error: rpcError } = await supabase.rpc('restore_household_state', { target_household_id: family.household.id, target_history_id: historyId })
    if (rpcError) throw rpcError
    return loadFamilyContext(session.user.id, family.household.id)
  }

  return {
    enabled: supabaseEnabled, session, family, syncStatus, error: draftError || error, isOnline, lastSyncedAt, remoteChange, conflict,
    signIn, signUp, signOut, createFamily, joinFamily, joinWithCode, updatePermission, restoreVersion, acceptRemote, keepLocal,
    dismissRemoteChange: () => setRemoteChange(null),
    refresh: () => session?.user ? loadFamilyContext(session.user.id, family?.household?.id) : null,
  }
}

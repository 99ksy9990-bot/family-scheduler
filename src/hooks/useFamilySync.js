import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, supabaseEnabled } from '../lib/supabase'

const hasSharedState = (value) => value && typeof value === 'object' && Object.keys(value).length > 0
const isConflictError = (error) => error?.code === '40001' || error?.message?.includes('SYNC_CONFLICT')

export function useFamilySync({ localState, onRemoteState }) {
  const [session, setSession] = useState(null)
  const [family, setFamily] = useState(null)
  const [syncStatus, setSyncStatus] = useState(supabaseEnabled ? 'local' : 'offline')
  const [error, setError] = useState('')
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [remoteChange, setRemoteChange] = useState(null)
  const [conflict, setConflict] = useState(null)
  const localStateRef = useRef(localState)
  const remoteStateRef = useRef('')
  const versionRef = useRef(0)
  const pendingLocalSaveRef = useRef(false)
  const pendingSnapshotRef = useRef(null)
  const saveTimerRef = useRef(null)

  useEffect(() => { localStateRef.current = localState }, [localState])

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
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

  const buildConflict = useCallback(async (householdId, localSnapshot = localStateRef.current) => {
    const { data: stored, error: stateError } = await supabase
      .from('household_states')
      .select('state, version, updated_at, updated_by')
      .eq('household_id', householdId)
      .single()
    if (stateError) throw stateError
    versionRef.current = stored.version
    setFamily((current) => current ? { ...current, version: stored.version } : current)
    setConflict({
      localState: localSnapshot,
      remoteState: stored.state,
      remoteVersion: stored.version,
      updatedAt: stored.updated_at,
      updatedBy: stored.updated_by,
    })
    setSyncStatus('conflict')
    return stored
  }, [])

  const loadFamilyContext = useCallback(async (userId, preferredHouseholdId) => {
    if (!supabase || !userId) return null
    if (!navigator.onLine) {
      setSyncStatus('offline')
      return null
    }
    setSyncStatus('connecting')
    setError('')

    let membershipQuery = supabase
      .from('household_members')
      .select('household_id, user_id, display_name, member_role, can_edit, joined_at')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true })
    if (preferredHouseholdId) membershipQuery = membershipQuery.eq('household_id', preferredHouseholdId)
    const { data: memberships, error: membershipError } = await membershipQuery.limit(1)
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

    versionRef.current = stored.version
    const nextFamily = { household, membership, members: members || [], version: stored.version, history: history || [] }
    setFamily(nextFamily)
    setLastSyncedAt(stored.updated_at)
    setConflict(null)

    if (hasSharedState(stored.state)) {
      const serialized = JSON.stringify(stored.state)
      remoteStateRef.current = serialized
      pendingLocalSaveRef.current = false
      onRemoteState(stored.state)
    } else if (membership.can_edit) {
      const { data: saved, error: saveError } = await supabase.rpc('save_household_state_v2', {
        target_household_id: membership.household_id,
        next_state: localStateRef.current,
        expected_version: stored.version,
      }).single()
      if (saveError) throw saveError
      remoteStateRef.current = JSON.stringify(saved.state)
      versionRef.current = saved.version
      setFamily((current) => current ? { ...current, version: saved.version } : current)
      setLastSyncedAt(saved.updated_at)
    }

    setSyncStatus(membership.can_edit ? 'synced' : 'readonly')
    return nextFamily
  }, [onRemoteState])

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
      setSession(data.session)
      if (data.session?.user) loadFamilyContext(data.session.user.id).catch((contextError) => {
        setError(contextError.message)
        setSyncStatus(navigator.onLine ? 'error' : 'offline')
      })
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      if (!nextSession?.user) {
        setFamily(null)
        setSyncStatus('local')
        return
      }
      window.setTimeout(() => {
        loadFamilyContext(nextSession.user.id).catch((contextError) => {
          setError(contextError.message)
          setSyncStatus(navigator.onLine ? 'error' : 'offline')
        })
      }, 0)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [loadFamilyContext])

  useEffect(() => {
    if (!supabase || !family?.household?.id) return undefined
    const householdId = family.household.id
    const channel = supabase
      .channel(`family-state-${householdId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'household_states', filter: `household_id=eq.${householdId}`,
      }, ({ new: changed }) => {
        if (!hasSharedState(changed?.state)) return
        const serialized = JSON.stringify(changed.state)
        const localSerialized = JSON.stringify(localStateRef.current)
        setVersion(changed.version)
        setLastSyncedAt(changed.updated_at)
        if (serialized === localSerialized) {
          remoteStateRef.current = serialized
          pendingLocalSaveRef.current = false
          pendingSnapshotRef.current = null
          setConflict(null)
          setSyncStatus(family.membership.can_edit ? 'synced' : 'readonly')
          return
        }
        if (pendingLocalSaveRef.current) {
          setConflict({
            localState: pendingSnapshotRef.current || localStateRef.current,
            remoteState: changed.state,
            remoteVersion: changed.version,
            updatedAt: changed.updated_at,
            updatedBy: changed.updated_by,
          })
          setSyncStatus('conflict')
          return
        }
        remoteStateRef.current = serialized
        onRemoteState(changed.state)
        if (changed.updated_by && changed.updated_by !== session?.user?.id) {
          setRemoteChange({ updatedAt: changed.updated_at, updatedBy: changed.updated_by })
        }
        setSyncStatus(family.membership.can_edit ? 'synced' : 'readonly')
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [family?.household?.id, family?.membership?.can_edit, onRemoteState, session?.user?.id, setVersion])

  useEffect(() => {
    if (!family?.household?.id || !family.membership.can_edit || conflict) return undefined
    const serialized = JSON.stringify(localState)
    if (serialized === remoteStateRef.current) return undefined
    pendingLocalSaveRef.current = true
    pendingSnapshotRef.current = localState

    if (!isOnline || !supabase) {
      window.setTimeout(() => setSyncStatus('offline'), 0)
      return undefined
    }

    window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(async () => {
      setSyncStatus('saving')
      const expectedVersion = versionRef.current
      const snapshot = localStateRef.current
      const { data: saved, error: saveError } = await supabase.rpc('save_household_state_v2', {
        target_household_id: family.household.id,
        next_state: snapshot,
        expected_version: expectedVersion,
      }).single()
      if (saveError) {
        if (isConflictError(saveError)) {
          try { await buildConflict(family.household.id, snapshot) }
          catch (loadError) { setError(loadError.message); setSyncStatus('error') }
          return
        }
        setError(saveError.message)
        setSyncStatus(navigator.onLine ? 'error' : 'offline')
        return
      }
      const savedSerialized = JSON.stringify(saved.state)
      remoteStateRef.current = savedSerialized
      versionRef.current = saved.version
      pendingLocalSaveRef.current = savedSerialized !== JSON.stringify(localStateRef.current)
      pendingSnapshotRef.current = pendingLocalSaveRef.current ? localStateRef.current : null
      setFamily((current) => current ? { ...current, version: saved.version } : current)
      setLastSyncedAt(saved.updated_at)
      setError('')
      setSyncStatus(pendingLocalSaveRef.current ? 'saving' : 'synced')
    }, 650)

    return () => window.clearTimeout(saveTimerRef.current)
  }, [buildConflict, conflict, family?.household?.id, family?.membership?.can_edit, isOnline, localState])

  useEffect(() => {
    if (!isOnline) {
      if (family) window.setTimeout(() => setSyncStatus('offline'), 0)
      return
    }
    if (session?.user && family && pendingLocalSaveRef.current && !conflict) {
      setSyncStatus('saving')
      setVersion(versionRef.current)
    }
  }, [conflict, family, isOnline, session?.user, setVersion])

  const acceptRemote = useCallback(() => {
    if (!conflict) return
    remoteStateRef.current = JSON.stringify(conflict.remoteState)
    pendingLocalSaveRef.current = false
    pendingSnapshotRef.current = null
    onRemoteState(conflict.remoteState)
    setLastSyncedAt(conflict.updatedAt)
    setConflict(null)
    setError('')
    setSyncStatus(family?.membership?.can_edit ? 'synced' : 'readonly')
  }, [conflict, family?.membership?.can_edit, onRemoteState])

  const keepLocal = useCallback(async () => {
    if (!conflict || !family?.household?.id || !isOnline) return
    setSyncStatus('saving')
    const { data: saved, error: saveError } = await supabase.rpc('save_household_state_v2', {
      target_household_id: family.household.id,
      next_state: conflict.localState,
      expected_version: conflict.remoteVersion,
    }).single()
    if (saveError) {
      if (isConflictError(saveError)) await buildConflict(family.household.id, conflict.localState)
      else { setError(saveError.message); setSyncStatus('error') }
      return
    }
    remoteStateRef.current = JSON.stringify(saved.state)
    versionRef.current = saved.version
    pendingLocalSaveRef.current = false
    pendingSnapshotRef.current = null
    onRemoteState(saved.state)
    setFamily((current) => current ? { ...current, version: saved.version } : current)
    setLastSyncedAt(saved.updated_at)
    setConflict(null)
    setError('')
    setSyncStatus('synced')
  }, [buildConflict, conflict, family, isOnline, onRemoteState])

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
    enabled: supabaseEnabled, session, family, syncStatus, error, isOnline, lastSyncedAt, remoteChange, conflict,
    signIn, signUp, signOut, createFamily, joinFamily, updatePermission, restoreVersion, acceptRemote, keepLocal,
    dismissRemoteChange: () => setRemoteChange(null),
    refresh: () => session?.user ? loadFamilyContext(session.user.id, family?.household?.id) : null,
  }
}

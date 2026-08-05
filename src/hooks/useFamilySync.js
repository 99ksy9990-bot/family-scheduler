import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, supabaseEnabled } from '../lib/supabase'

const hasSharedState = (value) => value && typeof value === 'object' && Object.keys(value).length > 0

export function useFamilySync({ localState, onRemoteState }) {
  const [session, setSession] = useState(null)
  const [family, setFamily] = useState(null)
  const [syncStatus, setSyncStatus] = useState(supabaseEnabled ? 'local' : 'offline')
  const [error, setError] = useState('')
  const localStateRef = useRef(localState)
  const remoteStateRef = useRef('')
  const saveTimerRef = useRef(null)

  useEffect(() => {
    localStateRef.current = localState
  }, [localState])

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

    const nextFamily = { household, membership, members: members || [], version: stored.version, history: history || [] }
    setFamily(nextFamily)

    if (hasSharedState(stored.state)) {
      const serialized = JSON.stringify(stored.state)
      remoteStateRef.current = serialized
      onRemoteState(stored.state)
    } else if (membership.can_edit) {
      const { data: saved, error: saveError } = await supabase.rpc('save_household_state', {
        target_household_id: membership.household_id,
        next_state: localStateRef.current,
      }).single()
      if (saveError) throw saveError
      remoteStateRef.current = JSON.stringify(saved.state)
      setFamily((current) => current ? { ...current, version: saved.version } : current)
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
        setSyncStatus('error')
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
          setSyncStatus('error')
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
        event: 'UPDATE',
        schema: 'public',
        table: 'household_states',
        filter: `household_id=eq.${householdId}`,
      }, ({ new: changed }) => {
        if (!hasSharedState(changed?.state)) return
        const serialized = JSON.stringify(changed.state)
        if (serialized === JSON.stringify(localStateRef.current)) return
        remoteStateRef.current = serialized
        onRemoteState(changed.state)
        setFamily((current) => current ? { ...current, version: changed.version } : current)
        setSyncStatus(family.membership.can_edit ? 'synced' : 'readonly')
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [family?.household?.id, family?.membership?.can_edit, onRemoteState])

  useEffect(() => {
    if (!supabase || !family?.household?.id || !family.membership.can_edit) return undefined
    const serialized = JSON.stringify(localState)
    if (serialized === remoteStateRef.current) return undefined

    window.clearTimeout(saveTimerRef.current)
    setSyncStatus('saving')
    saveTimerRef.current = window.setTimeout(async () => {
      const { data: saved, error: saveError } = await supabase.rpc('save_household_state', {
        target_household_id: family.household.id,
        next_state: localStateRef.current,
      }).single()
      if (saveError) {
        setError(saveError.message)
        setSyncStatus('error')
        return
      }
      remoteStateRef.current = JSON.stringify(saved.state)
      setFamily((current) => current ? { ...current, version: saved.version } : current)
      setSyncStatus('synced')
    }, 650)

    return () => window.clearTimeout(saveTimerRef.current)
  }, [family?.household?.id, family?.membership?.can_edit, localState])

  const signIn = async (email, password) => {
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) throw authError
  }

  const signUp = async (email, password) => {
    setError('')
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (authError) throw authError
    return data.session ? '가입과 로그인이 완료되었습니다.' : '확인 메일을 보냈습니다. 메일 인증 후 로그인해 주세요.'
  }

  const signOut = async () => {
    const { error: authError } = await supabase.auth.signOut()
    if (authError) throw authError
  }

  const createFamily = async ({ householdName, displayName, memberRole }) => {
    const { data, error: rpcError } = await supabase.rpc('create_household', {
      household_name: householdName,
      display_name: displayName,
      member_role: memberRole,
    }).single()
    if (rpcError) throw rpcError
    return loadFamilyContext(session.user.id, data.household_id)
  }

  const joinFamily = async ({ inviteCode, displayName, memberRole }) => {
    const { data: householdId, error: rpcError } = await supabase.rpc('join_household', {
      household_code: inviteCode,
      display_name: displayName,
      member_role: memberRole,
    })
    if (rpcError) throw rpcError
    return loadFamilyContext(session.user.id, householdId)
  }

  const updatePermission = async (userId, canEdit) => {
    const { error: rpcError } = await supabase.rpc('set_household_member_permission', {
      target_household_id: family.household.id,
      target_user_id: userId,
      allow_edit: canEdit,
    })
    if (rpcError) throw rpcError
    return loadFamilyContext(session.user.id, family.household.id)
  }

  const restoreVersion = async (historyId) => {
    const { error: rpcError } = await supabase.rpc('restore_household_state', {
      target_household_id: family.household.id,
      target_history_id: historyId,
    })
    if (rpcError) throw rpcError
    return loadFamilyContext(session.user.id, family.household.id)
  }

  return {
    enabled: supabaseEnabled,
    session,
    family,
    syncStatus,
    error,
    signIn,
    signUp,
    signOut,
    createFamily,
    joinFamily,
    updatePermission,
    restoreVersion,
    refresh: () => session?.user ? loadFamilyContext(session.user.id, family?.household?.id) : null,
  }
}

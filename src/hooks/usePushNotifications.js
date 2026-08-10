import { useCallback, useEffect, useState } from 'react'
import { supabase, supabaseUrl } from '../lib/supabase'

const supported = () => typeof window !== 'undefined'
  && 'serviceWorker' in navigator
  && 'PushManager' in window
  && 'Notification' in window

const toUint8Array = (value) => {
  const padded = `${value}${'='.repeat((4 - value.length % 4) % 4)}`
  const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0))
}

const subscriptionRecord = (subscription, family, session) => {
  const serialized = subscription.toJSON()
  return {
    household_id: family.household.id,
    user_id: session.user.id,
    endpoint: subscription.endpoint,
    p256dh: serialized.keys.p256dh,
    auth: serialized.keys.auth,
    device_label: `${navigator.platform || '기기'} · ${navigator.userAgent.includes('Mobile') ? '모바일' : '브라우저'}`,
    updated_at: new Date().toISOString(),
  }
}

export function usePushNotifications({ session, family }) {
  const [status, setStatus] = useState(() => !supported() ? 'unsupported' : Notification.permission === 'denied' ? 'denied' : 'idle')
  const [error, setError] = useState('')

  const saveSubscription = useCallback(async (subscription) => {
    if (!supabase || !session?.user || !family?.household?.id || !subscription) return
    const { error: upsertError } = await supabase
      .from('push_subscriptions')
      .upsert(subscriptionRecord(subscription, family, session), { onConflict: 'endpoint' })
    if (upsertError) throw upsertError
  }, [family, session])

  const enable = useCallback(async () => {
    if (!supported()) {
      setStatus('unsupported')
      return false
    }
    if (!session || !family) {
      setError('먼저 가족 계정에 연결해 주세요.')
      setStatus('error')
      return false
    }
    setStatus('enabling')
    setError('')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'idle')
        return false
      }
      const registration = await navigator.serviceWorker.ready
      const response = await fetch(`${supabaseUrl}/functions/v1/send-family-push`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!response.ok) throw new Error('푸시 알림 설정을 불러오지 못했습니다.')
      const { publicKey } = await response.json()
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toUint8Array(publicKey),
        })
      }
      await saveSubscription(subscription)
      setStatus('enabled')
      return true
    } catch (enableError) {
      setError(enableError.message || '푸시 알림을 켜지 못했습니다.')
      setStatus('error')
      return false
    }
  }, [family, saveSubscription, session])

  useEffect(() => {
    if (!supported() || Notification.permission !== 'granted') return undefined
    let active = true
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then(async (subscription) => {
        if (!active) return
        if (!subscription) {
          setStatus('idle')
          return
        }
        if (session && family) await saveSubscription(subscription)
        if (active) setStatus('enabled')
      })
      .catch((subscriptionError) => {
        if (!active) return
        setError(subscriptionError.message)
        setStatus('error')
      })
    return () => { active = false }
  }, [family, saveSubscription, session])

  return { status, error, enable, permission: supported() ? Notification.permission : 'unsupported' }
}


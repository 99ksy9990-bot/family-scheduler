import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

const base64Url = (bytes: Uint8Array) => {
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function ensureVapidKeys() {
  const { data: existing, error } = await admin
    .from('push_config')
    .select('public_key, private_key')
    .eq('singleton', true)
    .maybeSingle()
  if (error) throw error
  if (existing) return existing

  const keys = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  )
  const publicJwk = await crypto.subtle.exportKey('jwk', keys.publicKey)
  const privateJwk = await crypto.subtle.exportKey('jwk', keys.privateKey)
  if (!publicJwk.x || !publicJwk.y || !privateJwk.d) throw new Error('VAPID key generation failed')

  const decode = (value: string) => Uint8Array.from(
    atob(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')),
    (char) => char.charCodeAt(0),
  )
  const x = decode(publicJwk.x)
  const y = decode(publicJwk.y)
  const publicKey = base64Url(new Uint8Array([4, ...x, ...y]))
  const privateKey = privateJwk.d
  const { error: insertError } = await admin.from('push_config').insert({
    singleton: true,
    public_key: publicKey,
    private_key: privateKey,
  })
  if (insertError && insertError.code !== '23505') throw insertError

  if (insertError?.code === '23505') {
    const { data: concurrent, error: reloadError } = await admin
      .from('push_config')
      .select('public_key, private_key')
      .eq('singleton', true)
      .single()
    if (reloadError) throw reloadError
    return concurrent
  }
  return { public_key: publicKey, private_key: privateKey }
}

const koreanNow = (source = new Date()) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(source).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  }
}

const parseTime = (value: string) => {
  if (!value || value === '종일') return null
  const korean = value.match(/(오전|오후)\s*(\d{1,2}):(\d{2})/)
  const twentyFour = value.match(/^(\d{1,2}):(\d{2})$/)
  if (!korean && !twentyFour) return null
  if (twentyFour) return Number(twentyFour[1]) * 60 + Number(twentyFour[2])
  let hour = Number(korean![2]) % 12
  if (korean![1] === '오후') hour += 12
  return hour * 60 + Number(korean![3])
}

const dateAtKstMinutes = (date: string, minutes: number) => {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day, Math.floor(minutes / 60) - 9, minutes % 60)
}

const dateParts = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return { year, month, day, utc: Date.UTC(year, month - 1, day) }
}

const addDate = (value: string, amount: number) => {
  const current = dateParts(value)
  const next = new Date(current.utc + amount * 24 * 60 * 60 * 1000)
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`
}

const eventStartsOnDate = (event: Record<string, unknown>, targetDate: string) => {
  if (typeof event.date !== 'string') return false
  const recurrence = event.recurrence && typeof event.recurrence === 'object'
    ? event.recurrence as Record<string, unknown>
    : null
  if (!recurrence?.frequency || recurrence.frequency === 'none') return event.date === targetDate
  if (targetDate < event.date || (typeof recurrence.until === 'string' && targetDate > recurrence.until)) return false

  const start = dateParts(event.date)
  const target = dateParts(targetDate)
  const interval = Math.max(1, Number(recurrence.interval) || 1)
  const days = Math.round((target.utc - start.utc) / (24 * 60 * 60 * 1000))
  if (recurrence.frequency === 'daily') return days % interval === 0
  if (recurrence.frequency === 'weekly') return days % (7 * interval) === 0
  if (recurrence.frequency === 'monthly') {
    const months = (target.year - start.year) * 12 + target.month - start.month
    const targetDay = Math.min(start.day, new Date(Date.UTC(target.year, target.month, 0)).getUTCDate())
    return months >= 0 && months % interval === 0 && target.day === targetDay
  }
  if (recurrence.frequency === 'yearly') {
    const years = target.year - start.year
    const targetDay = Math.min(start.day, new Date(Date.UTC(target.year, start.month, 0)).getUTCDate())
    return years >= 0 && years % interval === 0 && target.month === start.month && target.day === targetDay
  }
  return false
}

const notificationCandidates = (state: Record<string, unknown>, now: Date) => {
  const current = koreanNow(now)
  const currentMs = now.getTime()
  const candidates: Array<{ key: string; title: string; body: string; url: string }> = []
  const events = Array.isArray(state.events) ? state.events as Array<Record<string, unknown>> : []
  const tasks = Array.isArray(state.tasks) ? state.tasks as Array<Record<string, unknown>> : []
  const exceptions = Array.isArray(state.scheduleExceptions) ? state.scheduleExceptions as Array<Record<string, unknown>> : []
  const reminderDates = [current.date, addDate(current.date, 1)]

  events.forEach((event) => {
    if (event.reminder !== '30-minutes' || typeof event.time !== 'string') return
    const minutes = parseTime(event.time)
    if (minutes === null) return
    reminderDates.forEach((occurrenceDate) => {
      if (!eventStartsOnDate(event, occurrenceDate)) return
      if (exceptions.some((exception) => exception.scheduleId === event.id && exception.date === occurrenceDate && exception.type === 'skip')) return
      const startMs = dateAtKstMinutes(occurrenceDate, minutes)
      const triggerMs = startMs - 30 * 60 * 1000
      if (currentMs < triggerMs || currentMs >= triggerMs + 60 * 1000) return
      candidates.push({
        key: `event-${String(event.id)}-${occurrenceDate}-${minutes}-30`,
        title: '30분 뒤 일정',
        body: `${String(event.title || '가족 일정')} · ${event.time}${event.location ? ` · ${String(event.location)}` : ''}`,
        url: '/?view=calendar',
      })
    })
  })

  if (current.hour === 9 && current.minute === 0) {
    tasks.forEach((task) => {
      if (task.done || !task.dueDate || !task.reminder || task.reminder === 'none') return
      const due = new Date(`${String(task.dueDate)}T00:00:00+09:00`)
      const trigger = new Date(due)
      if (task.reminder === 'day-before') trigger.setDate(trigger.getDate() - 1)
      if (koreanNow(trigger).date !== current.date) return
      candidates.push({
        key: `task-${String(task.id)}-${current.date}-${String(task.reminder)}`,
        title: task.reminder === 'day-before' ? '내일 마감할 일' : '오늘 마감할 일',
        body: String(task.title || '가족 할 일'),
        url: '/?view=tasks',
      })
    })
  }
  return candidates
}

const scheduleSlice = (state: Record<string, unknown>) => JSON.stringify({
  events: state.events ?? [],
  childSchedules: state.childSchedules ?? [],
  shifts: state.shifts ?? [],
  schedulePeriods: state.schedulePeriods ?? [],
  anniversaries: state.anniversaries ?? [],
  scheduleExceptions: state.scheduleExceptions ?? [],
})

async function alreadyDelivered(subscriptionId: string, key: string) {
  const { data } = await admin.from('push_delivery_log').select('id').eq('subscription_id', subscriptionId).eq('notification_key', key).maybeSingle()
  return Boolean(data)
}

async function deliver(subscription: Record<string, string>, candidate: { key: string; title: string; body: string; url: string }) {
  if (await alreadyDelivered(subscription.id, candidate.key)) return false
  try {
    await webpush.sendNotification({
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    }, JSON.stringify({ ...candidate, tag: candidate.key }), { TTL: 3600, urgency: 'high' })
    await admin.from('push_delivery_log').insert({ subscription_id: subscription.id, notification_key: candidate.key })
    return true
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 404 || statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', subscription.id)
    console.error('push delivery failed', subscription.id, statusCode, String(error))
    return false
  }
}

async function authorizeUser(req: Request) {
  const authorization = req.headers.get('Authorization') ?? ''
  if (!authorization.startsWith('Bearer ')) return null
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } },
  })
  const { data, error } = await client.auth.getUser()
  if (error) return null
  return data.user
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const keys = await ensureVapidKeys()
    webpush.setVapidDetails('mailto:notifications@family-scheduler.app', keys.public_key, keys.private_key)

    if (req.method === 'GET') {
      const user = await authorizeUser(req)
      if (!user) return json({ error: '로그인이 필요합니다.' }, 401)
      return json({ publicKey: keys.public_key })
    }

    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    const { data: expectedSecret, error: secretError } = await admin.rpc('get_push_cron_secret')
    if (secretError || !expectedSecret || req.headers.get('x-cron-secret') !== expectedSecret) {
      return json({ error: 'Forbidden' }, 403)
    }

    const [{ data: states, error: statesError }, { data: subscriptions, error: subscriptionsError }] = await Promise.all([
      admin.from('household_states').select('household_id, state, version, updated_at, updated_by'),
      admin.from('push_subscriptions').select('id, household_id, user_id, endpoint, p256dh, auth'),
    ])
    if (statesError) throw statesError
    if (subscriptionsError) throw subscriptionsError

    let delivered = 0
    const now = new Date()
    for (const stored of states ?? []) {
      const householdSubscriptions = (subscriptions ?? []).filter((item) => item.household_id === stored.household_id)
      const candidates = notificationCandidates(stored.state ?? {}, now)

      if (Date.now() - new Date(stored.updated_at).getTime() < 3 * 60 * 1000 && stored.version > 1) {
        const { data: previous } = await admin
          .from('household_state_history')
          .select('state')
          .eq('household_id', stored.household_id)
          .eq('version', stored.version - 1)
          .maybeSingle()
        if (previous && scheduleSlice(previous.state ?? {}) !== scheduleSlice(stored.state ?? {})) {
          candidates.push({
            key: `schedule-change-${stored.household_id}-${stored.version}`,
            title: '가족 일정이 변경됐어요',
            body: '다른 기기에서 변경한 내용을 확인해 주세요.',
            url: '/?view=calendar',
          })
        }
      }

      for (const candidate of candidates) {
        for (const subscription of householdSubscriptions) {
          if (candidate.key.startsWith('schedule-change-') && subscription.user_id === stored.updated_by) continue
          if (await deliver(subscription, candidate)) delivered += 1
        }
      }
    }

    await admin.from('push_delivery_log').delete().lt('delivered_at', new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString())
    return json({ ok: true, delivered })
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
})

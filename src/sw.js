const CACHE_PREFIX = 'family-scheduler-shell'
const CACHE_NAME = `${CACHE_PREFIX}-v5`
const PRECACHE_ENTRIES = self.__WB_MANIFEST
const PRECACHE_URLS = PRECACHE_ENTRIES.map((entry) => typeof entry === 'string' ? entry : entry.url)
const PRECACHE_ABSOLUTE_URLS = new Set(PRECACHE_URLS.map((url) => new URL(url, self.location.origin).href))

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)))
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)))
    const cache = await caches.open(CACHE_NAME)
    const cachedRequests = await cache.keys()
    await Promise.all(cachedRequests.filter((request) => !PRECACHE_ABSOLUTE_URLS.has(request.url)).map((request) => cache.delete(request)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        const cache = await caches.open(CACHE_NAME)
        cache.put('/index.html', response.clone())
        return response
      } catch {
        return (await caches.match('/index.html')) || (await caches.match('/')) || Response.error()
      }
    })())
    return
  }

  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreVary: true })
    if (cached) return cached
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  })())
})

self.addEventListener('push', (event) => {
  let data
  try { data = event.data?.json() || {} } catch { data = { body: event.data?.text() || '' } }
  event.waitUntil(self.registration.showNotification(data.title || 'Family Scheduler', {
    body: data.body || '가족 일정에 새 소식이 있습니다.',
    icon: '/app-icon-192.png',
    badge: '/app-icon-192.png',
    tag: data.tag || 'family-scheduler',
    renotify: true,
    data: { url: data.url || '/' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const client = clients.find((item) => item.url.startsWith(self.location.origin))
    if (client) {
      await client.focus()
      if ('navigate' in client) await client.navigate(target)
      return
    }
    await self.clients.openWindow(target)
  })())
})

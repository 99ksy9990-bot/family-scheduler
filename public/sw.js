self.addEventListener('push', (event) => {
  let data = {}
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


import { test as base, expect } from '@playwright/test'

const test = base.extend({
  schedulerSetup: [async ({ page, context }, use, testInfo) => {
  if (testInfo.project.name === 'iphone') {
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 59, bottom: 34, left: 0, right: 0 } })
  }
  await page.clock.install({ time: new Date('2026-11-05T10:00:00+09:00') })
  await page.addInitScript(() => {
    if (localStorage.getItem('v2-test-seeded')) return
    localStorage.setItem('v2-test-seeded', '1')
    const data = {
      'profiles-v1': [{ id: 'p', name: '가족', type: 'adult', characterId: 'dad' }],
      events: [{ id: 'e', title: '오후 일정', date: '2026-11-05', time: '오후 2:00', end: '오후 3:00', member: 'p' }],
      'work-settings-v1': { enabled: false },
    }
    for (const [key, value] of Object.entries(data)) localStorage.setItem(`family-scheduler-${key}`, JSON.stringify(value))
  })
  await page.goto('/')
  await use()
  }, { auto: true }],
})

export { test, expect }

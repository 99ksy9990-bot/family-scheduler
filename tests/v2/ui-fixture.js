import { test as base, expect } from '@playwright/test'

const test = base.extend({
  connected: [true, { option: true }],
  schedulerSetup: [async ({ page, context, connected }, use, testInfo) => {
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
  if (connected) {
    await page.addInitScript(() => {
      const payload = btoa(JSON.stringify({ sub: 'test-user', exp: 4102444800, role: 'authenticated' }))
      localStorage.setItem('sb-127-auth-token', JSON.stringify({ access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.test`, refresh_token: 'test-refresh', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user: { id: 'test-user', email: 'test@example.invalid', aud: 'authenticated' } }))
    })
    await page.route('**/rest/v1/**', async (route) => {
      const url = new URL(route.request().url())
      const table = url.pathname.split('/').at(-1)
      const member = { household_id: 'test-household', user_id: 'test-user', can_edit: true, member_role: 'owner', display_name: '테스트' }
      let data = []
      if (table === 'household_members') data = [member]
      if (table === 'households') data = { id: 'test-household', name: '검사용 가족', owner_id: 'test-user', invite_code: 'TEST' }
      if (table === 'household_states') {
        const state = await page.evaluate(() => {
          const keys = { profiles: 'profiles-v1', events: 'events', tasks: 'tasks', shifts: 'shifts', childSchedules: 'child-schedules-v1', childProfiles: 'child-profiles-v1', schedulePeriods: 'periods-v1', anniversaries: 'anniversaries-v1', scheduleExceptions: 'schedule-exceptions-v1', workSettings: 'work-settings-v1', profileLinks: 'profile-links-v1' }
          return Object.fromEntries(Object.entries(keys).filter(([, key]) => localStorage.getItem(`family-scheduler-${key}`)).map(([field, key]) => [field, JSON.parse(localStorage.getItem(`family-scheduler-${key}`))]))
        })
        data = { state, version: 1, updated_at: '2026-11-05T00:00:00Z' }
      }
      if (table === 'save_household_state_v2') data = { state: route.request().postDataJSON().next_state, version: 2 }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })
    })
    await page.route('**/auth/v1/logout*', (route) => route.fulfill({ status: 204 }))
  }
  await page.goto('/')
  if (connected) await expect(page.locator('.demo-banner')).toHaveCount(0)
  await use()
  }, { auto: true }],
})

export { test, expect }

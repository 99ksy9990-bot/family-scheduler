import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page, context }, testInfo) => {
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
})

test('첫 화면 일정·캐릭터·24시간 표기·5개 탭·가로 넘침 없음', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '오늘우리', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '오후 일정', exact: true })).toBeInViewport()
  await expect(page.locator('.timeline-time time')).toHaveText('14:00')
  await expect(page.locator('.character img')).toHaveAttribute('src', '/characters/dad_basic.png')
  await expect(page.getByRole('navigation').getByRole('button')).toHaveCount(5)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const frame = await page.locator('.v2-app').boundingBox()
  expect(frame.width).toBeLessThanOrEqual(480)
  expect(Math.abs(frame.x - (page.viewportSize().width - frame.width) / 2)).toBeLessThan(1)
  expect(await page.locator('.bottom-nav').evaluate((nav) => nav.getBoundingClientRect().width)).toBeLessThanOrEqual(480)
  for (const label of ['할 일', '놀이', '설정']) {
    await page.getByRole('navigation').getByRole('button', { name: label, exact: true }).click()
    await expect(page.getByRole('heading', { name: `${label} 준비 중` })).toBeVisible()
  }
})

test('오늘·달력 개수 동일·월주 전환·오늘 복귀·날짜 시트·Escape 복귀', async ({ page }) => {
  const count = await page.getByTestId('today-count').textContent()
  await page.getByRole('navigation').getByRole('button', { name: '달력', exact: true }).click()
  const today = page.getByRole('button', { name: `2026-11-05 일정 ${count}개`, exact: true })
  await today.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('heading', { name: '오후 일정' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(today).toBeFocused()
  await page.getByRole('button', { name: '주', exact: true }).click()
  await expect(page.locator('.calendar-day')).toHaveCount(7)
  await page.getByRole('button', { name: '다음 주' }).click()
  await page.getByRole('button', { name: '오늘', exact: true }).first().click()
  await expect(today).toBeVisible()
})

test('일정 추가·기존 형식·저장 후 새로고침 유지·잘못된 종료일 차단', async ({ page }) => {
  await page.getByRole('button', { name: '일정 추가', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('무슨 일정인가요?').fill('새 가족 일정')
  await dialog.getByLabel('종료일', { exact: true }).fill('2026-11-04')
  await dialog.getByRole('button', { name: '일정 저장' }).click()
  await expect(dialog.getByRole('alert')).toContainText('종료일')
  await dialog.getByLabel('종료일', { exact: true }).fill('2026-11-05')
  await dialog.getByLabel('종일 일정').uncheck()
  await dialog.getByLabel('시작 시간').fill('16:00')
  await dialog.getByLabel('종료 시간').fill('17:00')
  await dialog.getByRole('button', { name: '일정 저장' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: '새 가족 일정', exact: true })).toBeVisible()
  await page.clock.runFor(500)
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('family-scheduler-events')).length)).toBe(2)
  await page.reload()
  await expect(page.getByRole('heading', { name: '새 가족 일정', exact: true })).toBeVisible()
})

test('공휴일 칸 배경·오늘과 선택일 구분·모든 날짜 터치 영역', async ({ page }) => {
  await page.getByRole('navigation').getByRole('button', { name: '달력', exact: true }).click()
  expect(await page.locator('.calendar-day').evaluateAll((cells) => cells.every((cell) => cell.getBoundingClientRect().height >= 44 && cell.getBoundingClientRect().width >= 44))).toBe(true)
  await page.getByRole('button', { name: '이전 달' }).click()
  const holiday = page.locator('.holiday-day').first()
  await expect(holiday).toBeVisible()
  expect(await holiday.evaluate((cell) => getComputedStyle(cell).backgroundColor)).not.toBe(await page.locator('.calendar-day:not(.holiday-day)').first().evaluate((cell) => getComputedStyle(cell).backgroundColor))
})

test('빈 상태·손상 데이터 오류·재시도', async ({ page }) => {
  await page.clock.runFor(500)
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) if (key.startsWith('family-scheduler-')) localStorage.removeItem(key)
  })
  await page.reload()
  await expect(page.getByRole('heading', { name: '아직 일정이 없어요' })).toBeVisible()
  await page.clock.runFor(500)
  await page.evaluate(() => localStorage.setItem('family-scheduler-profiles-v1', 'null'))
  await page.reload()
  await expect(page.getByRole('alert').first()).toContainText('읽지 못했어요')
  await page.evaluate(() => localStorage.setItem('family-scheduler-profiles-v1', '[]'))
  await page.getByRole('button', { name: '다시 시도' }).first().click()
  await expect(page.getByRole('heading', { name: '아직 일정이 없어요' })).toBeVisible()
})

test('오프라인에서 화면·글꼴·캐릭터 유지', async ({ page, context }) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
  })
  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match('/index.html')))).toBe(true)
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: '오후 일정', exact: true })).toBeVisible()
  expect(await page.locator('.character img').evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true)
  expect(await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('17px SUITE') })).toBe(true)
  await context.setOffline(false)
})

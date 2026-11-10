import { test, expect } from './ui-fixture.js'
import { GAMES } from '../../src/v2/features/games/index.js'

test.describe('공개 예시', () => {
  test.use({ connected: false })
  test('다섯 탭·예시 배너·게임 준비 중·흰 빈 카드', async ({ page }) => {
    await expect(page.locator('.demo-banner')).toHaveText('예시 화면이에요 · 가족 연결하면 우리 일정이 보여요')
    await expect(page.getByRole('navigation').getByRole('button')).toHaveText(['우리집', '달력', '할 일', '놀이', '가족'])
    await expect(page.locator('.house-tile strong')).toHaveText(['아빠', '엄마', '초롱', '연두'])
    await page.getByRole('navigation').getByRole('button', { name: '할 일', exact: true }).click()
    await expect(page.locator('.task-view button')).toHaveText([/^할 일/, /^끝낸 일/])
    await page.getByRole('navigation').getByRole('button', { name: '우리집', exact: true }).click()
    await page.getByRole('navigation').getByRole('button', { name: '달력', exact: true }).click()
    await expect(page.locator('.app-date')).toHaveText('2026년')
    await expect(page.locator('.app-heading h1')).toHaveText('11월')
    await expect(page.locator('.month-card')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await page.getByRole('navigation').getByRole('button', { name: '놀이', exact: true }).click()
    await expect(page.locator('.game-tile')).toHaveCount(8)
    await expect(page.locator('.header-add')).toHaveCount(0)
    await expect.poll(() => page.locator('.game-tile img').evaluateAll((images) => images.every((img) => img.complete && img.naturalWidth > 0))).toBe(true)
    const pending = GAMES.findIndex((game) => !game.component)
    await page.locator('.game-tile').nth(pending < 0 ? 0 : pending).click()
    await expect(page.getByRole('dialog').getByRole('heading', { name: pending < 0 ? '누가 해요?' : '준비 중' })).toBeVisible()
    await page.keyboard.press('Escape')
    await page.locator('.demo-banner').click()
    await expect(page.locator('.app-heading h1')).toHaveText('가족')
    await expect(page.locator('.app-date')).toHaveCount(0) // 가족 탭은 한 줄 제목
    await expect(page.getByRole('dialog').getByRole('heading', { name: '가족 연결', exact: true })).toBeVisible()
  })

  test('로그인 전환 때 예시 입력창을 닫고 기기 데이터로 전환', async ({ page }) => {
    await page.route('**/rest/v1/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
    await page.getByRole('button', { name: '추가', exact: true }).click()
    await page.getByRole('button', { name: '일정', exact: true }).click()
    await page.getByLabel('무슨 일정인가요?').fill('예시에서만 작성 중')
    await page.evaluate(() => {
      // 인증 라이브러리의 탭 간 로그인 알림을 모의한다. 실제 로그인 요청 없음.
      const channel = new BroadcastChannel('sb-127-auth-token')
      channel.postMessage({ event: 'SIGNED_IN', session: { user: { id: 'mock-user', email: 'mock@example.invalid' }, access_token: 'test-token', refresh_token: 'test-refresh', expires_at: 4102444800 } })
      channel.close()
    })
    await expect(page.locator('.demo-banner')).toHaveCount(0)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: '오후 일정', exact: true })).toBeVisible()
    await page.clock.runFor(500)
    expect(await page.evaluate(() => localStorage.getItem('family-scheduler-events'))).not.toContain('예시에서만 작성 중')
  })

  test('예시 수정은 메모리에만·새로고침 초기화·기존 기기 데이터 보존', async ({ page }) => {
    const before = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('family-scheduler-'))))
    await page.getByRole('button', { name: '추가', exact: true }).click()
    await page.getByRole('button', { name: '일정', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('무슨 일정인가요?').fill('저장하지 않는 예시')
    await dialog.getByLabel('시작 시간').fill('22:00')
    await dialog.getByRole('button', { name: '추가', exact: true }).click()
    await expect(page.getByRole('heading', { name: '저장하지 않는 예시' })).toBeVisible()
    await page.clock.runFor(2000)
    const stored = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('family-scheduler-'))))
    // 로그인 전에는 원래 기기 데이터도 쓰지 않고 그대로 보존한다.
    expect(JSON.stringify(stored)).not.toContain('demo-')
    expect(JSON.stringify(stored)).not.toContain('저장하지 않는 예시')
    expect(stored).toEqual(before)
    await page.reload()
    await expect(page.getByRole('heading', { name: '저장하지 않는 예시' })).toHaveCount(0)
    await expect(page.locator('.house-tile')).toHaveCount(4)
  })
})

test('달력 가로 밀기는 월 이동·세로 밀기는 월 유지', async ({ page }) => {
  await page.getByRole('navigation').getByRole('button', { name: '달력', exact: true }).click()
  const card = page.locator('.month-card')
  const touch = (type, x, y) => card.evaluate((element, { type, x, y }) => {
    const event = new Event(type, { bubbles: true })
    Object.defineProperty(event, type === 'touchstart' ? 'touches' : 'changedTouches', { value: [{ clientX: x, clientY: y }] })
    element.dispatchEvent(event)
  }, { type, x, y })
  await touch('touchstart', 300, 300)
  await touch('touchend', 100, 310)
  await expect(page.locator('.app-heading h1')).toHaveText('12월')
  await touch('touchstart', 200, 300)
  await touch('touchend', 190, 500)
  await expect(page.locator('.app-heading h1')).toHaveText('12월')
})

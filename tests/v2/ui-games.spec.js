import { test, expect } from './ui-fixture.js'

const openPairs = async (page, player) => {
  await page.getByRole('navigation').getByRole('button', { name: '놀이', exact: true }).click()
  await page.locator('.game-tile').first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: player, exact: true }).click()
  await dialog.getByRole('button', { name: /^쉬움/ }).click()
  return dialog
}

const finishPairs = async (page, dialog) => {
  const faces = await dialog.locator('.pairs-card').evaluateAll((cards) => cards.map((card, index) => ({ index, face: card.querySelector('img').getAttribute('src') })))
  const pairs = new Map()
  for (const card of faces) pairs.set(card.face, [...pairs.get(card.face) || [], card.index])
  for (const indexes of pairs.values()) {
    await page.clock.runFor(1000)
    for (const index of indexes) await dialog.locator('.pairs-card').nth(index).click()
  }
  await expect(dialog.getByText('다 찾았어요', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('status')).toHaveText('기록을 남겼어요.')
}

test('가족 선택·게임 완료·gameScores 기록·판수·재불러오기 보존', async ({ page }) => {
  const dialog = await openPairs(page, '가족')
  await finishPairs(page, dialog)
  await page.clock.runFor(500)
  const scores = await page.evaluate(() => JSON.parse(localStorage.getItem('family-scheduler-v2-metadata')).gameScores)
  expect(scores.pairs.p).toMatchObject({ best: 6, level: 'easy', moves: 6, playsToday: 1 })
  await page.keyboard.press('Escape')
  await expect(page.locator('.app-date')).toHaveText('오늘 1판')
  await expect(page.locator('.game-tile').first()).toContainText('최고 6초')
  await page.reload()
  await page.getByRole('navigation').getByRole('button', { name: '놀이', exact: true }).click()
  await expect(page.locator('.game-tile').first()).toContainText('최고 6초')
})

test('연속 두 판·최고 기록과 무관한 증가·날짜 변경 후 초기화', async ({ page }) => {
  await finishPairs(page, await openPairs(page, '가족'))
  await page.keyboard.press('Escape')
  await expect(page.locator('.app-date')).toHaveText('오늘 1판')
  await finishPairs(page, await openPairs(page, '가족'))
  await page.keyboard.press('Escape')
  await expect(page.locator('.app-date')).toHaveText('오늘 2판')
  await page.clock.runFor(500)
  const scores = await page.evaluate(() => JSON.parse(localStorage.getItem('family-scheduler-v2-metadata')).gameScores)
  expect(scores.pairs.p.playsToday).toBe(2)
  await page.clock.setFixedTime(new Date('2026-11-06T10:00:00+09:00'))
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.locator('.app-date')).toHaveText('오늘 0판')
  await expect(page.locator('.game-tile').first()).toContainText('최고 6초')
})

test.describe('예시 게임', () => {
  test.use({ connected: false })
  test('일곱 게임 모두 선택·시작·하늘 선물의 선택 캐릭터 전달', async ({ page }) => {
    await page.getByRole('navigation').getByRole('button', { name: '놀이', exact: true }).click()
    for (const [index, selector] of ['.pairs-grid', '.catch-area', '.tap-grid', '.seq-grid', '.stack-area', '.merge-area', '.match-grid'].entries()) {
      await page.locator('.game-tile').nth(index).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByRole('button', { name: '연두', exact: true }).click()
      if (selector !== '.merge-area') await dialog.getByRole('button', { name: /^쉬움/ }).click()
      await expect(dialog.locator(selector)).toBeVisible()
      if (index === 1) await expect(dialog.locator('.catch-basket')).toHaveAttribute('src', '/game/little_basket.png')
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
    }
  })

  test('완료 기록도 화면에서만·새로고침 후 제거', async ({ page }) => {
    await finishPairs(page, await openPairs(page, '아빠'))
    await page.clock.runFor(1000)
    expect(await page.evaluate(() => localStorage.getItem('family-scheduler-v2-metadata'))).toBeNull()
    await page.reload()
    await page.getByRole('navigation').getByRole('button', { name: '놀이', exact: true }).click()
    await expect(page.locator('.app-date')).toHaveText('오늘 0판')
    await expect(page.locator('.game-tile').first()).toContainText('기록 없음')
  })
})

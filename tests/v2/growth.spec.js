import { test, expect } from './ui-fixture.js'

test('구성원 화면에서 키·몸무게 기록 추가하고 변화 표시', async ({ page }) => {
  await page.clock.runFor(500)
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-profiles-v1', JSON.stringify([{ id: 'k', name: '연두', type: 'child', characterId: 'little', growth: [{ date: '2025-11-01', height: 116.2, weight: 21.4 }, { date: '2026-02-01', height: 118, weight: 22 }, { date: '2026-05-01', height: 120.5, weight: 23 }] }]))
  })
  await page.reload()
  await page.locator('.bottom-nav').getByRole('button', { name: '가족', exact: true }).click()
  await page.getByRole('list', { name: '구성원', exact: true }).getByRole('button', { name: /^연두/ }).click()
  await page.getByRole('button', { name: /키·몸무게 기록/ }).click()
  if (process.env.SHOT) { await page.locator('.growth-form').scrollIntoViewIfNeeded(); await page.screenshot({ path: process.env.SHOT + '-form.png' }) }
  await page.getByLabel('키(cm)').fill('123.1')
  await page.getByLabel('몸무게(kg)').fill('24.2')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByText('지난번보다 +2.6cm')).toBeVisible()
  await page.clock.runFor(500)
  const growth = await page.evaluate(() => JSON.parse(localStorage.getItem('family-scheduler-profiles-v1'))[0].growth)
  expect(growth).toContainEqual({ date: '2026-11-05', height: 123.1, weight: 24.2 })
  await expect(page.getByRole('img', { name: '키 변화 116.2cm에서 123.1cm' })).toBeVisible()
  if (process.env.SHOT) { await page.locator('.growth-chart').scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, -160)); await page.screenshot({ path: process.env.SHOT + '-list.png' }) }
  page.once('dialog', (d) => d.dismiss())
  await page.getByRole('button', { name: '26.11.05 기록 지우기' }).click()
  await expect(page.getByText('지난번보다 +2.6cm')).toBeVisible() // 취소하면 그대로
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: '26.11.05 기록 지우기' }).click()
  await expect(page.getByText('지난번보다 +2.6cm')).toHaveCount(0)
})

import { expect, test } from '@playwright/test'

const profiles = [
  { id: 'david', name: '아빠', type: 'adult', relation: '아빠', initials: '아', color: '#a9c978', tone: '#f2f7e8', active: true },
  { id: 'emma', name: '엄마', type: 'adult', relation: '엄마', initials: '엄', color: '#ffaaa0', tone: '#fff0ed', active: true },
  { id: 'leo', name: '초롱', type: 'child', relation: '자녀', initials: '초', color: '#7fc7e3', tone: '#ecf8fc', active: true },
  { id: 'mia', name: '연두', type: 'child', relation: '자녀', initials: '연', color: '#c9df84', tone: '#f6fae9', active: true },
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript((seedProfiles) => {
    localStorage.setItem('family-scheduler-profiles-v1', JSON.stringify(seedProfiles))
    localStorage.setItem('family-scheduler-work-settings-v1', JSON.stringify({ enabled: true, workerIds: ['emma'], shiftTypes: [] }))
  }, profiles)
  await page.goto('/')
})

test('홈 화면을 표시한다', async ({ page }) => {
  await expect(page.getByRole('button', { name: '홈으로 이동' })).toBeVisible()
  await expect(page.getByText('Family Scheduler', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: '오늘의 일정' })).toBeVisible()
})

test('주요 화면을 이동한다', async ({ page }) => {
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: /년 .*월/ })).toBeVisible()
  await page.getByRole('button', { name: '할 일', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: '가족 할 일' })).toBeVisible()
  await page.getByRole('button', { name: '일정 관리', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: '가족 일정 관리' })).toBeVisible()
})

test('일정 모달을 Escape로 닫는다', async ({ page }) => {
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await page.getByRole('button', { name: /추가/ }).last().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('모바일에서도 주요 내비게이션이 보인다', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), '모바일 프로젝트 전용 확인')
  await expect(page.getByRole('navigation', { name: '주요 메뉴' }).last()).toBeVisible()
  await expect(page.getByRole('button', { name: '일정 관리', exact: true }).last()).toBeVisible()
})

test('첫 로드 후 오프라인에서도 앱 셸이 열린다', async ({ page, context }) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }))
    }
  })
  await expect.poll(async () => page.evaluate(async () => Boolean(await caches.match('/index.html')))).toBe(true)
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Family Scheduler', { exact: true }).first()).toBeVisible()
  await context.setOffline(false)
})

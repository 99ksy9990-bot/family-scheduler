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

test('모바일 홈 카드 간격이 같고 가로로 넘치지 않는다', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), '모바일 프로젝트 전용 확인')
  const layout = await page.evaluate(() => {
    const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect()
    const today = rect('.home-page > .today-card')
    const week = rect('.home-page > .week-strip-card')
    const overview = rect('.home-page > .overview-grid')
    const overviewCards = [...document.querySelectorAll('.overview-grid > .card')].map((element) => element.getBoundingClientRect())
    return {
      gaps: [week.top - today.bottom, overview.top - week.bottom, overviewCards[1].top - overviewCards[0].bottom],
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }
  })
  expect(layout.gaps.every((gap) => Math.abs(gap - 22) < 1)).toBe(true)
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth)
})

test('캘린더 오늘 날짜 숫자는 다른 날짜와 같은 크기로 표시한다', async ({ page }) => {
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  const appearance = await page.evaluate(() => {
    const today = document.querySelector('.calendar-grid button.today')
    const normal = document.querySelector('.calendar-grid button:not(.today):not(.outside)')
    const todayNumber = today?.querySelector(':scope > span:first-child')
    const normalNumber = normal?.querySelector(':scope > span:first-child')
    return {
      numberBackground: getComputedStyle(todayNumber).backgroundColor,
      todayNumberHeight: todayNumber?.getBoundingClientRect().height,
      normalNumberHeight: normalNumber?.getBoundingClientRect().height,
      todayCellBackground: getComputedStyle(today).backgroundColor,
      normalCellBackground: getComputedStyle(normal).backgroundColor,
    }
  })
  expect(appearance.numberBackground).toBe('rgba(0, 0, 0, 0)')
  expect(Math.abs(appearance.todayNumberHeight - appearance.normalNumberHeight)).toBeLessThan(1)
  expect(appearance.todayCellBackground).not.toBe(appearance.normalCellBackground)
})

test('자녀 캘린더에서 일회성 또는 반복 일정을 바로 등록한다', async ({ page }) => {
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await page.getByRole('button', { name: '자녀', exact: true }).click()
  const dateHeading = page.locator('.child-day-heading h2')
  await expect(dateHeading).toHaveCSS('white-space', 'nowrap')
  const dateLayout = await page.locator('.child-day-card').evaluate((card) => ({ clientWidth: card.clientWidth, scrollWidth: card.scrollWidth }))
  expect(dateLayout.scrollWidth).toBeLessThanOrEqual(dateLayout.clientWidth)
  await page.getByRole('button', { name: '자녀 일정 추가' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('제목')).toBeVisible()
  await expect(dialog.getByLabel('반복 주기')).toBeVisible()
  await dialog.getByLabel('제목').fill('체험 학습')
  await dialog.getByRole('button', { name: '일정 추가' }).click()
  await expect(page.getByText('체험 학습', { exact: true })).toBeVisible()
})

test('근무 카드 포커스 테두리는 셀 안쪽에 표시하고 입력 일수 문구는 숨긴다', async ({ page }) => {
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await page.getByRole('button', { name: '근무', exact: true }).click()
  const shiftButton = page.locator('.shift-editor-grid button').first()
  await shiftButton.focus()
  await expect(shiftButton).toHaveCSS('outline-offset', '-5px')
  await expect(page.getByText(/\d+\/\d+일 입력/)).toHaveCount(0)
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

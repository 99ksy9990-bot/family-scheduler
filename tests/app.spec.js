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
  await page.getByRole('button', { name: '가족 일정 추가' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
})

test('일정 입력 화면의 섹션 간격을 동일하게 유지한다', async ({ page }, testInfo) => {
  if (!testInfo.project.name.includes('mobile')) await page.setViewportSize({ width: 1100, height: 1700 })
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-events', JSON.stringify([
      { id: 'spacing-conflict', title: '수학 · 영어', date: '2026-08-11', endDate: '2026-08-11', time: '오전 9:00', end: '오전 10:00', member: 'david', members: ['david'], calendarScope: 'family' },
    ]))
  })
  await page.reload()
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await page.getByRole('button', { name: '가족 일정 추가' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('제목').fill('간격 확인 일정')
  await dialog.getByRole('button', { name: /시간·장소·반복 설정/ }).click()
  await dialog.getByRole('button', { name: '시작·종료', exact: true }).click()
  await expect(dialog.locator('.form-warning')).toBeVisible()

  const gaps = await dialog.evaluate((element) => {
    const advanced = element.querySelector('.advanced-toggle.active')
    const dateField = element.querySelector('.event-date-field')
    const warning = element.querySelector('.form-warning')
    const reminder = [...element.querySelectorAll('label')].find((label) => label.textContent.startsWith('앱 알림'))
    return {
      advancedToDate: Math.round(dateField.getBoundingClientRect().top - advanced.getBoundingClientRect().bottom),
      warningToReminder: Math.round(reminder.getBoundingClientRect().top - warning.getBoundingClientRect().bottom),
    }
  })
  expect(gaps).toEqual({ advancedToDate: 17, warningToReminder: 17 })
  if (!testInfo.project.name.includes('mobile')) await dialog.screenshot({ path: 'output/playwright/event-modal-spacing-after.png' })
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
  await page.locator('.calendar-toolbar .segmented').getByRole('button', { name: '자녀', exact: true }).click()
  const dateHeading = page.locator('.child-day-heading h2')
  await expect(dateHeading).toHaveCSS('white-space', 'nowrap')
  const dateLayout = await page.locator('.child-day-card').evaluate((card) => ({ clientWidth: card.clientWidth, scrollWidth: card.scrollWidth }))
  expect(dateLayout.scrollWidth).toBeLessThanOrEqual(dateLayout.clientWidth)
  await page.getByRole('button', { name: '자녀 일정 추가' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('제목')).toBeVisible()
  await expect(dialog.getByLabel('반복 주기')).toBeHidden()
  await dialog.getByRole('button', { name: /시간·장소·반복 설정/ }).click()
  await expect(dialog.getByLabel('반복 주기')).toBeVisible()
  await dialog.getByLabel('제목').fill('체험 학습')
  await dialog.getByRole('button', { name: '일정 추가' }).click()
  await expect(page.getByText('체험 학습', { exact: true })).toBeVisible()
  const directEventLayout = await page.locator('.child-direct-events .calendar-summary').evaluate((card) => ({
    clientWidth: card.clientWidth,
    scrollWidth: card.scrollWidth,
    metaDisplay: getComputedStyle(card.querySelector('.event-meta-row')).display,
    titleDisplay: getComputedStyle(card.querySelector('.event-title-row')).display,
    avatarLeft: card.querySelector('.avatar')?.getBoundingClientRect().left,
    titleLeft: card.querySelector('.event-title-row')?.getBoundingClientRect().left,
  }))
  expect(directEventLayout.scrollWidth).toBeLessThanOrEqual(directEventLayout.clientWidth)
  expect(directEventLayout.metaDisplay).toBe('flex')
  expect(directEventLayout.titleDisplay).toBe('flex')
  expect(Math.abs(directEventLayout.avatarLeft - directEventLayout.titleLeft)).toBeLessThan(1)

  await page.locator('.calendar-toolbar .segmented').getByRole('button', { name: '가족', exact: true }).click()
  await expect(page.locator('.day-panel').getByText('체험 학습', { exact: true })).toHaveCount(0)

  await page.locator('.calendar-toolbar .segmented').getByRole('button', { name: '자녀', exact: true }).click()
  const childEventCard = page.locator('.child-direct-events .calendar-summary').filter({ hasText: '체험 학습' })
  await childEventCard.getByRole('button', { name: '체험 학습 삭제' }).click()
  await expect(page.locator('.child-direct-events').getByText('체험 학습', { exact: true })).toHaveCount(0)
  await page.locator('.calendar-toolbar .segmented').getByRole('button', { name: '가족', exact: true }).click()
  await expect(page.locator('.day-panel').getByText('체험 학습', { exact: true })).toHaveCount(0)
})

test('통합 캘린더에서 가족·자녀·근무를 함께 보고 공휴일은 분리한다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-events', JSON.stringify([
      { id: 'family-one', title: '가족 일정', date: '2026-08-15', endDate: '2026-08-15', time: '종일', member: 'family', members: ['family'], calendarScope: 'family' },
      { id: 'child-one', title: '자녀 일정', date: '2026-08-15', endDate: '2026-08-15', time: '종일', member: 'leo', members: ['leo'], calendarScope: 'children' },
    ]))
    localStorage.setItem('family-scheduler-shifts', JSON.stringify([{ id: 'shift-one', date: '2026-08-15', member: 'emma', shift: 'day' }]))
  })
  await page.reload()
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await expect(page.getByRole('button', { name: '전체', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.locator('[data-date="2026-08-15"]').click()
  await expect(page.locator('.overview-day-section').filter({ hasText: '공휴일' })).toContainText('광복절')
  await expect(page.locator('.overview-day-section').filter({ hasText: '가족 일정' })).toContainText('가족 일정')
  await expect(page.locator('.overview-day-section').filter({ hasText: '자녀 일정' })).toContainText('자녀 일정')
  await expect(page.locator('.overview-day-section').filter({ hasText: '근무' })).toContainText('D · 주간 근무')
  await expect(page.locator('.overview-day-section.holiday-group')).toContainText('일정 개수에서 제외')
})

test('반복 할 일은 이번 회차 완료 상태를 따로 저장한다', async ({ page }) => {
  await page.getByRole('button', { name: '할 일', exact: true }).first().click()
  await page.getByRole('button', { name: '새 할 일' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('제목').fill('매주 분리수거')
  await dialog.getByLabel('마감일').fill('2026-08-11')
  await dialog.getByLabel('반복 주기').selectOption('weekly')
  await dialog.getByRole('button', { name: '할 일 추가' }).click()
  const card = page.locator('.task-card').filter({ hasText: '매주 분리수거' }).first()
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: '매주 분리수거 수정' }).click()
  await expect(page.getByRole('button', { name: '이번 회차 수정' })).toBeVisible()
  await expect(page.getByRole('button', { name: '전체 반복 수정' })).toBeVisible()
  await expect(page.getByRole('button', { name: '반복 중지' })).toBeVisible()
  await page.keyboard.press('Escape')
  await card.getByRole('button', { name: '완료하기 매주 분리수거' }).click()
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('family-scheduler-tasks') || '[]').find((task) => task.title === '매주 분리수거')?.completedDates || [])).toContain('2026-08-11')
})

test('자녀 캘린더 도트를 데스크톱과 모바일 모두 표시한다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-events', JSON.stringify([{ id: 'child-dot', title: '도트 일정', date: '2026-08-11', endDate: '2026-08-11', time: '종일', member: 'leo', members: ['leo'], calendarScope: 'children' }]))
  })
  await page.reload()
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await page.locator('.calendar-toolbar .segmented').getByRole('button', { name: '자녀', exact: true }).click()
  await expect(page.locator('[data-date="2026-08-11"] .child-schedule-dots')).toHaveCSS('display', 'flex')
  await expect(page.locator('[data-date="2026-08-11"] .child-schedule-dots i')).toHaveCount(1)
})

test('이전·다음 달 셀은 내용 없이 비활성화한다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-events', JSON.stringify([{ id: 'next-month', title: '다음 달 일정', date: '2026-09-01', endDate: '2026-09-01', time: '종일', member: 'family', members: ['family'], calendarScope: 'family' }]))
  })
  await page.reload()
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  const outsideCell = page.locator('[data-date="2026-09-01"]')
  await expect(outsideCell).toBeDisabled()
  await expect(outsideCell.locator('.calendar-overview-markers')).toHaveCount(0)
  await expect(outsideCell).not.toContainText('다음 달 일정')
})

test('기존 자녀 전용 일정은 자녀 캘린더로 분리한다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-events', JSON.stringify([{
      id: 'legacy-child-event',
      title: '기존 자녀 일정',
      date: '2026-08-11',
      endDate: '2026-08-11',
      time: '종일',
      type: 'family',
      member: 'leo',
      members: ['leo'],
    }]))
  })
  await page.reload()
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await page.locator('.calendar-toolbar .segmented').getByRole('button', { name: '가족', exact: true }).click()
  await expect(page.locator('.day-panel').getByText('기존 자녀 일정', { exact: true })).toHaveCount(0)
  await page.locator('.calendar-toolbar .segmented').getByRole('button', { name: '자녀', exact: true }).click()
  await expect(page.locator('.child-direct-events').getByText('기존 자녀 일정', { exact: true })).toBeVisible()
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

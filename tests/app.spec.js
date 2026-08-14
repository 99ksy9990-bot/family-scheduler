import { expect, test } from '@playwright/test'
import { MEMBER_COLORS, SYSTEM_COLORS, migrateMemberProfiles } from '../src/lib/colors.js'

const profiles = [
  { id: 'david', name: '아빠', type: 'adult', relation: '아빠', initials: '아', color: '#a9c978', tone: '#f2f7e8', active: true },
  { id: 'emma', name: '엄마', type: 'adult', relation: '엄마', initials: '엄', color: '#ffaaa0', tone: '#fff0ed', active: true },
  { id: 'leo', name: '초롱', type: 'child', relation: '자녀', initials: '초', color: '#7fc7e3', tone: '#ecf8fc', active: true },
  { id: 'mia', name: '연두', type: 'child', relation: '자녀', initials: '연', color: '#c9df84', tone: '#f6fae9', active: true },
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ seedProfiles, fixedNow }) => {
    const NativeDate = Date
    class FixedDate extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [fixedNow])) }
      static now() { return new NativeDate(fixedNow).getTime() }
    }
    Object.setPrototypeOf(FixedDate, NativeDate)
    window.Date = FixedDate
    localStorage.setItem('family-scheduler-profiles-v1', JSON.stringify(seedProfiles))
    localStorage.setItem('family-scheduler-work-settings-v1', JSON.stringify({ enabled: true, workerIds: ['emma'], shiftTypes: [] }))
  }, { seedProfiles: profiles, fixedNow: '2026-08-11T09:00:00+09:00' })
  await page.goto('/')
})

test('홈 화면을 표시한다', async ({ page }) => {
  await expect(page.getByRole('button', { name: '홈으로 이동' })).toBeVisible()
  await expect(page.getByText('Family Scheduler', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: '오늘의 일정' })).toBeVisible()
})

test('구성원 색을 새 팔레트로 중복 없이 결정적으로 마이그레이션한다', async ({ page }) => {
  const first = migrateMemberProfiles(profiles)
  const second = migrateMemberProfiles(profiles)
  expect(first).toEqual(second)
  expect(new Set(first.map((profile) => profile.color)).size).toBe(first.length)
  expect(first.every((profile) => MEMBER_COLORS.some((entry) => entry.color === profile.color && entry.tone === profile.tone))).toBe(true)
  expect(first.every((profile) => !Object.values(SYSTEM_COLORS).includes(profile.color))).toBe(true)

  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('family-scheduler-profiles-v1') || '[]'))).toEqual(first)
})

test('모든 구성원 아바타를 28px 둥근 정사각형으로 표시한다', async ({ page }) => {
  await page.getByRole('button', { name: '일정 추가' }).click()
  const avatars = page.locator('.avatar')
  await expect(avatars.first()).toBeVisible()
  const sizes = await avatars.evaluateAll((items) => items.map((item) => {
    const style = getComputedStyle(item)
    return { width: style.width, height: style.height, radius: style.borderRadius }
  }))
  expect(sizes.every((size) => size.width === '28px' && size.height === '28px' && size.radius === '8px')).toBe(true)
})

test('홈·캘린더·할 일 행 높이와 내부 여백을 68px 규격으로 통일한다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-events', JSON.stringify([{ id: 'row-event', title: '행 높이 일정', date: '2026-08-11', endDate: '2026-08-11', time: '오후 2:00', member: 'emma', members: ['emma'], calendarScope: 'family' }]))
    localStorage.setItem('family-scheduler-tasks', JSON.stringify([{ id: 'row-task', title: '행 높이 할 일', category: '집안일', dueDate: '2026-08-11', assignee: 'emma', assignees: ['emma'], done: false }]))
  })
  await page.reload()
  const homeRow = page.locator('.today-card .schedule-row').first()
  await expect(homeRow).toHaveCSS('height', '68px')
  const homeRowLayout = await homeRow.evaluate((row) => {
    const style = getComputedStyle(row)
    const copyStyle = getComputedStyle(row.querySelector('.schedule-row-copy'))
    const beforeStyle = getComputedStyle(row, '::before')
    return {
      paddingLeft: style.paddingLeft,
      paddingRight: style.paddingRight,
      copyGap: copyStyle.gap,
      accentContent: beforeStyle.content,
    }
  })
  expect(homeRowLayout).toEqual({ paddingLeft: '9px', paddingRight: '7px', copyGap: '6px', accentContent: 'none' })

  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await page.locator('.calendar-toolbar .segmented').getByRole('button', { name: '가족', exact: true }).click()
  await expect(page.locator('.day-panel .schedule-row').filter({ hasText: '행 높이 일정' })).toHaveCSS('height', '68px')

  await page.getByRole('button', { name: '할 일', exact: true }).first().click()
  await expect(page.locator('.tasks-page .schedule-row').filter({ hasText: '행 높이 할 일' })).toHaveCSS('height', '68px')
})

test('초기 가족·자녀 안내를 한 줄로 표시하고 섹션 간격을 유지한다', async ({ page }) => {
  await page.addInitScript((seedProfiles) => localStorage.setItem('family-scheduler-profiles-v1', JSON.stringify(seedProfiles.map((profile) => ({ ...profile, active: false })))), profiles)
  await page.reload()
  const familySetup = page.locator('.family-setup-card')
  await expect(familySetup.getByText('가족 등록 후 일정·자녀·근무표를 함께 씁니다.', { exact: true })).toBeVisible()
  const familySetupLayout = await familySetup.evaluate((card) => {
    const copy = card.querySelector('p')
    return {
      whiteSpace: getComputedStyle(copy).whiteSpace,
      fits: copy.scrollWidth <= copy.clientWidth && card.scrollWidth <= card.clientWidth,
    }
  })
  expect(familySetupLayout).toEqual({ whiteSpace: 'nowrap', fits: true })

  await page.addInitScript((seedProfiles) => localStorage.setItem('family-scheduler-profiles-v1', JSON.stringify(seedProfiles.filter((profile) => profile.type === 'adult'))), profiles)
  await page.reload()
  await page.getByRole('button', { name: '일정 관리', exact: true }).first().click()
  const scheduleCard = page.locator('.schedule-editor-card')
  const empty = scheduleCard.locator('.settings-empty')
  await expect(empty.getByText('자녀 추가 → 학기·방학 설정 → 학교·학원 일정 등록', { exact: true })).toBeVisible()
  const emptyLayout = await scheduleCard.evaluate((card) => {
    const heading = card.querySelector('.section-heading')
    const emptyState = card.querySelector('.settings-empty')
    const copy = emptyState.querySelector('span')
    return {
      headingGap: Math.round(emptyState.getBoundingClientRect().top - heading.getBoundingClientRect().bottom),
      whiteSpace: getComputedStyle(copy).whiteSpace,
      fits: copy.scrollWidth <= copy.clientWidth && emptyState.scrollWidth <= emptyState.clientWidth,
    }
  })
  expect(emptyLayout).toEqual({ headingGap: 17, whiteSpace: 'nowrap', fits: true })
})

test('홈 오늘 일정에 근무와 자녀 일정을 함께 표시하고 데스크톱 순서를 유지한다', async ({ page }, testInfo) => {
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-shifts', JSON.stringify([{ id: 'today-shift', date: '2026-08-11', member: 'emma', shift: 'day' }]))
    localStorage.setItem('family-scheduler-events', JSON.stringify([
      { id: 'today-child', title: '오늘 자녀 일정', date: '2026-08-11', endDate: '2026-08-11', time: '오후 2:00', member: 'leo', members: ['leo'], calendarScope: 'children' },
      { id: 'today-all-day', title: '오늘 가족 일정', date: '2026-08-11', endDate: '2026-08-11', time: '종일', member: 'family', members: ['family'], calendarScope: 'family' },
    ]))
  })
  await page.reload()

  const todayCard = page.locator('.today-card')
  await expect(todayCard.getByText('D', { exact: true })).toBeVisible()
  await expect(todayCard.getByText('오늘 자녀 일정', { exact: true })).toBeVisible()
  await expect(todayCard.locator('.home-event-row').first().locator('.event-time')).toHaveText('오전 6:30 – 오후 3:30')
  await expect(todayCard.locator('.home-event-row').first()).toHaveClass(/timeline-active/)
  await expect(todayCard.locator('.home-event-row').first().locator('.schedule-row-status')).toHaveText('진행 중')
  await expect(todayCard.locator('.home-category-chip.work')).toHaveText('근무')
  await expect(todayCard.locator('.home-category-chip.children')).toHaveText('자녀')
  const allDayRow = todayCard.locator('.home-event-row').filter({ hasText: '오늘 가족 일정' })
  await expect(allDayRow).toBeVisible()
  await expect(allDayRow.locator('.event-time')).toHaveCount(0)
  await expect(allDayRow).not.toContainText('종일')
  await expect(todayCard.locator('.schedule-row-repeat')).toHaveCount(0)
  await expect(todayCard.getByRole('button', { name: /대화와 준비물/ })).toHaveCount(0)
  await expect(todayCard.getByRole('button', { name: /수정|삭제/ })).toHaveCount(0)
  const homeEventOrder = await todayCard.locator('.home-event-row').first().evaluate((card) => ({
    children: [...card.children].map((child) => child.className),
    mainChildren: [...card.querySelector('.schedule-row-copy').children].map((child) => child.className),
    titleSize: parseFloat(getComputedStyle(card.querySelector('.home-event-title')).fontSize),
    timeSize: parseFloat(getComputedStyle(card.querySelector('.event-time')).fontSize),
    timeWeight: getComputedStyle(card.querySelector('.event-time')).fontWeight,
    mainFits: card.querySelector('.schedule-row-copy').scrollWidth <= card.querySelector('.schedule-row-copy').clientWidth,
    secondLineBelow: card.querySelector('.schedule-row-secondary').getBoundingClientRect().top > card.querySelector('.schedule-row-primary').getBoundingClientRect().top,
  }))
  expect(homeEventOrder.children).toEqual(['schedule-row-leading', 'schedule-row-copy', 'schedule-row-category home-category-chip work'])
  expect(homeEventOrder.mainChildren).toEqual(['schedule-row-primary', 'schedule-row-secondary'])
  expect(homeEventOrder.titleSize - homeEventOrder.timeSize).toBe(2)
  expect(homeEventOrder.timeWeight).toBe('400')
  expect(homeEventOrder.mainFits).toBe(true)
  expect(homeEventOrder.secondLineBelow).toBe(true)
  await expect(todayCard.getByText('오늘 한눈에 보기', { exact: true })).toHaveCount(0)
  const todaySummary = await todayCard.locator('.today-summary-bar').evaluate((bar) => {
    const buttons = [...bar.querySelectorAll('button')]
    const styles = buttons.map((button) => getComputedStyle(button))
    return {
      labels: buttons.map((button) => button.textContent),
      oneLine: buttons.every((button) => Math.abs(buttons[0].getBoundingClientRect().top - button.getBoundingClientRect().top) < 1),
      topBorder: getComputedStyle(bar).borderTopStyle,
      chips: buttons.every((button) => getComputedStyle(button).borderStyle === 'solid' && getComputedStyle(button).backgroundColor !== 'rgba(0, 0, 0, 0)' && getComputedStyle(button).cursor === 'pointer'),
      oneBackground: new Set(styles.map((style) => style.backgroundColor)).size,
      oneColor: new Set(styles.map((style) => style.color)).size,
    }
  })
  expect(todaySummary).toEqual({ labels: ['1', '1', '1', '0'], oneLine: true, topBorder: 'solid', chips: true, oneBackground: 1, oneColor: 1 })
  await expect(todayCard.locator('.today-summary-bar svg')).toHaveCount(4)
  await todayCard.locator('.home-event-row').filter({ hasText: '오늘 자녀 일정' }).click()
  await expect(page.getByRole('dialog', { name: '오늘 자녀 일정 작업' }).getByRole('button', { name: '수정' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: '오늘 자녀 일정 작업' }).getByRole('button', { name: '삭제' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.home-page > .overview-grid')).toHaveCount(0)
  await expect(page.locator('.home-week-strip .week-day-detail')).toHaveCount(0)
  await expect(page.getByText('이번 주 한눈에 보기', { exact: true })).toHaveCount(0)
  const homeHeadingStarts = await page.locator('.today-card > .section-heading, .week-strip-card > .section-heading').evaluateAll((headings) => headings.map((heading) => Math.round(heading.getBoundingClientRect().left)))
  expect(new Set(homeHeadingStarts).size).toBe(1)

  if (!testInfo.project.name.includes('mobile')) {
    const order = await page.evaluate(() => {
      const top = (selector) => document.querySelector(selector).getBoundingClientRect().top
      return [top('.today-card'), top('.week-strip-card')]
    })
    expect(order[0]).toBeLessThan(order[1])
  }
})

test('오늘 일정은 현재 시각을 기준으로 지난 일정과 진행 중 일정을 구분한다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-events', JSON.stringify([
      { id: 'past-event', title: '지난 일정', date: '2026-08-11', endDate: '2026-08-11', time: '오전 7:00', end: '오전 8:00', member: 'emma', members: ['emma'], calendarScope: 'family' },
      { id: 'active-event', title: '진행 일정', date: '2026-08-11', endDate: '2026-08-11', time: '오전 8:30', end: '오전 9:30', member: 'emma', members: ['emma'], calendarScope: 'family' },
      { id: 'upcoming-event', title: '예정 일정', date: '2026-08-11', endDate: '2026-08-11', time: '오전 10:00', end: '오전 11:00', member: 'emma', members: ['emma'], calendarScope: 'family' },
    ]))
  })
  await page.reload()

  const past = page.locator('.today-card .home-event-row').filter({ hasText: '지난 일정' })
  const active = page.locator('.today-card .home-event-row').filter({ hasText: '진행 일정' })
  const upcoming = page.locator('.today-card .home-event-row').filter({ hasText: '예정 일정' })
  await expect(past).toHaveClass(/timeline-past/)
  await expect(past.locator('.schedule-row-status')).toHaveCount(0)
  await expect(active).toHaveClass(/timeline-active/)
  await expect(active.locator('.schedule-row-status')).toHaveText('진행 중')
  await expect(upcoming).toHaveClass(/timeline-upcoming/)
  await expect(upcoming.locator('.schedule-row-status')).toHaveCount(0)
  expect(Number(await past.evaluate((row) => getComputedStyle(row).opacity))).toBeLessThan(1)
})

test('주요 화면을 이동한다', async ({ page }) => {
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: /년 .*월/ })).toBeVisible()
  await page.getByRole('button', { name: '할 일', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: '가족 할 일' })).toBeVisible()
  await page.getByRole('button', { name: '일정 관리', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: '가족 일정 관리' })).toBeVisible()
})

test('기념일·자녀 정보·학기 방학은 행 클릭 후 수정 삭제한다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-anniversaries-v1', JSON.stringify([
      { id: 'anniversary-action', name: '테스트', kind: '생일', calendarType: 'solar', leapMonth: false, baseYear: '1990', month: 8, day: 12 },
    ]))
    localStorage.setItem('family-scheduler-child-profiles-v1', JSON.stringify([
      { member: 'leo', school: '테스트초등학교', grade: '3', classNumber: '1', studentNumber: '2', teacherName: '', teacherPhone: '' },
    ]))
    localStorage.setItem('family-scheduler-periods-v1', JSON.stringify([
      { id: 'period-action', member: 'leo', season: '학기', start: '2026-08-01', end: '2026-08-31' },
    ]))
  })
  await page.reload()
  await page.getByRole('button', { name: '일정 관리', exact: true }).first().click()

  await page.getByRole('button', { name: /기념일/ }).click()
  const anniversaryRow = page.getByRole('button', { name: '테스트 생일 작업 열기' })
  await expect(anniversaryRow.locator('.event-actions')).toHaveCount(0)
  await anniversaryRow.click()
  await expect(page.getByRole('dialog', { name: '테스트 생일 작업' }).getByRole('button', { name: '수정' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: '테스트 생일 작업' }).getByRole('button', { name: '삭제' })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: /자녀 정보/ }).click()
  const profileRow = page.getByRole('button', { name: '초롱 학교 정보 작업 열기' })
  await expect(profileRow.locator('.event-actions')).toHaveCount(0)
  await profileRow.click()
  await expect(page.getByRole('dialog', { name: '초롱 학교 정보 작업' }).getByRole('button', { name: '수정' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: '초롱 학교 정보 작업' }).getByRole('button', { name: '삭제' })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: /학기·방학/ }).click()
  const periodRow = page.getByRole('button', { name: '학기 2026-08-01 적용 기간 작업 열기' })
  await expect(periodRow.locator('.event-actions')).toHaveCount(0)
  await periodRow.click()
  await expect(page.getByRole('dialog', { name: '학기 2026-08-01 ~ 2026-08-31 작업' }).getByRole('button', { name: '수정' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: '학기 2026-08-01 ~ 2026-08-31 작업' }).getByRole('button', { name: '삭제' })).toBeVisible()
})

test('일정 모달을 Escape로 닫는다', async ({ page }) => {
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  const trigger = page.locator('.day-panel').getByRole('button', { name: '일정 추가', exact: true })
  await trigger.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('연결 전 홈에서 로컬 저장 상태와 가족 연결 진입을 안내한다', async ({ page }) => {
  const banner = page.locator('.family-connect-banner')
  await expect(banner).toContainText('현재 일정은 이 기기에만 저장됩니다.')
  await banner.getByRole('button', { name: '가족 연결', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('가족 연결')
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
  await page.locator('.day-panel').getByRole('button', { name: '일정 추가', exact: true }).click()
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
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-shifts', JSON.stringify([{ id: 'week-shift', date: '2026-08-11', member: 'emma', shift: 'day' }]))
  })
  await page.reload()
  const layout = await page.evaluate(() => {
    const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect()
    const today = rect('.home-page > .today-card')
    const week = rect('.home-page > .week-strip-card')
    return {
      gaps: [week.top - today.bottom],
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }
  })
  expect(layout.gaps.every((gap) => Math.abs(gap - 22) < 1)).toBe(true)
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth)

  const weekSummaryLayout = await page.locator('.home-week-strip button').first().evaluate((button) => {
    const summaries = [...button.querySelectorAll('.week-summary-item')]
    return {
      count: summaries.length,
      sameLine: summaries.every((summary) => Math.abs(summary.getBoundingClientRect().top - summaries[0].getBoundingClientRect().top) < 1),
      familyCount: button.querySelector('.week-summary-item.family b').textContent,
      childCount: button.querySelector('.week-summary-item.children b').textContent,
      detailCount: button.querySelectorAll('.week-day-detail').length,
      fontSize: getComputedStyle(button.querySelector('.week-summary-item.family b')).fontSize,
    }
  })
  expect(weekSummaryLayout).toMatchObject({ count: 3, sameLine: true, familyCount: '0', childCount: '0', detailCount: 0, fontSize: '11px' })

  const sunday = page.locator('.home-week-strip button.sunday')
  const saturday = page.locator('.home-week-strip button.saturday')
  await expect(sunday.locator('.week-date-label')).toHaveText('9(일)')
  await expect(saturday.locator('.week-date-label')).toHaveText('15(토)')
  await expect(sunday.locator('.week-date-label')).toHaveCSS('color', 'rgb(220, 38, 38)')
  await expect(saturday.locator('.week-date-label')).toHaveCSS('color', 'rgb(37, 99, 235)')
  await expect(page.locator('.home-week-strip button.today .week-summary-item.work b')).toHaveText('D')
  const weekVisibility = await page.locator('.home-week-strip').evaluate((strip) => {
    const rows = [...strip.querySelectorAll('button')]
    return {
      rowCount: rows.length,
      noHorizontalOverflow: strip.scrollWidth <= strip.clientWidth,
      allRowsVisible: rows.every((row) => row.getBoundingClientRect().width <= strip.getBoundingClientRect().width),
    }
  })
  expect(weekVisibility).toEqual({ rowCount: 7, noHorizontalOverflow: true, allRowsVisible: true })
  await expect(page.getByRole('button', { name: /전체 캘린더/ })).toHaveCount(0)
  await expect(page.locator('.home-date-heading h1')).toHaveCount(0)
})

test('모바일 할 일 필터에서 오늘을 제외하고 남은 항목을 읽기 쉽게 표시한다', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), '모바일 레이아웃 전용')
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-tasks', JSON.stringify([{ id: 'done-task', title: '완료 일정', category: '장보기', dueDate: '2026-08-11', assignee: 'david', assignees: ['david'], done: true }]))
  })
  await page.reload()
  await page.getByRole('button', { name: '할 일', exact: true }).first().click()
  const filters = page.locator('.task-filter-bar button')
  await expect(filters).toHaveCount(4)
  await expect(page.locator('.task-filter-bar').getByRole('button', { name: '오늘', exact: true })).toHaveCount(0)
  await expect(filters).toHaveText(['전체', '이번 주', '이번 달', '완료 보기 1'])
  const layout = await filters.evaluateAll((buttons) => ({
    fontSizes: buttons.map((button) => parseFloat(getComputedStyle(button).fontSize)),
    oneLine: buttons.every((button) => Math.abs(buttons[0].getBoundingClientRect().top - button.getBoundingClientRect().top) < 1),
    fits: buttons.every((button) => button.scrollWidth <= button.clientWidth),
  }))
  expect(layout.fontSizes.every((size) => size >= 11)).toBe(true)
  expect(layout.oneLine).toBe(true)
  expect(layout.fits).toBe(true)
})

test('가족 구성원 수정 시 저장된 색과 근무표 안내를 정확히 표시한다', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: '설정', exact: true }).first().click()
  await page.getByRole('button', { name: /가족 구성원 관리/ }).click()
  const panel = page.getByRole('dialog', { name: '가족 구성원 관리' })
  await panel.getByRole('button', { name: '초롱 수정' }).click()
  const selectedColor = panel.locator('.profile-color-field button[aria-pressed="true"]')
  await expect(selectedColor).toHaveCount(1)
  await expect(selectedColor).toHaveAttribute('aria-label', /blue 색상/)
  await expect(selectedColor).not.toHaveAttribute('aria-label', /아빠 사용 중/)
  if (testInfo.project.name.includes('mobile')) {
    const shiftHelp = panel.locator('.shift-settings-section > p')
    await expect(shiftHelp).toHaveText('근무표 사용 구성원이 있을 때만 홈과 캘린더에 근무표가 표시됩니다.')
    const helpLayout = await shiftHelp.evaluate((copy) => ({
      whiteSpace: getComputedStyle(copy).whiteSpace,
      fits: copy.scrollWidth <= copy.clientWidth,
    }))
    expect(helpLayout).toEqual({ whiteSpace: 'nowrap', fits: true })
  }
})

test('캘린더 오늘 날짜는 네이비 숫자 원으로 표시하고 가로 격자만 유지한다', async ({ page }) => {
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  const appearance = await page.evaluate(() => {
    const today = document.querySelector('.calendar-grid button.today')
    const normal = document.querySelector('.calendar-grid button:not(.today):not(.outside)')
    const todayNumber = today?.querySelector(':scope > span:first-child')
    const firstCell = document.querySelector('.calendar-grid button')
    const lastCell = document.querySelector('.calendar-grid button:last-child')
    return {
      numberBackground: getComputedStyle(todayNumber).backgroundColor,
      numberColor: getComputedStyle(todayNumber).color,
      numberRadius: getComputedStyle(todayNumber).borderRadius,
      todayCellBackground: getComputedStyle(today).backgroundColor,
      normalCellBackground: getComputedStyle(normal).backgroundColor,
      verticalLine: getComputedStyle(firstCell).borderRightWidth,
      horizontalLine: getComputedStyle(firstCell).borderBottomWidth,
      lastRowLine: getComputedStyle(lastCell).borderBottomWidth,
    }
  })
  expect(appearance.numberBackground).toBe('rgb(23, 79, 101)')
  expect(appearance.numberColor).toBe('rgb(255, 255, 255)')
  expect(appearance.numberRadius).toBe('50%')
  expect(appearance.todayCellBackground).not.toBe(appearance.normalCellBackground)
  expect(appearance.verticalLine).toBe('0px')
  expect(appearance.horizontalLine).toBe('1px')
  expect(appearance.lastRowLine).toBe('0px')
})

test('자녀 캘린더에서 일회성 또는 반복 일정을 바로 등록한다', async ({ page }) => {
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await page.locator('.calendar-toolbar .segmented').getByRole('button', { name: '자녀', exact: true }).click()
  const dateHeading = page.locator('.child-day-heading h2')
  await expect(dateHeading).toHaveCSS('white-space', 'nowrap')
  const dateLayout = await page.locator('.child-day-card').evaluate((card) => ({ clientWidth: card.clientWidth, scrollWidth: card.scrollWidth }))
  expect(dateLayout.scrollWidth).toBeLessThanOrEqual(dateLayout.clientWidth)
  await page.locator('.child-day-card').getByRole('button', { name: '일정 추가', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: '자녀', exact: true })).toHaveAttribute('aria-pressed', 'true')
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
    rowDisplay: getComputedStyle(card).display,
    copyDisplay: getComputedStyle(card.querySelector('.schedule-row-copy')).display,
    avatarLeft: card.querySelector('.avatar')?.getBoundingClientRect().left,
    titleLeft: card.querySelector('.schedule-row-copy')?.getBoundingClientRect().left,
  }))
  expect(directEventLayout.scrollWidth).toBeLessThanOrEqual(directEventLayout.clientWidth)
  expect(directEventLayout.rowDisplay).toBe('flex')
  expect(directEventLayout.copyDisplay).toBe('flex')
  expect(directEventLayout.titleLeft).toBeGreaterThan(directEventLayout.avatarLeft)

  await page.locator('.calendar-toolbar .segmented').getByRole('button', { name: '가족', exact: true }).click()
  await expect(page.locator('.day-panel').getByText('체험 학습', { exact: true })).toHaveCount(0)

  await page.locator('.calendar-toolbar .segmented').getByRole('button', { name: '자녀', exact: true }).click()
  const childEventCard = page.locator('.child-direct-events .calendar-summary').filter({ hasText: '체험 학습' })
  await childEventCard.click()
  await page.getByRole('dialog', { name: '체험 학습 작업' }).getByRole('button', { name: '삭제' }).click()
  await page.getByRole('dialog', { name: '확인해 주세요' }).getByRole('button', { name: '확인' }).click()
  await expect(page.locator('.child-direct-events').getByText('체험 학습', { exact: true })).toHaveCount(0)
  await page.locator('.calendar-toolbar .segmented').getByRole('button', { name: '가족', exact: true }).click()
  await expect(page.locator('.day-panel').getByText('체험 학습', { exact: true })).toHaveCount(0)
})

test('자녀 캘린더의 반복 일정은 행 클릭 후 수정 삭제 범위를 선택한다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-child-schedules-v1', JSON.stringify([
      { id: 'child-calendar-action', member: 'leo', kind: '학원', title: '영어', weekdays: [2], weekday: 2, time: '오후 2:00', end: '오후 3:00', season: '학기' },
    ]))
    localStorage.setItem('family-scheduler-periods-v1', JSON.stringify([
      { id: 'child-calendar-period', member: 'leo', season: '학기', start: '2026-08-01', end: '2026-08-31' },
    ]))
  })
  await page.reload()
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await page.locator('.calendar-toolbar .segmented').getByRole('button', { name: '자녀', exact: true }).click()

  const scheduleRow = page.getByRole('button', { name: '초롱 영어 수정 및 삭제' })
  await expect(scheduleRow).toBeVisible()
  await expect(scheduleRow.locator('.event-actions')).toHaveCount(0)
  await scheduleRow.click()

  const rangeDialog = page.getByRole('dialog', { name: '영어' })
  await expect(rangeDialog.getByRole('button', { name: '이 날짜만 수정' })).toBeVisible()
  await expect(rangeDialog.getByRole('button', { name: '전체 반복 수정' })).toBeVisible()
  await expect(rangeDialog.getByRole('button', { name: '전체 반복 삭제' })).toBeVisible()
})

test('통합 캘린더에서 가족·자녀·근무를 함께 보고 공휴일은 분리한다', async ({ page }, testInfo) => {
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-events', JSON.stringify([
      { id: 'family-one', title: '가족 여행 준비 일정 제목', date: '2026-08-15', endDate: '2026-08-15', time: '오전 9:00', end: '오전 10:00', location: '광양교육청', recurrence: { frequency: 'weekly', interval: 1 }, member: 'leo', members: ['leo'], calendarScope: 'family' },
      { id: 'child-one', title: '자녀 일정', date: '2026-08-15', endDate: '2026-08-15', time: '오전 9:30', end: '오전 10:30', member: 'leo', members: ['leo'], calendarScope: 'children' },
      { id: 'family-two', title: '아빠 일정', date: '2026-08-15', endDate: '2026-08-15', time: '종일', member: 'david', members: ['david'], calendarScope: 'family' },
      { id: 'child-two', title: '연두 일정', date: '2026-08-15', endDate: '2026-08-15', time: '종일', member: 'mia', members: ['mia'], calendarScope: 'children' },
      { id: 'family-three', title: '엄마 일정', date: '2026-08-15', endDate: '2026-08-15', time: '종일', member: 'emma', members: ['emma'], calendarScope: 'family' },
    ]))
    localStorage.setItem('family-scheduler-shifts', JSON.stringify([{ id: 'shift-one', date: '2026-08-15', member: 'emma', shift: 'day' }]))
  })
  await page.reload()
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await expect(page.getByRole('button', { name: '전체', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.locator('[data-date="2026-08-15"]').click()
  await expect(page.getByText('선택한 날짜 · 전체 보기', { exact: true })).toHaveCount(0)
  await expect(page.getByText('선택한 날짜', { exact: true })).toHaveCount(0)
  const unifiedAdd = page.locator('.day-panel').getByRole('button', { name: '일정 추가', exact: true })
  await expect(unifiedAdd).toHaveCount(1)
  await unifiedAdd.click()
  const addDialog = page.getByRole('dialog', { name: '일정 추가' })
  await expect(addDialog.getByRole('button', { name: '가족', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(addDialog.getByRole('button', { name: '자녀', exact: true })).toBeVisible()
  await addDialog.getByRole('button', { name: '닫기' }).click()
  await expect(page.locator('.overview-day-section').filter({ hasText: '공휴일' })).toContainText('광복절')
  await expect(page.locator('.overview-day-section').filter({ hasText: '가족 일정' })).toContainText('가족 여행 준비 일정 제목')
  await expect(page.locator('.overview-day-section').filter({ hasText: '자녀 일정' })).toContainText('자녀 일정')
  await expect(page.locator('.overview-day-section').filter({ hasText: '근무' })).toContainText('D')
  await expect(page.locator('.overview-day-section.holiday-group')).toContainText('일정 개수에서 제외')
  const familyEventCard = page.locator('.overview-day-section').filter({ hasText: '가족 일정' }).locator('.calendar-summary').filter({ hasText: '가족 여행 준비 일정 제목' })
  const childEventCard = page.locator('.overview-day-section').filter({ hasText: '자녀 일정' }).locator('.calendar-summary').filter({ hasText: '자녀 일정' })
  const rowStarts = await page.locator('.overview-day-groups .schedule-row-leading').evaluateAll((items) => items.slice(0, 3).map((item) => Math.round(item.getBoundingClientRect().left)))
  expect(new Set(rowStarts).size).toBe(1)
  await expect(page.locator('.overview-conflict-banner')).toHaveCount(0)
  expect(await familyEventCard.locator('.schedule-row-category').evaluate((category) => getComputedStyle(category, '::before').content)).toBe('""')
  expect(await childEventCard.locator('.schedule-row-category').evaluate((category) => getComputedStyle(category, '::before').content)).toBe('""')
  await expect(familyEventCard).not.toContainText('시간 겹침')
  await expect(familyEventCard.locator('.schedule-row-location')).toHaveText('광양교육청')
  await expect(familyEventCard.locator('.schedule-row-time')).toHaveText('오전 9:00 ~ 오전 10:00')
  await expect(familyEventCard.locator('.schedule-row-repeat')).toHaveText('매주 토요일')
  await expect(childEventCard.locator('.schedule-row-repeat')).toHaveCount(0)
  await expect(childEventCard.locator('.schedule-row-category')).toHaveText('자녀')
  const familySecondaryStyle = await familyEventCard.locator('.schedule-row-secondary').evaluate((element) => ({
    color: getComputedStyle(element).color,
    weight: getComputedStyle(element).fontWeight,
    titleSize: parseFloat(getComputedStyle(element.closest('.schedule-row').querySelector('.schedule-row-title')).fontSize),
    secondarySize: parseFloat(getComputedStyle(element).fontSize),
  }))
  expect(familySecondaryStyle.weight).toBe('400')
  expect(familySecondaryStyle.titleSize - familySecondaryStyle.secondarySize).toBe(2)
  await expect(familyEventCard.getByRole('button', { name: '가족 여행 준비 일정 제목 대화와 준비물' })).toHaveCount(0)
  const actionRows = await familyEventCard.evaluate((card) => ({
    inlineActions: card.querySelectorAll('.event-actions button').length,
    fitsParent: card.getBoundingClientRect().right <= card.parentElement.getBoundingClientRect().right + 1,
    titleOverflowHidden: getComputedStyle(card.querySelector('.schedule-row-copy')).overflow === 'hidden',
  }))
  expect(actionRows).toEqual({ inlineActions: 0, fitsParent: true, titleOverflowHidden: true })
  await familyEventCard.click()
  const eventSheet = page.getByRole('dialog', { name: '가족 여행 준비 일정 제목 작업' })
  await expect(eventSheet.getByRole('button', { name: '수정' })).toBeVisible()
  await expect(eventSheet.getByRole('button', { name: '삭제' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(familyEventCard).toBeFocused()
  if (testInfo.project.name.includes('mobile')) {
    const mobileMarkers = page.locator('[data-date="2026-08-15"] .calendar-overview-markers')
    await expect(mobileMarkers.locator('.overview-count-label.family')).toHaveText('가3')
    await expect(mobileMarkers.locator('.overview-count-label.children')).toHaveText('자2')
    await expect(mobileMarkers.locator('.overview-member-dot')).toHaveCount(0)
    await expect(mobileMarkers.locator('.calendar-conflict-indicator')).toHaveCount(1)
    const shiftIcon = page.locator('[data-date="2026-08-15"] .overview-shift-icons .shift-icon.sage')
    await expect(shiftIcon.locator('svg')).toHaveCount(1)
    await expect(shiftIcon).toHaveText('')
  }
  await expect(page.locator('.calendar-overview-legend')).toHaveCount(0)
  const firstOverviewGroup = page.locator('.overview-day-groups > .overview-day-section').first()
  await expect(firstOverviewGroup.locator('header')).toContainText('근무')
  await expect(page.locator('[data-date="2026-08-15"]')).toHaveAttribute('aria-label', /시간 겹침 1개/)
  await expect(page.getByText('일정 3개 이상', { exact: true })).toHaveCount(0)
  if (!testInfo.project.name.includes('mobile')) {
    const toolbarLayout = await page.locator('.calendar-toolbar').evaluate((toolbar) => {
      const titleSlot = toolbar.querySelector('.calendar-title-slot').getBoundingClientRect()
      const title = toolbar.querySelector('.month-controls h1').getBoundingClientRect()
      const todayButton = toolbar.querySelector('.calendar-today-button').getBoundingClientRect()
      const tabs = toolbar.querySelector('.segmented').getBoundingClientRect()
      return {
        titleCenterDelta: Math.round(Math.abs((title.left + title.width / 2) - (titleSlot.left + titleSlot.width / 2))),
        todayAfterTabs: todayButton.left > tabs.right,
        todayRightMargin: Math.round(toolbar.getBoundingClientRect().right - todayButton.right),
        panelHeadingPadding: getComputedStyle(document.querySelector('.overview-heading > div:first-child')).paddingLeft,
      }
    })
    expect(toolbarLayout.titleCenterDelta).toBe(0)
    expect(toolbarLayout.todayAfterTabs).toBe(true)
    expect(toolbarLayout.todayRightMargin).toBeGreaterThanOrEqual(27)
    expect(toolbarLayout.todayRightMargin).toBeLessThanOrEqual(29)
    expect(toolbarLayout.panelHeadingPadding).toBe('0px')
  }
})

test('시간 겹침은 주간 날짜 옆 도트와 오늘 일정의 같은 빨간 테두리로 표시한다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-events', JSON.stringify([
      { id: 'conflict-a', title: '겹침 일정 A', date: '2026-08-11', endDate: '2026-08-11', time: '오전 8:30', end: '오전 10:00', member: 'emma', members: ['emma'], calendarScope: 'family' },
      { id: 'conflict-b', title: '겹침 일정 B', date: '2026-08-11', endDate: '2026-08-11', time: '오전 9:00', end: '오전 10:30', member: 'emma', members: ['emma'], calendarScope: 'family' },
    ]))
  })
  await page.reload()
  const conflictRow = page.locator('.today-card .home-event-row.conflict').first()
  const conflictStyle = await conflictRow.evaluate((row) => ({
    borderShadow: getComputedStyle(row).boxShadow,
    dotColor: getComputedStyle(row.querySelector('.schedule-row-category'), '::before').backgroundColor,
  }))
  expect(conflictStyle.borderShadow).toContain('rgb(220, 38, 38)')
  expect(conflictStyle.dotColor).toBe('rgb(220, 38, 38)')
  const weekDay = page.getByRole('button', { name: /8월 11일 화요일/ })
  await expect(weekDay.locator('.week-date-label > .week-conflict-dot')).toHaveCount(1)
})

test('통합 캘린더는 OFF를 숨기고 근무 탭에는 그대로 유지한다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-shifts', JSON.stringify([{ id: 'off-one', date: '2026-08-11', member: 'emma', shift: 'off' }]))
  })
  await page.reload()
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  const day = page.locator('[data-date="2026-08-11"]')
  await expect(day.locator('.overview-shift-icons')).toHaveCount(0)
  await expect(day).toHaveAttribute('aria-label', /엄마 근무 OFF/)
  await page.getByRole('button', { name: '근무', exact: true }).click()
  await expect(day.locator('.shift-chip')).toHaveText('OFF')
})

test('모바일 캘린더 셀을 키우고 모달 본문만 스크롤한다', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), '모바일 레이아웃 전용')
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  const calendar = page.locator('.calendar-card')
  const cell = page.locator('[data-date="2026-08-11"]')
  const calendarLayout = await calendar.evaluate((card) => ({
    fits: card.scrollWidth <= card.clientWidth,
    cellHeight: Math.round(card.querySelector('[data-date="2026-08-11"]').getBoundingClientRect().height),
  }))
  expect(calendarLayout.fits).toBe(true)
  expect(calendarLayout.cellHeight).toBeGreaterThanOrEqual(70)
  await cell.click()
  await page.locator('.day-panel').getByRole('button', { name: '일정 추가', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const modalLayout = await dialog.evaluate((modal) => {
    const body = modal.querySelector('.modal-scroll-body')
    const actions = modal.querySelector('.modal-actions')
    return {
      modalOverflow: getComputedStyle(modal).overflow,
      bodyOverflow: getComputedStyle(body).overflowY,
      actionsPosition: getComputedStyle(actions).position,
      actionsBelowBody: actions.getBoundingClientRect().top >= body.getBoundingClientRect().top,
      fitsViewport: modal.getBoundingClientRect().height <= window.innerHeight - 20,
    }
  })
  expect(modalLayout).toEqual({ modalOverflow: 'hidden', bodyOverflow: 'auto', actionsPosition: 'static', actionsBelowBody: true, fitsViewport: true })
})

test('모바일 가족 캘린더 범례를 날짜 상세보다 먼저 표시한다', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), '모바일 레이아웃 전용')
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await page.locator('.calendar-toolbar .segmented').getByRole('button', { name: '가족', exact: true }).click()
  const legend = page.locator('.calendar-card > .member-legend')
  const dayPanel = page.locator('.day-panel')
  await expect(legend).toBeVisible()
  await expect(dayPanel.locator('.member-legend')).toHaveCount(0)
  const order = await Promise.all([legend, dayPanel].map((locator) => locator.evaluate((element) => element.getBoundingClientRect().top)))
  expect(order[0]).toBeLessThan(order[1])
})

test('반복 할 일은 이번 회차 완료 상태를 따로 저장한다', async ({ page }) => {
  await page.getByRole('button', { name: '할 일', exact: true }).first().click()
  await page.getByRole('button', { name: '새 할 일' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('제목').fill('매주 분리수거')
  await dialog.getByLabel('마감일').fill('2026-08-11')
  await dialog.getByRole('button', { name: /알림·반복 설정/ }).click()
  await dialog.getByLabel('반복 주기').selectOption('weekly')
  await dialog.getByRole('button', { name: '할 일 추가' }).click()
  const card = page.locator('.task-card').filter({ hasText: '매주 분리수거' }).first()
  await expect(card).toBeVisible()
  await card.click()
  const taskSheet = page.getByRole('dialog', { name: '매주 분리수거 작업' })
  await expect(taskSheet.getByRole('button', { name: '완료' })).toBeVisible()
  await taskSheet.getByRole('button', { name: '수정' }).click()
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

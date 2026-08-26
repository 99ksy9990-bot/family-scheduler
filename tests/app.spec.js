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
  await expect(page.getByRole('heading', { name: '8월 11일(화) 일정' })).toBeVisible()
})

test('모든 화면의 콘텐츠 시작 여백을 헤더 아래 절반 간격으로 통일한다', async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 })
  await page.reload()

  for (const name of ['홈', '캘린더', '할 일', '일정 관리', '설정']) {
    await page.getByRole('button', { name, exact: true }).first().click()
    const spacing = await page.locator('main > .page').evaluate((content) => {
      const header = document.querySelector('.app-header')
      return {
        paddingTop: getComputedStyle(content).paddingTop,
        firstContentGap: Math.round(content.firstElementChild.getBoundingClientRect().top - header.getBoundingClientRect().bottom),
      }
    })
    expect(spacing).toEqual({ paddingTop: '15px', firstContentGap: 15 })
  }

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: '홈', exact: true }).first().click()
  const desktopSpacing = await page.locator('main > .page').evaluate((content) => ({
    paddingTop: getComputedStyle(content).paddingTop,
    firstContentGap: Math.round(content.firstElementChild.getBoundingClientRect().top - document.querySelector('.app-header').getBoundingClientRect().bottom),
  }))
  expect(desktopSpacing).toEqual({ paddingTop: '26px', firstContentGap: 26 })
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

test('홈 타임라인과 캘린더·할 일 행은 공통 56px 규격을 유지한다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-events', JSON.stringify([{ id: 'row-event', title: '행 높이 일정', date: '2026-08-11', endDate: '2026-08-11', time: '오후 2:00', member: 'emma', members: ['emma'], calendarScope: 'family' }]))
    localStorage.setItem('family-scheduler-tasks', JSON.stringify([{ id: 'row-task', title: '행 높이 할 일', category: '집안일', dueDate: '2026-08-11', assignee: 'emma', assignees: ['emma'], done: false }]))
  })
  await page.reload()
  const homeRow = page.locator('.today-card .schedule-row').first()
  await expect(homeRow).toHaveCSS('height', '56px')
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
  expect(homeRowLayout).toEqual({ paddingLeft: '0px', paddingRight: '0px', copyGap: '6px', accentContent: 'none' })

  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await page.locator('.calendar-toolbar .segmented').getByRole('button', { name: '가족', exact: true }).click()
  await expect(page.locator('.day-panel .schedule-row').filter({ hasText: '행 높이 일정' })).toHaveCSS('height', '56px')

  await page.getByRole('button', { name: '할 일', exact: true }).first().click()
  await expect(page.locator('.tasks-page .schedule-row').filter({ hasText: '행 높이 할 일' })).toHaveCSS('height', '56px')
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
      { id: 'today-child', title: '오늘 자녀 일정', kind: '학원', date: '2026-08-11', endDate: '2026-08-11', time: '오후 2:00', end: '오후 3:00', location: '영어 학원', member: 'leo', members: ['leo'], calendarScope: 'children' },
      { id: 'today-all-day', title: '오늘 가족 일정', date: '2026-08-11', endDate: '2026-08-11', time: '종일', member: 'family', members: ['family'], calendarScope: 'family' },
    ]))
    localStorage.setItem('family-scheduler-tasks', JSON.stringify([
      { id: 'today-task', title: '오늘 할 일', category: '집안일', dueDate: '2026-08-11', assignee: 'david', assignees: ['david'], done: false },
      { id: 'today-undated-task', title: '오늘 등록한 시간 없는 할 일', category: '장보기', dueDate: '', createdDate: '2026-08-11', assignee: 'david', assignees: ['david'], done: false },
      { id: 'overdue-task', title: '지난 마감 할 일', category: '긴급', dueDate: '2026-08-10', time: '오전 8:00', assignee: 'david', assignees: ['david'], done: false },
    ]))
  })
  await page.reload()

  const todayCard = page.locator('.today-card')
  await expect(todayCard.locator('.home-event-row').first().getByText('D', { exact: true })).toBeVisible()
  await expect(todayCard.getByText('오늘 자녀 일정', { exact: true })).toBeVisible()
  await expect(todayCard.locator('.home-event-row').first().locator('.event-time')).toHaveText('오전 6:30 ~ 오후 3:30')
  await expect(todayCard.locator('.home-event-row').first()).toHaveClass(/timeline-active/)
  await expect(todayCard.locator('.home-event-row').first().locator('.schedule-row-status')).toHaveText('진행')
  await expect(todayCard.getByRole('heading', { name: '8월 11일(화) 일정', exact: true })).toBeVisible()
  await expect(page.locator('.home-date-heading')).toHaveCount(0)
  await expect(todayCard.getByRole('button', { name: '캘린더', exact: true })).toBeVisible()
  await expect(todayCard.locator('.today-untimed-section').locator('.home-event-row').filter({ hasText: '오늘 등록한 시간 없는 할 일' })).toHaveCount(1)
  await expect(todayCard.locator('.timeline-now-marker')).toContainText('오전 9:00')
  await expect(todayCard.locator('.timeline-now-marker')).not.toContainText('지금')
  const timelineLayout = await todayCard.locator('.timeline').evaluate((timeline) => ({
    display: getComputedStyle(timeline).display,
    connector: getComputedStyle(timeline, '::before').content,
    oneColumn: [...timeline.querySelectorAll('.home-event-row')].every((row) => Math.abs(row.getBoundingClientRect().left - timeline.querySelector('.home-event-row').getBoundingClientRect().left) < 1),
  }))
  expect(timelineLayout).toEqual({ display: 'flex', connector: '""', oneColumn: true })
  await expect(todayCard.locator('.home-category-chip.work')).toHaveText('근무')
  await expect(todayCard.locator('.home-category-chip.children')).toHaveText('학원')
  const allDayRow = todayCard.locator('.home-event-row').filter({ hasText: '오늘 가족 일정' })
  await expect(allDayRow).toBeVisible()
  await expect(todayCard.locator('.timeline').locator('.home-event-row').filter({ hasText: '오늘 가족 일정' })).toHaveCount(0)
  await expect(todayCard.locator('.today-untimed-section').filter({ hasText: '시간 미정' }).locator('.home-event-row').filter({ hasText: '오늘 가족 일정' })).toHaveCount(1)
  await expect(todayCard.locator('.today-untimed-section').locator('.home-event-row').filter({ hasText: '오늘 할 일' })).toHaveCount(1)
  await expect(todayCard.locator('.timeline').getByText('지난 마감 할 일', { exact: true })).toHaveCount(1)
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
    timelineTimeLeft: card.querySelector('.schedule-row-timeline-time').getBoundingClientRect().left,
    avatarLeft: card.querySelector('.schedule-row-leading').getBoundingClientRect().left,
  }))
  expect(homeEventOrder.children).toEqual(['schedule-row-timeline-time', 'schedule-row-timeline-point', 'schedule-row-leading', 'schedule-row-copy', 'schedule-row-category home-category-chip work'])
  expect(homeEventOrder.mainChildren).toEqual(['schedule-row-primary', 'schedule-row-secondary'])
  expect(homeEventOrder.titleSize - homeEventOrder.timeSize).toBe(2)
  expect(homeEventOrder.timeWeight).toBe('400')
  expect(homeEventOrder.mainFits).toBe(true)
  expect(homeEventOrder.secondLineBelow).toBe(true)
  expect(homeEventOrder.timelineTimeLeft).toBeLessThan(homeEventOrder.avatarLeft)
  const nowMarkerLayout = await todayCard.locator('.timeline-now-marker').evaluate((marker) => {
    const time = marker.querySelector('.timeline-now-time').getBoundingClientRect()
    const dot = marker.querySelector('.timeline-now-dot').getBoundingClientRect()
    const line = marker.querySelector('i').getBoundingClientRect()
    return {
      label: marker.querySelector('.timeline-now-time').textContent,
      timeBeforeDot: time.right <= dot.left,
      lineAfterDot: dot.right <= line.left,
    }
  })
  expect(nowMarkerLayout).toEqual({ label: '오전 9:00', timeBeforeDot: true, lineAfterDot: true })
  const timelineSpacing = await todayCard.locator('.timeline').evaluate((timeline) => {
    const row = timeline.querySelector('.home-timeline-row')
    const time = row.querySelector('.schedule-row-timeline-time')
    const timeBox = time.getBoundingClientRect()
    const point = row.querySelector('.schedule-row-timeline-point').getBoundingClientRect()
    const avatar = row.querySelector('.schedule-row-leading').getBoundingClientRect()
    const copy = row.querySelector('.schedule-row-copy').getBoundingClientRect()
    const heading = timeline.closest('.today-card').querySelector('.section-heading h2').getBoundingClientRect()
    const timeTextRange = document.createRange()
    timeTextRange.selectNodeContents(time)
    const timeText = timeTextRange.getBoundingClientRect()
    return {
      pointCenter: Math.round(point.left + point.width / 2 - timeline.getBoundingClientRect().left),
      copyWidth: Math.round(copy.width),
      timeStartDelta: Math.round(Math.abs(timeText.left - heading.left)),
      timeToPointGap: Math.round(point.left - timeBox.right),
      pointToAvatarGap: Math.round(avatar.left - point.right),
      avatarToCopyGap: Math.round(copy.left - avatar.right),
      timeContentFits: time.scrollWidth <= time.clientWidth,
    }
  })
  expect(timelineSpacing.pointCenter).toBeLessThanOrEqual(86)
  expect(timelineSpacing.copyWidth).toBeGreaterThanOrEqual(145)
  expect(timelineSpacing.timeStartDelta).toBeLessThanOrEqual(1)
  expect(timelineSpacing.timeToPointGap).toBe(6)
  expect(timelineSpacing.pointToAvatarGap).toBe(8)
  expect(timelineSpacing.avatarToCopyGap).toBe(10)
  expect(timelineSpacing.timeContentFits).toBe(true)
  await expect(todayCard.locator('.home-event-row').filter({ hasText: '오늘 자녀 일정' }).locator('.schedule-row-location')).toHaveText('영어 학원')
  await expect(todayCard.getByText('오늘 한눈에 보기', { exact: true })).toHaveCount(0)
  const todaySummary = await todayCard.locator('.today-summary-bar').evaluate((bar) => {
    const buttons = [...bar.querySelectorAll('button')]
    const styles = buttons.map((button) => getComputedStyle(button))
    return {
      labels: buttons.map((button) => button.textContent),
      classes: buttons.map((button) => button.className),
      oneLine: buttons.every((button) => Math.abs(buttons[0].getBoundingClientRect().top - button.getBoundingClientRect().top) < 1),
      topBorder: getComputedStyle(bar).borderTopStyle,
      workPill: styles[0].backgroundColor !== 'rgba(0, 0, 0, 0)' && parseFloat(styles[0].borderRadius) >= 10,
      otherButtonsTransparent: styles.slice(1).every((style) => style.backgroundColor === 'rgba(0, 0, 0, 0)'),
      touchHeight: buttons.every((button) => button.getBoundingClientRect().height >= 44),
      oneColor: new Set(styles.map((style) => style.color)).size,
    }
  })
  expect(todaySummary).toEqual({ labels: ['D', '1', '1', '3'], classes: ['work sage', 'family', 'children', 'tasks'], oneLine: true, topBorder: 'solid', workPill: true, otherButtonsTransparent: true, touchHeight: true, oneColor: 2 })
  await expect(todayCard.locator('.today-summary-bar svg')).toHaveCount(4)
  await expect(todayCard.locator('.today-summary-bar .work svg')).toHaveCount(1)
  await expect(todayCard.locator('.today-summary-bar .work svg.lucide-sun')).toHaveCount(1)
  const todayWorkSpacing = await todayCard.locator('.today-summary-bar .work').evaluate((button) => {
    const style = getComputedStyle(button)
    return { left: parseFloat(style.paddingLeft), right: parseFloat(style.paddingRight), radius: parseFloat(style.borderRadius) }
  })
  expect(todayWorkSpacing.left).toBe(todayWorkSpacing.right)
  expect(todayWorkSpacing.left).toBeGreaterThanOrEqual(8)
  const weeklyWorkRadius = await page.locator('.home-week-strip .week-work-badge').first().evaluate((badge) => parseFloat(getComputedStyle(badge).borderRadius))
  expect(todayWorkSpacing.radius).toBe(weeklyWorkRadius)
  expect(todayWorkSpacing.radius).toBe(12)
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

test('오늘 일정은 전날 야간 근무를 이어 표시하고 최대 10개까지 보여준다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-shifts', JSON.stringify([
      { id: 'yesterday-night', date: '2026-08-10', member: 'emma', shift: 'night' },
    ]))
    localStorage.setItem('family-scheduler-events', JSON.stringify(Array.from({ length: 11 }, (_, index) => ({
      id: `today-many-${index}`,
      title: `오늘 일정 ${index + 1}`,
      date: '2026-08-11',
      endDate: '2026-08-11',
      time: `오전 ${index + 1}:12`,
      end: `오전 ${index + 1}:42`,
      member: 'emma',
      members: ['emma'],
      calendarScope: 'family',
    }))))
  })
  await page.reload()
  const todayCard = page.locator('.today-card')
  await expect(todayCard.locator('.home-event-row')).toHaveCount(10)
  await expect(todayCard.getByText('N', { exact: true })).toBeVisible()
  await expect(todayCard.getByText(/오후 10:00 ~ 익일 오전 8:00/)).toBeVisible()
  await expect(todayCard.locator('.home-event-row').filter({ hasText: 'N' }).locator('.schedule-row-timeline-time')).toHaveText('오전 8:00')
  expect((await todayCard.locator('.schedule-row-status').allTextContents()).every((text) => !text.includes('·'))).toBe(true)
  await expect(todayCard.getByRole('button', { name: '+2개 일정 더보기' })).toBeVisible()
  const fourDigitTime = todayCard.locator('.schedule-row-timeline-time').filter({ hasText: '오전 9:12' })
  await expect(fourDigitTime).toBeVisible()
  expect(await fourDigitTime.evaluate((time) => time.scrollWidth <= time.clientWidth)).toBe(true)
})

test('일정과 할 일은 당일·30분 전·10분 전 알림을 중복 선택해 저장한다', async ({ page }) => {
  await page.getByRole('button', { name: '일정 추가' }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByLabel('제목').fill('중복 알림 일정')
  await dialog.getByRole('button', { name: /시간·장소·반복 설정/ }).click()
  await dialog.getByRole('checkbox', { name: '당일 알림' }).check()
  await dialog.getByRole('checkbox', { name: '30분 전' }).check()
  await dialog.getByRole('checkbox', { name: '10분 전' }).check()
  await dialog.getByRole('button', { name: '일정 추가' }).click()
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('family-scheduler-events') || '[]').find((event) => event.title === '중복 알림 일정')?.reminders)).toEqual(['same-day', '30-minutes', '10-minutes'])

  await page.getByRole('button', { name: '할 일', exact: true }).first().click()
  await page.getByRole('button', { name: '추가', exact: true }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('제목').fill('중복 알림 할 일')
  await dialog.getByRole('button', { name: /시간·알림·반복 설정/ }).click()
  await dialog.getByRole('checkbox', { name: '당일 알림' }).check()
  await dialog.getByRole('checkbox', { name: '30분 전' }).check()
  await dialog.getByRole('checkbox', { name: '10분 전' }).check()
  await dialog.getByRole('button', { name: '할 일 추가' }).click()
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('family-scheduler-tasks') || '[]').find((task) => task.title === '중복 알림 할 일')?.reminders)).toEqual(['same-day', '30-minutes', '10-minutes'])
})

test('할 일 시작일자와 완료일자를 수정하고 완료 날짜를 과거로 기록한다', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('family-scheduler-tasks', JSON.stringify([{
    id: 'dated-task', title: '날짜 기록 할 일', category: '집안일', startDate: '2026-08-10', dueDate: '2026-08-11', assignee: 'david', assignees: ['david'], done: false,
  }])))
  await page.reload()
  await page.getByRole('button', { name: '할 일', exact: true }).first().click()
  const card = page.locator('.task-card').filter({ hasText: '날짜 기록 할 일' })
  await card.click()
  await page.getByRole('dialog', { name: '날짜 기록 할 일 작업' }).getByRole('button', { name: '수정' }).click()
  const dialog = page.getByRole('dialog', { name: '할 일 수정' })
  await dialog.getByLabel('시작일자').fill('2026-08-09')
  await dialog.getByLabel('마감일자').fill('2026-08-10')
  await dialog.getByLabel('완료일자').fill('2026-08-10')
  await dialog.getByRole('button', { name: '수정 완료' }).click()
  await expect.poll(async () => page.evaluate(() => {
    const task = JSON.parse(localStorage.getItem('family-scheduler-tasks') || '[]').find((item) => item.id === 'dated-task')
    return task && { startDate: task.startDate, dueDate: task.dueDate, completedDate: task.completedDate, done: task.done }
  })).toEqual({ startDate: '2026-08-09', dueDate: '2026-08-10', completedDate: '2026-08-10', done: true })
})

test('오늘 일정은 현재 시각을 기준으로 지난 일정과 진행 중 일정을 구분한다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-events', JSON.stringify([
      { id: 'past-event', title: '지난 일정', date: '2026-08-11', endDate: '2026-08-11', time: '오전 7:00', end: '오전 8:00', member: 'emma', members: ['emma'], calendarScope: 'family' },
      { id: 'active-event', title: '진행 일정', date: '2026-08-11', endDate: '2026-08-11', time: '오전 8:30', end: '오전 9:30', member: 'emma', members: ['emma'], calendarScope: 'family' },
      { id: 'overlap-event', title: '겹친 일정', date: '2026-08-11', endDate: '2026-08-11', time: '오전 9:00', end: '오전 10:00', member: 'emma', members: ['emma'], calendarScope: 'family' },
      { id: 'same-time-other-member', title: '다른 구성원 동시 일정', date: '2026-08-11', endDate: '2026-08-11', time: '오전 9:00', end: '오전 10:00', member: 'david', members: ['david'], calendarScope: 'family' },
      { id: 'upcoming-event', title: '예정 일정', date: '2026-08-11', endDate: '2026-08-11', time: '오전 10:00', end: '오전 11:00', member: 'emma', members: ['emma'], calendarScope: 'family' },
    ]))
  })
  await page.reload()

  const past = page.locator('.today-card .home-event-row').filter({ hasText: '지난 일정' })
  const active = page.locator('.today-card .home-event-row').filter({ hasText: '진행 일정' })
  const sameTimeOtherMember = page.locator('.today-card .home-event-row').filter({ hasText: '다른 구성원 동시 일정' })
  const upcoming = page.locator('.today-card .home-event-row').filter({ hasText: '예정 일정' })
  await expect(past).toHaveClass(/timeline-past/)
  await expect(past.locator('.schedule-row-status')).toHaveCount(0)
  await expect(active).toHaveClass(/timeline-active/)
  await expect(active.locator('.schedule-row-status')).toHaveText('진행')
  const statusStyle = await active.locator('.schedule-row-status').evaluate((status) => ({
    background: getComputedStyle(status).backgroundColor,
    beforeContent: getComputedStyle(status, '::before').content,
    fontSize: getComputedStyle(status).fontSize,
  }))
  expect(statusStyle.background).not.toBe('rgba(0, 0, 0, 0)')
  expect(statusStyle.beforeContent).toBe('none')
  expect(statusStyle.fontSize).toBe('11px')
  await expect(active.locator('.schedule-row-conflict-dot')).toHaveCount(1)
  await expect(active).not.toHaveCSS('box-shadow', /rgb\(220, 38, 38\)/)
  await expect(active).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(active).toHaveCSS('border-top-style', 'none')
  await expect(active).toHaveCSS('border-radius', '0px')
  await expect(active.locator('.schedule-row-timeline-point svg')).toHaveCount(1)
  const timelineAlignment = await active.evaluate((row) => {
    const time = row.querySelector('.schedule-row-timeline-time').getBoundingClientRect()
    const point = row.querySelector('.schedule-row-timeline-point').getBoundingClientRect()
    const avatar = row.querySelector('.schedule-row-leading').getBoundingClientRect()
    const copy = row.querySelector('.schedule-row-copy').getBoundingClientRect()
    const timeline = row.closest('.timeline')
    const timelineBox = timeline.getBoundingClientRect()
    const connectorLeft = parseFloat(getComputedStyle(timeline, '::before').left) + timelineBox.left
    return {
      ordered: time.right <= point.left && point.right <= avatar.left && avatar.right <= copy.left,
      connectorDelta: Math.abs(connectorLeft - (point.left + point.width / 2)),
    }
  })
  expect(timelineAlignment.ordered).toBe(true)
  expect(timelineAlignment.connectorDelta).toBeLessThanOrEqual(1)
  await expect(upcoming).toHaveClass(/timeline-upcoming/)
  await expect(upcoming.locator('.schedule-row-status')).toHaveCount(0)
  await expect(sameTimeOtherMember).toHaveCount(1)
  await expect(sameTimeOtherMember.locator('.schedule-row-timeline-time')).toHaveText('오전 9:00')
  await expect(page.locator('.today-card .schedule-row-timeline-time').filter({ hasText: '오전 9:00' })).toHaveCount(2)
  await expect(sameTimeOtherMember.locator('.schedule-row-conflict-dot')).toHaveCount(0)
  const neutralTimelineTime = await sameTimeOtherMember.locator('.schedule-row-timeline-time').evaluate((time) => {
    const probe = document.createElement('span')
    probe.style.color = 'var(--muted)'
    document.body.append(probe)
    const expected = getComputedStyle(probe).color
    probe.remove()
    return { actual: getComputedStyle(time).color, expected }
  })
  expect(neutralTimelineTime.actual).toBe(neutralTimelineTime.expected)
  expect(Number(await past.evaluate((row) => getComputedStyle(row).opacity))).toBeLessThan(1)
  await expect(past).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
})

test('시간이 없는 근무는 오늘 일정 본문에서 숨기고 요약에만 표시한다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-shifts', JSON.stringify([
      { id: 'today-off', date: '2026-08-11', member: 'emma', shift: 'off' },
    ]))
  })
  await page.reload()

  const todayCard = page.locator('.today-card')
  await expect(todayCard.locator('.today-untimed-section').getByText('OFF', { exact: true })).toHaveCount(0)
  await expect(todayCard.locator('.today-summary-bar .work')).toHaveText('OFF')
})

test('이번 주 근무 요약은 D E N OFF에 맞는 아이콘을 표시한다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-shifts', JSON.stringify([
      { id: 'week-off-icon', date: '2026-08-11', member: 'emma', shift: 'off' },
      { id: 'week-day-icon', date: '2026-08-12', member: 'emma', shift: 'day' },
      { id: 'week-evening-icon', date: '2026-08-13', member: 'emma', shift: 'evening' },
      { id: 'week-night-icon', date: '2026-08-14', member: 'emma', shift: 'night' },
    ]))
  })
  await page.reload()

  await expect(page.getByRole('button', { name: /8월 11일 화요일/ }).locator('.week-summary-item.work svg.lucide-calendar-days')).toHaveCount(1)
  await expect(page.getByRole('button', { name: /8월 12일 수요일/ }).locator('.week-summary-item.work svg.lucide-sun')).toHaveCount(1)
  await expect(page.getByRole('button', { name: /8월 13일 목요일/ }).locator('.week-summary-item.work svg.lucide-sunset')).toHaveCount(1)
  await expect(page.getByRole('button', { name: /8월 14일 금요일/ }).locator('.week-summary-item.work svg.lucide-moon')).toHaveCount(1)
  const workBackgrounds = await page.locator('.home-week-strip .week-summary-item.work').evaluateAll((items) => items.map((item) => getComputedStyle(item).backgroundColor))
  expect(new Set(workBackgrounds)).toEqual(new Set(['rgba(0, 0, 0, 0)']))
  await expect(page.locator('.home-week-strip .week-work-badge')).toHaveCount(4)
  const workBadges = await page.locator('.home-week-strip .week-work-badge').evaluateAll((items) => items.map((item) => ({
    background: getComputedStyle(item).backgroundColor,
    radius: getComputedStyle(item).borderRadius,
    fitsContent: item.getBoundingClientRect().width < item.parentElement.getBoundingClientRect().width,
    contentFits: item.scrollWidth <= item.clientWidth,
    coversLabel: item.getBoundingClientRect().right >= item.querySelector('b').getBoundingClientRect().right,
  })))
  expect(workBadges.every((badge) => badge.background !== 'rgba(0, 0, 0, 0)' && parseFloat(badge.radius) >= 10 && badge.fitsContent && badge.contentFits && badge.coversLabel)).toBe(true)
})

test('주간 요약은 오늘부터 시작하는 다가오는 7일을 표시한다', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '다가오는 7일', exact: true })).toBeVisible()
  const days = page.locator('.home-week-strip > button')
  await expect(days).toHaveCount(7)
  await expect(days.first()).toHaveAccessibleName(/8월 11일 화요일/)
  await expect(days.last()).toHaveAccessibleName(/8월 17일 월요일/)
  await expect(page.getByRole('button', { name: /8월 10일 월요일/ })).toHaveCount(0)
})

test('주요 화면을 이동한다', async ({ page }) => {
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: /년 .*월/ })).toBeVisible()
  await page.getByRole('button', { name: '할 일', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: '가족 할 일' })).toBeVisible()
  await page.getByRole('button', { name: '일정 관리', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: '가족 일정 관리' })).toBeVisible()
})

test('캘린더 보기 탭은 전체 근무 가족 자녀 순서로 표시한다', async ({ page }) => {
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await expect(page.locator('.calendar-toolbar .segmented button')).toHaveText(['전체', '근무', '가족', '자녀'])
})

test('자녀 일정은 현재 적용 중인 기간만 먼저 보이고 지난 기간은 접어 둔다', async ({ page }) => {
  const childSchedules = [
    ...Array.from({ length: 5 }, (_, index) => ({
      id: `term-schedule-${index}`,
      member: index % 2 ? 'mia' : 'leo',
      kind: '학원',
      title: `학기 일정 ${index + 1}`,
      season: '학기',
      weekdays: [index % 5 + 1],
      weekday: index % 5 + 1,
      time: '오후 2:00',
      end: '오후 3:00',
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      id: `vacation-schedule-${index}`,
      member: index % 2 ? 'mia' : 'leo',
      kind: '학원',
      title: `방학 일정 ${index + 1}`,
      season: '방학',
      weekdays: [index % 5 + 1],
      weekday: index % 5 + 1,
      time: '오후 4:00',
      end: '오후 5:00',
    })),
  ]
  const schedulePeriods = [
    { id: 'leo-vacation-past', member: 'leo', season: '방학', start: '2026-07-01', end: '2026-08-10' },
    { id: 'mia-vacation-past', member: 'mia', season: '방학', start: '2026-07-01', end: '2026-08-10' },
    { id: 'leo-term-current', member: 'leo', season: '학기', start: '2026-08-11', end: '2026-12-31' },
    { id: 'mia-term-current', member: 'mia', season: '학기', start: '2026-08-11', end: '2026-12-31' },
  ]
  await page.evaluate((items) => localStorage.setItem('family-scheduler-child-schedules-v1', JSON.stringify(items)), childSchedules)
  await page.evaluate((items) => localStorage.setItem('family-scheduler-periods-v1', JSON.stringify(items)), schedulePeriods)
  await page.reload()
  await page.getByRole('button', { name: '일정 관리', exact: true }).first().click()

  await expect(page.getByRole('button', { name: /자녀 일정/ })).toContainText('5')
  await expect(page.locator('.current-child-schedule-list .managed-child-schedule-row')).toHaveCount(5)
  await expect(page.getByRole('heading', { name: '등록 일정' })).toBeVisible()
  await expect(page.getByText('학기 일정 1', { exact: true })).toBeVisible()
  const pastGroups = page.locator('.past-child-schedule-group')
  await expect(pastGroups).toHaveCount(2)
  await expect(pastGroups.first()).not.toHaveAttribute('open', '')
  await expect(page.getByText('방학 일정 1', { exact: true })).toBeHidden()
  await pastGroups.first().locator('summary').click()
  await expect(pastGroups.first().locator('.managed-child-schedule-row').first()).toBeVisible()
  const categoryAlignment = await page.locator('.current-child-schedule-list .managed-child-schedule-row').first().evaluate((row) => {
    const category = row.querySelector('.schedule-row-category').getBoundingClientRect()
    const cell = row.getBoundingClientRect()
    return Math.abs((category.top + category.height / 2) - (cell.top + cell.height / 2))
  })
  expect(categoryAlignment).toBeLessThanOrEqual(1)
})

test('홈 진행 표시는 일정명 옆에 있고 다가오는 7일 날짜는 왼쪽 여백을 확보한다', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('family-scheduler-events', JSON.stringify([
    { id: 'active-class', title: '진행 중 수업', date: '2026-08-11', endDate: '2026-08-11', time: '오전 8:30', end: '오전 10:00', member: 'leo', members: ['leo'], calendarScope: 'children' },
  ])))
  await page.reload()

  const activeRow = page.locator('.today-card .schedule-row').filter({ hasText: '진행 중 수업' })
  await expect(activeRow.locator('.schedule-row-primary .schedule-row-status')).toHaveText('진행')

  await page.setViewportSize({ width: 402, height: 874 })
  const dateInset = await page.locator('.home-week-strip button').first().evaluate((row) => {
    const rowRect = row.getBoundingClientRect()
    const dateRect = row.querySelector('.week-date-label').getBoundingClientRect()
    return Math.round(dateRect.left - rowRect.left)
  })
  expect(dateInset).toBeGreaterThanOrEqual(8)
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
    const reminder = element.querySelector('.reminder-field')
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
    localStorage.setItem('family-scheduler-shifts', JSON.stringify([
      { id: 'week-shift-old', date: '2026-08-11', member: 'emma', shift: 'day' },
      { id: 'week-shift-latest', date: '2026-08-11', member: 'emma', shift: 'night' },
    ]))
    localStorage.setItem('family-scheduler-tasks', JSON.stringify([{ id: 'week-task', title: '완료한 주간 할 일', dueDate: '2026-08-11', done: true, category: '집안일', assignee: 'family' }]))
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
  expect(layout.gaps.every((gap) => Math.abs(gap - 14) < 1)).toBe(true)
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth)

  const weekSummaryLayout = await page.locator('.home-week-strip button').first().evaluate((button) => {
    const summaries = [...button.querySelectorAll('.week-summary-item')]
    return {
      count: summaries.length,
      sameLine: summaries.every((summary) => Math.abs(summary.getBoundingClientRect().top - summaries[0].getBoundingClientRect().top) <= 1),
      familyCount: button.querySelector('.week-summary-item.family b').textContent,
      childCount: button.querySelector('.week-summary-item.children b').textContent,
      taskCount: button.querySelector('.week-summary-item.tasks b').textContent,
      detailCount: button.querySelectorAll('.week-day-detail').length,
      fontSize: getComputedStyle(button.querySelector('.week-summary-item.family b')).fontSize,
      borderless: summaries.every((summary) => getComputedStyle(summary).borderStyle === 'none'),
      workPill: getComputedStyle(summaries[0]).backgroundColor !== 'rgba(0, 0, 0, 0)' && parseFloat(getComputedStyle(summaries[0]).borderRadius) >= 10,
      otherSummariesTransparent: summaries.slice(1).every((summary) => getComputedStyle(summary).backgroundColor === 'rgba(0, 0, 0, 0)'),
    }
  })
  expect(weekSummaryLayout).toMatchObject({ count: 4, sameLine: true, familyCount: '0', childCount: '0', taskCount: '1', detailCount: 0, fontSize: '11px', borderless: true, workPill: false, otherSummariesTransparent: true })

  const sunday = page.locator('.home-week-strip button.sunday')
  const saturday = page.locator('.home-week-strip button.saturday')
  await expect(sunday.locator('.week-date-label')).toHaveText('16(일)')
  await expect(saturday.locator('.week-date-label')).toHaveText('15(토)')
  await expect(sunday.locator('.week-date-label')).toHaveCSS('color', 'rgb(220, 38, 38)')
  await expect(saturday.locator('.week-date-label')).toHaveCSS('color', 'rgb(37, 99, 235)')
  const dayWorkSummary = page.getByRole('button', { name: /8월 11일 화요일/ }).locator('.week-summary-item.work')
  await expect(dayWorkSummary.locator('svg')).toHaveCount(1)
  await expect(dayWorkSummary.locator('svg.lucide-moon')).toHaveCount(1)
  await expect(dayWorkSummary.locator('b')).toHaveText('N')
  await expect(dayWorkSummary).toHaveClass(/navy/)
  await expect(dayWorkSummary).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(page.getByRole('button', { name: /8월 11일 화요일/ }).locator('.week-summary-item.tasks b')).toHaveText('1')
  await expect(page.locator('.home-week-strip button.today')).toHaveCSS('box-shadow', 'none')
  await page.evaluate(() => {
    const shifts = JSON.parse(localStorage.getItem('family-scheduler-shifts') || '[]')
    localStorage.setItem('family-scheduler-shifts', JSON.stringify([...shifts, { id: 'week-off', date: '2026-08-12', member: 'emma', shift: 'off' }]))
  })
  await page.reload()
  const offSummary = page.getByRole('button', { name: /8월 12일 수요일/ }).locator('.week-summary-item.work')
  await expect(offSummary.locator('b')).toHaveText('OFF')
  await expect(offSummary.locator('svg.lucide-calendar-days')).toHaveCount(1)
  const emptyWorkSummary = page.getByRole('button', { name: /8월 13일 목요일/ }).locator('.week-summary-item.work')
  await expect(emptyWorkSummary).toHaveText('')
  const alignedSummaryIcons = await page.locator('.home-week-strip').evaluate((strip) => {
    const rows = [...strip.querySelectorAll('button')]
    const lefts = (selector) => rows.map((row) => row.querySelector(selector)?.getBoundingClientRect().left).filter(Number.isFinite).map(Math.round)
    return {
      work: new Set(lefts('.week-summary-item.work svg')).size,
      family: new Set(lefts('.week-summary-item.family svg')).size,
      children: new Set(lefts('.week-summary-item.children svg')).size,
      tasks: new Set(lefts('.week-summary-item.tasks svg')).size,
    }
  })
  expect(alignedSummaryIcons).toEqual({ work: 1, family: 1, children: 1, tasks: 1 })
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

test('할 일에 시작 및 종료 시간을 선택적으로 저장하고 목록에 표시한다', async ({ page }) => {
  await page.getByRole('button', { name: '할 일', exact: true }).first().click()
  await expect(page.getByRole('button', { name: /긴급 추가|장보기 추가|집안일 추가/ })).toHaveCount(0)
  await page.getByRole('button', { name: '추가', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: /할 일 추가/ })
  await dialog.getByLabel('제목').fill('학교 픽업')
  await dialog.getByLabel('시작일자').fill('2026-08-11')
  await dialog.getByLabel('마감일자').fill('2026-08-11')
  await dialog.getByRole('button', { name: /알림·반복 설정/ }).click()
  await dialog.getByRole('button', { name: '시작·종료', exact: true }).click()
  await dialog.getByLabel('시작 시간 오전 오후').selectOption('오후')
  await dialog.getByLabel('시작 시간 시').selectOption('3')
  await dialog.getByLabel('종료 시간 오전 오후').selectOption('오후')
  await dialog.getByLabel('종료 시간 시').selectOption('4')
  await dialog.getByRole('button', { name: '할 일 추가', exact: true }).click()

  await expect.poll(async () => page.evaluate(() => {
    const task = JSON.parse(localStorage.getItem('family-scheduler-tasks') || '[]').find((item) => item.title === '학교 픽업')
    return task ? { time: task.time, end: task.end } : null
  })).toEqual({ time: '오후 3:00', end: '오후 4:00' })
  await expect(page.locator('.task-card').filter({ hasText: '학교 픽업' })).toContainText('오후 3:00 ~ 오후 4:00')
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

test('캘린더 오늘 날짜는 다른 날짜와 같은 숫자 크기와 위치를 유지한다', async ({ page }) => {
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  const appearance = await page.evaluate(() => {
    const today = document.querySelector('.calendar-grid button.today')
    const normal = document.querySelector('.calendar-grid button:not(.today):not(.outside)')
    const todayNumber = today?.querySelector('.calendar-day-number')
    const firstCell = document.querySelector('.calendar-grid button')
    const lastCell = document.querySelector('.calendar-grid button:last-child')
    return {
      numberBackground: getComputedStyle(todayNumber).backgroundColor,
      numberColor: getComputedStyle(todayNumber).color,
      numberRadius: getComputedStyle(todayNumber).borderRadius,
      numberSize: getComputedStyle(todayNumber).fontSize,
      normalNumberSize: getComputedStyle(normal.querySelector('.calendar-day-number')).fontSize,
      numberMargin: getComputedStyle(todayNumber).margin,
      todayCellBackground: getComputedStyle(today).backgroundColor,
      normalCellBackground: getComputedStyle(normal).backgroundColor,
      verticalLine: getComputedStyle(firstCell).borderRightWidth,
      horizontalLine: getComputedStyle(firstCell).borderBottomWidth,
      lastRowLine: getComputedStyle(lastCell).borderBottomWidth,
    }
  })
  expect(appearance.numberBackground).toBe('rgba(0, 0, 0, 0)')
  expect(appearance.numberRadius).toBe('0px')
  expect(appearance.numberSize).toBe(appearance.normalNumberSize)
  expect(appearance.numberMargin).toBe('0px')
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
      { id: 'child-one', title: '자녀 일정', kind: '학교', date: '2026-08-15', endDate: '2026-08-15', time: '오전 9:30', end: '오전 10:30', member: 'leo', members: ['leo'], calendarScope: 'children' },
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
  await expect(page.locator('.overview-conflict-banner')).toHaveCount(1)
  expect(await familyEventCard.locator('.schedule-row-category').evaluate((category) => getComputedStyle(category, '::before').content)).toBe('""')
  expect(await childEventCard.locator('.schedule-row-category').evaluate((category) => getComputedStyle(category, '::before').content)).toBe('""')
  await expect(familyEventCard).not.toContainText('시간 겹침')
  await expect(familyEventCard.locator('.schedule-row-location')).toHaveText('광양교육청')
  await expect(familyEventCard.locator('.schedule-row-time')).toHaveText('오전 9:00 ~ 10:00')
  await expect(familyEventCard.locator('.schedule-row-repeat')).toHaveText('매주 토요일')
  await expect(childEventCard.locator('.schedule-row-repeat')).toHaveCount(0)
  await expect(childEventCard.locator('.schedule-row-category')).toHaveText('학교')
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
    const mobileSlots = page.locator('[data-date="2026-08-15"] .calendar-cell-slots')
    await expect(mobileSlots.locator('.calendar-cell-family svg')).toHaveCount(1)
    await expect(mobileSlots.locator('.calendar-cell-family b')).toHaveText('3')
    await expect(mobileSlots.locator('.calendar-cell-children svg')).toHaveCount(1)
    await expect(mobileSlots.locator('.calendar-cell-children b')).toHaveText('2')
    await expect(page.locator('[data-date="2026-08-15"] .calendar-conflict-indicator')).toHaveCount(0)
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

test('시간 겹침은 주간 날짜 옆과 오늘 일정에 빨간 도트로만 표시한다', async ({ page }) => {
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
    dotColor: getComputedStyle(row.querySelector('.schedule-row-conflict-dot')).backgroundColor,
  }))
  expect(conflictStyle.borderShadow).not.toContain('rgb(220, 38, 38)')
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
  await expect(day.locator('.overview-shift-icons')).toHaveClass(/is-empty/)
  await expect(day.locator('.overview-shift-icons .shift-icon')).toHaveCount(0)
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

test('모바일 캘린더 상단은 모든 보기에서 같은 구조와 중심선을 유지한다', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), '모바일 레이아웃 전용')
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  const layouts = []
  for (const mode of ['전체', '가족', '근무', '자녀']) {
    await page.locator('.calendar-toolbar .segmented').getByRole('button', { name: mode, exact: true }).click()
    layouts.push(await page.locator('.calendar-toolbar').evaluate((toolbar) => {
      const title = toolbar.querySelector('.month-controls h1').getBoundingClientRect()
      const tabs = toolbar.querySelector('.segmented').getBoundingClientRect()
      const today = toolbar.querySelector('.calendar-today-button').getBoundingClientRect()
      return {
        titleCenter: Math.round(title.left + title.width / 2),
        tabsCenter: Math.round(tabs.left + tabs.width / 2),
        titleTop: Math.round(title.top),
        tabsTop: Math.round(tabs.top),
        todayTop: Math.round(today.top),
      }
    }))
  }
  expect(layouts.every((layout) => Math.abs(layout.titleCenter - layout.tabsCenter) <= 1)).toBe(true)
  expect(new Set(layouts.map(({ titleTop, tabsTop, todayTop }) => `${titleTop}:${tabsTop}:${todayTop}`)).size).toBe(1)
})

test('전체부터 자녀까지 같은 월간 셀 폼과 1px 작은 날짜를 사용하고 일요일과 공휴일은 빨간색으로 표시한다', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), '모바일 레이아웃 전용')
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()

  const layouts = []
  for (const mode of ['전체', '가족', '근무', '자녀']) {
    await page.locator('.calendar-toolbar .segmented').getByRole('button', { name: mode, exact: true }).click()
    const grid = page.locator('.calendar-grid')
    await expect(grid.locator(':scope > button')).toHaveCount(42)
    await expect(grid.locator('.calendar-cell-slots')).toHaveCount(42)
    layouts.push(await page.locator('[data-date="2026-08-11"]').evaluate((cell) => {
      const number = cell.querySelector('.calendar-day-number').getBoundingClientRect()
      const rect = cell.getBoundingClientRect()
      return {
        height: Math.round(rect.height),
        numberLeft: Math.round(number.left - rect.left),
        numberTop: Math.round(number.top - rect.top),
      }
    }))
  }
  expect(new Set(layouts.map(({ height, numberLeft, numberTop }) => `${height}:${numberLeft}:${numberTop}`)).size).toBe(1)

  const normal = page.locator('[data-date="2026-08-10"] .calendar-day-number')
  const sunday = page.locator('[data-date="2026-08-09"] .calendar-day-number')
  const holiday = page.locator('[data-date="2026-08-15"] .calendar-day-number')
  const styles = await Promise.all([normal, sunday, holiday].map((locator) => locator.evaluate((element) => ({
    color: getComputedStyle(element).color,
    size: Number.parseFloat(getComputedStyle(element).fontSize),
  }))))
  expect(styles[1].color).toBe('rgb(220, 38, 38)')
  expect(styles[2].color).toBe('rgb(220, 38, 38)')
  expect(styles.map(({ size }) => size)).toEqual([16, 16, 16])
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
  const centers = await Promise.all([legend, page.locator('.calendar-grid')].map((locator) => locator.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return Math.round(rect.left + rect.width / 2)
  })))
  expect(Math.abs(centers[0] - centers[1])).toBeLessThanOrEqual(1)
  await expect(legend).toHaveCSS('justify-content', 'center')
})

test('반복 할 일은 이번 회차 완료 상태를 따로 저장한다', async ({ page }) => {
  await page.getByRole('button', { name: '할 일', exact: true }).first().click()
  await page.getByRole('button', { name: '추가', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('제목').fill('매주 분리수거')
  await dialog.getByLabel('시작일자').fill('2026-08-11')
  await dialog.getByLabel('마감일자').fill('2026-08-11')
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

test('자녀 캘린더는 자녀별 아바타와 일정 개수를 표시한다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-events', JSON.stringify([
      { id: 'child-dot-leo', title: '초롱 일정', date: '2026-08-11', endDate: '2026-08-11', time: '종일', member: 'leo', members: ['leo'], calendarScope: 'children' },
      { id: 'child-dot-mia', title: '연두 일정', date: '2026-08-11', endDate: '2026-08-11', time: '종일', member: 'mia', members: ['mia'], calendarScope: 'children' },
    ]))
  })
  await page.reload()
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await page.locator('.calendar-toolbar .segmented').getByRole('button', { name: '자녀', exact: true }).click()
  const marker = page.locator('[data-date="2026-08-11"] .child-calendar-counts')
  await expect(marker).toHaveCSS('display', 'flex')
  await expect(marker.locator('.child-calendar-count')).toHaveCount(2)
  await expect(marker.locator('.child-calendar-count')).toHaveText(['초1', '연1'])
  const markerFit = await marker.evaluate((container) => {
    const containerRect = container.getBoundingClientRect()
    return [...container.querySelectorAll('.child-calendar-count')].map((row) => {
      const rowRect = row.getBoundingClientRect()
      const avatar = row.querySelector('i')
      const avatarStyle = getComputedStyle(avatar)
      return {
        fullyVisible: rowRect.top >= containerRect.top && rowRect.bottom <= containerRect.bottom,
        avatarFits: avatar.scrollWidth <= avatar.clientWidth && avatar.scrollHeight <= avatar.clientHeight,
        avatarWidth: Number.parseFloat(avatarStyle.width),
        fontSize: Number.parseFloat(avatarStyle.fontSize),
      }
    })
  })
  expect(markerFit.every(({ fullyVisible, avatarFits }) => fullyVisible && avatarFits)).toBe(true)
  expect(markerFit.every(({ avatarWidth }) => avatarWidth >= 17)).toBe(true)
  expect(markerFit.every(({ fontSize }) => fontSize >= 10)).toBe(true)
})

test('모바일 월간 전체 캘린더는 82px 고정 4행 셀과 16px 날짜·17px 근무 배지를 사용한다', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), '모바일 레이아웃 전용')
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-shifts', JSON.stringify([
      { id: 'day-shift', date: '2026-08-08', member: 'emma', shift: 'day' },
      { id: 'off-shift', date: '2026-08-09', member: 'emma', shift: 'off' },
    ]))
    localStorage.setItem('family-scheduler-events', JSON.stringify([
      { id: 'family-one', title: '가족 일정', date: '2026-08-08', endDate: '2026-08-08', time: '종일', member: 'emma', members: ['emma'], calendarScope: 'family' },
      { id: 'child-one', title: '자녀 일정', date: '2026-08-08', endDate: '2026-08-08', time: '종일', member: 'leo', members: ['leo'], calendarScope: 'children' },
    ]))
  })
  await page.reload()
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  const day = page.locator('[data-date="2026-08-08"]')
  const slots = day.locator('.calendar-cell-slots')
  await expect(slots.locator('.calendar-cell-top')).toHaveCount(1)
  await expect(slots.locator('.calendar-cell-holiday')).toHaveCount(1)
  await expect(slots.locator('.calendar-cell-family')).toHaveText(/1/)
  await expect(slots.locator('.calendar-cell-children')).toHaveText(/1/)
  await expect(day.locator('.overview-shift-icons .shift-icon')).toHaveCount(1)
  const metrics = await day.evaluate((cell) => {
    const number = cell.querySelector('.calendar-day-number')
    const shift = cell.querySelector('.overview-shift-icons .shift-icon')
    return {
      height: Math.round(cell.getBoundingClientRect().height),
      paddingLeft: getComputedStyle(cell).paddingLeft,
      numberSize: getComputedStyle(number).fontSize,
      numberWidth: Math.round(number.getBoundingClientRect().width),
      shiftWidth: Math.round(shift.getBoundingClientRect().width),
      shiftHeight: Math.round(shift.getBoundingClientRect().height),
      slots: cell.querySelector('.calendar-cell-slots').children.length,
    }
  })
  expect(metrics).toEqual({ height: 82, paddingLeft: '4px', numberSize: '16px', numberWidth: 21, shiftWidth: 17, shiftHeight: 17, slots: 4 })
  await expect(page.locator('[data-date="2026-08-09"] .overview-shift-icons')).toHaveClass(/is-empty/)
})

test('근무 상세 제목은 구성원 아바타와 날짜만 표시한다', async ({ page }) => {
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await page.getByRole('button', { name: '근무', exact: true }).click()
  const heading = page.locator('.shift-editor-heading')
  await expect(heading.locator('.avatar')).toHaveText('엄')
  await expect(heading.getByRole('heading', { name: '8월 11일 화요일' })).toBeVisible()
  await expect(heading).not.toContainText('엄마 근무표')
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

test('근무 입력은 D부터 OFF까지 한 줄로 표시하고 선택한 시간만 아래에 안내한다', async ({ page }) => {
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  await page.getByRole('button', { name: '근무', exact: true }).click()
  const shiftButton = page.locator('.shift-editor-grid button').first()
  const appearance = await page.locator('.shift-editor-grid').evaluate((grid) => {
    const buttons = [...grid.querySelectorAll('button')]
    return {
      count: buttons.length,
      sameLine: buttons.every((button) => Math.abs(buttons[0].getBoundingClientRect().top - button.getBoundingClientRect().top) < 1),
      labels: buttons.map((button) => button.querySelector('strong')?.textContent),
      embeddedTimes: buttons.map((button) => button.querySelectorAll('small').length),
      fits: grid.scrollWidth <= grid.clientWidth,
    }
  })
  expect(appearance).toEqual({ count: 4, sameLine: true, labels: ['D', 'E', 'N', 'OFF'], embeddedTimes: [0, 0, 0, 0], fits: true })
  await shiftButton.click()
  await expect(page.locator('.shift-selected-time')).toContainText(/오전 6:30.+오후 3:30/)
  await expect(page.getByText(/\d+\/\d+일 입력/)).toHaveCount(0)
})

test('서로 다른 날짜의 로컬·원격 근무 변경을 자동으로 병합한다', async () => {
  const syncMerge = await import('../src/lib/shiftSyncMerge.js').catch(() => ({}))
  expect(typeof syncMerge.mergeSharedShiftChanges).toBe('function')
  const base = {
    schemaVersion: 7,
    events: [{ id: 'shared-event', title: '공통 일정' }],
    shifts: [{ id: 'emma-2026-08-01', member: 'emma', date: '2026-08-01', shift: 'day' }],
  }
  const local = {
    ...base,
    shifts: [...base.shifts, { id: 'emma-2026-08-02', member: 'emma', date: '2026-08-02', shift: 'evening' }],
  }
  const remote = {
    ...base,
    shifts: [...base.shifts, { id: 'emma-2026-08-03', member: 'emma', date: '2026-08-03', shift: 'night' }],
  }
  expect(syncMerge.mergeSharedShiftChanges(base, local, remote)).toEqual({
    ...base,
    shifts: [
      { id: 'emma-2026-08-01', member: 'emma', date: '2026-08-01', shift: 'day' },
      { id: 'emma-2026-08-02', member: 'emma', date: '2026-08-02', shift: 'evening' },
      { id: 'emma-2026-08-03', member: 'emma', date: '2026-08-03', shift: 'night' },
    ],
  })
})

test('같은 날짜의 서로 다른 근무 변경은 자동 병합하지 않는다', async () => {
  const { mergeSharedShiftChanges } = await import('../src/lib/shiftSyncMerge.js')
  const base = { shifts: [{ id: 'emma-2026-08-02', member: 'emma', date: '2026-08-02', shift: 'day' }] }
  const local = { shifts: [{ id: 'emma-2026-08-02', member: 'emma', date: '2026-08-02', shift: 'evening' }] }
  const remote = { shifts: [{ id: 'emma-2026-08-02', member: 'emma', date: '2026-08-02', shift: 'night' }] }
  expect(mergeSharedShiftChanges(base, local, remote)).toBeNull()
})

test('광복절 대체휴일은 대체휴일만 표시하고 공휴일 라인을 셀 가운데에 둔다', async ({ page }) => {
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  const liberation = page.locator('[data-date="2026-08-15"]')
  const substitute = page.locator('[data-date="2026-08-17"]')
  await expect(liberation.locator('.calendar-cell-holiday')).toHaveText('광복절')
  await expect(substitute.locator('.calendar-cell-holiday')).toHaveText('대체휴일')
  await expect(substitute.locator('.calendar-cell-holiday')).not.toContainText('광복절')
  await expect(substitute.locator('.calendar-cell-holiday')).not.toContainText('대체공휴일')
  const positions = await liberation.evaluate((cell) => {
    const date = cell.querySelector('.calendar-cell-top').getBoundingClientRect()
    const holiday = cell.querySelector('.calendar-cell-holiday').getBoundingClientRect()
    const family = cell.querySelector('.calendar-cell-family').getBoundingClientRect()
    return {
      upperGap: Math.round(holiday.top - date.bottom),
      lowerGap: Math.round(family.top - holiday.bottom),
    }
  })
  expect(Math.abs(positions.upperGap - positions.lowerGap)).toBeLessThanOrEqual(1)
})

test('구형 근무 설정도 근무별 아이콘을 복원하고 모바일에서 칩과 편집기가 넘치지 않는다', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-work-settings-v1', JSON.stringify({
      enabled: true,
      workerIds: ['emma'],
      shiftTypes: [
        { id: 'day', code: 'D', label: '주간 근무 이름이 길어져도 안전하게 표시', start: '06:30', end: '15:30', color: 'sage' },
        { id: 'evening', code: 'E', label: '오후 근무', start: '13:30', end: '22:30', color: 'blue' },
        { id: 'night', code: 'N', label: '야간 근무', start: '22:00', end: '08:00', color: 'navy' },
        { id: 'off', code: 'OFF', label: '휴무', start: '', end: '', color: 'lavender' },
      ],
    }))
    localStorage.setItem('family-scheduler-shifts', JSON.stringify([
      { id: 'legacy-evening', date: '2026-08-11', member: 'emma', shift: 'evening' },
      { id: 'legacy-off', date: '2026-08-12', member: 'emma', shift: 'off' },
    ]))
  })
  await page.reload()
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()

  const overviewShift = page.locator('[data-date="2026-08-11"] .overview-shift-icons .shift-icon')
  await expect(overviewShift.locator('svg.lucide-sunset')).toHaveCount(1)
  await expect(overviewShift.locator('svg.lucide-calendar-days')).toHaveCount(0)

  await page.getByRole('button', { name: '근무', exact: true }).click()
  await expect(page.locator('.shift-editor-grid .sage .shift-option-label svg.lucide-sun')).toHaveCount(1)
  await expect(page.locator('.shift-editor-grid .blue .shift-option-label svg.lucide-sunset')).toHaveCount(1)
  await expect(page.locator('.shift-editor-grid .navy .shift-option-label svg.lucide-moon')).toHaveCount(1)
  await expect(page.locator('.shift-editor-grid .lavender .shift-option-label svg.lucide-calendar-days')).toHaveCount(1)

  const shiftCell = page.locator('[data-date="2026-08-11"]')
  const shiftChip = shiftCell.locator('.shift-chip')
  await expect(shiftChip.locator('svg.lucide-sunset')).toBeVisible()
  const offChip = page.locator('[data-date="2026-08-12"] .shift-chip')
  await expect(offChip).toHaveText('OFF')
  const layout = await page.evaluate(() => ({
    documentFits: document.documentElement.scrollWidth <= window.innerWidth,
    editorFits: [...document.querySelectorAll('.shift-editor-grid button')].every((button) => {
      const label = button.querySelector('.shift-option-label')
      return label && label.getBoundingClientRect().right <= button.getBoundingClientRect().right
    }),
    chipFitsContent: (() => {
      const chip = document.querySelector('[data-date="2026-08-11"] .shift-chip')
      return chip && chip.getBoundingClientRect().width < chip.parentElement.getBoundingClientRect().width * 0.75
    })(),
    offFits: (() => {
      const chip = document.querySelector('[data-date="2026-08-12"] .shift-chip')
      const cell = chip?.closest('button')
      return Boolean(chip && cell && chip.scrollWidth <= chip.clientWidth && chip.getBoundingClientRect().right <= cell.getBoundingClientRect().right)
    })(),
  }))
  expect(layout).toEqual({ documentFits: true, editorFits: true, chipFitsContent: true, offFits: true })
})

test('전체 캘린더의 두 자리 가족·자녀 개수를 자르지 않고 셀 안에 표시한다', async ({ page }) => {
  await page.evaluate(() => {
    const familyEvents = Array.from({ length: 12 }, (_, index) => ({
      id: `family-count-${index}`,
      title: `가족 일정 ${index + 1}`,
      date: '2026-08-11',
      endDate: '2026-08-11',
      time: '종일',
      member: 'emma',
      members: ['emma'],
      calendarScope: 'family',
    }))
    const childEvents = Array.from({ length: 12 }, (_, index) => ({
      id: `child-count-${index}`,
      title: `자녀 일정 ${index + 1}`,
      date: '2026-08-11',
      endDate: '2026-08-11',
      time: '종일',
      member: 'leo',
      members: ['leo'],
      calendarScope: 'children',
    }))
    localStorage.setItem('family-scheduler-events', JSON.stringify([...familyEvents, ...childEvents]))
  })
  await page.reload()
  await page.getByRole('button', { name: '캘린더', exact: true }).first().click()
  const cell = page.locator('[data-date="2026-08-11"]')
  await expect(cell.locator('.calendar-cell-family b')).toHaveText('12')
  await expect(cell.locator('.calendar-cell-children b')).toHaveText('12')
  const markerLayout = await cell.evaluate((button) => {
    const bounds = button.getBoundingClientRect()
    const markers = [...button.querySelectorAll('.calendar-cell-count')]
    return {
      allInside: markers.every((marker) => {
        const rect = marker.getBoundingClientRect()
        return rect.left >= bounds.left && rect.right <= bounds.right && rect.bottom <= bounds.bottom
      }),
      overflowVisible: getComputedStyle(button.querySelector('.calendar-cell-slots')).overflow === 'visible',
    }
  })
  expect(markerLayout).toEqual({ allInside: true, overflowVisible: true })
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

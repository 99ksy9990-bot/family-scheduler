import { test, expect } from './ui-fixture.js'

const seed = async (page) => {
  await page.clock.runFor(500)
  await page.evaluate(() => {
    const profiles = [{ id: 'p', name: '가족', type: 'adult', characterId: 'dad' }, { id: 'q', name: '아이', type: 'child', characterId: 'little' }, { id: 'r', name: '엄마', type: 'adult', characterId: 'mom' }, { id: 's', name: '언니', type: 'child', characterId: 'big' }]
    const data = {
      'profiles-v1': profiles,
      events: [{ id: 'all', title: '공통 일정', date: '2026-11-05', time: '14:00', end: '15:00', member: 'family', customFlag: 'keep' }, { id: 'multi', title: '두 명 일정', date: '2026-11-05', time: '16:00', members: ['p', 'q'] }],
      tasks: [{ id: 't', title: '개인 할 일', dueDate: '2026-11-05', time: '11:30', assignee: 'p' }, { id: 'rec', title: '매일 연습', dueDate: '2026-11-05', time: '20:00', assignee: 'p', recurrence: { frequency: 'daily' }, completedDates: [] }, { id: 'tomorrow', title: '내일 준비', dueDate: '2026-11-06', time: '13:00', assignee: 'p' }],
      shifts: [{ member: 'p', date: '2026-11-04', shift: 'night' }, { member: 'p', date: '2026-11-05', shift: 'day' }],
      'work-settings-v1': { enabled: true, workerIds: ['p'] },
      'periods-v1': [{ id: 'term', member: 'q', season: 'term', start: '2026-01-01', end: '2026-12-31' }],
      'child-schedules-v1': [{ id: 'school', member: 'q', title: '아이 시간표', season: 'term', weekdays: [4, 5], time: '09:00', end: '10:00' }],
    }
    for (const [key, value] of Object.entries(data)) localStorage.setItem(`family-scheduler-${key}`, JSON.stringify(value))
  })
  await page.reload()
  await expect(page.locator('.demo-banner')).toHaveCount(0)
  await expect(page.locator('.house-tile')).toHaveCount(4)
}

test('모두 4명·여러 명 얼굴이 32px 안에 겹쳐 표시, 달력도 동일', async ({ page }) => {
  await seed(page)
  const all = page.locator('.house-row').filter({ hasText: '공통 일정' }).locator('.member-stack')
  await expect(all.locator('img')).toHaveCount(4)
  await expect(page.locator('.house-row').filter({ hasText: '두 명 일정' }).locator('.member-stack img')).toHaveCount(2)
  expect(await all.evaluate((element) => {
    const r = element.getBoundingClientRect()
    return r.width === 32 && r.height === 32 && [...element.querySelectorAll('img')].every((img) => { const face = img.getBoundingClientRect(); return face.x >= r.x && face.y >= r.y && face.right <= r.right && face.bottom <= r.bottom })
  })).toBe(true)
  await page.getByRole('navigation').getByRole('button', { name: '달력', exact: true }).click()
  await expect(page.locator('.grouped-row').filter({ hasText: '공통 일정' }).locator('.member-stack img')).toHaveCount(4)
  await expect(page.locator('.grouped-row').filter({ hasText: '두 명 일정' }).locator('.member-stack img')).toHaveCount(2)
})

test('개인 오늘·내일·96px 현재 표정·즉시 완료·반복 내일 회차·일정 편집 보존', async ({ page }) => {
  await seed(page)
  await page.locator('.house-tile').first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toHaveAccessibleName('가족의 하루')
  expect((await dialog.locator('.person-hero .character').boundingBox()).width).toBe(96)
  expect(await dialog.locator('.person-hero img').evaluate((img) => img.getBoundingClientRect().width)).toBe(84)
  await expect(dialog.locator('.person-hero img')).toHaveAttribute('src', '/characters/dad_busy.png')
  await expect(dialog.locator('.person-hero p')).toContainText('근무 중')
  const today = dialog.getByRole('list', { name: '오늘의 일정과 할 일', exact: true })
  await expect(today.locator('.person-row-body strong')).toHaveText(['근무 N 마침', '근무 D', '개인 할 일', '공통 일정', '두 명 일정', '매일 연습'])
  await expect(dialog.getByRole('list', { name: '내일의 일정과 할 일', exact: true })).toContainText('내일 준비')
  await dialog.getByRole('checkbox', { name: '오늘 개인 할 일 완료', exact: true }).check()
  await dialog.getByRole('checkbox', { name: '내일 매일 연습 완료', exact: true }).check()
  await page.clock.runFor(500)
  const tasks = await page.evaluate(() => JSON.parse(localStorage.getItem('family-scheduler-tasks')))
  expect(tasks.find((task) => task.id === 't').done).toBe(true)
  expect(tasks.find((task) => task.id === 'rec')).toMatchObject({ completedDates: ['2026-11-06'] })
  await today.getByRole('button', { name: /^공통 일정/ }).click()
  await expect(dialog.getByRole('heading', { name: '일정 수정', exact: true })).toBeVisible()
  expect(await dialog.locator('.schedule-owners button[aria-pressed="true"]').count()).toBe(4)
  await dialog.getByLabel('무슨 일정인가요?').fill('바꾼 공통 일정')
  await dialog.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveAccessibleName('가족의 하루')
  await page.clock.runFor(500)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('family-scheduler-events')).find((event) => event.id === 'all'))).toMatchObject({ title: '바꾼 공통 일정', member: 'family', members: ['family'], customFlag: 'keep', time: '14:00' })
  await page.keyboard.press('Escape')
  await page.getByRole('navigation').getByRole('button', { name: '가족', exact: true }).click()
  await page.getByRole('list', { name: '구성원', exact: true }).getByRole('button', { name: /^가족/ }).click()
  await expect(page.getByRole('dialog')).toHaveAccessibleName('가족의 하루')
})

test('야간 이월 근무 원본과 시간표 편집, 중복 근무를 만들지 않음', async ({ page }) => {
  await seed(page)
  await page.locator('.house-tile').first().click()
  let dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: /^근무 N/ }).click()
  dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('날짜', { exact: true })).toHaveValue('2026-11-04')
  await dialog.getByRole('combobox', { name: '근무 유형', exact: true }).selectOption('off')
  await dialog.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveAccessibleName('가족의 하루')
  await page.clock.runFor(500)
  const shifts = await page.evaluate(() => JSON.parse(localStorage.getItem('family-scheduler-shifts')))
  expect(shifts.filter((shift) => shift.member === 'p')).toHaveLength(2)
  expect(shifts.find((shift) => shift.member === 'p' && shift.date === '2026-11-04').shift).toBe('off')
  expect(shifts.find((shift) => shift.member === 'p' && shift.date === '2026-11-05').shift).toBe('day')
  await page.keyboard.press('Escape')
  await page.getByRole('navigation').getByRole('button', { name: '가족', exact: true }).click()
  await page.getByRole('list', { name: '구성원', exact: true }).getByRole('button', { name: /^아이/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: /^아이 시간표/ }).first().click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('수업 이름', { exact: true }).fill('바꾼 시간표')
  await dialog.getByRole('button', { name: '저장', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveAccessibleName('아이의 하루')
  await page.clock.runFor(500)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('family-scheduler-child-schedules-v1'))[0].title)).toBe('바꾼 시간표')
})

test('연속 N 한 칸 두 행·마침 흐리게·두 줄 시간 칸·상단 불투명 날짜', async ({ page }) => {
  await seed(page)
  await page.clock.runFor(500)
  await page.evaluate(() => {
    localStorage.setItem('family-scheduler-shifts', JSON.stringify([{ member: 'p', date: '2026-11-04', shift: 'night' }, { member: 'p', date: '2026-11-05', shift: 'night' }]))
    localStorage.setItem('family-scheduler-work-settings-v1', JSON.stringify({ enabled: true, workerIds: ['p'], shiftTypes: [{ id: 'night', label: '야간', code: 'N', start: '22:00', end: '07:00' }] }))
    const events = JSON.parse(localStorage.getItem('family-scheduler-events'))
    events.push({ id: 'day', title: '종일 일정', date: '2026-11-05', time: '종일', member: 'p' })
    localStorage.setItem('family-scheduler-events', JSON.stringify(events))
  })
  await page.reload()
  await expect(page.locator('.demo-banner')).toHaveCount(0)
  await page.getByRole('navigation').getByRole('button', { name: '달력', exact: true }).click()
  const group = page.locator('.schedule-shift-group')
  await expect(group).toHaveCount(1)
  await expect(group.locator('.shift-line h3')).toHaveText(['근무 N 마침', '근무 N'])
  await expect(group.locator('.time-start')).toHaveText(['~07:00', '22:00'])
  await expect(group.locator('.time-end').last()).toHaveText('– 내일 07:00')
  await expect(group.locator('.is-carryover h3')).toHaveCSS('color', 'rgb(69, 69, 80)')
  const cells = page.locator('.selected-schedule .time-cell')
  expect(await cells.evaluateAll((elements) => new Set(elements.map((element) => element.getBoundingClientRect().height)).size)).toBe(1)
  await expect(page.locator('.grouped-row').filter({ hasText: '종일 일정' }).locator('.time-start')).toHaveText('하루 종일')
  const date = page.locator('.app-date')
  await expect(date).toHaveCSS('color', 'rgb(110, 110, 115)')
  await expect(date).toHaveCSS('filter', 'none')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect.poll(() => date.evaluate((element) => getComputedStyle(element).color)).toBe('rgb(152, 152, 157)')
})

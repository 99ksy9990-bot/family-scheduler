import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Holidays from 'date-holidays'
import KoreanLunarCalendar from 'korean-lunar-calendar'

const START_YEAR = 1950
const END_YEAR = 2100
const outputPath = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/korean-holidays.json')
const calendar = new Holidays('KR')
calendar.setLanguages('ko')

const pad = (value) => String(value).padStart(2, '0')
const iso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const addDays = (base, amount) => {
  const date = new Date(base)
  date.setDate(date.getDate() + amount)
  return date
}
const normalizeName = (name) => name.replace('석가탄신일', '부처님오신날')

const holidaysForYear = (year) => {
  const holidayMap = new Map()
  const addHoliday = (dateValue, name, substitute = false) => {
    const list = holidayMap.get(dateValue) || []
    if (!list.some((holiday) => holiday.name === name)) list.push({ name, substitute })
    holidayMap.set(dateValue, list)
  }

  calendar.getHolidays(year)
    .filter((holiday) => holiday.type === 'public')
    .filter((holiday) => !holiday.name.startsWith('설날') && !holiday.name.startsWith('추석'))
    .forEach((holiday) => addHoliday(
      holiday.date.slice(0, 10),
      normalizeName(holiday.name),
      Boolean(holiday.substitute),
    ))

  const addLunarFestival = (lunarMonth, lunarDay, name) => {
    const lunarCalendar = new KoreanLunarCalendar()
    if (!lunarCalendar.setLunarDate(year, lunarMonth, lunarDay, false)) return
    const solar = lunarCalendar.getSolarCalendar()
    const center = new Date(solar.year, solar.month - 1, solar.day)
    const festivalDates = [-1, 0, 1].map((offset) => addDays(center, offset))
    festivalDates.forEach((date, index) => addHoliday(iso(date), index === 1 ? name : `${name} 연휴`))

    const festivalNames = new Set([name, `${name} 연휴`])
    const needsSubstitute = festivalDates.some((date) => (
      date.getDay() === 0
      || (holidayMap.get(iso(date)) || []).some((holiday) => !festivalNames.has(holiday.name))
    ))
    if (!needsSubstitute) return
    let substituteDate = addDays(festivalDates[2], 1)
    while (substituteDate.getDay() === 0 || substituteDate.getDay() === 6 || holidayMap.has(iso(substituteDate))) {
      substituteDate = addDays(substituteDate, 1)
    }
    addHoliday(iso(substituteDate), `${name} (대체공휴일)`, true)
  }

  addLunarFestival(1, 1, '설날')
  addLunarFestival(8, 15, '추석')

  // Family Scheduler 운영상 표시하기로 한 일정입니다.
  if (year >= 2026) addHoliday(`${year}-05-01`, '노동절')
  if (year === 2026) addHoliday('2026-06-03', '전국동시지방선거일')

  return Object.fromEntries([...holidayMap.entries()].sort(([first], [second]) => first.localeCompare(second)))
}

const data = Object.fromEntries(
  Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, index) => START_YEAR + index)
    .map((year) => [year, holidaysForYear(year)]),
)

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(data)}\n`, 'utf8')
console.log(`Generated Korean holidays for ${START_YEAR}-${END_YEAR}`)

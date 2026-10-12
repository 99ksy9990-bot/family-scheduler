import koreanHolidayData from '../data/korean-holidays.json'
import { iso } from './dates'

const holidayYearCache = new Map()

export const holidaysForYear = (year) => {
  if (holidayYearCache.has(year)) return holidayYearCache.get(year)
  const holidayMap = new Map(Object.entries(koreanHolidayData[String(year)] || {}).map(([date, holidays]) => [
    date,
    holidays.map((holiday) => ({
      ...holiday,
      name: holiday.substitute ? '대체휴일' : holiday.name,
    })),
  ]))
  holidayYearCache.set(year, holidayMap)
  return holidayMap
}

export const holidayEventsForDate = (date, holidayMemberId = 'holiday') => (
  holidaysForYear(date.getFullYear()).get(iso(date)) || []
).map((holiday, index) => ({
  id: `holiday-${iso(date)}-${index}`,
  date: iso(date),
  title: holiday.name,
  time: '종일',
  end: '',
  location: holiday.substitute ? '대한민국 대체휴일' : '대한민국 공휴일',
  member: holidayMemberId,
  type: 'holiday',
  holiday: true,
  readOnly: true,
}))

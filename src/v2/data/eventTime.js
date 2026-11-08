import { addDays, iso } from '../../lib/dates'

export function oneHourLater(time, date) {
  const [hours, minutes] = time.split(':').map(Number)
  const total = hours * 60 + minutes + 60
  return { time: `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`,
    endDate: total >= 1440 ? iso(addDays(new Date(`${date}T00:00:00`), 1)) : date }
}

// 끝 시간이 없는 일정은 1시간짜리로 봄 (시작하자마자 '끝남'으로 바뀌던 문제)
export const endOf = (row) => row.displayEnd || (row.displayStart && /^\d\d:\d\d$/.test(row.displayStart) ? oneHourLater(row.displayStart, '2000-01-01').time : '')

export function eventPhase(row, date, now) {
  const key = iso(date)
  const current = iso(now)
  if (!row.displayStart) return 'untimed'
  if (key < current) return 'past'
  if (key > current) return 'future'
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  if (row.displayStart > clock) return 'future'
  if (row.crossesMidnight || row.endDate > key) return 'active'
  const end = endOf(row)
  if (end && end <= row.displayStart) return 'active' // 자정 넘는 1시간
  return !end || end <= clock ? 'past' : 'active'
}

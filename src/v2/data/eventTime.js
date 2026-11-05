import { addDays, iso } from '../../lib/dates'

export function oneHourLater(time, date) {
  const [hours, minutes] = time.split(':').map(Number)
  const total = hours * 60 + minutes + 60
  return { time: `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`,
    endDate: total >= 1440 ? iso(addDays(new Date(`${date}T00:00:00`), 1)) : date }
}

export function eventPhase(row, date, now) {
  const key = iso(date)
  const current = iso(now)
  if (!row.displayStart) return 'untimed'
  if (key < current) return 'past'
  if (key > current) return 'future'
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  if (row.displayStart > clock) return 'future'
  if (row.crossesMidnight || row.endDate > key) return 'active'
  return (row.displayEnd || row.displayStart) <= clock ? 'past' : 'active'
}

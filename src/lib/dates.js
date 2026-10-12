export const pad = (value) => String(value).padStart(2, '0')

export const iso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const addDays = (base, amount) => {
  const date = new Date(base)
  date.setDate(date.getDate() + amount)
  return date
}

export const startOfToday = () => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

export const formatLongDate = (date) => new Intl.DateTimeFormat('ko-KR', {
  month: 'long', day: 'numeric', weekday: 'long',
}).format(date)

export const formatSolarDate = (date) => (
  date ? `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.` : '변환 가능한 날짜 없음'
)

export const validSolarDate = (year, month, day) => {
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

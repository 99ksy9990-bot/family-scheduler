import REF from './growthRef.json' with { type: 'json' }

// 질병관리청·대한소아청소년과학회 2017 소아청소년 성장도표 (연령별 신장·체중 백분위수, 0~227개월)
// REF[kind][sex][개월] = 3·10·25·50·75·90·97 백분위 값
export const ageMonths = (birthDate, date) => {
  const [by, bm, bd] = birthDate.split('-').map(Number), [y, m, d] = date.split('-').map(Number)
  return (y - by) * 12 + (m - bm) - (d < bd ? 1 : 0)
}

// 같은 나이·성별 또래와 비교: { median, top } (top = 상위 몇 %), 범위 밖이면 null
export function compareToPeers(kind, sex, birthDate, date, value) {
  if (!sex || !birthDate || !value) return null
  const months = ageMonths(birthDate, date)
  const row = REF[kind]?.[sex]?.[months]
  if (!row) return null
  const pct = REF.pct
  let p
  if (value <= row[0]) p = 3
  else if (value >= row.at(-1)) p = 97
  else { const i = row.findIndex((v) => v >= value); p = pct[i - 1] + (pct[i] - pct[i - 1]) * (value - row[i - 1]) / (row[i] - row[i - 1]) }
  return { median: row[3], months, top: Math.round(100 - p) }
}

export const medianAt = (kind, sex, birthDate, date) => REF[kind]?.[sex]?.[ageMonths(birthDate, date)]?.[3] ?? null

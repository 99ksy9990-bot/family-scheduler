// 시간순 첫 행의 자리에 같은 가족의 당일 근무만 묶는다. 원본 행과 시간은 보존한다.
export function groupShiftRows(rows) {
  const groups = []
  const shifts = new Map()
  for (const row of rows) {
    const key = row.type === 'shift' && row.sourceDate ? `${row.member}:${row.date}` : null
    if (key && shifts.has(key)) shifts.get(key).push(row)
    else { const group = [row]; groups.push(group); if (key) shifts.set(key, group) }
  }
  return groups
}

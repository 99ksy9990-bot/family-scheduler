// 일정 줄 종류 → 아이콘 (한 사람 목록에서 얼굴 대신)
export const kindOf = (row) => row.holiday ? 'holiday' : row.anniversary ? row.anniversaryKind : row.type === 'shift' ? 'shift' : row.recurrenceType === 'child' ? (row.kind === '학교' ? '학교' : '학원') : 'event'

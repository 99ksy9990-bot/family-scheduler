// 일정 줄 종류 → 아이콘 (한 사람 목록에서 얼굴 대신)
export const kindOf = (row) => row.holiday || row.type === 'leave' || (row.type === 'shift' && row.title === 'OFF') ? 'holiday' // 쉬는 날(공휴일·OFF·연차)은 같은 깃발
     : row.anniversary ? row.anniversaryKind : row.type === 'shift' ? 'shift' : row.recurrenceType === 'child' ? (row.kind === '학교' ? '학교' : '학원') : 'event'

// 사람 고유색 (캐릭터 색, 직접 고른 색이 있으면 그 색)
export const personColor = (profile) => profile?.colorCustomized ? profile.color : `var(--color-${profile?.characterId || 'dad'})`

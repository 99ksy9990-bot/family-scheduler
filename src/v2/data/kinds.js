import { roleOf } from '../components/CharacterAvatar.jsx'
// 일정 줄 종류 → 아이콘 (한 사람 목록에서 얼굴 대신)
export const kindOf = (row) => row.holiday || row.type === 'leave' || (row.type === 'shift' && row.title === 'OFF') ? 'holiday' // 쉬는 날(공휴일·OFF·연차)은 같은 깃발
     : row.anniversary ? row.anniversaryKind : row.type === 'shift' ? 'shift' : row.recurrenceType === 'child' || ['학교', '학원'].includes(row.kind) ? (row.kind === '학교' ? '학교' : '학원') : 'event' // 한 번만 넣은 학교·학원 일정도 같은 그림

// 사람 고유색 (캐릭터 색, 직접 고른 색이 있으면 그 색)
// 치이카와 그림을 골라도 원래 역할 색 (아빠·엄마…)
export const personColor = (profile) => profile?.colorCustomized ? profile.color : `var(--color-${roleOf(profile || {}) || 'dad'})`

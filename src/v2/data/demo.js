import { iso, addDays } from '../../lib/dates'
import { DEFAULT_SHIFT_TYPES } from '../../lib/legacyState'

// 공개 예시 전용. 실제 가족·백업에서 가져온 내용 없이 매번 오늘 기준으로 만든다.
export function createDemo(today) {
  const date = iso(today)
  const profiles = [['dad', '아빠', 'adult'], ['mom', '엄마', 'adult'], ['big', '초롱', 'child'], ['little', '연두', 'child']]
    .map(([id, name, type]) => ({ id: `demo-${id}`, name, type, characterId: id, active: true, ...(id === 'dad' ? { regularWork: { weekdays: [1, 2, 3, 4, 5], start: '08:00', end: '17:00', skipHolidays: true } } : {}) }))
  const events = [
    ['아침 산책', '07:30', '08:00', 'dad'], ['그림 그리기', '10:00', '11:00', 'little'],
    ['함께 점심', '12:00', '13:00', 'family'], ['도서관 나들이', '15:00', '16:00', 'big'],
    ['저녁 준비', '18:00', '19:00', 'mom'], ['가족 이야기', '20:00', '20:30', 'family'],
  ].map(([title, time, end, member], index) => ({ id: `demo-event-${index}`, title, date, time, end, member: member === 'family' ? 'family' : `demo-${member}`, type: 'family', calendarScope: 'family' }))
  const tasks = [['우유 사기', '장보기', 'mom', date], ['가방 챙기기', '긴급', 'little', date], ['화분 물 주기', '집안일', 'dad', ''], ['책장 정리', '집안일', 'big', ''], ['식탁 닦기', '집안일', 'family', date]]
    .map(([title, category, member, dueDate], index) => ({ id: `demo-task-${index}`, title, category, assignee: member === 'family' ? 'family' : `demo-${member}`, dueDate, done: index === 4 }))
  return { profiles, events, tasks, taskCategories: ['긴급', '장보기', '집안일'],
    // 엄마: 교대(D·D·E·E·N·N·휴·휴 반복), 아빠: 평일 고정 근무(아래 profiles 수정)
    shifts: Array.from({ length: 42 }, (_, i) => i - 14).map((offset) => ({ id: `demo-shift-${offset}`, member: 'demo-mom', date: iso(addDays(today, offset)), shift: ['day', 'day', 'evening', 'evening', 'night', 'night', 'off', 'off'][((offset % 8) + 8) % 8] })),
    workSettings: { enabled: true, workerIds: ['demo-mom'], shiftTypes: structuredClone(DEFAULT_SHIFT_TYPES) },
    childSchedules: [], childProfiles: [], schedulePeriods: [], anniversaries: [], scheduleExceptions: [], profileLinks: {}, gameScores: {} }
}

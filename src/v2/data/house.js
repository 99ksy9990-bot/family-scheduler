import { nextAnniversaryOccurrence } from '../../lib/schedule'
import { assignedMemberIds } from '../../lib/legacyState'
import { memberStatus } from './schedule'
import { endOf, eventPhase } from './eventTime'

export const rowsForMember = (rows, id) => rows.filter((row) => {
  const ids = assignedMemberIds(row)
  return ids.includes(id) || ids.includes('family')
})

const SICK_WORD = /병원|치과|검진|진료|한의원|예방접종/
// 오늘 병원 일정이 있거나, 오늘(또는 날짜 없는) 안 끝낸 병원 할 일이 있는지
const hospitalToday = (profile, own, tasks, key) => own.some((row) => SICK_WORD.test(row.title || '')) || tasks.some((t) => !t.done && (t.assignees || [t.assignee]).some((id) => id === profile.id || id === 'family') && (!t.dueDate || t.dueDate === key) && SICK_WORD.test(t.title || ''))

export function houseStatus(profile, rows, tasks, today, now, shifts = []) {
  const own = rowsForMember(rows, profile.id)
  const active = own.find((row) => eventPhase(row, today, now) === 'active')
  const schoolKind = (row) => ['학교', '학원'].includes(row?.kind) ? row.kind : row?.type === 'school' ? '학교' : null
  const status = memberStatus(profile, rows, tasks, now)
  if (active) return { ...status, expression: 'busy', badgeKind: active.type === 'shift' ? null : schoolKind(active), badge: active.type === 'shift' ? '근무' : schoolKind(active) || '일정', // 칩은 두 글자로 통일 (사용자 2026-11-12)
    what: active.type === 'shift' ? '' : active.title, detail: `@${active.type === 'shift' ? 'work' : schoolKind(active) ? 'study' : 'event'}:${active.crossesMidnight ? "내일 " : ""}${endOf(active) || active.displayStart}` } // 화면에서 softDetail이 문장으로
  const next = own.find((row) => eventPhase(row, today, now) === 'future')
  if (schoolKind(next)) return { ...status, badgeKind: schoolKind(next), badge: schoolKind(next), badgeUpcoming: true, detail: `${next.displayStart} 시작` }
  if (!next && own.some((row) => row.type === 'leave')) return { ...status, detail: '오늘은 쉬는 날' } // 아빠 연차도 엄마 OFF처럼
  const half = own.find((row) => row.regular && row.title.includes('반차'))
  if (!next && half) return { ...status, detail: `오늘 ${half.title.split(' · ')[1]}` }
  // 교대 근무 기록이 오늘 '휴무'면 '여유로운 하루' 대신 휴무로
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  // 교대 근무자(엄마)는 OFF인 날 일정이 있어도 휴무 표시. 상주 근무자(아빠)는 주말·공휴일이 당연히 쉬어서 따로 안 씀
  if (shifts.findLast((s) => s.member === profile.id && s.date === key)?.shift === 'off') return { ...status, detail: next ? `휴무 · 다음 ${next.displayStart}` : '오늘은 쉬는 날' }
  if (!next && hospitalToday(profile, own, tasks, key)) return { ...status, detail: '병원 가는 날' } // 일정 없다고 '여유로운 하루'라 하지 않게
  return { ...status, detail: next && status.label.length > 14 ? `다음 ${next.displayStart}` : status.label }
}

export function remainingSchedule(rows, today, now) {
  return rows.filter((row) => ['future', 'untimed'].includes(eventPhase(row, today, now)))
}

// 얼굴은 사람 상태만 (날씨는 맨 위 날씨 줄에만, 사용자 2026-11-12)
// 새 표정 고르기: 생일 > 수업 중(공부) > 근무 등 바쁨 > 병원 날(아픔) > 밤·밤근무 다음날(졸림) > 밀린 할 일(걱정) > 휴무(휴식) > 기본
export function moodFor(profile, status, { rows = [], tasks = [], now = new Date(), birthday = false, weather = null } = {}) {
  if (birthday) return 'party'
  const own = rowsForMember(rows, profile.id)
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (hospitalToday(profile, own, tasks, today)) return 'sick' // 병원 날은 수업·근무 중이어도 아픈 얼굴 먼저
  if (status.expression === 'busy') return status.badgeKind ? 'study' : status.badge === '근무' && (profile.characterId === 'mom' || profile.baseCharacter === 'mom') && profile.characterId !== 'siren' ? 'mask' : 'busy' // 간호사 엄마는 근무 중 마스크
  const h = now.getHours()
  if (h >= 23 || h < 6 || (h < 13 && own.some((row) => row.carryover))) return 'sleepy'
  if (status.expression !== 'done' && tasks.filter((t) => !t.done && t.assignee === profile.id && t.dueDate && t.dueDate < today).length >= 2) return 'worried'
  if (status.detail === '오늘은 쉬는 날') return 'rest'
  return status.expression
}

// 오늘이 이 사람 생일인지 (기념일 목록의 '생일')
export function isBirthdayToday(anniversaries = [], profile, today, match = (a) => a.kind === '생일') {
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return anniversaries.some((a) => match(a) && (a.members?.includes(profile.id) || a.member === profile.id || a.name === profile.name) && nextAnniversaryOccurrence(a, day)?.getTime() === day.getTime())
}

// 생일·기념일(제사·기일 제외)이면 축하 얼굴
export const isCelebrationToday = (anniversaries, profile, today) => isBirthdayToday(anniversaries, profile, today, (a) => !/제사|기일/.test(a.kind || ''))

// 같은 상태라도 날짜·사람마다 다른 말로 (하루 동안은 그대로)
const SOFT = {
  '오늘은 쉬는 날': ['오늘은 쉬는 날', '푹 쉬는 하루', '오늘은 충전하는 날', '느긋하게 쉬어요', '쉬엄쉬엄 하는 날', '오늘은 쉬어 가요', '집에서 뒹굴뒹굴', '마음껏 쉬는 날'],
  '오늘도 수고했어요': ['오늘도 수고했어요', '오늘 할 일 끝!', '멋진 하루였어요', '이제 편히 쉬어요', '오늘도 잘 해냈어요', '고생 많았어요', '오늘 하루 끝!', '이제 쉬어도 돼요'],
  '여유로운 하루': ['여유로운 하루', '느긋한 시간', '한숨 돌리는 중', '오늘은 여유 있어요', '잠깐 쉬는 중', '편안한 시간', '마음 편한 하루', '숨 고르는 중'],
  '병원 가는 날': ['병원 가는 날', '몸 챙기는 날', '병원 다녀와요', '오늘은 몸 돌보기', '건강 챙기는 날', '푹 쉬고 나아요'],
  '할 일이 남았어요': ['할 일이 남았어요', '조금만 더 힘내요', '할 일 하나씩 해봐요', '거의 다 왔어요', '천천히 해봐요', '하나만 더 해볼까요'],
}
const BUSY = {
  work: (t) => [`${t}까지 일하는 중`, `${t}까지 열일 중`, `${t}에 퇴근해요`, `${t}까지 힘내는 중`, `${t}까지 바쁘게 일해요`, `${t}에 일 끝나요`, `${t}까지 근무 중`, `${t}에 만나요`],
  study: (t) => [`${t}까지 공부 중`, `${t}까지 열공 중`, `${t}에 끝나요`, `${t}까지 배우는 중`, `${t}까지 집중 중`, `${t}에 수업 끝나요`, `${t}까지 열심히 하는 중`, `${t}에 만나요`],
  event: (t) => [`${t}에 끝나요`, `${t}까지 바빠요`, `${t}까지 일정 중`, `${t}쯤 끝나요`, `${t}쯤 마쳐요`, `${t}까지 조금 바빠요`],
}
export function softDetail(detail, profile, today, what) {
  const m = /^@(\w+):(.*)$/.exec(detail || '')
  if (m && what && what.length <= 8) return `${what} ${m[2]}까지` // 일정 이름 보이게 (사용자 2026-11-12)
  const list = m ? BUSY[m[1]](m[2]) : SOFT[detail]
  if (!list) return detail
  const seed = [...`${profile.id}${today.getFullYear()}${today.getMonth()}${today.getDate()}`].reduce((n, c) => n * 31 + c.charCodeAt(0) >>> 0, 7)
  return list[seed % list.length]
}

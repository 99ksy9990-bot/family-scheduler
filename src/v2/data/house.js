import { assignedMemberIds } from '../../lib/legacyState'
import { memberStatus } from './schedule'
import { endOf, eventPhase } from './eventTime'

export const rowsForMember = (rows, id) => rows.filter((row) => {
  const ids = assignedMemberIds(row)
  return ids.includes(id) || ids.includes('family')
})

export function houseStatus(profile, rows, tasks, today, now, shifts = []) {
  const own = rowsForMember(rows, profile.id)
  const active = own.find((row) => eventPhase(row, today, now) === 'active')
  const schoolKind = (row) => ['학교', '학원'].includes(row?.kind) ? row.kind : row?.type === 'school' ? '학교' : null
  const status = memberStatus(profile, rows, tasks, now)
  if (active) return { ...status, expression: 'busy', badgeKind: active.type === 'shift' ? null : schoolKind(active), badge: active.type === 'shift' ? '근무 중' : active.title.length > 6 ? schoolKind(active) || '일정 중' : active.title, // 학원·학교도 수업명(수학·4교시)
    detail: `» ${active.crossesMidnight ? "내일 " : ""}${endOf(active) || active.displayStart}` }
  const next = own.find((row) => eventPhase(row, today, now) === 'future')
  if (schoolKind(next)) return { ...status, badgeKind: schoolKind(next), badge: next.title.length > 6 ? schoolKind(next) : next.title, badgeUpcoming: true, detail: `${next.displayStart} 시작` }
  if (!next && own.some((row) => row.type === 'leave')) return { ...status, detail: '오늘 휴무' } // 아빠 연차도 엄마 OFF처럼
  const half = own.find((row) => row.regular && row.title.includes('반차'))
  if (!next && half) return { ...status, detail: `오늘 ${half.title.split(' · ')[1]}` }
  // 교대 근무 기록이 오늘 '휴무'면 '쉬는 중' 대신 휴무로
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  // 교대 근무자(엄마)는 OFF인 날 일정이 있어도 휴무 표시. 상주 근무자(아빠)는 주말·공휴일이 당연히 쉬어서 따로 안 씀
  if (shifts.findLast((s) => s.member === profile.id && s.date === key)?.shift === 'off') return { ...status, detail: next ? `휴무 · 다음 ${next.displayStart}` : '오늘 휴무' }
  return { ...status, detail: next && status.label.length > 14 ? `다음 ${next.displayStart}` : status.label }
}

export function remainingSchedule(rows, today, now) {
  return rows.filter((row) => ['future', 'untimed'].includes(eventPhase(row, today, now)))
}

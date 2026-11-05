import { assignedMemberIds } from '../../lib/legacyState'
import { memberStatus } from './schedule'
import { eventPhase } from './eventTime'

export const rowsForMember = (rows, id) => rows.filter((row) => {
  const ids = assignedMemberIds(row)
  return ids.includes(id) || ids.includes('family')
})

export function houseStatus(profile, rows, tasks, today, now) {
  const own = rowsForMember(rows, profile.id)
  const active = own.find((row) => eventPhase(row, today, now) === 'active')
  const status = memberStatus(profile, rows, tasks, now)
  if (active) return { ...status, expression: 'busy', badge: active.type === 'shift' ? '근무 중' : active.kind || (active.title.length > 6 ? '일정 중' : active.title),
    detail: `${active.crossesMidnight ? '내일 ' : ''}${active.displayEnd || active.displayStart}까지` }
  const next = own.find((row) => eventPhase(row, today, now) === 'future')
  return { ...status, detail: next && status.label.length > 14 ? `다음 ${next.displayStart}` : status.label }
}

export function remainingSchedule(rows, today, now) {
  return rows.filter((row) => ['future', 'untimed'].includes(eventPhase(row, today, now)))
}

// 가족 알림 모음: 일정·할 일이 추가·수정·삭제·완료될 때 state.activity에 한 줄씩 남김 (최근 60개)
const KEEP = 60
const SEEN = 'family-scheduler-activity-seen'
const pick = (row) => JSON.stringify([row.title, row.date || row.dueDate, row.time, row.end, row.member, row.members, row.assignee, row.location, row.recurrence])

function diff(kind, before = [], after = []) {
  const old = new Map(before.map((row) => [row.id, row]))
  const out = []
  for (const row of after) {
    const prev = old.get(row.id)
    old.delete(row.id)
    if (!prev) out.push({ kind, action: 'add', row })
    else if (kind === 'task' && !prev.done && row.done) out.push({ kind, action: 'done', row })
    else if (kind === 'task' && (row.completedDates?.length || 0) > (prev.completedDates?.length || 0)) out.push({ kind, action: 'done', row })
    else if (pick(prev) !== pick(row)) out.push({ kind, action: 'edit', row })
  }
  for (const row of old.values()) out.push({ kind, action: 'remove', row })
  return out
}

export function logChanges(prev, next, by, at = new Date().toISOString()) {
  if (!prev || !next || prev === next) return next
  const changes = [...(prev.events !== next.events ? diff('event', prev.events, next.events) : []), ...(prev.tasks !== next.tasks ? diff('task', prev.tasks, next.tasks) : [])]
  if (!changes.length) return next
  const items = changes.map(({ kind, action, row }) => ({ id: `${at}-${row.id}-${action}`, at, by: by || '', kind, action, title: row.title || '', date: row.date || row.dueDate || '' }))
  return { ...next, activity: [...items.reverse(), ...(next.activity || [])].slice(0, KEEP) }
}

export const ACTION_TEXT = { add: '추가', edit: '수정', remove: '삭제', done: '완료' }
export const getSeen = () => { try { return localStorage.getItem(SEEN) || '' } catch { return '' } }
export const setSeen = (at) => { try { localStorage.setItem(SEEN, at) } catch { /* 못 저장하면 점이 남을 뿐 */ } }

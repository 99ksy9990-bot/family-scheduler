// 대청소 진행도 합치기: 기기·서버 어느 쪽이 오래된 값이어도 뒤로 가지 않게 (깬 단계·별·꾸민 것은 큰 쪽/합집합)
const maxMap = (a = {}, b = {}) => Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map((k) => [k, Math.max(a[k] || 0, b[k] || 0)]))
const weekNo = (w) => (w?.id ? new Date(w.id.replace(/-/g, '/')).getTime() : 0)
function mergeWeek(a, b) {
  if (!a || !b) return a || b
  if (weekNo(a) !== weekNo(b)) return weekNo(a) > weekNo(b) ? a : b
  return { id: a.id, dust: Math.max(a.dust || 0, b.dust || 0), claimed: !!(a.claimed || b.claimed) }
}
export function mergeProgress(a, b) {
  if (!a) return b; if (!b) return a
  return {
    unlocked: Math.max(a.unlocked || 0, b.unlocked || 0),
    stars: maxMap(a.stars, b.stars),
    done: [...new Set([...(a.done || []), ...(b.done || [])])],
    // econ 2: 별 계산을 바꾼 뒤부터 쓴 별만 셈 (예전 값과 섞지 않음)
    econ: Math.max(a.econ || 0, b.econ || 0),
    bought: Math.max(...[a, b].filter((x) => (x.econ || 0) === Math.max(a.econ || 0, b.econ || 0)).map((x) => x.bought || 0)),
    // 연승은 더 최근에 저장한 쪽, 이벤트 보상은 큰 쪽, 주간 이벤트는 최근 주
    ...((b.streakAt || 0) >= (a.streakAt || 0) ? { streak: b.streak || 0, streakAt: b.streakAt } : { streak: a.streak || 0, streakAt: a.streakAt }),
    bonus: Math.max(a.bonus || 0, b.bonus || 0),
    comp: Math.max(a.comp || 0, b.comp || 0),
    seen: [...new Set([...(a.seen || []), ...(b.seen || [])])],
    week: mergeWeek(a.week, b.week),
  }
}
export function mergeAllProgress(a = {}, b = {}) {
  return Object.fromEntries([...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])].map((k) => [k, mergeProgress(a?.[k], b?.[k])]))
}

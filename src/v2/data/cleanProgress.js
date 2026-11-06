// 대청소 진행도 합치기: 기기·서버 어느 쪽이 오래된 값이어도 뒤로 가지 않게 (깬 단계·별·꾸민 것은 큰 쪽/합집합)
const maxMap = (a = {}, b = {}) => Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map((k) => [k, Math.max(a[k] || 0, b[k] || 0)]))
export function mergeProgress(a, b) {
  if (!a) return b; if (!b) return a
  return {
    unlocked: Math.max(a.unlocked || 0, b.unlocked || 0),
    stars: maxMap(a.stars, b.stars), extra: maxMap(a.extra, b.extra),
    done: [...new Set([...(a.done || []), ...(b.done || [])])],
    bought: Math.max(a.bought || 0, b.bought || 0),
  }
}
export function mergeAllProgress(a = {}, b = {}) {
  return Object.fromEntries([...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])].map((k) => [k, mergeProgress(a?.[k], b?.[k])]))
}

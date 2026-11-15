// 튕김 기록: 화면이 보이는 채로 앱이 꺼지면(아이폰이 강제로 닫음) 다음에 열 때 '꺼짐'으로, JS 오류는 '오류'로 남김 (이 폰에만, 최근 20개)
const LOG = 'family-scheduler-crashlog', ALIVE = 'family-scheduler-alive', WHERE = 'family-scheduler-where'
const get = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const put = (k, v) => { try { localStorage.setItem(k, v) } catch { /* 저장 못 하면 기록만 빠짐 */ } }
export const readLog = () => { try { return JSON.parse(get(LOG) || '[]') } catch { return [] } }
const add = (kind, detail = '') => put(LOG, JSON.stringify([{ at: new Date().toISOString(), kind, where: get(WHERE) || '', detail: String(detail).slice(0, 160) }, ...readLog()].slice(0, 20)))
export const clearLog = () => put(LOG, '[]')
export const markWhere = (where) => put(WHERE, where)

export function startCrashLog() {
  if (get(ALIVE) === '1') add('꺼짐')
  put(ALIVE, '1')
  document.addEventListener('visibilitychange', () => put(ALIVE, document.visibilityState === 'visible' ? '1' : '0'))
  window.addEventListener('pagehide', () => put(ALIVE, '0'))
  window.addEventListener('error', (e) => add('오류', e.message))
  window.addEventListener('unhandledrejection', (e) => add('오류', e.reason?.message || e.reason))
}

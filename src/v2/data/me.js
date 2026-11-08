// 이 폰의 주인 (초대 링크·코드로 정해짐). 정해지면 게임에서 사람 고르기 없이 바로 그 사람으로.
const KEY = 'family-scheduler-me'
export const getMe = () => { try { return localStorage.getItem(KEY) || '' } catch { return '' } }
export const setMe = (id) => { try { if (id) localStorage.setItem(KEY, id); else localStorage.removeItem(KEY) } catch { /* 저장 못 하면 고르기 화면 그대로 */ } }
// 연결 링크 #connect=<로그인정보>&who=<구성원 id>
export const parseConnect = (text) => { const m = String(text).match(/#connect=([\w-]+)(?:&who=([\w-]+))?/); return m ? { code: m[1], who: m[2] || '' } : null }

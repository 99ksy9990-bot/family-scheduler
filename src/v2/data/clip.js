// 일정 복사·붙여넣기: 이 폰에만 잠깐 보관 (가족과 공유 안 함)
const KEY = 'family-scheduler-clip'
export const getClip = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
export const setClip = (event) => { try { localStorage.setItem(KEY, JSON.stringify(event)) } catch { /* 저장 못 하면 복사만 안 됨 */ } }

// 복사한 일정을 다른 날짜로: 새 일정이 되도록 id 빼고, 여러 날 일정은 길이 유지
export function pasteAt(clip, date) {
  const { id: _id, sourceTaskId: _s, ...rest } = clip
  const days = clip.endDate && clip.endDate > clip.date ? Math.round((new Date(clip.endDate) - new Date(clip.date)) / 864e5) : 0
  const end = new Date(`${date}T00:00:00`); end.setDate(end.getDate() + days)
  const endDate = days ? `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}` : (rest.endDate ? date : rest.endDate)
  return { ...rest, date, endDate }
}

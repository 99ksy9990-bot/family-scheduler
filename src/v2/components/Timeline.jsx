import { CalendarPlus, CalendarDays, BriefcaseBusiness, Cake, GraduationCap, Sun } from 'lucide-react'
import { assignedMemberIds } from '../../lib/legacyState'

export function DataState({ loading, error, onRetry, children }) {
  if (loading) return <p className="data-message" role="status">가족 일정을 불러오고 있어요…</p>
  if (error) return <div className="data-message error" role="alert"><p>{error}</p><button onClick={onRetry}>다시 시도</button></div>
  return children
}

export default function Timeline({ rows, profiles, onAdd, canEdit = true }) {
  if (!rows.length) return <div className="empty-state"><CalendarDays aria-hidden="true" /><div><h3>아직 일정이 없어요</h3><p>가족과 함께할 일정을 하나 남겨 보세요.</p></div>{canEdit && <button onClick={onAdd}><CalendarPlus size={18} /> 일정 추가</button>}</div>
  return <ol className="timeline" aria-label="시간순 일정">
    {rows.map((row) => {
      const Icon = row.type === 'shift' ? BriefcaseBusiness : row.anniversary ? Cake : row.holiday ? Sun : row.type === 'school' || row.type === 'child' ? GraduationCap : CalendarDays
      const names = assignedMemberIds(row).map((id) => profiles.find((p) => p.id === id)?.name || (id === 'family' ? '가족 모두' : '')).filter(Boolean)
      return <li key={row.id} className={`timeline-row ${row.holiday ? 'holiday-row' : ''}`}>
        <div className="timeline-time"><time>{row.displayStart || '종일'}</time>{row.displayEnd && <small>{row.crossesMidnight ? '다음 날 ' : ''}{row.displayEnd}</small>}</div>
        <div className="timeline-marker"><Icon size={19} aria-hidden="true" /></div>
        <div className="timeline-body"><h3>{row.title}</h3><p>{[names.join(' · '), row.location].filter(Boolean).join(' · ') || (row.anniversary ? '가족 기념일' : '함께 기억해요')}</p></div>
      </li>
    })}
  </ol>
}

import { BookOpen, BriefcaseBusiness, CalendarDays, Cake, Flag, GraduationCap, Heart } from 'lucide-react'

// 생일·기념일·공휴일 아이콘 (얼굴 자리와 같은 32px 동그라미)
const KINDS = { 생일: [Cake, 'birthday', '생일'], holiday: [Flag, 'holiday', '공휴일'], shift: [BriefcaseBusiness, 'shift', '근무'], 학교: [GraduationCap, 'school', '학교'], 학원: [BookOpen, 'academy', '학원'], event: [CalendarDays, 'event', '일정'] }
export default function DayIcon({ kind, size = 40 }) {
  const [Icon, tone, label] = KINDS[kind] || [Heart, 'anniversary', '기념일']
  return <span className="day-icon" data-tone={tone} role="img" aria-label={label} style={{ width: size, height: size }}><Icon size={Math.round(size * 0.55)} strokeWidth={2.2} /></span>
}


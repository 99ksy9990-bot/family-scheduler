// 일정 종류 그림 (얼굴 자리와 같은 동그라미 위에 손그림 아이콘)
const KINDS = { 생일: ['birthday', '생일'], holiday: ['holiday', '공휴일'], shift: ['shift', '근무'], 학교: ['school', '학교'], 학원: ['academy', '학원'], event: ['event', '일정'], bank: ['bank', '은행 근무'], hospital: ['hospital', '병원 근무'] }
export default function DayIcon({ kind, size = 40 }) {
  const [tone, label] = KINDS[kind] || ['anniversary', '기념일']
  return <span className="day-icon" data-tone={tone} role="img" aria-label={label} style={{ width: size, height: size }}><img src={`/icons/kind/${tone}.png`} alt="" width={Math.round(size * 0.66)} height={Math.round(size * 0.66)} /></span>
}

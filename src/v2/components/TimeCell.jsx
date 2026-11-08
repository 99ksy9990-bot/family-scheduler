import { ChevronsRight } from 'lucide-react'

export default function TimeCell({ row }) {
  const start = row.carryover ? `어제 ${row.startedAt || ''}`.trim() : row.displayStart || (row.anniversary || row.holiday || (row.endDate && row.endDate > row.date) ? '하루 종일' : '시간 없음')
  const end = row.carryover ? row.displayEnd : row.displayEnd ? `${row.crossesMidnight ? '내일 ' : ''}${row.displayEnd}` : ''
  return <time className={`time-cell${row.carryover ? ' is-carryover' : ''}`}><span className="time-start">{start}</span>{end && <><ChevronsRight className="time-arrow" size={12} aria-label="부터" /><span className="time-end">{end}</span></>}</time>
}

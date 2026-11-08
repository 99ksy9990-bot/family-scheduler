export default function TimeCell({ row }) {
  const start = row.carryover ? `~${row.displayEnd}` : row.displayStart || (row.task ? '시간 없음' : '하루 종일')
  const end = !row.carryover && row.displayEnd ? `${row.crossesMidnight ? '내일 ' : ''}${row.displayEnd}` : ''
  return <time className={`time-cell${row.carryover ? ' is-carryover' : ''}`}><span className="time-start">{start}</span>{end && <span className="time-end">{end}</span>}</time>
}

import { CircleDot } from 'lucide-react'

export default function ScheduleRow({
  className = '',
  memberColor,
  memberTone,
  leading,
  timelineTime,
  title,
  primaryMeta,
  time,
  meta,
  secondaryMeta,
  status,
  conflict = false,
  category,
  categoryClassName = '',
  categoryInline = false,
  trailing,
  onClick,
  ariaLabel,
  rowRef,
}) {
  const interactiveProps = onClick ? {
    role: 'button',
    tabIndex: 0,
    onClick,
    onKeyDown: (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onClick(event)
      }
    },
    'aria-label': ariaLabel || title,
  } : {}

  return (
    <article
      className={`schedule-row ${className}`.trim()}
      ref={rowRef}
      style={{ '--schedule-member': memberColor, '--schedule-tone': memberTone }}
      {...interactiveProps}
    >
      {timelineTime !== undefined && <time className="schedule-row-timeline-time">{timelineTime}</time>}
      {timelineTime !== undefined && <span className="schedule-row-timeline-point" aria-hidden="true"><CircleDot /></span>}
      {leading && <span className="schedule-row-leading">{leading}</span>}
      <span className="schedule-row-copy" title={[title, primaryMeta, time, secondaryMeta ?? meta].filter(Boolean).join(' · ')}>
        <span className="schedule-row-primary">
          <strong className="schedule-row-title home-event-title">{title}</strong>
          {status && <span className="schedule-row-status">{status}</span>}
          {category && categoryInline && <em className={`schedule-row-category ${categoryClassName}`.trim()}>{category}</em>}
          {primaryMeta && <><i aria-hidden="true">·</i><span className="schedule-row-location">{primaryMeta}</span></>}
        </span>
        {(time || secondaryMeta || meta) && <span className="schedule-row-secondary">
          {time && <span className="schedule-row-time event-time">{time}</span>}
          {(secondaryMeta ?? meta) && <>{time && <i aria-hidden="true">·</i>}<span className="schedule-row-repeat">{secondaryMeta ?? meta}</span></>}
        </span>}
      </span>
      {conflict && <i className="schedule-row-conflict-dot" aria-label="시간 겹침" />}
      {category && !categoryInline && <em className={`schedule-row-category ${categoryClassName}`.trim()}>{category}</em>}
      {trailing && <span className="schedule-row-trailing">{trailing}</span>}
    </article>
  )
}

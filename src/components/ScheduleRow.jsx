export default function ScheduleRow({
  className = '',
  memberColor,
  memberTone,
  leading,
  title,
  primaryMeta,
  time,
  meta,
  secondaryMeta,
  category,
  categoryClassName = '',
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
      {leading && <span className="schedule-row-leading">{leading}</span>}
      <span className="schedule-row-copy" title={[title, primaryMeta, time, secondaryMeta ?? meta].filter(Boolean).join(' · ')}>
        <span className="schedule-row-primary">
          <strong className="schedule-row-title home-event-title">{title}</strong>
          {primaryMeta && <><i aria-hidden="true">·</i><span className="schedule-row-location">{primaryMeta}</span></>}
        </span>
        {(time || secondaryMeta || meta) && <span className="schedule-row-secondary">
          {time && <span className="schedule-row-time event-time">{time}</span>}
          {(secondaryMeta ?? meta) && <>{time && <i aria-hidden="true">·</i>}<span className="schedule-row-repeat">{secondaryMeta ?? meta}</span></>}
        </span>}
      </span>
      {category && <em className={`schedule-row-category ${categoryClassName}`.trim()}>{category}</em>}
      {trailing && <span className="schedule-row-trailing">{trailing}</span>}
    </article>
  )
}

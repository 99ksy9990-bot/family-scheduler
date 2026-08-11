export default function ScheduleRow({
  className = '',
  memberColor,
  memberTone,
  leading,
  title,
  time,
  meta,
  category,
  categoryClassName = '',
  trailing,
  onClick,
  ariaLabel,
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
      style={{ '--schedule-member': memberColor, '--schedule-tone': memberTone }}
      {...interactiveProps}
    >
      {leading && <span className="schedule-row-leading">{leading}</span>}
      <span className="schedule-row-copy" title={[title, time, meta].filter(Boolean).join(' · ')}>
        <strong className="schedule-row-title home-event-title">{title}</strong>
        {time && <><i className="schedule-row-separator home-event-separator" aria-hidden="true">·</i><span className="schedule-row-time event-time">{time}</span></>}
        {meta && <><i aria-hidden="true">·</i><span>{meta}</span></>}
      </span>
      {category && <em className={`schedule-row-category ${categoryClassName}`.trim()}>{category}</em>}
      {trailing && <span className="schedule-row-trailing">{trailing}</span>}
    </article>
  )
}

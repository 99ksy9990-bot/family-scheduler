export function GroupedList({ children, label, className = '' }) {
  return <ul className={`grouped-list ${className}`} aria-label={label}>{children}</ul>
}

export function GroupedRow({ icon, title, subtitle, value, onClick, className = '', children }) {
  const content = <>{icon && <span className="grouped-icon">{icon}</span>}<span className="grouped-body">{typeof title === 'string' ? <strong>{title}</strong> : title}{subtitle && <small>{subtitle}</small>}</span>{value && <span className="grouped-value">{value}</span>}{children}</>
  return <li className={`grouped-row ${className}`}>{onClick ? <button className="grouped-action" onClick={onClick}>{content}</button> : content}</li>
}

import { X } from 'lucide-react'
import { useModalAccessibility } from '../../hooks/useModalAccessibility'

export default function Sheet({ title, onClose, children }) {
  const ref = useModalAccessibility(true, onClose)
  return <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="sheet" ref={ref} role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabIndex={-1}>
      <header className="sheet-heading"><h2 id="sheet-title">{title}</h2><button className="icon-button" aria-label="닫기" onClick={onClose}><X /></button></header>
      {children}
    </section>
  </div>
}

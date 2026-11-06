import { X } from 'lucide-react'
import { useModalAccessibility } from '../../hooks/useModalAccessibility'

export default function Sheet({ title, onClose, children, className = '', handle = false, submitForm }) {
  const ref = useModalAccessibility(true, onClose)
  return <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className={`sheet ${className}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby="sheet-title" tabIndex={-1}>
      {handle && <div className="sheet-grab" aria-hidden="true" />}
      <header className={`sheet-heading${submitForm ? ' sheet-toolbar' : ''}`}>{submitForm && <button type="button" onClick={onClose}>취소</button>}<h2 id="sheet-title">{title}</h2>{submitForm ? <button type="submit" form={submitForm}>추가</button> : <button className="icon-button" aria-label="닫기" onClick={onClose}><X /></button>}</header>
      {children}
    </section>
  </div>
}

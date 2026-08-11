import { Check, Pencil, Trash2, X } from 'lucide-react'
import { useAppDialog } from '../hooks/useAppDialog'
import { useModalAccessibility } from '../hooks/useModalAccessibility'

export default function ScheduleActionSheet({ open, title, onClose, onEdit, onDelete, onComplete, completed = false, returnFocusRef, confirmDelete = true }) {
  const { confirm } = useAppDialog()
  const dialogRef = useModalAccessibility(open, onClose, returnFocusRef)
  if (!open) return null

  const run = (action) => {
    onClose()
    action?.()
  }
  const remove = async () => {
    if (confirmDelete && !await confirm(`‘${title}’을 삭제할까요?`)) return
    run(onDelete)
  }

  return <div className="schedule-sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} tabIndex="-1" className="schedule-action-sheet" role="dialog" aria-modal="true" aria-label={`${title} 작업`}>
      <header><strong title={title}>{title}</strong><button className="icon-button" onClick={onClose} aria-label="작업 메뉴 닫기"><X /></button></header>
      <div className="schedule-sheet-actions">
        {onComplete && <button onClick={() => run(onComplete)}><Check />{completed ? '완료 취소' : '완료'}</button>}
        {onEdit && <button onClick={() => run(onEdit)}><Pencil />수정</button>}
        {onDelete && <button className="delete" onClick={remove}><Trash2 />삭제</button>}
      </div>
    </section>
  </div>
}

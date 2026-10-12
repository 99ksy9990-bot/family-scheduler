import { useCallback, useMemo, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import AppDialogContext from '../contexts/AppDialogContext'
import { useModalAccessibility } from '../hooks/useModalAccessibility'

export default function AppDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null)
  const resolverRef = useRef(null)

  const finish = useCallback((result) => {
    const resolve = resolverRef.current
    resolverRef.current = null
    setDialog(null)
    resolve?.(result)
  }, [])

  const request = useCallback((message, mode) => new Promise((resolve) => {
    resolverRef.current?.(false)
    resolverRef.current = resolve
    setDialog({ message, mode })
  }), [])

  const confirm = useCallback((message) => request(message, 'confirm'), [request])
  const alert = useCallback((message) => request(message, 'alert'), [request])
  const dialogRef = useModalAccessibility(Boolean(dialog), () => finish(false))
  const value = useMemo(() => ({ confirm, alert }), [alert, confirm])

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      {dialog && <div className="modal-backdrop app-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && finish(false)}>
        <section ref={dialogRef} tabIndex="-1" className="modal app-dialog" role="dialog" aria-modal="true" aria-labelledby="app-dialog-title" aria-describedby="app-dialog-message">
          <AlertTriangle aria-hidden="true" />
          <h2 id="app-dialog-title">{dialog.mode === 'confirm' ? '확인해 주세요' : '알려드려요'}</h2>
          <p id="app-dialog-message">{dialog.message}</p>
          <div className="modal-actions">
            {dialog.mode === 'confirm' && <button type="button" className="secondary-button" onClick={() => finish(false)}>취소</button>}
            <button type="button" className="primary-button" data-autofocus onClick={() => finish(true)}>확인</button>
          </div>
        </section>
      </div>}
    </AppDialogContext.Provider>
  )
}

import { useContext } from 'react'
import AppDialogContext from '../contexts/AppDialogContext'

export function useAppDialog() {
  const value = useContext(AppDialogContext)
  if (!value) throw new Error('useAppDialog must be used inside AppDialogProvider')
  return value
}

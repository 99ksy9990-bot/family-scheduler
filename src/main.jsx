import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import AppDialogProvider from './components/AppDialogProvider.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './styles.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      const notifyUpdate = (worker) => window.dispatchEvent(new CustomEvent('family-scheduler:update-ready', { detail: { worker } }))
      if (registration.waiting && navigator.serviceWorker.controller) notifyUpdate(registration.waiting)
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) notifyUpdate(worker)
        })
      })
    } catch (error) {
      console.error('Service worker registration failed', error)
    }
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AppDialogProvider>
        <App />
      </AppDialogProvider>
    </ErrorBoundary>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ErrorBoundary from '../components/ErrorBoundary'
import App from './App'
import './styles/tokens.css'
import './styles/base.css'
import './styles/app.css'
import './styles/ui-3b.css'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => console.error('Service worker registration failed', error))
  })
}

createRoot(document.getElementById('root')).render(<StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>)

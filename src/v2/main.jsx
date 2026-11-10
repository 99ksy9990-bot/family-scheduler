import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ErrorBoundary from '../components/ErrorBoundary'
import App from './App'
import './styles/tokens.css'
import './styles/base.css'
import './styles/app.css'
import './styles/forms.css'
import './styles/apple.css'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // 홈 화면 앱은 다시 켜도 새로고침이 안 되므로, 돌아올 때마다 새 버전 확인
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}) })
    }).catch((error) => console.error('Service worker registration failed', error))
  })
  let reloaded = false
  if (navigator.serviceWorker.controller) navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload() } })
}

createRoot(document.getElementById('root')).render(<StrictMode><ErrorBoundary appName="우리집"><App /></ErrorBoundary></StrictMode>)

import './styles/tabs.css'

import './styles/person.css'

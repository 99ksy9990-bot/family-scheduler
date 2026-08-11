import { useEffect, useState } from 'react'
import { startOfToday } from '../lib/dates'

const millisecondsUntilTomorrow = () => {
  const now = new Date()
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return Math.max(1000, tomorrow.getTime() - now.getTime() + 250)
}

export function useToday() {
  const [today, setToday] = useState(startOfToday)

  useEffect(() => {
    let timer
    const refresh = () => {
      setToday((current) => {
        const next = startOfToday()
        return current.getTime() === next.getTime() ? current : next
      })
      window.clearTimeout(timer)
      timer = window.setTimeout(refresh, millisecondsUntilTomorrow())
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    timer = window.setTimeout(refresh, millisecondsUntilTomorrow())
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [])

  return today
}

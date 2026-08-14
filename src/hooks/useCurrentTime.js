import { useEffect, useState } from 'react'

const millisecondsUntilNextMinute = () => {
  const now = new Date()
  return Math.max(1000, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50)
}

export function useCurrentTime() {
  const [currentTime, setCurrentTime] = useState(() => new Date())

  useEffect(() => {
    let timer
    const refresh = () => {
      setCurrentTime(new Date())
      window.clearTimeout(timer)
      timer = window.setTimeout(refresh, millisecondsUntilNextMinute())
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    timer = window.setTimeout(refresh, millisecondsUntilNextMinute())
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [])

  return currentTime
}

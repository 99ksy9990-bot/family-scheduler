import { useEffect } from 'react'

export function usePersistedValue(key, value, delay = 250) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        console.error(`Failed to persist ${key}`, error)
      }
    }, delay)
    return () => window.clearTimeout(timer)
  }, [delay, key, value])
}

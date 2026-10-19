import { useEffect, useRef, useState } from 'react'

/**
 * Sigue a `value` pero cambia como mucho una vez cada `intervalMs`. Si `value`
 * cambia antes, el último valor se aplica al terminar el intervalo, así nunca
 * queda desactualizado.
 */
export function useThrottledValue<T>(value: T, intervalMs: number): T {
  const [throttled, setThrottled] = useState(value)
  const lastAppliedAt = useRef(0)

  useEffect(() => {
    const wait = lastAppliedAt.current + intervalMs - Date.now()
    const apply = () => {
      lastAppliedAt.current = Date.now()
      setThrottled(value)
    }
    if (wait <= 0) {
      apply()
      return
    }
    const timeoutId = window.setTimeout(apply, wait)
    return () => window.clearTimeout(timeoutId)
  }, [value, intervalMs])

  return throttled
}

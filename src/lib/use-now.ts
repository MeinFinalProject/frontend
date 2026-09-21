import { useEffect, useState } from 'react'
// Refresh time-gated controls even when the server data itself is unchanged.
export function useNow() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

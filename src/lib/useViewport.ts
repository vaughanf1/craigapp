import { useEffect, useState } from 'react'

/**
 * Is the viewport phone-shaped (tall and narrow)? Portrait coach clips can
 * fill a phone screen edge to edge, but on a wide window we letterbox
 * instead of cropping faces.
 */
export function usePhonePortrait(): boolean {
  const check = () => typeof window !== 'undefined' && window.innerWidth / window.innerHeight <= 0.62
  const [phone, setPhone] = useState(check)
  useEffect(() => {
    const onResize = () => setPhone(check())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return phone
}

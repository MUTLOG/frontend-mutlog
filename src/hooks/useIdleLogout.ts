import { useEffect, useRef } from 'react'

/** Déconnexion automatique après une période d'inactivité (CDC §22 : protection contre les accès non autorisés). */
export function useIdleLogout(minutes: number, onIdle: () => void) {
  // La fonction change à chaque rendu : on la garde dans une référence pour ne pas relancer le minuteur à chaque fois.
  const latest = useRef(onIdle)
  latest.current = onIdle
  useEffect(() => {
    const idle = () => latest.current()
    let t = window.setTimeout(idle, minutes * 60_000)
    const reset = () => { window.clearTimeout(t); t = window.setTimeout(idle, minutes * 60_000) }
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'] as const
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    return () => { window.clearTimeout(t); events.forEach((e) => window.removeEventListener(e, reset)) }
  }, [minutes])
}

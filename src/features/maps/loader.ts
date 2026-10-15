/** Chargement unique de l'API Google Maps JavaScript. */
let promise: Promise<void> | null = null
export const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

export function mapsConfigured(): boolean {
  return Boolean(MAPS_KEY)
}

export function loadGoogleMaps(): Promise<void> {
  if (!MAPS_KEY) return Promise.reject(new Error('no-key'))
  if (typeof google !== 'undefined' && google.maps) return Promise.resolve()
  if (promise) return promise
  promise = new Promise<void>((resolve, reject) => {
    ;(window as unknown as Record<string, unknown>).gm_authFailure = () => reject(new Error('auth'))
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_KEY)}&language=fr&region=BJ&loading=async`
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('network'))
    document.head.appendChild(s)
  }).catch((e) => {
    promise = null
    throw e
  })
  return promise
}

export interface City { name: string; lat: number; lng: number; dept: string }

/** Principales localités du Bénin (coordonnées approximatives — à affiner via Google Geocoding/Places). */
export const CITIES: City[] = [
  { name: 'Cotonou', lat: 6.3703, lng: 2.3912, dept: 'Littoral' },
  { name: 'Abomey-Calavi', lat: 6.4485, lng: 2.3556, dept: 'Atlantique' },
  { name: 'Ouidah', lat: 6.363, lng: 2.085, dept: 'Atlantique' },
  { name: 'Allada', lat: 6.665, lng: 2.1514, dept: 'Atlantique' },
  { name: 'Porto-Novo', lat: 6.4969, lng: 2.6289, dept: 'Ouémé' },
  { name: 'Sèmè-Podji', lat: 6.3833, lng: 2.6167, dept: 'Ouémé' },
  { name: 'Sakété', lat: 6.7333, lng: 2.6586, dept: 'Plateau' },
  { name: 'Pobè', lat: 6.9833, lng: 2.6667, dept: 'Plateau' },
  { name: 'Kétou', lat: 7.3631, lng: 2.6, dept: 'Plateau' },
  { name: 'Lokossa', lat: 6.6386, lng: 1.7167, dept: 'Mono' },
  { name: 'Grand-Popo', lat: 6.282, lng: 1.823, dept: 'Mono' },
  { name: 'Comè', lat: 6.4044, lng: 1.883, dept: 'Mono' },
  { name: 'Dogbo', lat: 6.7919, lng: 1.7814, dept: 'Couffo' },
  { name: 'Aplahoué', lat: 6.9333, lng: 1.6833, dept: 'Couffo' },
  { name: 'Bohicon', lat: 7.1783, lng: 2.0667, dept: 'Zou' },
  { name: 'Abomey', lat: 7.1829, lng: 1.9912, dept: 'Zou' },
  { name: 'Dassa-Zoumè', lat: 7.75, lng: 2.1833, dept: 'Collines' },
  { name: 'Savalou', lat: 7.9281, lng: 1.9758, dept: 'Collines' },
  { name: 'Savè', lat: 8.0333, lng: 2.4833, dept: 'Collines' },
  { name: 'Parakou', lat: 9.3372, lng: 2.6303, dept: 'Borgou' },
  { name: 'Tchaourou', lat: 8.8833, lng: 2.6, dept: 'Borgou' },
  { name: 'Nikki', lat: 9.9333, lng: 3.2167, dept: 'Borgou' },
  { name: 'Djougou', lat: 9.7085, lng: 1.666, dept: 'Donga' },
  { name: 'Natitingou', lat: 10.3042, lng: 1.3796, dept: 'Atacora' },
  { name: 'Tanguiéta', lat: 10.6167, lng: 1.2667, dept: 'Atacora' },
  { name: 'Kandi', lat: 11.1342, lng: 2.9386, dept: 'Alibori' },
  { name: 'Banikoara', lat: 11.3, lng: 2.4333, dept: 'Alibori' },
  { name: 'Malanville', lat: 11.8683, lng: 3.3856, dept: 'Alibori' },
]

export function norm(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export function findCity(name: string): City | undefined {
  const n = norm(name)
  return CITIES.find((c) => norm(c.name) === n)
}

/** Distance à vol d'oiseau en km (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Distance entre deux villes connues ; `null` si l'une est inconnue. */
export function cityDistanceKm(a: string, b: string): number | null {
  const ca = findCity(a)
  const cb = findCity(b)
  return ca && cb ? distanceKm(ca, cb) : null
}

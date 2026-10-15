import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { distanceKm, findCity } from '@/domain/geo'
import { loadGoogleMaps, mapsConfigured } from './loader'

export interface MapPoint { lat: number; lng: number; label: string }
export interface RouteInfo { km: number; minutes?: number; approximate: boolean }

interface Props {
  from: string
  to: string
  /** Positions enregistrées pendant le transport (traçabilité). */
  trace?: MapPoint[]
  height?: number
  onRoute?: (info: RouteInfo) => void
  simulate?: boolean
}

/** Itinéraire sur Google Maps (Directions) ; schéma de secours si la clé est absente ou refusée. */
export default function RouteMap({ from, to, trace = [], height = 320, onRoute, simulate = false }: Props) {
  const a = findCity(from)
  const b = findCity(to)
  const ref = useRef<HTMLDivElement>(null)
  const [fallback, setFallback] = useState(!mapsConfigured())
  const [simStep, setSimStep] = useState(0)
  useEffect(() => { if (!simulate) return; const id = window.setInterval(() => setSimStep(v => (v + 1) % 101), 700); return () => window.clearInterval(id) }, [simulate])
  const traceKey = JSON.stringify(trace)
  const onRouteRef = useRef(onRoute)
  onRouteRef.current = onRoute

  useEffect(() => {
    if (!a || !b || !mapsConfigured()) return
    let cancelled = false
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !ref.current) return
        const map = new google.maps.Map(ref.current, {
          center: { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 }, zoom: 7, mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
        })
        const bounds = new google.maps.LatLngBounds()
        const drawStraight = () => {
          new google.maps.Polyline({ map, path: [a, b], geodesic: true, strokeColor: '#FF7A00', strokeWeight: 4 })
          bounds.extend(a); bounds.extend(b); map.fitBounds(bounds, 40)
          onRouteRef.current?.({ km: Math.round(distanceKm(a, b) * 1.25), approximate: true })
        }
        new google.maps.DirectionsService().route(
          { origin: a, destination: b, travelMode: google.maps.TravelMode.DRIVING, region: 'BJ' },
          (res, status) => {
            if (cancelled) return
            if (status === 'OK' && res) {
              new google.maps.DirectionsRenderer({ map, directions: res, suppressMarkers: false, polylineOptions: { strokeColor: '#FF7A00', strokeWeight: 5 } })
              const leg = res.routes[0]?.legs[0]
              if (leg) onRouteRef.current?.({ km: Math.round((leg.distance?.value ?? 0) / 1000), minutes: Math.round((leg.duration?.value ?? 0) / 60), approximate: false })
            } else drawStraight() // Directions API non activée, quota ou aucun itinéraire
          },
        )
        const info = new google.maps.InfoWindow()
        trace.forEach((p, i) => {
          const last = i === trace.length - 1
          const m = new google.maps.Marker({
            map, position: p, title: p.label,
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: last ? 9 : 6, fillColor: last ? '#0B2A4A' : '#123E68', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
          })
          m.addListener('click', () => { info.setContent(p.label); info.open(map, m) })
        })
      })
      .catch(() => !cancelled && setFallback(true))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, traceKey])

  if (!a || !b) {
    return <div className="flex items-center justify-center rounded-card border border-line bg-primary-soft text-sm text-muted" style={{ height }}>Itinéraire indisponible : localité inconnue.</div>
  }
  if (fallback) return <SchematicMap a={a} b={b} aName={from} bName={to} trace={trace} height={height} onRoute={onRoute} />
  return <div className="relative"><div ref={ref} className="w-full overflow-hidden rounded-card border border-line" style={{ height }} role="img" aria-label={`Carte de l'itinéraire ${from} vers ${to}`} />{simulate && <><div aria-hidden="true" className="pointer-events-none absolute z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary text-lg shadow-lg" style={{left:`calc(8% + ${simStep * .84}%)`,top:`calc(12% + ${Math.sin(simStep/100*Math.PI*2)*18 + 18}%)`,transition:'left 650ms linear, top 650ms linear'}}>🚚</div><div className="absolute bottom-3 left-3 rounded-md border border-line bg-white/95 px-3 py-2 text-xs font-semibold text-ink shadow-sm">Simulation visuelle — position non réelle</div></>}</div>
}

function SchematicMap({ a, b, aName, bName, trace, height, onRoute }: { a: { lat: number; lng: number }; b: { lat: number; lng: number }; aName: string; bName: string; trace: MapPoint[]; height: number; onRoute?: (i: RouteInfo) => void }) {
  const W = 600, H = 300, pad = 60
  const pts = [a, b, ...trace]
  const proj = useMemo(() => {
    const lats = pts.map((p) => p.lat), lngs = pts.map((p) => p.lng)
    const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
    const sx = (W - 2 * pad) / Math.max(maxLng - minLng, 0.2), sy = (H - 2 * pad) / Math.max(maxLat - minLat, 0.2)
    const s = Math.min(sx, sy)
    const cx = (minLng + maxLng) / 2, cy = (minLat + maxLat) / 2
    return (p: { lat: number; lng: number }) => ({ x: W / 2 + (p.lng - cx) * s, y: H / 2 - (p.lat - cy) * s })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.lat, a.lng, b.lat, b.lng, trace.length])
  const A = proj(a), B = proj(b)
  const km = Math.round(distanceKm(a, b) * 1.25)
  useEffect(() => { onRoute?.({ km, approximate: true }) }, [km]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="relative overflow-hidden rounded-card border border-line bg-gradient-to-br from-primary-soft to-white" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label={`Schéma de l'itinéraire ${aName} vers ${bName}`} preserveAspectRatio="xMidYMid meet">
        <path d={`M${A.x},${A.y} L${B.x},${B.y}`} stroke="#FF7A00" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 9" fill="none" />
        {trace.map((p, i) => { const q = proj(p); const last = i === trace.length - 1; return <circle key={i} cx={q.x} cy={q.y} r={last ? 9 : 6} fill={last ? '#0B2A4A' : '#123E68'} stroke="#fff" strokeWidth="2"><title>{p.label}</title></circle> })}
        <circle cx={A.x} cy={A.y} r="9" fill="#fff" stroke="#0B2A4A" strokeWidth="4" />
        <circle cx={B.x} cy={B.y} r="9" fill="#FF7A00" stroke="#fff" strokeWidth="3" />
        <text x={A.x} y={A.y - 16} textAnchor="middle" fontSize="15" fontWeight="600" fill="#102033">{aName}</text>
        <text x={B.x} y={B.y - 16} textAnchor="middle" fontSize="15" fontWeight="600" fill="#102033">{bName}</text>
      </svg>
      <p className="absolute bottom-2 left-3 right-3 flex items-center gap-1.5 text-xs text-muted">
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Schéma indicatif (≈ {km} km). Ajoutez la clé Google Maps pour afficher la carte et l'itinéraire routier.
      </p>
    </div>
  )
}

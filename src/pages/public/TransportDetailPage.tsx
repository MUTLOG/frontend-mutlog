import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Package, Scale, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import RouteMap, { type RouteInfo } from '@/features/maps/RouteMap'
import { useAuth } from '@/features/auth/useAuth'
import { Stars, fmtDate, fmtT, GOODS_LABEL, Notice, offerPriceLabel, useFlash } from '@/components/shared/ui-bits'
import { EMPTY_PUBLIC_SETTINGS, publicApi, type RemoteOffer } from '@/services/mutlogApi'
import { useResource } from '@/hooks/useResource'
import type { GoodsType } from '@/domain/types'

export default function TransportDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const base = useLocation().pathname.startsWith('/client') ? '/client' : ''
  const flash = useFlash()
  const [info, setInfo] = useState<RouteInfo | null>(null)
  const offer = useResource(() => publicApi.offer(id!), null as RemoteOffer | null, [id])
  const settings = useResource(() => publicApi.settings(), EMPTY_PUBLIC_SETTINGS)

  const o = offer.data
  if (!offer.loaded) return <div className="mx-auto max-w-[1200px] px-4 py-16 text-center" role="status">Chargement du transport…</div>
  if (!o) return (
    <div className="mx-auto max-w-[1200px] px-4 py-16 text-center">
      <p className="text-lg font-semibold">{offer.errorStatus && offer.errorStatus !== 404 ? offer.error : 'Transport introuvable.'}</p>
      <Button asChild className="mt-4"><Link to={`${base}/rechercher`}>Retour aux résultats</Link></Button>
    </div>
  )

  const carrier = o.transporter
  const carrierName = carrier?.displayName || [carrier?.firstName, carrier?.lastName].filter(Boolean).join(' ') || 'Transporteur MUTLOG'
  const rating = carrier?.rating
  const price = offerPriceLabel(o)
  const bearer = settings.data.commissionBearer === 'transporteur' ? 'est prélevée sur le montant versé au transporteur' : 'est ajoutée à la part de chaque client'
  const here = `${base}/transports/${o.id}`

  // Le client publie (ou retrouve) sa demande pour ce trajet : la page de la demande propose ensuite de réserver ce transport.
  const book = () => {
    if (!user) return navigate('/connexion', { state: { from: here } })
    if (user.role !== 'client') return flash.err('Seuls les comptes clients peuvent réserver un transport.')
    navigate(`/client/demandes/nouvelle?from=${encodeURIComponent(o.from)}&to=${encodeURIComponent(o.to)}&date=${o.date}`)
  }
  const contact = () => {
    if (!user || !carrier) return navigate('/connexion', { state: { from: here } })
    navigate(`/${user.role}/messages?avec=${carrier.id}&offre=${o.id}`, { state: { name: carrierName } })
  }

  return (
    <div className={`mx-auto max-w-[1200px] ${base ? '' : 'px-4 py-6 sm:px-6'}`}>
      <Link to={`${base}/rechercher`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-2 hover:underline"><ArrowLeft className="h-4 w-4" /> Retour aux résultats</Link>
      {flash.node && <div className="mb-4">{flash.node}</div>}
      {offer.error && <Notice tone="danger">{offer.error}</Notice>}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3">
          <RouteMap from={o.from} to={o.to} height={380} onRoute={setInfo} simulate />
          {info && <p className="text-sm text-muted">Distance {info.approximate ? 'estimée' : 'par la route'} : <strong className="text-ink">{info.km} km</strong>{info.minutes ? <> · durée environ <strong className="text-ink">{Math.floor(info.minutes / 60)} h {String(info.minutes % 60).padStart(2, '0')}</strong></> : null}</p>}
        </div>
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-ink">{o.from} → {o.to}</h1>
              <Badge tone="success">Disponible</Badge>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info2 icon={CalendarDays} label="Date de départ" value={fmtDate(o.date)} />
              <Info2 icon={Package} label="Type de marchandises" value={o.goodsAccepted.map((g) => GOODS_LABEL[g as GoodsType] ?? g).join(', ')} />
              <Info2 icon={Scale} label="Poids total" value={fmtT(o.totalCapacityT)} />
              <Info2 icon={Scale} label="Disponible" value={fmtT(o.availableT)} />
            </div>
            <div className="mt-5 rounded-control bg-info-soft p-4">
              <p className="text-2xl font-bold text-primary">{price.amount}</p>
              <p className="text-sm text-muted">{price.unit}</p>
            </div>
            <Button size="lg" className="mt-4 w-full" onClick={book}>Réserver ce transport</Button>
            <p className="mt-3 flex gap-2 text-xs text-muted"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> La réservation est une demande : le regroupement est validé par MUTLOG, puis confirmé par le transporteur. La commission MUTLOG{settings.data.commissionPct > 0 ? ` (${settings.data.commissionPct} %)` : ''} {bearer}.</p>
            {o.notes && <p className="mt-3 text-sm text-ink">{o.notes}</p>}
          </Card>
          <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-ink">{carrierName}</p>
              <p className="mt-0.5 flex items-center gap-2 text-sm text-muted">{rating ? <><Stars value={rating.avg} size={14} /> {rating.avg.toFixed(1)} ({rating.count} avis)</> : 'Pas encore d\'avis'} {carrier?.verified && <Badge tone="success">Vérifié</Badge>}</p>
            </div>
            <Button variant="outline" onClick={contact}>Contacter le transporteur</Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Info2({ icon: Icon, label, value }: { icon: typeof Info; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon className="h-4 w-4" aria-hidden="true" /></span>
      <dl><dt className="text-xs text-muted">{label}</dt><dd className="text-sm font-semibold text-ink">{value}</dd></dl>
    </div>
  )
}

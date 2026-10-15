import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Package, Scale, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import RouteMap, { type RouteInfo } from '@/features/maps/RouteMap'
import { useAuth } from '@/features/auth/useAuth'
import { Stars, fmtDate, fmtT, GOODS_LABEL, Modal, Notice, offerPriceLabel, useFlash } from '@/components/shared/ui-bits'
import { scoreMatch } from '@/domain/matching'
import { avgRating, userName } from '@/store/logic'
import * as L from '@/store/logic'
import { run } from '@/store/store'
import { apiEnabled } from '@/services/api'
import { publicApi, type RemoteOffer } from '@/services/mutlogApi'
import type { GoodsType, Offer } from '@/domain/types'

export default function TransportDetailPage() {
  const { id } = useParams()
  const { db, user } = useAuth()
  const navigate = useNavigate()
  const base = useLocation().pathname.startsWith('/client') ? '/client' : ''
  const flash = useFlash()
  const [open, setOpen] = useState(false)
  const [info, setInfo] = useState<RouteInfo | null>(null)
  const [choice, setChoice] = useState('')
  const [remoteOffer, setRemoteOffer] = useState<Offer | null>(null)
  const [remoteCarrierName, setRemoteCarrierName] = useState('Transporteur MUTLOG')
  const [loadingRemote, setLoadingRemote] = useState(apiEnabled)
  const [remoteError, setRemoteError] = useState('')
  useEffect(() => {
    if (!apiEnabled || !id) return
    let cancelled = false
    publicApi.offer(id).then((offer: RemoteOffer) => {
      if (cancelled) return
      setRemoteOffer({ id: String(offer.id), transporterId: String(offer.transporter?.id ?? ''), vehicleId: '', from: offer.from, to: offer.to, date: offer.date, totalCapacityT: Number(offer.totalCapacityT), availableT: Number(offer.availableT), goodsAccepted: (offer.goodsAccepted ?? []) as GoodsType[], pricingMode: offer.pricingMode, price: Number(offer.price), notes: offer.notes, status: (offer.status === 'ouverte' ? 'ouverte' : offer.status === 'complete' ? 'complete' : 'terminee') as Offer['status'], createdAt: '' })
      setRemoteCarrierName(offer.transporter?.displayName || [offer.transporter?.firstName, offer.transporter?.lastName].filter(Boolean).join(' ') || 'Transporteur MUTLOG')
      setRemoteError('')
    }).catch((error: unknown) => { if (!cancelled) setRemoteError(error instanceof Error ? error.message : 'Chargement du transport impossible.') }).finally(() => { if (!cancelled) setLoadingRemote(false) })
    return () => { cancelled = true }
  }, [id])

  const o = apiEnabled ? remoteOffer : db.offers.find((x) => x.id === id)
  if (loadingRemote) return <div className="mx-auto max-w-[1200px] px-4 py-16 text-center">Chargement du transport…</div>
  if (!o) return <div className="mx-auto max-w-[1200px] px-4 py-16 text-center"><p className="text-lg font-semibold">Transport introuvable.</p><Button asChild className="mt-4"><Link to={`${base}/rechercher`}>Retour aux résultats</Link></Button></div>

  const t = db.users.find((u) => u.id === o.transporterId)
  const rating = avgRating(db, o.transporterId)
  const price = offerPriceLabel(o)
  const mine = !apiEnabled && user?.role === 'client'
    ? db.requests.filter((r) => r.clientId === user.id && r.status === 'recherche' && scoreMatch(r, o, db.settings).compatible)
    : []
  const bearer = db.settings.commissionBearer === 'transporteur' ? 'est prélevée sur le montant versé au transporteur' : 'est ajoutée à la part de chaque client'

  const book = () => {
    if (!user) return navigate('/connexion', { state: { from: `${base}/transports/${o.id}` } })
    if (user.role !== 'client') return flash.err('Seuls les comptes clients peuvent réserver un transport.')
    if (apiEnabled) return navigate(`/client/demandes/nouvelle?from=${encodeURIComponent(o.from)}&to=${encodeURIComponent(o.to)}&date=${o.date}`)
    if (!mine.length) return navigate(`/client/demandes/nouvelle?from=${encodeURIComponent(o.from)}&to=${encodeURIComponent(o.to)}&date=${o.date}&offre=${o.id}`)
    setChoice(mine[0].id)
    setOpen(true)
  }
  const confirm = () => {
    const res = run((d) => L.reserve(d, user!.id, choice, o.id))
    if (res.ok) { setOpen(false); flash.ok('Réservation envoyée. Elle est en attente : MUTLOG regroupe les demandes compatibles, puis le transporteur confirme.') }
    else flash.err(res.error)
  }

  return (
    <div className={`mx-auto max-w-[1200px] ${base ? '' : 'px-4 py-6 sm:px-6'}`}>
      <Link to={`${base}/rechercher`} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-2 hover:underline"><ArrowLeft className="h-4 w-4" /> Retour aux résultats</Link>
      {flash.node && <div className="mb-4">{flash.node}</div>}
      {remoteError && <Notice tone="danger">{remoteError}</Notice>}
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
              <Info2 icon={Package} label="Type de marchandises" value={o.goodsAccepted.map((g) => GOODS_LABEL[g]).join(', ')} />
              <Info2 icon={Scale} label="Poids total" value={fmtT(o.totalCapacityT)} />
              <Info2 icon={Scale} label="Disponible" value={fmtT(o.availableT)} />
            </div>
            <div className="mt-5 rounded-control bg-info-soft p-4">
              <p className="text-2xl font-bold text-primary">{price.amount}</p>
              <p className="text-sm text-muted">{price.unit}</p>
            </div>
            <Button size="lg" className="mt-4 w-full" onClick={book}>Réserver ce transport</Button>
            <p className="mt-3 flex gap-2 text-xs text-muted"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> La réservation est une demande : le regroupement est validé par MUTLOG, puis confirmé par le transporteur. La commission MUTLOG ({db.settings.commissionPct} %) {bearer}.</p>
            {o.notes && <p className="mt-3 text-sm text-ink">{o.notes}</p>}
          </Card>
          <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-ink">{apiEnabled ? remoteCarrierName : userName(t)}</p>
              <p className="mt-0.5 flex items-center gap-2 text-sm text-muted">{rating ? <><Stars value={rating.avg} size={14} /> {rating.avg.toFixed(1)} ({rating.count} avis)</> : 'Pas encore d\'avis'} {t?.status === 'actif' && <Badge tone="success">Vérifié</Badge>}</p>
            </div>
            <Button variant="outline" onClick={() => user ? navigate(`/${user.role}/messages?avec=${t!.id}&offre=${o.id}`) : navigate('/connexion', { state: { from: `${base}/transports/${o.id}` } })}>Contacter le transporteur</Button>
          </Card>
        </div>
      </div>
      {open && (
        <Modal title="Choisir votre demande" onClose={() => setOpen(false)}>
          <p className="mb-3 text-sm text-muted">Quelle demande voulez-vous placer sur ce transport ?</p>
          <div className="space-y-2">
            {mine.map((r) => (
              <label key={r.id} className="flex cursor-pointer items-center gap-3 rounded-control border border-line p-3 has-[:checked]:border-primary-2 has-[:checked]:bg-primary-soft">
                <input type="radio" name="req" checked={choice === r.id} onChange={() => setChoice(r.id)} />
                <span className="text-sm"><strong>{r.from} → {r.to}</strong><br /><span className="text-muted">{fmtDate(r.date)} · {fmtT(r.weightT)}</span></span>
              </label>
            ))}
          </div>
          <Button className="mt-4 w-full" size="lg" onClick={confirm}>Envoyer la réservation</Button>
          <div className="mt-3"><Notice>Aucun paiement n'est demandé à cette étape.</Notice></div>
        </Modal>
      )}
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

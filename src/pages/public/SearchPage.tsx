import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { CalendarDays, Package, Scale, Search } from 'lucide-react'
import { useTitle } from '@/hooks/useTitle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { Stars, fmtDate, fmtT, GOODS_LABEL, GOODS_OPTIONS, offerPriceLabel, EmptyState } from '@/components/shared/ui-bits'
import { CITIES } from '@/domain/geo'
import { searchOffers, type OfferSort } from '@/domain/matching'
import type { GoodsType, Offer } from '@/domain/types'
import { apiEnabled } from '@/services/api'
import truckImage from '@/assets/mutlog_truck.png'
import { publicApi, type RemoteOffer } from '@/services/mutlogApi'
import { avgRating, today, userName } from '@/store/logic'
import { useDb } from '@/store/store'

const selectCls = 'h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink focus-visible:border-primary-2'

export default function SearchPage() {
  useTitle('Rechercher un transport')
  const db = useDb()
  const [params, setParams] = useSearchParams()
  const base = useLocation().pathname.startsWith('/client') ? '/client' : ''
  const q = {
    from: params.get('from') ?? '', to: params.get('to') ?? '', date: params.get('date') ?? '',
    goods: (params.get('goods') ?? '') as GoodsType | '', weightT: Number(params.get('poids')) || undefined,
  }
  const sort = (params.get('tri') ?? 'date') as OfferSort
  const [remoteResults, setRemoteResults] = useState<Offer[]>([])
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [remoteError, setRemoteError] = useState('')
  useEffect(() => {
    if (!apiEnabled) return
    let cancelled = false
    setRemoteLoading(true)
    setRemoteError('')
    publicApi.offers({ from: q.from || undefined, to: q.to || undefined, date: q.date || undefined, goods: q.goods || undefined, weightT: q.weightT, sort })
      .then((offers) => {
        if (cancelled) return
        setRemoteResults(offers.map((offer: RemoteOffer) => ({
          id: String(offer.id), transporterId: String(offer.transporter?.id ?? ''), vehicleId: '',
          from: offer.from, to: offer.to, date: offer.date, totalCapacityT: Number(offer.totalCapacityT),
          availableT: Number(offer.availableT), goodsAccepted: (offer.goodsAccepted ?? []) as GoodsType[],
          pricingMode: offer.pricingMode, price: Number(offer.price), notes: offer.notes,
          status: (offer.status === 'ouverte' ? 'ouverte' : offer.status === 'complete' ? 'complete' : 'terminee') as Offer['status'],
          createdAt: '',
        })))
      })
      .catch((error: unknown) => { if (!cancelled) setRemoteError(error instanceof Error ? error.message : 'Recherche API impossible.') })
      .finally(() => { if (!cancelled) setRemoteLoading(false) })
    return () => { cancelled = true }
  }, [params.toString()])
  const results = apiEnabled ? remoteResults : searchOffers(db.offers, q, db.settings, today(), (id) => db.users.find((u) => u.id === id)?.status === 'actif', sort)

  const apply = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const next = new URLSearchParams()
    for (const k of ['from', 'to', 'date', 'goods', 'poids']) {
      const v = String(f.get(k) ?? '').trim()
      if (v) next.set(k, v)
    }
    if (sort !== 'date') next.set('tri', sort)
    setParams(next)
  }

  return (
    <div className={`mx-auto grid max-w-[1200px] gap-6 lg:grid-cols-[280px_1fr] ${base ? '' : 'px-4 py-8 sm:px-6'}`}>
      <form onSubmit={apply} className="h-fit" aria-label="Filtres de recherche">
        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-bold text-ink">Filtres</h2>
          <Field label="Ville de départ" htmlFor="from">
            <select id="from" name="from" defaultValue={q.from} className={selectCls}>
              <option value="">Toutes</option>
              {CITIES.map((c) => <option key={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Ville d'arrivée" htmlFor="to">
            <select id="to" name="to" defaultValue={q.to} className={selectCls}>
              <option value="">Toutes</option>
              {CITIES.map((c) => <option key={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Date de départ" htmlFor="date"><Input id="date" name="date" type="date" min={today()} defaultValue={q.date} /></Field>
          <Field label="Type de marchandises" htmlFor="goods">
            <select id="goods" name="goods" defaultValue={q.goods} className={selectCls}>
              <option value="">Tous</option>
              {GOODS_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="Poids (tonnes)" htmlFor="poids"><Input id="poids" name="poids" inputMode="decimal" placeholder="Ex. 2" defaultValue={q.weightT ?? ''} /></Field>
          <Button type="submit" size="lg" className="w-full"><Search className="h-4 w-4" /> Rechercher</Button>
          <p className="text-xs text-muted">Les villes proches (moins de {db.settings.cityRadiusKm} km) et les dates à ±{db.settings.dateToleranceDays} jours sont incluses.</p>
        </Card>
      </form>

      <section aria-labelledby="res">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 id="res" className="text-2xl font-bold text-ink">Transports disponibles</h1>
            <p className="text-sm text-muted" aria-live="polite">{remoteLoading ? 'Recherche en cours…' : `${results.length} résultat${results.length > 1 ? 's' : ''} trouvé${results.length > 1 ? 's' : ''}`}</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            Trier par
            <select value={sort} onChange={(e) => { const n = new URLSearchParams(params); n.set('tri', e.target.value); setParams(n) }} className="h-10 rounded-control border border-line bg-surface px-3 text-sm text-ink">
              <option value="date">Date (la plus proche)</option>
              <option value="prix">Prix (croissant)</option>
              <option value="capacite">Capacité disponible</option>
            </select>
          </label>
        </div>

        {remoteError && <Card className="mb-4 border border-red-200 p-4 text-sm text-red-700">{remoteError}</Card>}
        {results.length === 0 ? (
          <Card><EmptyState title="Aucun transport ne correspond à votre recherche" text="Élargissez vos critères, ou publiez une demande : MUTLOG vous préviendra dès qu'un transport compatible sera disponible." action={<Button asChild><Link to="/client/demandes/nouvelle">Publier une demande</Link></Button>} /></Card>
        ) : (
          <ul className="space-y-4">
            {results.map((o) => {
              const t = db.users.find((u) => u.id === o.transporterId)
              const r = avgRating(db, o.transporterId)
              const price = offerPriceLabel(o)
              return (
                <li key={o.id}>
                  <Card className="flex flex-col gap-4 p-4 sm:flex-row">
                    <Link to={`${base}/transports/${o.id}`} className="block h-36 shrink-0 overflow-hidden rounded-control sm:h-auto sm:w-44" aria-hidden="true" tabIndex={-1}><img src={truckImage} alt="Camion sur une route de montagne" className="h-full w-full object-cover" /></Link>
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-ink"><Link to={`${base}/transports/${o.id}`} className="hover:underline">{o.from} → {o.to}</Link></h2>
                      <ul className="mt-2 grid gap-x-6 gap-y-1.5 text-sm text-muted sm:grid-cols-2">
                        <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden="true" /> {fmtDate(o.date)}</li>
                        <li className="flex items-center gap-2"><Scale className="h-4 w-4" aria-hidden="true" /> {fmtT(o.totalCapacityT)}</li>
                        <li className="flex items-center gap-2"><Package className="h-4 w-4" aria-hidden="true" /> {o.goodsAccepted.map((g) => GOODS_LABEL[g]).slice(0, 2).join(', ')}</li>
                        <li className="font-medium text-ink">Disponible : {fmtT(o.availableT)}</li>
                      </ul>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-ink">{userName(t)}</span>
                        {r && <span className="flex items-center gap-1 text-muted"><Stars value={r.avg} size={13} /> {r.avg.toFixed(1)} ({r.count} avis)</span>}
                        {t?.status === 'actif' && <Badge tone="success">Vérifié</Badge>}
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-3 sm:w-44 sm:flex-col sm:items-end sm:justify-between">
                      <p className="sm:text-right"><span className="block text-xl font-bold text-ink">{price.amount}</span><span className="text-xs text-muted">{price.unit}</span></p>
                      <Button asChild><Link to={`${base}/transports/${o.id}`}>Réserver</Link></Button>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

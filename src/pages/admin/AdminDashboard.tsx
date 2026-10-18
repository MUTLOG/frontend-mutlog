import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, CalendarCheck, CheckCircle2, CreditCard, FileText, Layers, Percent, ShieldCheck, Truck, Users, Wallet, XCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/layout/PageHeader'
import { Correspondence } from '@/components/matching/Correspondence'
import { useAuth } from '@/features/auth/useAuth'
import { CITIES } from '@/domain/geo'
import { compatibleRequests } from '@/domain/matching'
import { fillRate } from '@/domain/pooling'
import { formatFCFA } from '@/lib/format'
import { today, userName } from '@/store/logic'
import { transportViews } from '@/store/selectors'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/shared/ui-bits'
import { adminApiMode, type ApiUser } from '@/services/api'
import { adminApi, type AdminDashboardSummary, type AdminMatchingOffer } from '@/services/mutlogApi'
import { useAdminResource } from './useAdminResource'

type Preset = 'tout' | 'jour' | 'semaine' | 'mois' | 'perso'
const sel = 'h-10 rounded-control border border-line bg-surface px-3 text-sm text-ink'

function range(preset: Preset, from: string, to: string): [number, number] {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (preset === 'jour') return [start.getTime(), start.getTime() + 86_400_000 - 1]
  if (preset === 'semaine') { const d = new Date(start); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return [d.getTime(), d.getTime() + 7 * 86_400_000 - 1] }
  if (preset === 'mois') return [new Date(now.getFullYear(), now.getMonth(), 1).getTime(), new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() - 1]
  if (preset === 'perso') return [from ? Date.parse(from) : 0, to ? Date.parse(to) + 86_400_000 - 1 : Infinity]
  return [0, Infinity]
}

/** Tableau de bord administrateur (CDC §19) : indicateurs et filtres jour / semaine / mois / période, destination, transporteur. */
export function AdminDashboard() {
  return adminApiMode ? <AdminDashboardApi /> : <AdminDashboardDemo />
}

function AdminDashboardApi() {
  const [preset, setPreset] = useState<Preset>('tout')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [dest, setDest] = useState('')
  const [carrier, setCarrier] = useState('')
  const query = useMemo(() => {
    const [start, end] = range(preset, from, to)
    const params = new URLSearchParams()
    if (preset === 'perso') {
      if (from) params.set('from', from)
      if (to) params.set('to', to)
    } else if (preset !== 'tout') {
      params.set('from', from || new Date(start).toISOString().slice(0, 10))
      params.set('to', to || new Date(end).toISOString().slice(0, 10))
    }
    if (dest) params.set('destination', dest)
    if (carrier) params.set('transporter_id', carrier)
    return `?${params.toString()}`
  }, [preset, from, to, dest, carrier])
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const matches = useAdminResource(adminApi.matchingOffers, [] as AdminMatchingOffer[])
  const carriers = useAdminResource(() => adminApi.users('?role=transporteur&per_page=100'), [] as ApiUser[])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    adminApi.dashboard(query)
      .then((result) => { if (active) setSummary(result) })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Impossible de charger le tableau de bord.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [query])

  const opportunities = matches.data.slice(0, 3)
  return (
    <>
      <PageHeader title="Tableau de bord" description="Vue d'ensemble de la plateforme." />
      <div className="space-y-6">
        {error && <Notice tone="danger">{error}</Notice>}
        {(matches.error || carriers.error) && <Notice tone="danger">{matches.error || carriers.error}</Notice>}
        {loading && <p className="text-sm text-muted">Chargement des indicateurs…</p>}
        {summary && <>
          <Card className="space-y-3 p-4">
            <p className="text-sm font-semibold text-ink">Filtres</p>
            <div className="flex flex-wrap items-center gap-2">
              {([['tout', 'Tout'], ['jour', 'Aujourd\'hui'], ['semaine', 'Cette semaine'], ['mois', 'Ce mois'], ['perso', 'Période…']] as const).map(([k, label]) => (
                <button key={k} onClick={() => setPreset(k)} aria-pressed={preset === k} className={`rounded-full px-4 py-2 text-sm font-medium ${preset === k ? 'bg-primary text-white' : 'bg-surface text-ink ring-1 ring-line hover:bg-primary-soft'}`}>{label}</button>
              ))}
            </div>
            {preset === 'perso' && <div className="flex flex-wrap items-center gap-2 text-sm"><label className="flex items-center gap-2">Du <Input type="date" className="w-auto" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="flex items-center gap-2">au <Input type="date" className="w-auto" value={to} onChange={(e) => setTo(e.target.value)} /></label></div>}
            <div className="flex flex-wrap gap-2">
              <select aria-label="Destination" className={sel} value={dest} onChange={(e) => setDest(e.target.value)}><option value="">Toutes les destinations</option>{CITIES.map((city) => <option key={city.name}>{city.name}</option>)}</select>
              <select aria-label="Transporteur" className={sel} value={carrier} onChange={(e) => setCarrier(e.target.value)}><option value="">Tous les transporteurs</option>{carriers.data.map((user) => <option key={user.id} value={user.id}>{user.displayName || `${user.firstName} ${user.lastName}`}</option>)}</select>
              {(preset !== 'tout' || dest || carrier) && <Button variant="ghost" size="sm" onClick={() => { setPreset('tout'); setDest(''); setCarrier(''); setFrom(''); setTo('') }}>Réinitialiser</Button>}
            </div>
          </Card>

          {(summary.poolingsToValidate + summary.carriersToValidate + summary.paymentsToReview + opportunities.length > 0) && (
            <Card className="space-y-3 p-5"><h2 className="text-base font-semibold text-ink">À traiter</h2><ul className="space-y-1.5 text-sm">
              {summary.carriersToValidate > 0 && <li><Link className="font-medium text-primary-2 hover:underline" to="/admin/transporteurs">{summary.carriersToValidate} transporteur(s) à valider</Link></li>}
              {summary.poolingsToValidate > 0 && <li><Link className="font-medium text-primary-2 hover:underline" to="/admin/mutualisations">{summary.poolingsToValidate} regroupement(s) à valider</Link></li>}
              {summary.paymentsToReview > 0 && <li><Link className="font-medium text-primary-2 hover:underline" to="/admin/paiements">{summary.paymentsToReview} paiement(s) à vérifier</Link></li>}
            </ul>
              {opportunities.map(({ offer, compatibleRequests }) => {
                const domainOffer = { id: String(offer.id), transporterId: String(offer.transporter?.id ?? ''), vehicleId: '', from: offer.from, to: offer.to, date: offer.date, totalCapacityT: offer.totalCapacityT, availableT: offer.availableT, goodsAccepted: offer.goodsAccepted as import('@/domain/types').GoodsType[], pricingMode: offer.pricingMode, price: offer.price, notes: offer.notes, status: offer.status as import('@/domain/types').Offer['status'], createdAt: '' }
                return <Correspondence key={offer.id} offer={domainOffer} count={compatibleRequests} action={<Button asChild size="sm"><Link to={`/admin/mutualisations?offre=${offer.id}`}>Créer le regroupement</Link></Button>} />
              })}
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard icon={Users} label="Clients" value={String(summary.clients)} sub="Comptes" subTone="muted" />
            <StatCard icon={ShieldCheck} label="Transporteurs" value={String(summary.carriers)} sub={`${summary.carriersToValidate} à valider`} subTone="muted" tone="success" />
            <StatCard icon={Truck} label="Véhicules" value={String(summary.vehicles)} sub={`${summary.vehiclesAvailable} disponibles`} subTone="muted" />
            <StatCard icon={FileText} label="Demandes de transport" value={String(summary.requests)} sub={`${summary.requestsSearching} en recherche`} subTone="muted" />
            <StatCard icon={CalendarCheck} label="Transports confirmés" value={String(summary.transportsConfirmed)} sub={`${summary.transportsMoving} en cours`} subTone="muted" tone="success" />
            <StatCard icon={CheckCircle2} label="Transports terminés" value={String(summary.transportsDone)} sub="Livrés et clôturés" subTone="muted" tone="success" />
            <StatCard icon={XCircle} label="Annulés" value={String(summary.cancelled)} sub="Demandes et transports" subTone="muted" tone="danger" />
            <StatCard icon={Layers} label="Mutualisations" value={String(summary.poolings)} sub={`${summary.poolingsMulti} avec plusieurs clients`} subTone="muted" />
            <StatCard icon={Wallet} label="Montant total des transports" value={formatFCFA(summary.transportAmount)} sub="Hors annulés" subTone="muted" tone="accent" />
            <StatCard icon={Percent} label="Commissions générées" value={formatFCFA(summary.commissionAcquired + summary.commissionPlanned)} sub={`${formatFCFA(summary.commissionAcquired)} acquises`} subTone="muted" tone="accent" />
            <StatCard icon={CreditCard} label="Paiements à vérifier" value={String(summary.paymentsToReview)} sub="Référence déclarée" subTone="muted" tone="danger" />
            <StatCard icon={Activity} label="Remplissage des offres" value={`${summary.fillRate} %`} sub="Capacité réservée" subTone="muted" />
          </div>
        </>}
      </div>
    </>
  )
}

function AdminDashboardDemo() {
  const { db } = useAuth()
  const [preset, setPreset] = useState<Preset>('tout')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [dest, setDest] = useState('')
  const [carrier, setCarrier] = useState('')

  const d = useMemo(() => {
    const [a, b] = range(preset, from, to)
    const inR = (iso: string) => { const t = Date.parse(iso); return t >= a && t <= b }
    const views = transportViews(db).filter((v) => inR(v.t.events[0].at) && (!dest || v.offer.to === dest) && (!carrier || v.offer.transporterId === carrier))
    const reqs = db.requests.filter((r) => inR(r.createdAt) && (!dest || r.to === dest) && (!carrier || db.reservations.some((x) => x.requestId === r.id && x.transporterId === carrier) || views.some((v) => v.p.requestIds.includes(r.id))))
    const confirmed = views.filter((v) => v.t.status !== 'annule')
    const comm = views.map((v) => db.commissions.find((c) => c.transportId === v.t.id)).filter((c) => c && c.status !== 'annulee')
    const poolings = db.poolings.filter((p) => p.status === 'confirmee' && views.some((v) => v.p.id === p.id))
    return {
      reqs, views, confirmed, poolings, comm,
      done: views.filter((v) => v.t.status === 'terminee').length,
      cancelled: views.filter((v) => v.t.status === 'annule').length + reqs.filter((r) => r.status === 'annule').length,
      moving: confirmed.filter((v) => ['en_cours', 'arrive_destination'].includes(v.t.status)).length,
      amount: confirmed.reduce((s, v) => s + v.p.finance.gross, 0),
    }
  }, [db, preset, from, to, dest, carrier])

  const pendingPay = db.payments.filter((p) => p.status === 'en_attente' && p.reference).length
  const proposals = db.poolings.filter((p) => p.status === 'proposee').length
  const toValidate = db.users.filter((u) => u.role === 'transporteur' && u.status === 'en_attente').length
  const live = db.offers.filter((o) => o.status !== 'annulee')
  const rate = fillRate(live.reduce((s, o) => s + o.totalCapacityT - o.availableT, 0), live.reduce((s, o) => s + o.totalCapacityT, 0))
  const searching = db.requests.filter((r) => r.status === 'recherche')
  const opportunities = db.offers.filter((o) => o.status === 'ouverte' && o.date >= today()).map((o) => ({ o, n: compatibleRequests(o, searching, db.settings).length })).filter((x) => x.n > 0).slice(0, 3)
  const carriers = db.users.filter((u) => u.role === 'transporteur')
  const comAcq = d.comm.filter((c) => c!.status === 'acquise').reduce((s, c) => s + c!.commission, 0)
  const comPrev = d.comm.filter((c) => c!.status === 'prevue').reduce((s, c) => s + c!.commission, 0)

  return (
    <>
      <PageHeader title="Tableau de bord" description="Vue d'ensemble de la plateforme." />
      <div className="space-y-6">
        <Card className="space-y-3 p-4">
          <p className="text-sm font-semibold text-ink">Filtres</p>
          <div className="flex flex-wrap items-center gap-2">
            {([['tout', 'Tout'], ['jour', 'Aujourd\'hui'], ['semaine', 'Cette semaine'], ['mois', 'Ce mois'], ['perso', 'Période…']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setPreset(k)} aria-pressed={preset === k} className={`rounded-full px-4 py-2 text-sm font-medium ${preset === k ? 'bg-primary text-white' : 'bg-surface text-ink ring-1 ring-line hover:bg-primary-soft'}`}>{l}</button>
            ))}
          </div>
          {preset === 'perso' && <div className="flex flex-wrap items-center gap-2 text-sm"><label className="flex items-center gap-2">Du <Input type="date" className="w-auto" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="flex items-center gap-2">au <Input type="date" className="w-auto" value={to} onChange={(e) => setTo(e.target.value)} /></label></div>}
          <div className="flex flex-wrap gap-2">
            <select aria-label="Destination" className={sel} value={dest} onChange={(e) => setDest(e.target.value)}><option value="">Toutes les destinations</option>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select>
            <select aria-label="Transporteur" className={sel} value={carrier} onChange={(e) => setCarrier(e.target.value)}><option value="">Tous les transporteurs</option>{carriers.map((c) => <option key={c.id} value={c.id}>{userName(c)}</option>)}</select>
            {(preset !== 'tout' || dest || carrier) && <Button variant="ghost" size="sm" onClick={() => { setPreset('tout'); setDest(''); setCarrier(''); setFrom(''); setTo('') }}>Réinitialiser</Button>}
          </div>
        </Card>

        {(proposals + toValidate + pendingPay + opportunities.length > 0) && (
          <Card className="space-y-3 p-5"><h2 className="text-base font-semibold text-ink">À traiter</h2>
            <ul className="space-y-1.5 text-sm">
              {toValidate > 0 && <li><Link className="font-medium text-primary-2 hover:underline" to="/admin/transporteurs">{toValidate} transporteur(s) à valider</Link></li>}
              {proposals > 0 && <li><Link className="font-medium text-primary-2 hover:underline" to="/admin/mutualisations">{proposals} regroupement(s) à valider</Link></li>}
              {pendingPay > 0 && <li><Link className="font-medium text-primary-2 hover:underline" to="/admin/paiements">{pendingPay} paiement(s) à vérifier</Link></li>}
            </ul>
            {opportunities.map(({ o, n }) => <Correspondence key={o.id} offer={o} count={n} action={<Button asChild size="sm"><Link to={`/admin/mutualisations?offre=${o.id}`}>Créer le regroupement</Link></Button>} />)}
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard icon={Users} label="Clients" value={String(db.users.filter((u) => u.role === 'client').length)} sub="Comptes" subTone="muted" />
          <StatCard icon={ShieldCheck} label="Transporteurs" value={String(carriers.length)} sub={`${toValidate} à valider`} subTone="muted" tone="success" />
          <StatCard icon={Truck} label="Véhicules" value={String(db.vehicles.length)} sub={`${db.vehicles.filter((v) => v.active && v.available).length} disponibles`} subTone="muted" />
          <StatCard icon={FileText} label="Demandes de transport" value={String(d.reqs.length)} sub={`${d.reqs.filter((r) => r.status === 'recherche').length} en recherche`} subTone="muted" />
          <StatCard icon={CalendarCheck} label="Transports confirmés" value={String(d.confirmed.length)} sub={`${d.moving} en cours`} subTone="muted" tone="success" />
          <StatCard icon={CheckCircle2} label="Transports terminés" value={String(d.done)} sub="Livrés et clôturés" subTone="muted" tone="success" />
          <StatCard icon={XCircle} label="Annulés" value={String(d.cancelled)} sub="Demandes et transports" subTone="muted" tone="danger" />
          <StatCard icon={Layers} label="Mutualisations" value={String(d.poolings.length)} sub={`${d.poolings.filter((p) => p.shares.length > 1).length} avec plusieurs clients`} subTone="muted" />
          <StatCard icon={Wallet} label="Montant total des transports" value={formatFCFA(d.amount)} sub="Hors annulés" subTone="muted" tone="accent" />
          <StatCard icon={Percent} label="Commissions générées" value={formatFCFA(comAcq + comPrev)} sub={`${formatFCFA(comAcq)} acquises`} subTone="muted" tone="accent" />
          <StatCard icon={CreditCard} label="Paiements à vérifier" value={String(pendingPay)} sub="Référence déclarée" subTone="muted" tone="danger" />
          <StatCard icon={Activity} label="Remplissage des offres" value={`${rate} %`} sub="Capacité réservée" subTone="muted" />
        </div>
      </div>
    </>
  )
}

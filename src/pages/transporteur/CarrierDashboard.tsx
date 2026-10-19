import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, CalendarCheck, Route, Truck, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState, fmtDate, fmtT, Notice } from '@/components/shared/ui-bits'
import { useAuth } from '@/features/auth/useAuth'
import { formatFCFA, monthLabel, today } from '@/lib/format'
import { fillRate } from '@/domain/pooling'
import { useResource } from '@/hooks/useResource'
import { carrierApi, type AdminPooling, type AdminTransport, type CarrierReservation, type CarrierRevenue, type RemoteOffer } from '@/services/mutlogApi'

const NO_OFFERS: RemoteOffer[] = []
const NO_RESERVATIONS: CarrierReservation[] = []
const NO_TRANSPORTS: AdminTransport[] = []
const NO_POOLINGS: AdminPooling[] = []
const NO_REVENUE: CarrierRevenue = { netReceived: 0, netPending: 0, commissionPaid: 0, monthly: [] }

export default function CarrierDashboard() {
  const { user } = useAuth()
  const me = user!
  const offers = useResource(() => carrierApi.offers(), NO_OFFERS)
  const reservations = useResource(() => carrierApi.reservations(), NO_RESERVATIONS)
  const transports = useResource(() => carrierApi.transports(), NO_TRANSPORTS)
  const revenue = useResource(() => carrierApi.revenue(), NO_REVENUE)
  const toConfirm = useResource(() => carrierApi.poolings('?status=validee&per_page=100'), NO_POOLINGS)
  const error = offers.error || reservations.error || transports.error || revenue.error || toConfirm.error
  const ready = offers.loaded && reservations.loaded && transports.loaded && revenue.loaded && toConfirm.loaded && !error

  const stats = useMemo(() => {
    const active = offers.data.filter((o) => o.status === 'ouverte' && o.date >= today())
    const upcoming = [...active].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)
    const monthKey = new Date().toISOString().slice(0, 7)
    const monthTrs = transports.data.filter((t) => (t.events[0]?.at ?? t.createdAt ?? '').slice(0, 7) === monthKey)
    const live = offers.data.filter((o) => o.status !== 'annulee')
    const used = live.reduce((s, o) => s + (o.totalCapacityT - o.availableT), 0)
    const cap = live.reduce((s, o) => s + o.totalCapacityT, 0)
    const chart = revenue.data.monthly.map((m) => ({ label: monthLabel(m.month), value: m.net }))
    return {
      active, upcoming, monthTrs, rate: fillRate(used, cap), chart, monthRevenue: chart.length ? chart[chart.length - 1].value : 0,
      booked: reservations.data.filter((r) => ['en_attente', 'confirmee'].includes(r.status)).length,
      broken: transports.data.filter((t) => t.breakdown),
    }
  }, [offers.data, transports.data, reservations.data, revenue.data])
  const waiting = toConfirm.data.length

  return (
    <>
      <PageHeader title="Tableau de bord" description={`Bienvenue ${me.firstName} ! Voici un aperçu de vos activités.`} action={<Button asChild size="lg"><Link to="/transporteur/trajets/nouveau">Publier un trajet</Link></Button>} />
      <div className="space-y-6">
        {error && <Notice tone="danger">{error}</Notice>}
        {me.status !== 'actif' && <Notice tone="warning">Votre compte est en attente de validation par MUTLOG. Vous pourrez publier vos trajets dès sa validation.</Notice>}
        {waiting > 0 && <Notice tone="info">{waiting} regroupement{waiting > 1 ? 's' : ''} à confirmer. <Link to="/transporteur/demandes" className="underline">Répondre</Link></Notice>}
        {stats.broken.length > 0 && <Notice tone="warning"><AlertTriangle className="mr-1 inline h-4 w-4" aria-hidden="true" />Panne signalée sur {stats.broken.length} transport{stats.broken.length > 1 ? 's' : ''} : MUTLOG et les clients concernés sont informés. <Link to="/transporteur/transports" className="underline">Voir</Link></Notice>}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard icon={Route} label="Trajets publiés" value={ready ? String(offers.data.length) : '—'} sub={ready ? `${stats.active.length} actifs` : '—'} subTone="muted" />
          <StatCard icon={CalendarCheck} label="Réservations" value={ready ? String(stats.booked) : '—'} sub={ready ? `${stats.monthTrs.length} transport(s) ce mois-ci` : '—'} subTone="muted" />
          <StatCard icon={Wallet} label="Revenus nets" value={ready ? formatFCFA(stats.monthRevenue) : '—'} sub="Ce mois-ci" tone="danger" subTone="muted" />
          <StatCard icon={Truck} label="Taux de remplissage" value={ready ? `${stats.rate} %` : '—'} sub="Capacité réservée / capacité publiée" tone="info" subTone="muted" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Card>
            <CardHeader title="Mes prochains trajets" action={<Link to="/transporteur/trajets" className="text-sm font-semibold text-primary-2 hover:underline">Voir tout</Link>} />
            {!ready ? <p className="px-5 py-6 text-sm text-muted" role="status">{error ? 'Données indisponibles.' : 'Chargement…'}</p> : stats.upcoming.length === 0 ? <EmptyState title="Aucun trajet à venir" /> : (
              <ul className="mt-3 divide-y divide-line">
                {stats.upcoming.map((o) => {
                  const n = reservations.data.filter((r) => String(r.offerId) === String(o.id) && ['en_attente', 'confirmee'].includes(r.status)).length
                  return (
                    <li key={o.id}><Link to={`/transporteur/trajets/${o.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-background/70">
                      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{o.from} → {o.to}</span><span className="text-xs text-muted">{fmtDate(o.date)} · {fmtT(o.totalCapacityT)}</span></span>
                      <span className="text-xs text-muted">{n} réservation{n > 1 ? 's' : ''}</span><Badge tone="success">Actif</Badge>
                    </Link></li>
                  )
                })}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title="Statistiques" />
            <p className="px-5 pt-1 text-xs text-muted">Revenus nets (6 derniers mois)</p>
            <div className="h-56 px-2 pb-4 pt-2" role="img" aria-label="Graphique des revenus nets des six derniers mois">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis width={44} tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v: number) => (v >= 1e6 ? `${v / 1e6} M` : `${Math.round(v / 1000)} k`)} />
                  <Tooltip formatter={(v) => formatFCFA(Number(v))} cursor={{ fill: '#E8EEF5' }} />
                  <Bar dataKey="value" name="Revenu net" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarCheck, Route, Truck, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState, fmtDate, fmtT, Notice } from '@/components/shared/ui-bits'
import { useAuth } from '@/features/auth/useAuth'
import { formatFCFA } from '@/lib/format'
import { carrierTransports, monthlyNet } from '@/store/selectors'
import { today } from '@/store/logic'
import { fillRate } from '@/domain/pooling'

export default function CarrierDashboard() {
  const { db, user } = useAuth()
  const me = user!
  const offers = db.offers.filter((o) => o.transporterId === me.id)
  const active = offers.filter((o) => o.status === 'ouverte' && o.date >= today())
  const upcoming = [...active].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)
  const trs = carrierTransports(db, me.id)
  const monthKey = new Date().toISOString().slice(0, 7)
  const monthTrs = trs.filter((v) => v.t.events[0].at.slice(0, 7) === monthKey)
  const reservations = db.reservations.filter((r) => r.transporterId === me.id && ['en_attente', 'confirmee'].includes(r.status))
  const revenue = monthlyNet(db, me.id)
  const monthRevenue = revenue[revenue.length - 1].value
  const live = offers.filter((o) => o.status !== 'annulee')
  const used = live.reduce((s, o) => s + (o.totalCapacityT - o.availableT), 0)
  const cap = live.reduce((s, o) => s + o.totalCapacityT, 0)
  const rate = fillRate(used, cap)
  const waiting = db.poolings.filter((p) => p.status === 'validee' && db.offers.find((o) => o.id === p.offerId)?.transporterId === me.id).length

  return (
    <>
      <PageHeader title="Tableau de bord" description={`Bienvenue ${me.firstName} ! Voici un aperçu de vos activités.`} action={<Button asChild size="lg"><Link to="/transporteur/trajets/nouveau">Publier un trajet</Link></Button>} />
      <div className="space-y-6">
        {me.status !== 'actif' && <Notice tone="warning">Votre compte est en attente de validation par MUTLOG. Vous pourrez publier vos trajets dès sa validation.</Notice>}
        {waiting > 0 && <Notice tone="info">{waiting} regroupement{waiting > 1 ? 's' : ''} à confirmer. <Link to="/transporteur/demandes" className="underline">Répondre</Link></Notice>}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard icon={Route} label="Trajets publiés" value={String(offers.length)} sub={`${active.length} actifs`} subTone="muted" />
          <StatCard icon={CalendarCheck} label="Réservations" value={String(reservations.length)} sub={`${monthTrs.length} transport(s) ce mois-ci`} subTone="muted" />
          <StatCard icon={Wallet} label="Revenus nets" value={formatFCFA(monthRevenue)} sub="Ce mois-ci" tone="danger" subTone="muted" />
          <StatCard icon={Truck} label="Taux de remplissage" value={`${rate} %`} sub="Capacité réservée / capacité publiée" tone="info" subTone="muted" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Card>
            <CardHeader title="Mes prochains trajets" action={<Link to="/transporteur/trajets" className="text-sm font-semibold text-primary-2 hover:underline">Voir tout</Link>} />
            {upcoming.length === 0 ? <EmptyState title="Aucun trajet à venir" /> : (
              <ul className="mt-3 divide-y divide-line">
                {upcoming.map((o) => {
                  const n = db.reservations.filter((r) => r.offerId === o.id && ['en_attente', 'confirmee'].includes(r.status)).length
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
                <BarChart data={revenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, FileText, Truck, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/layout/PageHeader'
import { useAuth } from '@/features/auth/useAuth'
import { EmptyState, fmtDate, fmtT, GOODS_LABEL, Notice, RequestStatusBadge } from '@/components/shared/ui-bits'
import { formatFCFA } from '@/lib/format'
import { clientSavings } from '@/domain/savings'
import { useResource } from '@/hooks/useResource'
import { clientApi, type ClientRequest, type ClientShipment } from '@/services/mutlogApi'

const NO_REQUESTS: ClientRequest[] = []
const NO_SHIPMENTS: ClientShipment[] = []
const IN_TRANSIT = ['en_cours', 'arrive_destination']
const DELIVERED = ['livree', 'terminee']

export default function ClientDashboard() {
  const { user } = useAuth()
  const me = user!
  const requests = useResource(() => clientApi.requests('?per_page=100'), NO_REQUESTS)
  const shipments = useResource(() => clientApi.shipments(), NO_SHIPMENTS)
  const error = requests.error || shipments.error
  const ready = requests.loaded && shipments.loaded && !error

  const reqs = useMemo(() => [...requests.data].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')), [requests.data])
  const trs = shipments.data
  const inProgress = reqs.filter((r) => ['demande', 'recherche', 'mutualisation'].includes(r.status)).length
  const confirmed = reqs.filter((r) => r.status === 'confirmee').length
  const moving = trs.filter((t) => IN_TRANSIT.includes(t.status)).length
  const done = trs.filter((t) => DELIVERED.includes(t.status)).length
  const savings = clientSavings(trs)
  const tracked = trs.find((t) => IN_TRANSIT.includes(t.status)) ?? trs.find((t) => t.status === 'confirmee')
  const stat = (n: number) => (ready ? String(n) : '—')
  const pending = <p className="px-5 py-6 text-sm text-muted" role="status">{error ? 'Données indisponibles.' : 'Chargement…'}</p>

  return (
    <>
      <PageHeader title="Tableau de bord" description={`Bienvenue ${me.firstName} ! Voici un aperçu de vos activités.`}
        action={<Button asChild size="lg"><Link to="/client/demandes/nouvelle">Publier une demande</Link></Button>} />
      {error && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={FileText} label="Demandes de transport" value={stat(inProgress)} sub="En cours" />
        <StatCard icon={CalendarCheck} label="Réservations" value={stat(confirmed)} sub="Confirmées" subTone="success" />
        <StatCard icon={Truck} label="Expéditions" value={stat(done + moving)} sub={ready ? `${moving} en transit · ${done} terminées` : '—'} tone="success" subTone="muted" />
        <StatCard icon={Wallet} label="Économies réalisées" value={ready ? formatFCFA(savings) : '—'} sub="Grâce à la mutualisation" tone="accent" subTone="muted" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title="Demandes récentes" action={<Link to="/client/demandes" className="text-sm font-semibold text-primary-2 hover:underline">Voir tout</Link>} />
          {!ready ? pending : reqs.length === 0 ? <EmptyState title="Aucune demande pour le moment" text="Publiez votre première demande de transport." action={<Button asChild><Link to="/client/demandes/nouvelle">Publier une demande</Link></Button>} /> : (
            <ul className="mt-3 divide-y divide-line">
              {reqs.slice(0, 4).map((r) => (
                <li key={r.id}>
                  <Link to={`/client/demandes/${r.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-background/70">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"><Truck className="h-4 w-4" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{r.from} → {r.to}</span>
                      <span className="block truncate text-xs text-muted">{fmtT(r.weightT)} · {GOODS_LABEL[r.goods]}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1"><RequestStatusBadge status={r.status} /><span className="text-xs text-muted">{fmtDate(r.date)}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Suivi de mes expéditions" action={<Link to="/client/expeditions" className="text-sm font-semibold text-primary-2 hover:underline">Voir tout</Link>} />
          {!ready ? pending : tracked ? (
            <Link to={`/client/expeditions/${tracked.id}`} className="block p-5">
              <p className="text-sm font-semibold text-ink">{tracked.offer.from} → {tracked.offer.to} <span className="ml-1 text-xs font-normal text-muted">{tracked.ref}</span></p>
              <TrackLine from={tracked.offer.from} to={tracked.offer.to} status={tracked.status} />
            </Link>
          ) : <EmptyState title="Aucune expédition en cours" text="Vos transports confirmés apparaîtront ici." />}
        </Card>
      </div>
    </>
  )
}

export function TrackLine({ from, to, status }: { from: string; to: string; status: string }) {
  const pos = ['en_cours'].includes(status) ? 1 : ['arrive_destination', 'livree', 'terminee'].includes(status) ? 2 : 0
  const label = ['Départ prévu', 'En transit', 'Arrivé'][pos]
  return (
    <div className="mt-6" aria-label={`Progression : ${label}`}>
      <div className="relative mx-3 h-1 rounded-full bg-line">
        <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${pos * 50}%` }} />
        {[0, 1, 2].map((i) => <span key={i} className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${i <= pos ? 'border-primary bg-surface' : 'border-line bg-surface'} ${i === pos ? 'ring-4 ring-accent-soft !border-accent' : ''}`} style={{ left: `${i * 50}%` }} />)}
        <Truck className="absolute -top-7 h-5 w-5 -translate-x-1/2 text-primary" style={{ left: `${pos * 50}%` }} aria-hidden="true" />
      </div>
      <div className="mt-4 flex justify-between text-xs"><span className="font-medium text-ink">{from}</span><span className="font-semibold text-accent-text">{label}</span><span className="font-medium text-ink">{to}</span></div>
    </div>
  )
}

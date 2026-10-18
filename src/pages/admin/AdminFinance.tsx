import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, Notice } from '@/components/shared/ui-bits'
import { useAuth } from '@/features/auth/useAuth'
import { adminApi } from '@/services/mutlogApi'
import { formatFCFA } from '@/lib/format'
import { transportViews } from '@/store/selectors'
import { adminApiMode } from '@/services/api'
import { useAdminResource } from './useAdminResource'

/** Gestion financière (CDC §18) : chiffre d'affaires, commissions, montants des transports, paiements, opérations terminées. */
export function CommissionsPage() {
  const { db } = useAuth()
  const remote = useAdminResource(adminApi.commissions, { revenue: 0, commissionAcquired: 0, commissionPlanned: 0, paymentsConfirmed: 0, paymentsWaiting: 0, refunded: 0, ratePct: 0, bearer: 'transporteur', rows: [] } as Awaited<ReturnType<typeof adminApi.commissions>>)
  if (adminApiMode) return (
    <>
      <PageHeader title="Commissions" description="Gestion financière : chiffre d'affaires, commissions, paiements et opérations terminées." action={<Button asChild variant="outline"><Link to="/admin/parametres">Modifier le taux</Link></Button>} />
      {remote.error && <Notice tone="danger">{remote.error}</Notice>}
      {remote.loading && <p className="py-4 text-sm text-muted">Chargement des données financières…</p>}
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
          ['Chiffre d’affaires (montant des transports)', formatFCFA(remote.data.revenue), `${remote.data.rows.length} opérations`],
          ['Commissions acquises', formatFCFA(remote.data.commissionAcquired)],
          ['Commissions prévues', formatFCFA(remote.data.commissionPlanned)],
          ['Paiements confirmés', formatFCFA(remote.data.paymentsConfirmed), `${formatFCFA(remote.data.paymentsWaiting)} en attente`],
          ['Remboursements', formatFCFA(remote.data.refunded)],
          ['Taux appliqué', `${remote.data.ratePct} %`, remote.data.bearer === 'transporteur' ? 'Supportée par le transporteur' : 'Supportée par les clients'],
        ].map(([label, value, sub]) => <Card key={label} className="p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-xl font-bold text-ink">{value}</p>{sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}</Card>)}</div>
        <DataTable rows={remote.data.rows.map((row, index) => ({ ...row, id: `${row.transportRef}-${index}` }))} rowKey={(row) => row.id} empty={<p className="p-8 text-center text-sm text-muted">Aucune commission</p>} columns={[
          { header: 'Opération', cell: (row) => <strong>{row.transportRef}</strong> },
          { header: 'Montant brut', cell: (row) => formatFCFA(row.gross) },
          { header: 'Taux', cell: (row) => `${row.ratePct} %` },
          { header: 'Commission', cell: (row) => <strong>{formatFCFA(row.commission)}</strong> },
          { header: 'Net transporteur', cell: (row) => formatFCFA(row.netCarrier) },
          { header: 'Statut', cell: (row) => <Badge tone={row.status === 'acquise' ? 'success' : row.status === 'annulee' ? 'danger' : 'pending'}>{{ acquise: 'Acquise', prevue: 'Prévue', annulee: 'Annulée' }[row.status as 'acquise']}</Badge> },
        ]} />
      </div>
    </>
  )
  const views = transportViews(db).filter((v) => v.t.status !== 'annule')
  const rows = db.commissions.map((c) => ({ c, v: transportViews(db).find((x) => x.t.id === c.transportId) })).filter((x) => x.v)
  const commission = (s: string) => db.commissions.filter((c) => c.status === s).reduce((a, c) => a + c.commission, 0)
  const gross = views.reduce((s, v) => s + v.p.finance.gross, 0)
  const paid = db.payments.filter((p) => p.status === 'confirme').reduce((s, p) => s + p.amount, 0)
  const waiting = db.payments.filter((p) => p.status === 'en_attente').reduce((s, p) => s + p.amount, 0)
  const refunded = db.payments.filter((p) => p.status === 'rembourse').reduce((s, p) => s + p.amount, 0)
  const done = views.filter((v) => v.t.status === 'terminee').length
  const kpis: [string, string, string?][] = [
    ['Chiffre d\'affaires (montant des transports)', formatFCFA(gross), `${views.length} opérations confirmées`],
    ['Commissions acquises', formatFCFA(commission('acquise')), `${done} opérations terminées`],
    ['Commissions prévues', formatFCFA(commission('prevue')), 'Opérations en cours'],
    ['Paiements confirmés', formatFCFA(paid), `${formatFCFA(waiting)} en attente`],
    ['Remboursements', formatFCFA(refunded)],
    ['Taux appliqué', `${db.settings.commissionPct} %`, db.settings.commissionBearer === 'transporteur' ? 'Supportée par le transporteur' : 'Supportée par les clients'],
  ]
  return (
    <>
      <PageHeader title="Commissions" description="Gestion financière : chiffre d'affaires, commissions, paiements et opérations terminées." action={<Button asChild variant="outline"><Link to="/admin/parametres">Modifier le taux</Link></Button>} />
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{kpis.map(([l, v, s]) => <Card key={l} className="p-4"><p className="text-xs text-muted">{l}</p><p className="mt-1 text-xl font-bold text-ink">{v}</p>{s && <p className="mt-0.5 text-xs text-muted">{s}</p>}</Card>)}</div>
        <DataTable rows={rows} rowKey={(x) => x.c.id} columns={[
          { header: 'Opération', cell: (x) => <strong>{x.v!.t.ref}</strong> }, { header: 'Trajet', cell: (x) => `${x.v!.offer.from} → ${x.v!.offer.to}` },
          { header: 'Montant brut', cell: (x) => formatFCFA(x.c.gross) }, { header: 'Taux', cell: (x) => `${x.c.ratePct} %` },
          { header: 'Commission', cell: (x) => <strong>{formatFCFA(x.c.commission)}</strong> }, { header: 'Net transporteur', cell: (x) => formatFCFA(x.c.netCarrier) },
          { header: 'Statut', cell: (x) => <Badge tone={x.c.status === 'acquise' ? 'success' : x.c.status === 'annulee' ? 'danger' : 'pending'}>{{ acquise: 'Acquise', prevue: 'Prévue', annulee: 'Annulée' }[x.c.status]}</Badge> },
        ]} />
      </div>
    </>
  )
}

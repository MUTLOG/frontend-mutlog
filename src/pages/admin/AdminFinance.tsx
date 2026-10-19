import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, Notice } from '@/components/shared/ui-bits'
import { adminApi } from '@/services/mutlogApi'
import { formatFCFA } from '@/lib/format'
import { useResource } from '@/hooks/useResource'

/** Gestion financière (CDC §18) : chiffre d'affaires, commissions, montants des transports, paiements, opérations terminées. */
export function CommissionsPage() {
  const remote = useResource(adminApi.commissions, { revenue: 0, commissionAcquired: 0, commissionPlanned: 0, paymentsConfirmed: 0, paymentsWaiting: 0, refunded: 0, ratePct: 0, bearer: 'transporteur', rows: [] } as Awaited<ReturnType<typeof adminApi.commissions>>)
  return (
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
}

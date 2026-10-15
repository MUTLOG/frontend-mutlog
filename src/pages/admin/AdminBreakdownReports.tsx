import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field } from '@/components/ui/input'
import { Notice } from '@/components/shared/ui-bits'
import { adminApi } from '@/services/mutlogApi'

type Report = {
  id: number; kind: string; urgency: string; location: string; description: string; status: string; createdAt: string;
  adminNotes?: string | null; transporter?: { displayName?: string; firstName?: string; lastName?: string; phone?: string };
  transport?: { ref?: string; offer?: { from: string; to: string } };
}
const kindLabel: Record<string, string> = { mecanique: 'Panne mécanique / moteur', pneu: 'Pneu crevé', accident: 'Accident ou collision', carburant: 'Problème de carburant', autre: 'Autre incident' }
const statusLabel: Record<string, string> = { en_attente: 'En attente', prise_en_charge: 'Prise en charge', resolue: 'Résolue', cloturee: 'Clôturée' }

export function AdminBreakdownReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [status, setStatus] = useState('')
  const [urgency, setUrgency] = useState('')
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const result = await adminApi.breakdowns({ status, urgency }) as { data?: Report[] } | Report[]
      setReports(Array.isArray(result) ? result : result.data ?? [])
    } catch (e) { setError(e instanceof Error ? e.message : 'Impossible de charger les signalements.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [status, urgency])

  async function update(report: Report, nextStatus: string) {
    setError(''); setMessage('')
    try {
      await adminApi.updateBreakdown(report.id, { status: nextStatus, adminNotes: notes[report.id] ?? report.adminNotes ?? '' })
      setMessage(`Signalement #${report.id} mis à jour.`)
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Mise à jour impossible.') }
  }

  return <>
    <PageHeader title="Signalements de panne" description="Incidents déclarés par les transporteurs pendant leurs trajets." action={<Button variant="outline" onClick={() => void load()}><RefreshCw className="h-4 w-4" /> Actualiser</Button>} />
    {error && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}
    {message && <div className="mb-4"><Notice tone="info">{message}</Notice></div>}
    <div className="mb-5 grid gap-3 sm:grid-cols-2">
      <Field label="Filtrer par statut" htmlFor="breakdown-status"><select id="breakdown-status" className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm" value={status} onChange={e => setStatus(e.target.value)}><option value="">Tous les statuts</option>{Object.entries(statusLabel).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      <Field label="Filtrer par urgence" htmlFor="breakdown-urgency"><select id="breakdown-urgency" className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm" value={urgency} onChange={e => setUrgency(e.target.value)}><option value="">Toutes les urgences</option><option value="critique">Critique</option><option value="elevee">Élevée</option><option value="moderee">Modérée</option></select></Field>
    </div>
    {loading ? <Card className="p-6 text-sm text-muted">Chargement des signalements…</Card> : reports.length === 0 ? <Card className="p-8 text-center"><AlertTriangle className="mx-auto mb-2 h-8 w-8 text-muted" /><p className="font-semibold">Aucun signalement</p><p className="mt-1 text-sm text-muted">Les nouveaux signalements des transporteurs apparaîtront ici.</p></Card> :
      <div className="space-y-4">{reports.map(r => <Card key={r.id} className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="font-semibold">{kindLabel[r.kind] ?? r.kind} · #{r.id}</p><p className="mt-1 text-sm text-muted">{r.transport?.offer ? `${r.transport.offer.from} → ${r.transport.offer.to}` : r.transport?.ref ?? 'Transport non renseigné'}</p></div>
          <div className="flex gap-2"><Badge tone={r.urgency === 'critique' ? 'danger' : r.urgency === 'elevee' ? 'pending' : 'neutral'}>{r.urgency === 'critique' ? 'Critique' : r.urgency === 'elevee' ? 'Élevée' : 'Modérée'}</Badge><Badge tone={r.status === 'resolue' || r.status === 'cloturee' ? 'success' : 'neutral'}>{statusLabel[r.status] ?? r.status}</Badge></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 text-sm"><div><p className="text-xs text-muted">Transporteur</p><p className="font-medium">{r.transporter?.displayName || `${r.transporter?.firstName ?? ''} ${r.transporter?.lastName ?? ''}`.trim() || 'Non renseigné'}</p><p className="text-muted">{r.transporter?.phone ?? ''}</p></div><div><p className="text-xs text-muted">Localisation déclarée</p><p className="font-medium">{r.location}</p><p className="text-xs text-muted">{new Date(r.createdAt).toLocaleString('fr-FR')}</p></div></div>
        <p className="whitespace-pre-wrap text-sm">{r.description}</p>
        <Field label="Note administrative" htmlFor={`notes-${r.id}`}><textarea id={`notes-${r.id}`} value={notes[r.id] ?? r.adminNotes ?? ''} onChange={e => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))} rows={2} maxLength={2000} className="w-full rounded-control border border-line bg-surface px-3 py-2 text-sm" placeholder="Action réalisée, contact, suivi…" /></Field>
        <div className="flex flex-wrap gap-2">{Object.entries(statusLabel).map(([v,l]) => <Button key={v} size="sm" variant={r.status === v ? 'primary' : 'outline'} onClick={() => void update(r, v)} disabled={r.status === v}>{l}</Button>)}</div>
      </Card>)}</div>}
  </>
}

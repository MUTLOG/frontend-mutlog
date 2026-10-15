import { useEffect, useState } from 'react'
import { AlertTriangle, Clock3, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { Notice } from '@/components/shared/ui-bits'
import { carrierApi } from '@/services/mutlogApi'

type TransportOption = { id: number | string; ref?: string; status?: string; offer?: { from: string; to: string }; vehicle?: { type?: string; plate?: string } }
type Breakdown = {
  id: number; transportId: number | string | null; kind: string; urgency: string; location: string;
  description: string; status: string; createdAt: string; transport?: { ref?: string; offer?: { from: string; to: string } }
}

const kinds = [
  ['mecanique', 'Panne mécanique / moteur'], ['pneu', 'Pneu crevé'], ['accident', 'Accident ou collision'],
  ['carburant', 'Problème de carburant'], ['autre', 'Autre incident'],
]

export default function CarrierBreakdownPage() {
  const [transports, setTransports] = useState<TransportOption[]>([])
  const [reports, setReports] = useState<Breakdown[]>([])
  const [transportId, setTransportId] = useState('')
  const [kind, setKind] = useState('mecanique')
  const [urgency, setUrgency] = useState('elevee')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      const [t, r] = await Promise.all([carrierApi.transports(), carrierApi.breakdowns()])
      const transportRows = Array.isArray(t) ? t as TransportOption[] : (t as { data?: TransportOption[] }).data ?? []
      const reportRows = Array.isArray(r) ? r as Breakdown[] : (r as { data?: Breakdown[] }).data ?? []
      setTransports(transportRows)
      setReports(reportRows)
      if (!transportId && transportRows[0]) setTransportId(String(transportRows[0].id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger les données.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void refresh() }, [])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!transportId) { setError('Sélectionnez le transport concerné.'); return }
    if (location.trim().length < 3) { setError('Indiquez une localisation suffisamment précise.'); return }
    if (description.trim().length < 10) { setError('Décrivez l’incident en au moins 10 caractères.'); return }
    setSaving(true)
    try {
      await carrierApi.createBreakdown({ transportId: Number(transportId), kind, urgency, location: location.trim(), description: description.trim() })
      setLocation(''); setDescription('')
      setSuccess('Signalement enregistré en base de données et transmis à l’administration MUTLOG.')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Le signalement n’a pas pu être enregistré.')
    } finally { setSaving(false) }
  }

  return <>
    <PageHeader title="Signaler une panne" description="Déclarez un incident pendant un transport. Le signalement sera transmis à l’administration." />
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,.9fr)]">
      <Card className="p-5 sm:p-6">
        <div className="mb-4 text-lg font-semibold">Nouveau signalement</div>
        <div className="mb-5"><Notice tone="warning">En cas de danger immédiat, mettez-vous en sécurité et contactez les services d’urgence. Ce formulaire ne remplace pas un appel d’urgence.</Notice></div>
        {error && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}
        {success && <div className="mb-4"><Notice tone="info">{success}</Notice></div>}
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Transport concerné" htmlFor="breakdown-transport" required>
            <select id="breakdown-transport" value={transportId} onChange={e => setTransportId(e.target.value)} className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink">
              <option value="">Sélectionner un transport</option>
              {transports.map(t => <option key={t.id} value={t.id}>{t.offer ? `${t.offer.from} → ${t.offer.to}` : t.ref ?? `Transport #${t.id}`} · {t.status ?? ''}</option>)}
            </select>
          </Field>
          <Field label="Type d’incident" htmlFor="breakdown-kind" required>
            <select id="breakdown-kind" value={kind} onChange={e => setKind(e.target.value)} className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink">{kinds.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
          </Field>
          <Field label="Niveau d’urgence" htmlFor="breakdown-urgency" required>
            <select id="breakdown-urgency" value={urgency} onChange={e => setUrgency(e.target.value)} className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink">
              <option value="moderee">Modérée — véhicule en sécurité</option><option value="elevee">Élevée — transport interrompu</option><option value="critique">Critique — danger ou accident</option>
            </select>
          </Field>
          <Field label="Localisation actuelle" htmlFor="breakdown-location" required>
            <Input id="breakdown-location" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex. : RNIE 2, à 5 km de Bohicon" />
            <span className="mt-1 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3.5 w-3.5" /> Localisation saisie manuellement ; aucun GPS n’est utilisé.</span>
          </Field>
          <Field label="Description de l’incident" htmlFor="breakdown-description" required>
            <textarea id="breakdown-description" value={description} onChange={e => setDescription(e.target.value)} rows={4} maxLength={1000} className="w-full rounded-control border border-line bg-surface px-3 py-2 text-sm text-ink" placeholder="Décrivez l’incident et l’aide nécessaire…" />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le signalement'}</Button>
        </form>
      </Card>
      <Card>
        <div className="border-b border-line p-5 text-lg font-semibold">Mes signalements</div>
        {loading ? <p className="p-5 text-sm text-muted">Chargement…</p> : reports.length === 0 ? <p className="p-5 text-sm text-muted">Aucun signalement enregistré.</p> :
          <ul className="divide-y divide-line">{reports.map(r => <li key={r.id} className="space-y-2 p-5">
            <div className="flex items-start justify-between gap-2"><strong className="text-sm">{kinds.find(([v]) => v === r.kind)?.[1] ?? r.kind}</strong><Badge tone={r.urgency === 'critique' ? 'danger' : r.urgency === 'elevee' ? 'pending' : 'neutral'}>{r.urgency}</Badge></div>
            <p className="text-sm text-muted">{r.transport?.offer ? `${r.transport.offer.from} → ${r.transport.offer.to}` : `Transport #${r.transportId ?? '—'}`}</p>
            <p className="text-sm">{r.location}</p><p className="text-sm text-muted">{r.description}</p>
            <p className="flex items-center gap-1 text-xs text-muted"><Clock3 className="h-3.5 w-3.5" /> {r.status} · {new Date(r.createdAt).toLocaleString('fr-FR')}</p>
          </li>)}</ul>}
      </Card>
    </div>
  </>
}

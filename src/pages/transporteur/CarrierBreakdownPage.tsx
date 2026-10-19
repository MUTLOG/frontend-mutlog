import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Clock3, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { Notice } from '@/components/shared/ui-bits'
import { useResource } from '@/hooks/useResource'
import { errorMessage } from '@/services/api'
import { carrierApi, type AdminTransport, type BreakdownKind, type BreakdownUrgency, type CarrierBreakdown } from '@/services/mutlogApi'

const KINDS: Array<[BreakdownKind, string]> = [
  ['mecanique', 'Panne mécanique / moteur'], ['pneu', 'Pneu crevé'], ['accident', 'Accident ou collision'],
  ['carburant', 'Problème de carburant'], ['autre', 'Autre incident'],
]
const STATUS: Record<CarrierBreakdown['status'], string> = { en_attente: 'En attente', prise_en_charge: 'Prise en charge', resolue: 'Résolue', cloturee: 'Clôturée' }
/** Une panne ne peut être signalée que sur un transport qui n'est ni livré, ni terminé, ni annulé. */
const REPORTABLE = ['confirmee', 'en_cours', 'arrive_destination']
const NO_TRANSPORTS: AdminTransport[] = []
const NO_REPORTS: CarrierBreakdown[] = []
const field = 'h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink'

export default function CarrierBreakdownPage() {
  const [params] = useSearchParams()
  const transports = useResource(() => carrierApi.transports(), NO_TRANSPORTS)
  const reports = useResource(() => carrierApi.breakdowns(), NO_REPORTS)
  const options = useMemo(() => transports.data.filter((t) => REPORTABLE.includes(t.status)), [transports.data])
  const [chosen, setChosen] = useState(params.get('transport') ?? '')
  const [kind, setKind] = useState<BreakdownKind>('mecanique')
  const [urgency, setUrgency] = useState<BreakdownUrgency>('elevee')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  // Transport sélectionné : celui choisi, sinon le premier signalable (jamais un transport terminé ou annulé).
  const transportId = options.some((t) => String(t.id) === chosen) ? chosen : options[0] ? String(options[0].id) : ''
  const selected = options.find((t) => String(t.id) === transportId)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!transportId) { setError('Aucun transport en cours ou confirmé : il n’y a rien à signaler.'); return }
    if (selected?.breakdown) { setError('Une panne est déjà signalée pour ce transport et en cours de traitement par MUTLOG.'); return }
    if (location.trim().length < 3) { setError('Indiquez une localisation suffisamment précise.'); return }
    if (description.trim().length < 10) { setError('Décrivez l’incident en au moins 10 caractères.'); return }
    setSaving(true)
    try {
      const res = await carrierApi.createBreakdown({ transportId: Number(transportId), kind, urgency, location: location.trim(), description: description.trim() })
      setLocation(''); setDescription('')
      setSuccess(res.message ?? 'Signalement enregistré et transmis à l’administration MUTLOG.')
      reports.reload()
      transports.reload()
    } catch (cause) {
      setError(errorMessage(cause, 'Le signalement n’a pas pu être enregistré.'))
    } finally { setSaving(false) }
  }

  return <>
    <PageHeader title="Signaler une panne" description="Déclarez un incident pendant un transport. Les clients concernés et l’administration sont prévenus immédiatement." />
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,.9fr)]">
      <Card className="p-5 sm:p-6">
        <div className="mb-4 text-lg font-semibold">Nouveau signalement</div>
        <div className="mb-5"><Notice tone="warning">En cas de danger immédiat, mettez-vous en sécurité et contactez les services d’urgence. Ce formulaire ne remplace pas un appel d’urgence.</Notice></div>
        {(error || transports.error || reports.error) && <div className="mb-4"><Notice tone="danger">{error || transports.error || reports.error}</Notice></div>}
        {success && <div className="mb-4"><Notice tone="info">{success}</Notice></div>}
        {transports.loaded && options.length === 0 && <div className="mb-4"><Notice>Vous n’avez aucun transport confirmé ou en cours : une panne ne peut être signalée que pendant un transport.</Notice></div>}
        {selected?.breakdown && <div className="mb-4"><Notice tone="warning">Une panne est déjà signalée pour ce transport ({STATUS[selected.breakdown.status as CarrierBreakdown['status']] ?? selected.breakdown.status}). Vous pourrez en signaler une nouvelle une fois celle-ci résolue.</Notice></div>}
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Transport concerné" htmlFor="breakdown-transport" required>
            <select id="breakdown-transport" value={transportId} onChange={(e) => setChosen(e.target.value)} className={field}>
              <option value="">Sélectionner un transport</option>
              {options.map((t) => <option key={t.id} value={t.id}>{t.offer.from} → {t.offer.to} · {t.ref}</option>)}
            </select>
          </Field>
          <Field label="Type d’incident" htmlFor="breakdown-kind" required>
            <select id="breakdown-kind" value={kind} onChange={(e) => setKind(e.target.value as BreakdownKind)} className={field}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </Field>
          <Field label="Niveau d’urgence" htmlFor="breakdown-urgency" required>
            <select id="breakdown-urgency" value={urgency} onChange={(e) => setUrgency(e.target.value as BreakdownUrgency)} className={field}>
              <option value="moderee">Modérée — véhicule en sécurité</option><option value="elevee">Élevée — transport interrompu</option><option value="critique">Critique — danger ou accident</option>
            </select>
          </Field>
          <Field label="Localisation actuelle" htmlFor="breakdown-location" required>
            <Input id="breakdown-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex. : RNIE 2, à 5 km de Bohicon" />
            <span className="mt-1 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3.5 w-3.5" /> Localisation saisie manuellement ; aucun GPS n’est utilisé.</span>
          </Field>
          <Field label="Description de l’incident" htmlFor="breakdown-description" required>
            <textarea id="breakdown-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={1000} className="w-full rounded-control border border-line bg-surface px-3 py-2 text-sm" placeholder="Ce qui s’est passé, l’état du véhicule et de la marchandise, l’aide dont vous avez besoin…" />
            <span className="mt-1 block text-xs text-muted">Visible par MUTLOG uniquement. Les clients reçoivent le type d’incident, l’urgence et le lieu.</span>
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={saving || !transportId || Boolean(selected?.breakdown)}>{saving ? 'Enregistrement…' : 'Enregistrer le signalement'}</Button>
        </form>
      </Card>
      <Card>
        <div className="border-b border-line p-5 text-lg font-semibold">Mes signalements</div>
        {!reports.loaded ? <p className="p-5 text-sm text-muted" role="status">Chargement…</p> : reports.data.length === 0 ? <p className="p-5 text-sm text-muted">Aucun signalement enregistré.</p> :
          <ul className="divide-y divide-line">{reports.data.map((r) => <li key={r.id} className="space-y-2 p-5">
            <div className="flex items-start justify-between gap-2"><strong className="text-sm">{KINDS.find(([v]) => v === r.kind)?.[1] ?? r.kind}</strong><Badge tone={r.urgency === 'critique' ? 'danger' : r.urgency === 'elevee' ? 'pending' : 'neutral'}>{r.urgency === 'critique' ? 'Critique' : r.urgency === 'elevee' ? 'Élevée' : 'Modérée'}</Badge></div>
            <p className="text-sm text-muted">{r.transport?.offer ? `${r.transport.offer.from} → ${r.transport.offer.to}` : `Transport #${r.transportId ?? '—'}`}{r.transport?.ref ? ` · ${r.transport.ref}` : ''}</p>
            <p className="text-sm">{r.location}</p><p className="text-sm text-muted">{r.description}</p>
            {r.adminNotes && <p className="rounded-control bg-background p-2 text-xs text-ink">MUTLOG : {r.adminNotes}</p>}
            <p className="flex items-center gap-1 text-xs text-muted"><Clock3 className="h-3.5 w-3.5" /> {STATUS[r.status] ?? r.status} · {new Date(r.createdAt).toLocaleString('fr-FR')}</p>
          </li>)}</ul>}
      </Card>
    </div>
  </>
}

import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Paperclip, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { MatchCard } from '@/components/matching/MatchCard'
import { StatusStepper } from '@/components/tracking/StatusStepper'
import { EmptyState, fmtDate, fmtT, GOODS_LABEL, GOODS_OPTIONS, Notice, offerPriceLabel, RequestStatusBadge, ReservationBadge, Tabs, useFlash } from '@/components/shared/ui-bits'
import { ask } from '@/components/shared/confirm'
import { useAuth } from '@/features/auth/useAuth'
import { CITIES } from '@/domain/geo'
import { formatPhone } from '@/domain/phone'
import type { GoodsType } from '@/domain/types'
import { today } from '@/lib/format'
import { useResource } from '@/hooks/useResource'
import { errorMessage } from '@/services/api'
import { clientApi, type ClientRequest, type ClientRequestDetail } from '@/services/mutlogApi'

const selectCls = 'h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink focus-visible:border-primary-2'

type Tab = 'toutes' | 'recherche' | 'mutualisation' | 'confirmees' | 'annulees'
const NO_REQUESTS: ClientRequest[] = []

export function ClientRequestsPage() {
  const [tab, setTab] = useState<Tab>('toutes')
  const requests = useResource(() => clientApi.requests('?per_page=100'), NO_REQUESTS)
  const all = useMemo(() => [...requests.data].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')), [requests.data])
  const groups: Record<Tab, (s: string) => boolean> = {
    toutes: () => true, recherche: (s) => ['demande', 'recherche'].includes(s), mutualisation: (s) => s === 'mutualisation',
    confirmees: (s) => ['confirmee', 'en_cours', 'arrive_destination', 'livree', 'terminee'].includes(s), annulees: (s) => s === 'annule',
  }
  const rows = all.filter((r) => groups[tab](r.status))
  const count = (t: Tab) => all.filter((r) => groups[t](r.status)).length
  return (
    <>
      <PageHeader title="Mes demandes" description="Toutes vos demandes de transport et leur avancement." action={<Button asChild size="lg"><Link to="/client/demandes/nouvelle">Publier une demande</Link></Button>} />
      {requests.error && <div className="mb-4"><Notice tone="danger">{requests.error}</Notice></div>}
      <Tabs value={tab} onChange={setTab} tabs={[
        { key: 'toutes', label: 'Toutes', count: count('toutes') }, { key: 'recherche', label: 'En recherche', count: count('recherche') },
        { key: 'mutualisation', label: 'Mutualisation', count: count('mutualisation') }, { key: 'confirmees', label: 'Confirmées', count: count('confirmees') },
        { key: 'annulees', label: 'Annulées', count: count('annulees') },
      ]} />
      <Card>
        {!requests.loaded ? <p className="px-5 py-6 text-sm text-muted" role="status">Chargement…</p> : rows.length === 0 ? <EmptyState title="Aucune demande dans cette catégorie" /> : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id}>
                <Link to={`/client/demandes/${r.id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-background/70">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{r.from} → {r.to}</span>
                    <span className="block text-sm text-muted">{fmtDate(r.date)} · {fmtT(r.weightT)} · {GOODS_LABEL[r.goods]}</span>
                  </span>
                  <RequestStatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}

export function NewRequestPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [qs] = useSearchParams()
  const [f, setF] = useState({
    from: qs.get('from') ?? user!.city, to: qs.get('to') ?? '', date: qs.get('date') ?? '', goods: 'agricoles' as GoodsType, weightT: '', volumeM3: '', parcels: '',
    description: '', requirements: '', contact: user!.phone,
  })
  const [files, setFiles] = useState<string[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))
  const known = (c: string) => !c || CITIES.some((x) => x.name.toLowerCase() === c.trim().toLowerCase())

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? [])
    if (list.some((x) => x.size > 5 * 1024 * 1024)) return setError('Chaque fichier doit faire moins de 5 Mo.')
    setError(''); setFiles(list.slice(0, 3).map((x) => x.name)) // V1 : seuls les noms sont transmis ; le backend stockera les fichiers (S3)
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    const weight = Number(f.weightT.replace(',', '.'))
    const payload = {
      from: f.from.trim(), to: f.to.trim(), date: f.date, goods: f.goods, weightT: weight,
      volumeM3: f.volumeM3 ? Number(f.volumeM3.replace(',', '.')) : undefined, parcels: f.parcels ? Number(f.parcels) : undefined,
      description: f.description.trim(), requirements: f.requirements.trim() || undefined, attachments: files, contact: f.contact.trim(),
    }
    setBusy(true)
    setError('')
    try {
      await clientApi.createRequest(payload)
      navigate('/client/demandes', { state: { created: true } })
    } catch (cause) {
      setError(errorMessage(cause, 'Publication de la demande impossible.'))
      setBusy(false)
    }
  }
  return (
    <>
      <PageHeader title="Publier une demande de transport" description="Quelques informations suffisent. MUTLOG cherche ensuite les transports compatibles." />
      <form onSubmit={submit} noValidate>
        <Card className="max-w-3xl space-y-5 p-5 sm:p-6">
          {error && <Notice tone="danger">{error}</Notice>}
          <datalist id="villes">{CITIES.map((c) => <option key={c.name} value={c.name} />)}</datalist>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Point de départ" htmlFor="from" required error={!known(f.from) ? 'Localité non reconnue : la carte et la recherche par proximité seront limitées.' : undefined}>
              <Input id="from" list="villes" className="h-11" value={f.from} onChange={(e) => set('from', e.target.value)} placeholder="Ville de départ" />
            </Field>
            <Field label="Destination" htmlFor="to" required error={!known(f.to) ? 'Localité non reconnue : la carte et la recherche par proximité seront limitées.' : undefined}>
              <Input id="to" list="villes" className="h-11" value={f.to} onChange={(e) => set('to', e.target.value)} placeholder="Ville d'arrivée" />
            </Field>
            <Field label="Date souhaitée" htmlFor="date" required><Input id="date" type="date" className="h-11" min={today()} value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
            <Field label="Type de marchandise" htmlFor="goods" required>
              <select id="goods" className={selectCls} value={f.goods} onChange={(e) => set('goods', e.target.value as GoodsType)}>{GOODS_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </Field>
            <Field label="Poids (tonnes)" htmlFor="w" required hint="Ex. 1 ou 2,5"><Input id="w" inputMode="decimal" className="h-11" value={f.weightT} onChange={(e) => set('weightT', e.target.value)} /></Field>
            <Field label="Nombre de colis" htmlFor="p"><Input id="p" inputMode="numeric" className="h-11" value={f.parcels} onChange={(e) => set('parcels', e.target.value)} /></Field>
            <Field label="Volume (m³), si nécessaire" htmlFor="v"><Input id="v" inputMode="decimal" className="h-11" value={f.volumeM3} onChange={(e) => set('volumeM3', e.target.value)} /></Field>
            <Field label="Contact (téléphone)" htmlFor="c" required><Input id="c" inputMode="tel" className="h-11" value={f.contact} onChange={(e) => set('contact', e.target.value)} /></Field>
          </div>
          <Field label="Description de la marchandise" htmlFor="d"><textarea id="d" rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} className="w-full rounded-control border border-line bg-surface p-3 text-sm focus-visible:border-primary-2" placeholder="Ex. 20 sacs de maïs" /></Field>
          <Field label="Exigences particulières" htmlFor="r"><Input id="r" className="h-11" value={f.requirements} onChange={(e) => set('requirements', e.target.value)} placeholder="Ex. produits à garder au sec" /></Field>
          <div>
            <label htmlFor="file" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink"><Paperclip className="h-4 w-4" aria-hidden="true" /> Photo ou document (facultatif)</label>
            <input id="file" type="file" multiple accept="image/*,.pdf" onChange={onFiles} className="block w-full text-sm text-muted file:mr-3 file:rounded-control file:border-0 file:bg-primary-soft file:px-4 file:py-2.5 file:font-semibold file:text-primary" />
            {files.length > 0 && <p className="mt-1 text-xs text-muted">{files.join(', ')}</p>}
          </div>
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy}>Publier ma demande</Button>
        </Card>
      </form>
    </>
  )
}

export function RequestDetailPage() {
  const { id } = useParams()
  const flash = useFlash()
  const [busy, setBusy] = useState(false)
  const detail = useResource(() => clientApi.request(id!), null as ClientRequestDetail | null, [id])
  const r = detail.data

  if (!detail.loaded) return <p className="text-sm text-muted" role="status">Chargement…</p>
  if (!r) return <Notice tone="danger">{detail.errorStatus === 404 || detail.errorStatus === 403 ? 'Demande introuvable.' : detail.error || 'Demande introuvable.'}</Notice>

  const matches = r.matches ?? []
  const reservations = r.reservations ?? []
  const share = r.share

  const reserve = async (offerId: ClientRequestDetail['matches'][number]['offer']['id']) => {
    if (busy) return
    setBusy(true)
    try {
      await clientApi.reserve(r.id, offerId)
      flash.ok('Réservation envoyée : elle est en attente de regroupement et de confirmation.')
      detail.reload()
    } catch (cause) {
      flash.err(errorMessage(cause, 'Réservation impossible.'))
    } finally {
      setBusy(false)
    }
  }
  const cancel = async () => {
    if (busy) return
    if (!(await ask({ message: 'Annuler cette demande ?', confirmLabel: 'Annuler la demande' }))) return
    setBusy(true)
    try {
      await clientApi.cancelRequest(r.id)
      flash.ok('Demande annulée.')
      detail.reload()
    } catch (cause) {
      flash.err(errorMessage(cause, 'Annulation impossible.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title={`${r.from} → ${r.to}`} description={`${fmtDate(r.date)} · ${fmtT(r.weightT)} · ${GOODS_LABEL[r.goods]}`} action={<RequestStatusBadge status={r.status} matchCount={r.status === 'recherche' ? matches.length : undefined} />} />
      <div className="space-y-6">
        {flash.node}
        {detail.error && <Notice tone="danger">{detail.error}</Notice>}
        <Card className="p-5">
          <StatusStepper status={r.status === 'demande' ? 'recherche' : r.status} />
        </Card>

        {matches.length > 0 && (
          <Card>
            <CardHeader title="Correspondances trouvées" />
            <ul className="mt-3 divide-y divide-line">
              {matches.map((m) => {
                const p = offerPriceLabel(m.offer)
                const pending = reservations.some((x) => String(x.offerId) === String(m.offer.id) && x.status === 'en_attente')
                return (
                  <li key={m.offer.id}>
                    <MatchCard m={m} transporter={m.offer.transporter?.displayName} price={`${p.amount} ${p.unit}`}
                      actions={<><Button asChild variant="outline"><Link to={`/client/transports/${m.offer.id}`}>Voir le transport</Link></Button><Button disabled={pending || busy} onClick={() => reserve(m.offer.id)}>{pending ? 'En attente' : 'Réserver'}</Button></>} />
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
        {r.status === 'recherche' && matches.length === 0 && <Notice>Aucun transport compatible pour le moment. Vous serez notifié dès qu'une correspondance sera disponible.</Notice>}

        {reservations.length > 0 && (
          <Card>
            <CardHeader title="Mes réservations pour cette demande" />
            <ul className="mt-3 divide-y divide-line">
              {reservations.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span>{x.offer?.from} → {x.offer?.to} · {x.offer && fmtDate(x.offer.date)}</span>
                  <ReservationBadge status={x.status} />
                </li>
              ))}
            </ul>
          </Card>
        )}

        {share && (
          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Ma participation</h2>
            <p className="mt-2 text-2xl font-bold text-primary">{share.payable.toLocaleString('fr-FR')} FCFA</p>
            <p className="text-sm text-muted">Part du prix du transport : {share.amount.toLocaleString('fr-FR')} FCFA{share.payable > share.amount ? ` + commission MUTLOG ${(share.payable - share.amount).toLocaleString('fr-FR')} FCFA` : ''}</p>
            {r.transportId && <Button asChild className="mt-4"><Link to={`/client/expeditions/${r.transportId}`}>Suivre le transport</Link></Button>}
          </Card>
        )}

        <Card className="p-5 text-sm">
          <h2 className="text-base font-semibold text-ink">Détails de la demande</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {([['Colis', r.parcels ?? '—'], ['Volume', r.volumeM3 ? `${r.volumeM3} m³` : '—'], ['Contact', formatPhone(r.contact)], ['Description', r.description || '—'], ['Exigences', r.requirements || '—'], ['Pièces jointes', (r.attachments ?? []).join(', ') || '—']] as const).map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>)}
          </dl>
          {['demande', 'recherche', 'mutualisation'].includes(r.status) && <Button variant="outline" className="mt-5" disabled={busy} onClick={cancel}><X className="h-4 w-4" /> Annuler la demande</Button>}
        </Card>
      </div>
    </>
  )
}

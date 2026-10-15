import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Paperclip, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { MatchCard } from '@/components/matching/MatchCard'
import { StatusStepper } from '@/components/tracking/StatusStepper'
import { EmptyState, fmtDate, fmtT, GOODS_LABEL, GOODS_OPTIONS, Notice, offerPriceLabel, RequestBadge, Tabs, useFlash } from '@/components/shared/ui-bits'
import { ask } from '@/components/shared/confirm'
import { useAuth } from '@/features/auth/useAuth'
import { CITIES } from '@/domain/geo'
import { formatPhone } from '@/domain/phone'
import { findMatches } from '@/domain/matching'
import type { GoodsType } from '@/domain/types'
import { today, userName } from '@/store/logic'
import * as L from '@/store/logic'
import { run } from '@/store/store'
import { apiEnabled } from '@/services/api'
import { clientApi } from '@/services/mutlogApi'
import type { TransportRequest } from '@/domain/types'

const selectCls = 'h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink focus-visible:border-primary-2'

type Tab = 'toutes' | 'recherche' | 'mutualisation' | 'confirmees' | 'annulees'

export function ClientRequestsPage() {
  const { db, user } = useAuth()
  const [tab, setTab] = useState<Tab>('toutes')
  const [remoteRequests, setRemoteRequests] = useState<TransportRequest[]>([])
  const [remoteError, setRemoteError] = useState('')
  useEffect(() => {
    if (!apiEnabled) return
    let cancelled = false
    clientApi.requests().then((result) => {
      const payload = result as { data?: Array<Record<string, unknown>> } | Array<Record<string, unknown>>
      const items = Array.isArray(payload) ? payload : payload.data ?? []
      if (cancelled) return
      setRemoteRequests(items.map((item) => ({
        id: String(item.id), clientId: String(user!.id), from: String(item.from ?? ''), to: String(item.to ?? ''),
        date: String(item.date ?? ''), goods: String(item.goods ?? 'generales') as GoodsType, weightT: Number(item.weightT ?? 0),
        volumeM3: item.volumeM3 == null ? undefined : Number(item.volumeM3), parcels: item.parcels == null ? undefined : Number(item.parcels),
        description: String(item.description ?? ''), requirements: item.requirements ? String(item.requirements) : undefined,
        attachments: Array.isArray(item.attachments) ? item.attachments.map(String) : [], contact: String(item.contact ?? ''),
        status: String(item.status ?? 'recherche') as TransportRequest['status'], poolingId: item.poolingId ? String(item.poolingId) : undefined,
        createdAt: String(item.createdAt ?? ''),
      })))
      setRemoteError('')
    }).catch((error: unknown) => { if (!cancelled) setRemoteError(error instanceof Error ? error.message : 'Chargement des demandes impossible.') })
    return () => { cancelled = true }
  }, [user?.id])
  const all = (apiEnabled ? remoteRequests : db.requests.filter((r) => r.clientId === user!.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const groups: Record<Tab, (s: string) => boolean> = {
    toutes: () => true, recherche: (s) => ['demande', 'recherche'].includes(s), mutualisation: (s) => s === 'mutualisation',
    confirmees: (s) => ['confirmee', 'en_cours', 'arrive_destination', 'livree', 'terminee'].includes(s), annulees: (s) => s === 'annule',
  }
  const rows = all.filter((r) => groups[tab](r.status))
  const count = (t: Tab) => all.filter((r) => groups[t](r.status)).length
  return (
    <>
      <PageHeader title="Mes demandes" description="Toutes vos demandes de transport et leur avancement." action={<Button asChild size="lg"><Link to="/client/demandes/nouvelle">Publier une demande</Link></Button>} />
      {remoteError && <Notice tone="danger">{remoteError}</Notice>}
      <Tabs value={tab} onChange={setTab} tabs={[
        { key: 'toutes', label: 'Toutes', count: count('toutes') }, { key: 'recherche', label: 'En recherche', count: count('recherche') },
        { key: 'mutualisation', label: 'Mutualisation', count: count('mutualisation') }, { key: 'confirmees', label: 'Confirmées', count: count('confirmees') },
        { key: 'annulees', label: 'Annulées', count: count('annulees') },
      ]} />
      <Card>
        {rows.length === 0 ? <EmptyState title="Aucune demande dans cette catégorie" /> : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id}>
                <Link to={`/client/demandes/${r.id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-background/70">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{r.from} → {r.to}</span>
                    <span className="block text-sm text-muted">{fmtDate(r.date)} · {fmtT(r.weightT)} · {GOODS_LABEL[r.goods]}</span>
                  </span>
                  <RequestBadge db={db} r={r} />
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
  const { db, user } = useAuth()
  const navigate = useNavigate()
  const [qs] = useSearchParams()
  const [f, setF] = useState({
    from: qs.get('from') ?? user!.city, to: qs.get('to') ?? '', date: qs.get('date') ?? '', goods: 'agricoles' as GoodsType, weightT: '', volumeM3: '', parcels: '',
    description: '', requirements: '', contact: user!.phone,
  })
  const [files, setFiles] = useState<string[]>([])
  const [error, setError] = useState('')
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))
  const known = (c: string) => !c || CITIES.some((x) => x.name.toLowerCase() === c.trim().toLowerCase())

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? [])
    if (list.some((x) => x.size > 5 * 1024 * 1024)) return setError('Chaque fichier doit faire moins de 5 Mo.')
    setError(''); setFiles(list.slice(0, 3).map((x) => x.name)) // V1 démo : noms conservés ; le backend stockera les fichiers (S3)
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const weight = Number(f.weightT.replace(',', '.'))
    const payload = {
      from: f.from.trim(), to: f.to.trim(), date: f.date, goods: f.goods, weightT: weight,
      volumeM3: f.volumeM3 ? Number(f.volumeM3.replace(',', '.')) : undefined, parcels: f.parcels ? Number(f.parcels) : undefined,
      description: f.description.trim(), requirements: f.requirements.trim() || undefined, attachments: files, contact: f.contact.trim(),
    }
    if (apiEnabled) {
      try {
        await clientApi.createRequest(payload)
        navigate('/client/demandes', { state: { created: true } })
      } catch (error) { setError(error instanceof Error ? error.message : 'Publication de la demande impossible.') }
      return
    }
    const res = run((d) => L.createRequest(d, user!.id, payload))
    if (!res.ok) return setError(res.error)
    navigate(`/client/demandes/${res.value.id}`, { state: { created: true } })
  }
  void db
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
          <Button type="submit" size="lg" className="w-full sm:w-auto">Publier ma demande</Button>
        </Card>
      </form>
    </>
  )
}

export function RequestDetailPage() {
  const { id } = useParams()
  const { db, user } = useAuth()
  const flash = useFlash()
  const r = db.requests.find((x) => x.id === id && x.clientId === user!.id)
  if (!r) return <Notice tone="danger">Demande introuvable.</Notice>

  const matches = r.status === 'recherche' ? findMatches(r, db.offers, db.settings, (tid) => db.users.find((u) => u.id === tid)?.status === 'actif') : []
  const reservations = db.reservations.filter((x) => x.requestId === r.id)
  const pooling = r.poolingId ? db.poolings.find((p) => p.id === r.poolingId) : undefined
  const transport = pooling?.transportId ? db.transports.find((t) => t.id === pooling.transportId) : undefined
  const share = pooling?.shares.find((s) => s.requestId === r.id)

  const reserve = (offerId: string) => {
    const res = run((d) => L.reserve(d, user!.id, r.id, offerId))
    res.ok ? flash.ok('Réservation envoyée : elle est en attente de regroupement et de confirmation.') : flash.err(res.error)
  }
  const cancel = async () => {
    if (!(await ask({ message: 'Annuler cette demande ?', confirmLabel: 'Annuler la demande' }))) return
    const res = run((d) => L.cancelRequest(d, user!.id, r.id))
    res.ok ? flash.ok('Demande annulée.') : flash.err(res.error)
  }

  return (
    <>
      <PageHeader title={`${r.from} → ${r.to}`} description={`${fmtDate(r.date)} · ${fmtT(r.weightT)} · ${GOODS_LABEL[r.goods]}`} action={<RequestBadge db={db} r={r} />} />
      <div className="space-y-6">
        {flash.node}
        <Card className="p-5">
          <StatusStepper status={r.status === 'demande' ? 'recherche' : r.status} />
        </Card>

        {matches.length > 0 && (
          <Card>
            <CardHeader title="Correspondances trouvées" />
            <ul className="mt-3 divide-y divide-line">
              {matches.map((m) => {
                const t = db.users.find((u) => u.id === m.offer.transporterId)
                const p = offerPriceLabel(m.offer)
                const pending = reservations.some((x) => x.offerId === m.offer.id && x.status === 'en_attente')
                return (
                  <li key={m.offer.id}>
                    <MatchCard m={m} transporter={userName(t)} price={`${p.amount} ${p.unit}`}
                      actions={<><Button asChild variant="outline"><Link to={`/client/transports/${m.offer.id}`}>Voir le transport</Link></Button><Button disabled={pending} onClick={() => reserve(m.offer.id)}>{pending ? 'En attente' : 'Réserver'}</Button></>} />
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
              {reservations.map((x) => {
                const o = db.offers.find((y) => y.id === x.offerId)
                return <li key={x.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><span>{o?.from} → {o?.to} · {o && fmtDate(o.date)}</span><Badge tone={x.status === 'confirmee' ? 'success' : x.status === 'en_attente' ? 'pending' : 'danger'}>{{ en_attente: 'En attente', confirmee: 'Confirmée', refusee: 'Refusée', annulee: 'Annulée' }[x.status]}</Badge></li>
              })}
            </ul>
          </Card>
        )}

        {share && (
          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">Ma participation</h2>
            <p className="mt-2 text-2xl font-bold text-primary">{share.payable.toLocaleString('fr-FR')} FCFA</p>
            <p className="text-sm text-muted">Part du prix du transport : {share.amount.toLocaleString('fr-FR')} FCFA{share.payable > share.amount ? ` + commission MUTLOG ${(share.payable - share.amount).toLocaleString('fr-FR')} FCFA` : ''}</p>
            {transport && <Button asChild className="mt-4"><Link to={`/client/expeditions/${transport.id}`}>Suivre le transport {transport.ref}</Link></Button>}
          </Card>
        )}

        <Card className="p-5 text-sm">
          <h2 className="text-base font-semibold text-ink">Détails de la demande</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {([['Colis', r.parcels ?? '—'], ['Volume', r.volumeM3 ? `${r.volumeM3} m³` : '—'], ['Contact', formatPhone(r.contact)], ['Description', r.description || '—'], ['Exigences', r.requirements || '—'], ['Pièces jointes', r.attachments.join(', ') || '—']] as const).map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>)}
          </dl>
          {['demande', 'recherche', 'mutualisation'].includes(r.status) && <Button variant="outline" className="mt-5" onClick={cancel}><X className="h-4 w-4" /> Annuler la demande</Button>}
        </Card>
      </div>
    </>
  )
}

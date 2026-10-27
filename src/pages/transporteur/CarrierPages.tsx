import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, LocateFixed, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { Correspondence } from '@/components/matching/Correspondence'
import { PoolingCard } from '@/components/mutualisation/PoolingCard'
import { StatusBadge } from '@/components/tracking/StatusBadge'
import { StatusStepper } from '@/components/tracking/StatusStepper'
import { DataTable, EmptyState, fmtDate, fmtDateTime, fmtT, GOODS_LABEL, GOODS_OPTIONS, Modal, Notice, offerPriceLabel, PaymentBadge, ReservationBadge, useFlash } from '@/components/shared/ui-bits'
import RouteMap from '@/features/maps/RouteMap'
import { ask } from '@/components/shared/confirm'
import { useAuth } from '@/features/auth/useAuth'
import { CallButton } from '@/features/calls/CallButton'
import { errorMessage, type ApiUser } from '@/services/api'
import {
  adminApi, carrierApi, EMPTY_PUBLIC_SETTINGS, publicApi, sharedApi,
  type AdminPooling, type AdminTransport, type AdminVehicle, type CarrierReservation, type CarrierRevenue, type RemoteOffer,
} from '@/services/mutlogApi'
import { CITIES, findCity } from '@/domain/geo'
import type { GoodsType, PricingMode } from '@/domain/types'
import { formatFCFA, monthLabel, today } from '@/lib/format'
import type { OperationStatus } from '@/types/operation'
import { useResource } from '@/hooks/useResource'

const sel = 'h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink focus-visible:border-primary-2'
const NO_OFFERS: RemoteOffer[] = []
const NO_RESERVATIONS: CarrierReservation[] = []
const NO_POOLINGS: AdminPooling[] = []
const NO_TRANSPORTS: AdminTransport[] = []
const NO_VEHICLES: AdminVehicle[] = []
const NO_OWNERS: ApiUser[] = []
const NO_REVENUE: CarrierRevenue = { netReceived: 0, netPending: 0, commissionPaid: 0, monthly: [] }
const OFFER_STATUS = { ouverte: 'Actif', complete: 'Complet', annulee: 'Annulé', terminee: 'Terminé' } as Record<string, string>
const loading = <p className="text-sm text-muted" role="status">Chargement…</p>
const failure = (message: string, onRetry?: () => void) => (message ? <div className="mb-4"><Notice tone="danger">{message}</Notice>{onRetry && <Button variant="outline" className="mt-2" onClick={onRetry}>Réessayer</Button>}</div> : null)

export function CarrierOffersPage() {
  const offers = useResource(() => carrierApi.offers(), NO_OFFERS)
  const rows = useMemo(() => [...offers.data].sort((a, b) => b.date.localeCompare(a.date)), [offers.data])
  return (
    <>
      <PageHeader title="Mes trajets" description="Vos offres de transport publiées." action={<Button asChild size="lg"><Link to="/transporteur/trajets/nouveau"><Plus className="h-4 w-4" /> Publier un trajet</Link></Button>} />
      {failure(offers.error, offers.reload)}
      {!offers.loaded ? loading : (
        <DataTable rows={rows} rowKey={(o) => String(o.id)} empty={<EmptyState title="Aucun trajet publié" />}
          columns={[
            { header: 'Trajet', cell: (o) => <Link to={`/transporteur/trajets/${o.id}`} className="font-semibold text-primary-2 hover:underline">{o.from} → {o.to}</Link> },
            { header: 'Départ', cell: (o) => fmtDate(o.date) },
            { header: 'Disponible', cell: (o) => `${o.availableT} / ${o.totalCapacityT} t` },
            { header: 'Tarif', cell: (o) => `${offerPriceLabel(o).amount} ${offerPriceLabel(o).unit}` },
            { header: 'Statut', cell: (o) => <Badge tone={o.status === 'ouverte' ? 'success' : o.status === 'annulee' ? 'danger' : 'neutral'}>{OFFER_STATUS[o.status] ?? o.status}</Badge> },
          ]} />
      )}
    </>
  )
}

export function NewOfferPage() {
  const { user } = useAuth()
  const vehicles = useResource(() => carrierApi.vehicles(), NO_VEHICLES)
  const settings = useResource(() => publicApi.settings(), EMPTY_PUBLIC_SETTINGS)
  if (user!.status !== 'actif') return <><PageHeader title="Publier un trajet" /><Notice tone="warning">Votre compte doit être validé par MUTLOG avant de publier un trajet.</Notice></>
  if (!vehicles.loaded) return <><PageHeader title="Publier un trajet" />{loading}</>
  const usable = vehicles.data.filter((v) => v.active)
  if (vehicles.error) return <><PageHeader title="Publier un trajet" />{failure(vehicles.error, vehicles.reload)}</>
  if (!usable.length) return <><PageHeader title="Publier un trajet" /><Notice tone="warning">Enregistrez d'abord un véhicule. <Link to="/transporteur/vehicules" className="underline">Ajouter un véhicule</Link></Notice></>
  return <NewOfferForm vehicles={usable} city={user!.city} commissionPct={settings.data.commissionPct} bearer={settings.data.commissionBearer} />
}

function NewOfferForm({ vehicles, city, commissionPct, bearer }: { vehicles: AdminVehicle[]; city: string; commissionPct: number; bearer: 'transporteur' | 'clients' }) {
  const navigate = useNavigate()
  const first = vehicles[0]
  const [f, setF] = useState({
    vehicleId: String(first.id), from: city, to: '', date: '', total: String(first.capacityT), avail: String(first.capacityT), mode: 'tonne' as PricingMode, price: '',
    goods: first.goodsAccepted as GoodsType[], notes: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))
  const pick = (id: string) => { const v = vehicles.find((x) => String(x.id) === id); setF((p) => ({ ...p, vehicleId: id, total: String(v?.capacityT ?? ''), avail: String(v?.capacityT ?? ''), goods: v?.goodsAccepted ?? p.goods })) }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const offer = await carrierApi.createOffer({
        vehicleId: Number(f.vehicleId), from: f.from.trim(), to: f.to.trim(), date: f.date, totalCapacityT: Number(f.total.replace(',', '.')), availableT: Number(f.avail.replace(',', '.')),
        goodsAccepted: f.goods, pricingMode: f.mode, price: Number(f.price.replace(/\s/g, '')), notes: f.notes.trim() || undefined,
      })
      navigate(`/transporteur/trajets/${offer.id}`)
    } catch (cause) {
      setError(errorMessage(cause, 'Publication impossible.'))
      setBusy(false)
    }
  }
  return (
    <>
      <PageHeader title="Publier un trajet" description="Indiquez l'itinéraire, la capacité disponible et votre tarif." />
      <form onSubmit={submit} noValidate>
        <Card className="max-w-3xl space-y-5 p-5 sm:p-6">
          {error && <Notice tone="danger">{error}</Notice>}
          <datalist id="villes">{CITIES.map((c) => <option key={c.name} value={c.name} />)}</datalist>
          <Field label="Véhicule" htmlFor="v" required><select id="v" className={sel} value={f.vehicleId} onChange={(e) => pick(e.target.value)}>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.type} — {v.plate}</option>)}</select></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Départ" htmlFor="from" required><Input id="from" list="villes" className="h-11" value={f.from} onChange={(e) => set('from', e.target.value)} /></Field>
            <Field label="Destination" htmlFor="to" required><Input id="to" list="villes" className="h-11" value={f.to} onChange={(e) => set('to', e.target.value)} /></Field>
            <Field label="Date de départ" htmlFor="date" required><Input id="date" type="date" min={today()} className="h-11" value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
            <div />
            <Field label="Capacité totale (tonnes)" htmlFor="t" required><Input id="t" inputMode="decimal" className="h-11" value={f.total} onChange={(e) => set('total', e.target.value)} /></Field>
            <Field label="Capacité disponible (tonnes)" htmlFor="a" required><Input id="a" inputMode="decimal" className="h-11" value={f.avail} onChange={(e) => set('avail', e.target.value)} /></Field>
            <Field label="Mode de tarification" htmlFor="m"><select id="m" className={sel} value={f.mode} onChange={(e) => set('mode', e.target.value as PricingMode)}><option value="tonne">Par tonne</option><option value="forfait">Forfait pour le trajet</option></select></Field>
            <Field label={f.mode === 'tonne' ? 'Prix par tonne (FCFA)' : 'Prix du trajet (FCFA)'} htmlFor="p" required><Input id="p" inputMode="numeric" className="h-11" value={f.price} onChange={(e) => set('price', e.target.value)} /></Field>
          </div>
          <fieldset><legend className="mb-2 text-sm font-medium text-ink">Marchandises acceptées</legend>
            <div className="flex flex-wrap gap-2">{GOODS_OPTIONS.map(([k, l]) => <label key={k} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${f.goods.includes(k) ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink'}`}><input type="checkbox" className="sr-only" checked={f.goods.includes(k)} onChange={() => set('goods', f.goods.includes(k) ? f.goods.filter((g) => g !== k) : [...f.goods, k])} />{l}</label>)}</div>
          </fieldset>
          <Field label="Informations complémentaires" htmlFor="n"><Input id="n" className="h-11" value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
          {commissionPct > 0 && <Notice>MUTLOG perçoit une commission de {commissionPct} % ({bearer === 'transporteur' ? 'prélevée sur votre montant' : 'ajoutée au prix payé par les clients'}).</Notice>}
          <Button type="submit" size="lg" disabled={busy}>Publier mon offre</Button>
        </Card>
      </form>
    </>
  )
}

export function OfferDetailPage() {
  const { id } = useParams()
  const flash = useFlash()
  const [busy, setBusy] = useState(false)
  const detail = useResource(() => carrierApi.offer(id!), null as Awaited<ReturnType<typeof carrierApi.offer>> | null, [id])
  const o = detail.data
  if (!detail.loaded) return loading
  if (!o) return <Notice tone="danger">{detail.errorStatus === 403 || detail.errorStatus === 404 ? 'Trajet introuvable.' : detail.error || 'Trajet introuvable.'}</Notice>
  const p = offerPriceLabel(o)
  const cancel = async () => {
    if (busy || !(await ask({ message: 'Annuler ce trajet ?', confirmLabel: 'Annuler le trajet' }))) return
    setBusy(true)
    try {
      await carrierApi.cancelOffer(o.id)
      flash.ok('Trajet annulé.')
      detail.reload()
    } catch (cause) {
      flash.err(errorMessage(cause, 'Annulation impossible.'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <PageHeader title={`${o.from} → ${o.to}`} description={`Départ le ${fmtDate(o.date)} · ${p.amount} ${p.unit}`} action={<Badge tone={o.status === 'ouverte' ? 'success' : 'neutral'}>{OFFER_STATUS[o.status] ?? o.status}</Badge>} />
      <div className="space-y-6">
        {flash.node}
        {o.compatibleRequests > 0 && <Correspondence offer={o} count={o.compatibleRequests} />}
        <RouteMap from={o.from} to={o.to} height={300} />
        <Card className="p-5 text-sm"><p>Capacité : <strong>{fmtT(o.availableT)}</strong> disponibles sur {fmtT(o.totalCapacityT)} · {o.goodsAccepted.map((g) => GOODS_LABEL[g as GoodsType] ?? g).join(', ')}</p>
          {['ouverte', 'complete'].includes(o.status) && <Button variant="outline" className="mt-4" disabled={busy} onClick={cancel}>Annuler le trajet</Button>}</Card>
        <Card><CardHeader title="Réservations liées" />
          {o.reservations.length === 0 ? <EmptyState title="Aucune réservation pour le moment" /> : (
            <ul className="mt-3 divide-y divide-line">{o.reservations.map((r) => <li key={r.id} className="flex justify-between px-5 py-3 text-sm"><span>{r.request?.client?.firstName ?? 'Client'} · {fmtT(r.weightT)}</span><ReservationBadge status={r.status} /></li>)}</ul>
          )}
        </Card>
      </div>
    </>
  )
}

/** Accepter / refuser un regroupement validé par MUTLOG ; `onDone` recharge la page. */
function usePoolingAnswer(onDone: () => void) {
  const flash = useFlash()
  const [busy, setBusy] = useState(false)
  const answer = async (id: AdminPooling['id'], accept: boolean) => {
    if (busy) return
    if (!accept && !(await ask({ message: 'Refuser ce regroupement ?', confirmLabel: 'Refuser' }))) return
    setBusy(true)
    try {
      const res = await carrierApi.respondToPooling(id, accept)
      flash.ok(accept ? `Transport confirmé : ${res.transportRef}` : 'Regroupement refusé.')
      onDone()
    } catch (cause) {
      flash.err(errorMessage(cause, 'Réponse impossible.'))
    } finally {
      setBusy(false)
    }
  }
  return { answer, flash, busy }
}

export function ReceivedRequestsPage() {
  const poolings = useResource(() => carrierApi.poolings('?status=validee&per_page=100'), NO_POOLINGS)
  const reservations = useResource(() => carrierApi.reservations(), NO_RESERVATIONS)
  const { answer, flash, busy } = usePoolingAnswer(() => { poolings.reload(); reservations.reload() })
  const waiting = reservations.data.filter((r) => r.status === 'en_attente')
  return (
    <>
      <PageHeader title="Demandes reçues" description="Acceptez ou refusez les regroupements validés par MUTLOG." />
      <div className="space-y-6">
        {flash.node}
        {failure(poolings.error || reservations.error, () => { poolings.reload(); reservations.reload() })}
        {!poolings.loaded ? loading : poolings.data.length === 0 ? <Card><EmptyState title="Aucun regroupement à confirmer" text="Vous serez notifié dès que MUTLOG validera un regroupement sur l'un de vos trajets." /></Card> : poolings.data.map((p) => p.offer && (
          <PoolingCard key={p.id} offer={p.offer} vehicleLabel={p.offer.vehicle?.type} finance={p.finance} status={<Badge tone="pending">À confirmer</Badge>}
            rows={p.shares.map((s) => ({ key: String(s.requestId), label: s.clientName ?? 'Client', weightT: s.weightT, payable: s.amount }))}
            actions={<><Button size="lg" disabled={busy} onClick={() => answer(p.id, true)}>Accepter</Button><Button size="lg" variant="outline" disabled={busy} onClick={() => answer(p.id, false)}>Refuser</Button><Button size="lg" variant="ghost" asChild><Link to={`/transporteur/demandes/${p.id}`}>Détails</Link></Button></>} />
        ))}
        {waiting.length > 0 && <Card><CardHeader title="Réservations en attente de regroupement" /><ul className="mt-3 divide-y divide-line">{waiting.map((r) => <li key={r.id} className="flex justify-between gap-3 px-5 py-3 text-sm"><span>{r.offer?.from} → {r.offer?.to} · {fmtT(r.weightT)}</span><span className="text-muted">MUTLOG prépare le regroupement</span></li>)}</ul></Card>}
      </div>
    </>
  )
}

/** Détails d'une demande reçue (direction UI/UX §1) : trajet, marchandises de chaque client, exigences, montants. */
export function ReceivedRequestDetailPage() {
  const { id } = useParams()
  const detail = useResource(() => carrierApi.pooling(id!), null as Awaited<ReturnType<typeof carrierApi.pooling>> | null, [id])
  const { answer, flash, busy } = usePoolingAnswer(() => detail.reload())
  const p = detail.data
  if (!detail.loaded) return loading
  if (!p || !p.offer) return <Notice tone="danger">{detail.errorStatus === 403 || detail.errorStatus === 404 ? 'Demande introuvable.' : detail.error || 'Demande introuvable.'}</Notice>
  const o = p.offer
  return (
    <>
      <PageHeader title={`${o.from} → ${o.to}`} description={`Regroupement de ${p.shares.length} client(s) · départ le ${fmtDate(o.date)}`} />
      <div className="space-y-6">
        {flash.node}
        <RouteMap from={o.from} to={o.to} height={260} />
        <PoolingCard offer={o} vehicleLabel={o.vehicle?.type} finance={p.finance} status={<Badge tone={p.status === 'validee' ? 'pending' : p.status === 'confirmee' ? 'success' : 'neutral'}>{p.status === 'validee' ? 'À confirmer' : p.status}</Badge>}
          rows={p.shares.map((s) => ({ key: String(s.requestId), label: s.clientName ?? 'Client', weightT: s.weightT, payable: s.amount }))}
          actions={p.status === 'validee' ? <><Button size="lg" disabled={busy} onClick={() => answer(p.id, true)}>Accepter</Button><Button size="lg" variant="outline" disabled={busy} onClick={() => answer(p.id, false)}>Refuser</Button></> : undefined} />
        <Card className="p-5"><h2 className="text-base font-semibold text-ink">Marchandises</h2>
          <ul className="mt-3 divide-y divide-line text-sm">{p.goods.map((g, i) => <li key={i} className="py-3"><p className="font-medium text-ink">{g.clientName} · {GOODS_LABEL[g.goods] ?? g.goods} · {fmtT(g.weightT)}{g.parcels ? ` · ${g.parcels} colis` : ''}</p><p className="text-muted">{g.description || 'Sans description'}{g.requirements ? ` — Exigences : ${g.requirements}` : ''}</p>{g.phone && <p className="text-muted">Téléphone : {g.phone}</p>}</li>)}</ul>
          {p.status !== 'confirmee' && <p className="mt-3 text-xs text-muted">Les coordonnées des clients vous sont communiquées après la confirmation du transport.</p>}</Card>
      </div>
    </>
  )
}

export function CarrierReservationsPage() {
  const reservations = useResource(() => carrierApi.reservations(), NO_RESERVATIONS)
  const rows = useMemo(() => [...reservations.data].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')), [reservations.data])
  return (
    <>
      <PageHeader title="Mes réservations" />
      {failure(reservations.error, reservations.reload)}
      {!reservations.loaded ? loading : (
        <DataTable rows={rows} rowKey={(r) => String(r.id)} empty={<EmptyState title="Aucune réservation" />} columns={[
          { header: 'Trajet', cell: (r) => <span className="font-semibold">{r.offer?.from} → {r.offer?.to}</span> },
          { header: 'Client', cell: (r) => r.request?.client?.firstName ?? '—' },
          { header: 'Poids', cell: (r) => fmtT(r.weightT) }, { header: 'Reçue le', cell: (r) => (r.createdAt ? fmtDate(r.createdAt) : '—') },
          { header: 'Statut', cell: (r) => <ReservationBadge status={r.status} /> },
        ]} />
      )}
    </>
  )
}

// ───────────────────────── Véhicules (transporteur : les siens ; administrateur : tous) ─────────────────────────

type VehicleApi = {
  list: () => Promise<AdminVehicle[]>
  create: (input: Record<string, unknown>) => Promise<AdminVehicle>
  update: (id: AdminVehicle['id'], input: Record<string, unknown>) => Promise<AdminVehicle>
}
const CARRIER_VEHICLES: VehicleApi = { list: carrierApi.vehicles, create: carrierApi.createVehicle, update: carrierApi.updateVehicle }
const ADMIN_VEHICLES: VehicleApi = { list: adminApi.vehicles, create: adminApi.createVehicle, update: adminApi.updateVehicle }

export function VehiclesPage({ adminView = false }: { adminView?: boolean }) {
  const api = adminView ? ADMIN_VEHICLES : CARRIER_VEHICLES
  const flash = useFlash()
  const [edit, setEdit] = useState<Partial<AdminVehicle> | null>(null)
  const vehicles = useResource(() => api.list(), NO_VEHICLES, [adminView])
  const owners = useResource(() => (adminView ? adminApi.users('?role=transporteur&per_page=100') : Promise.resolve(NO_OWNERS)), NO_OWNERS, [adminView])
  const toggle = async (vehicle: AdminVehicle, key: 'active' | 'available') => {
    try {
      await api.update(vehicle.id, {
        type: vehicle.type, brand: vehicle.brand ?? '', plate: vehicle.plate, capacityT: vehicle.capacityT, volumeM3: vehicle.volumeM3, goodsAccepted: vehicle.goodsAccepted,
        available: key === 'available' ? !vehicle.available : vehicle.available, active: key === 'active' ? !vehicle.active : vehicle.active,
      })
      vehicles.reload()
    } catch (cause) {
      flash.err(errorMessage(cause, 'Impossible de modifier le véhicule.'))
    }
  }
  const ownerName = (id: AdminVehicle['ownerId']) => {
    const owner = owners.data.find((item) => String(item.id) === String(id))
    return owner?.company || owner?.displayName || (owner ? `${owner.firstName} ${owner.lastName}` : '—')
  }
  return (
    <>
      <PageHeader title={adminView ? 'Véhicules' : 'Mes véhicules'} description="Type, capacité et disponibilité." action={<Button size="lg" onClick={() => setEdit({ goodsAccepted: ['generales'], available: true, active: true })}><Plus className="h-4 w-4" /> Ajouter un véhicule</Button>} />
      {flash.node}
      {failure(vehicles.error || owners.error, () => { vehicles.reload(); owners.reload() })}
      {!vehicles.loaded ? loading : (
        <DataTable rows={vehicles.data} rowKey={(v) => String(v.id)} empty={<EmptyState title="Aucun véhicule" />} columns={[
          { header: 'Véhicule', cell: (v) => <span><strong>{v.type}</strong><br /><span className="text-xs text-muted">{v.brand} · {v.plate}</span></span> },
          ...(adminView ? [{ header: 'Propriétaire', cell: (v: AdminVehicle) => ownerName(v.ownerId) }] : []),
          { header: 'Capacité', cell: (v) => `${v.capacityT} t · ${v.volumeM3} m³` },
          { header: 'Disponible', cell: (v) => <Button size="sm" variant={v.available ? 'primary' : 'outline'} onClick={() => void toggle(v, 'available')}>{v.available ? 'Oui' : 'Non'}</Button> },
          { header: 'Actif', cell: (v) => <Button size="sm" variant={v.active ? 'primary' : 'outline'} onClick={() => void toggle(v, 'active')}>{v.active ? 'Oui' : 'Non'}</Button> },
          { header: '', cell: (v) => <Button size="sm" variant="ghost" onClick={() => setEdit(v)}>Modifier</Button> },
        ]} />
      )}
      {edit && <VehicleModal vehicle={edit} api={api} owners={adminView ? owners.data : undefined} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); vehicles.reload(); flash.ok('Véhicule enregistré.') }} />}
    </>
  )
}

function VehicleModal({ vehicle, api, owners, onClose, onSaved }: { vehicle: Partial<AdminVehicle>; api: VehicleApi; owners?: ApiUser[]; onClose: () => void; onSaved: () => void }) {
  const [owner, setOwner] = useState(String(vehicle.ownerId ?? owners?.[0]?.id ?? ''))
  const [form, setForm] = useState({ type: vehicle.type ?? '', brand: vehicle.brand ?? '', plate: vehicle.plate ?? '', capacity: String(vehicle.capacityT ?? ''), volume: String(vehicle.volumeM3 ?? ''), goods: vehicle.goodsAccepted ?? (['generales'] as GoodsType[]) })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setError('')
    setSaving(true)
    try {
      const input = { type: form.type, brand: form.brand, plate: form.plate, capacityT: Number(form.capacity.replace(',', '.')), volumeM3: Number(form.volume.replace(',', '.')) || 0, goodsAccepted: form.goods, available: vehicle.available ?? true, active: vehicle.active ?? true }
      if (vehicle.id) await api.update(vehicle.id, input)
      else await api.create(owners ? { ...input, ownerId: owner } : input)
      onSaved()
    } catch (cause) {
      setError(errorMessage(cause, 'Impossible d’enregistrer le véhicule.'))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal title={vehicle.id ? 'Modifier le véhicule' : 'Ajouter un véhicule'} onClose={onClose}>
      <div className="space-y-3">
        {error && <Notice tone="danger">{error}</Notice>}
        {owners && !vehicle.id && <Field label="Propriétaire" htmlFor="vehicle-owner" required><select id="vehicle-owner" className={sel} value={owner} onChange={(e) => setOwner(e.target.value)}>{owners.map((item) => <option key={item.id} value={item.id}>{item.company || item.displayName || `${item.firstName} ${item.lastName}`}</option>)}</select></Field>}
        <Field label="Type de véhicule" htmlFor="vehicle-type" required><Input id="vehicle-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="Camion 12 tonnes" /></Field>
        <Field label="Marque" htmlFor="vehicle-brand"><Input id="vehicle-brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
        <Field label="Immatriculation" htmlFor="vehicle-plate" required><Input id="vehicle-plate" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Capacité (t)" htmlFor="vehicle-capacity" required><Input id="vehicle-capacity" inputMode="decimal" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></Field><Field label="Volume (m³)" htmlFor="vehicle-volume"><Input id="vehicle-volume" inputMode="decimal" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} /></Field></div>
        <fieldset><legend className="mb-1.5 text-sm font-medium">Marchandises acceptées</legend><div className="flex flex-wrap gap-2">{GOODS_OPTIONS.map(([key, label]) => <label key={key} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${form.goods.includes(key) ? 'border-primary bg-primary text-white' : 'border-line'}`}><input type="checkbox" className="sr-only" checked={form.goods.includes(key)} onChange={() => setForm({ ...form, goods: form.goods.includes(key) ? form.goods.filter((item) => item !== key) : [...form.goods, key] })} />{label}</label>)}</div></fieldset>
        <Button size="lg" className="w-full" onClick={() => void save()} disabled={saving || (Boolean(owners) && !vehicle.id && owners?.length === 0)}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
      </div>
    </Modal>
  )
}

// ───────────────────────── Transports, revenus, paiements ─────────────────────────

const BREAKDOWN_LABEL: Record<string, string> = { mecanique: 'Panne mécanique', pneu: 'Pneu crevé', accident: 'Accident', carburant: 'Problème de carburant', autre: 'Incident' }

export function CarrierTransportsPage() {
  const flash = useFlash()
  const transports = useResource(() => carrierApi.transports(), NO_TRANSPORTS)
  const [open, setOpen] = useState<string | null>(null)
  const [city, setCity] = useState('')
  const [busy, setBusy] = useState(false)
  const guard = async (work: () => Promise<unknown>, done: string, fallback: string) => {
    if (busy) return
    setBusy(true)
    try {
      await work()
      flash.ok(done)
      transports.reload()
    } catch (cause) {
      flash.err(errorMessage(cause, fallback))
    } finally {
      setBusy(false)
    }
  }
  const step = (t: AdminTransport, to: string) => guard(() => sharedApi.updateTransportStatus(t.id, to), 'Statut mis à jour.', 'Mise à jour impossible.')
  const sendCity = (t: AdminTransport) => {
    const c = findCity(city)
    if (!c) return flash.err('Choisissez une localité.')
    return guard(() => sharedApi.recordPosition(t.id, { lat: c.lat, lng: c.lng, label: `Passage à ${c.name}` }), 'Position enregistrée.', 'Enregistrement impossible.')
  }
  const sendGps = (t: AdminTransport) => {
    if (!navigator.geolocation) return flash.err('La géolocalisation n\'est pas disponible sur cet appareil.')
    navigator.geolocation.getCurrentPosition(
      (pos) => void guard(() => sharedApi.recordPosition(t.id, { lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Position GPS' }), 'Position enregistrée.', 'Enregistrement impossible.'),
      () => flash.err('Position refusée ou indisponible. Choisissez plutôt une localité.'), { enableHighAccuracy: true, timeout: 10000 })
  }
  return (
    <>
      <PageHeader title="Mes transports" description="Mettez à jour le statut et la position de vos transports confirmés." />
      <div className="space-y-4">
        {flash.node}
        {failure(transports.error, transports.reload)}
        {!transports.loaded ? loading : transports.data.length === 0 && <Card><EmptyState title="Aucun transport confirmé" /></Card>}
        {transports.data.map((t) => {
          const clients = t.clients ?? []
          const unpaid = (t.payments ?? []).filter((x) => x.status !== 'confirme').length
          const trace = t.events.filter((e) => e.kind === 'position' && e.lat != null && e.lng != null).map((e) => ({ lat: e.lat as number, lng: e.lng as number, label: `${e.label} — ${fmtDateTime(e.at)}` }))
          const key = String(t.id)
          const canReport = ['confirmee', 'en_cours', 'arrive_destination'].includes(t.status)
          return (
            <Card key={key} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-ink">{t.offer.from} → {t.offer.to}</h2><p className="text-sm text-muted">{t.ref} · départ {fmtDate(t.offer.date)} · {clients.length} client(s) · {fmtT(clients.reduce((s, x) => s + x.weightT, 0))}</p></div><StatusBadge status={t.status as OperationStatus} /></div>
              <div className="mt-4"><StatusStepper status={t.status as OperationStatus} /></div>
              {t.breakdown && <div className="mt-4"><Notice tone="warning"><AlertTriangle className="mr-1 inline h-4 w-4" aria-hidden="true" />{BREAKDOWN_LABEL[t.breakdown.kind] ?? 'Incident'} signalé à {t.breakdown.location} — {t.breakdown.status === 'prise_en_charge' ? 'pris en charge par MUTLOG' : 'en attente de prise en charge'}. Les clients du transport sont informés.</Notice></div>}
              {unpaid > 0 && !['terminee', 'annule'].includes(t.status) && <div className="mt-4"><Notice tone="warning">{unpaid} paiement(s) client non confirmé(s) par MUTLOG.</Notice></div>}
              {clients.length > 0 && !['terminee', 'annule'].includes(t.status) && (
                <div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-xs text-muted">Appeler un client :</span>{clients.map((c) => <CallButton key={String(c.clientId)} peer={{ id: c.clientId, displayName: c.name, role: 'client' }} label={c.name} />)}</div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {t.status === 'confirmee' && <Button disabled={busy} onClick={() => step(t, 'en_cours')}>Démarrer le transport</Button>}
                {t.status === 'en_cours' && <Button disabled={busy} onClick={() => step(t, 'arrive_destination')}>Arrivé à destination</Button>}
                {t.status === 'arrive_destination' && <Button disabled={busy} onClick={() => step(t, 'livree')}>Marquer comme livré</Button>}
                {t.status === 'livree' && <Badge tone="info">En attente de confirmation du client</Badge>}
                {t.status === 'confirmee' && <Button variant="outline" disabled={busy} onClick={async () => (await ask({ message: 'Annuler ce transport ?', confirmLabel: 'Annuler le transport' })) && step(t, 'annule')}>Annuler</Button>}
                {canReport && !t.breakdown && <Button variant="outline" asChild><Link to={`/transporteur/pannes?transport=${t.id}`}><AlertTriangle className="h-4 w-4" /> Signaler une panne</Link></Button>}
                <Button variant="ghost" onClick={() => setOpen(open === key ? null : key)}>{open === key ? 'Masquer la carte' : 'Carte et positions'}</Button>
              </div>
              {open === key && (
                <div className="mt-4 space-y-3">
                  <RouteMap from={t.offer.from} to={t.offer.to} trace={trace} height={300} />
                  {t.status === 'en_cours' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" disabled={busy} onClick={() => sendGps(t)}><LocateFixed className="h-4 w-4" /> Envoyer ma position</Button>
                      <select aria-label="Localité" value={city} onChange={(e) => setCity(e.target.value)} className="h-10 rounded-control border border-line bg-surface px-3 text-sm"><option value="">Passage à…</option>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select>
                      <Button variant="ghost" disabled={busy} onClick={() => sendCity(t)}>Enregistrer</Button>
                    </div>
                  )}
                  {(t.payments ?? []).length > 0 && <div className="flex flex-wrap gap-2">{(t.payments ?? []).map((x) => <span key={x.id} className="flex items-center gap-2 text-xs text-muted">{clients.find((c) => String(c.clientId) === String(x.clientId))?.name} <PaymentBadge status={x.status} /></span>)}</div>}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </>
  )
}

export function RevenuePage() {
  const transports = useResource(() => carrierApi.transports(), NO_TRANSPORTS)
  const revenue = useResource(() => carrierApi.revenue(), NO_REVENUE)
  const rows = useMemo(() => transports.data.filter((t) => t.status !== 'annule' && t.finance), [transports.data])
  const data = revenue.data.monthly.map((m) => ({ label: monthLabel(m.month), value: m.net }))
  const totals: Array<[string, number]> = [['Revenus nets perçus', revenue.data.netReceived], ['Revenus en cours', revenue.data.netPending], ['Commissions MUTLOG', revenue.data.commissionPaid]]
  return (
    <>
      <PageHeader title="Revenus" description="Revenus nets après commission MUTLOG." />
      <div className="space-y-6">
        {failure(transports.error || revenue.error, () => { transports.reload(); revenue.reload() })}
        <div className="grid gap-4 sm:grid-cols-3">
          {totals.map(([l, v]) => <Card key={l} className="p-5"><p className="text-xs text-muted">{l}</p><p className="mt-1 text-2xl font-bold text-ink">{revenue.loaded ? formatFCFA(v) : '—'}</p></Card>)}
        </div>
        <Card className="p-4"><div className="h-60" role="img" aria-label="Revenus nets par mois"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid vertical={false} stroke="#E2E8F0" /><XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis width={48} tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v: number) => (v >= 1e6 ? `${v / 1e6} M` : `${Math.round(v / 1000)} k`)} /><Tooltip formatter={(v) => formatFCFA(Number(v))} /><Bar dataKey="value" name="Revenu net" fill="#FF7A00" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        {!transports.loaded ? loading : (
          <DataTable rows={rows} rowKey={(t) => String(t.id)} empty={<EmptyState title="Aucun revenu" />} columns={[
            { header: 'Opération', cell: (t) => t.ref }, { header: 'Trajet', cell: (t) => `${t.offer.from} → ${t.offer.to}` },
            { header: 'Brut', cell: (t) => formatFCFA(t.finance!.gross) }, { header: 'Commission', cell: (t) => `${formatFCFA(t.finance!.commission)} (${t.finance!.ratePct} %)` },
            { header: 'Net', cell: (t) => <strong>{formatFCFA(t.finance!.netCarrier)}</strong> }, { header: 'Statut', cell: (t) => <Badge tone={t.status === 'terminee' ? 'success' : 'pending'}>{t.status === 'terminee' ? 'Perçu' : 'Prévu'}</Badge> },
          ]} />
        )}
      </div>
    </>
  )
}

export function CarrierPaymentsPage() {
  const transports = useResource(() => carrierApi.transports(), NO_TRANSPORTS)
  const rows = useMemo(() => transports.data
    .flatMap((t) => (t.payments ?? []).map((payment) => ({ payment, ref: t.ref, client: t.clients?.find((c) => String(c.clientId) === String(payment.clientId))?.name ?? '—' })))
    .sort((a, b) => (b.payment.createdAt ?? '').localeCompare(a.payment.createdAt ?? '')), [transports.data])
  return (
    <>
      <PageHeader title="Mes paiements" description="Paiements des clients sur vos transports (vérifiés par MUTLOG)." />
      {failure(transports.error, transports.reload)}
      {!transports.loaded ? loading : (
        <DataTable rows={rows} rowKey={(x) => String(x.payment.id)} empty={<EmptyState title="Aucun paiement" />} columns={[
          { header: 'Opération', cell: (x) => x.ref }, { header: 'Client', cell: (x) => x.client },
          { header: 'Montant', cell: (x) => formatFCFA(x.payment.amount) }, { header: 'Statut', cell: (x) => <PaymentBadge status={x.payment.status} /> },
        ]} />
      )}
    </>
  )
}

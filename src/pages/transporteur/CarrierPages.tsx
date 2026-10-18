import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LocateFixed, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { Correspondence } from '@/components/matching/Correspondence'
import { PoolingCard } from '@/components/mutualisation/PoolingCard'
import { StatusBadge } from '@/components/tracking/StatusBadge'
import { StatusStepper } from '@/components/tracking/StatusStepper'
import { DataTable, EmptyState, fmtDate, fmtDateTime, fmtT, GOODS_LABEL, GOODS_OPTIONS, Modal, Notice, offerPriceLabel, PaymentBadge, useFlash } from '@/components/shared/ui-bits'
import RouteMap from '@/features/maps/RouteMap'
import { ask } from '@/components/shared/confirm'
import { useAuth } from '@/features/auth/useAuth'
import { adminApiMode, type ApiUser } from '@/services/api'
import { adminApi, type AdminVehicle } from '@/services/mutlogApi'
import { CITIES, findCity } from '@/domain/geo'
import { compatibleRequests } from '@/domain/matching'
import type { GoodsType, PricingMode, Vehicle } from '@/domain/types'
import { formatFCFA } from '@/lib/format'
import { today, userName } from '@/store/logic'
import * as L from '@/store/logic'
import { carrierTransports, monthlyNet } from '@/store/selectors'
import { run } from '@/store/store'
import { useAdminResource } from '@/pages/admin/useAdminResource'

const sel = 'h-11 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink focus-visible:border-primary-2'

export function CarrierOffersPage() {
  const { db, user } = useAuth()
  const rows = db.offers.filter((o) => o.transporterId === user!.id).sort((a, b) => b.date.localeCompare(a.date))
  return (
    <>
      <PageHeader title="Mes trajets" description="Vos offres de transport publiées." action={<Button asChild size="lg"><Link to="/transporteur/trajets/nouveau"><Plus className="h-4 w-4" /> Publier un trajet</Link></Button>} />
      <DataTable rows={rows} rowKey={(o) => o.id} empty={<EmptyState title="Aucun trajet publié" />}
        columns={[
          { header: 'Trajet', cell: (o) => <Link to={`/transporteur/trajets/${o.id}`} className="font-semibold text-primary-2 hover:underline">{o.from} → {o.to}</Link> },
          { header: 'Départ', cell: (o) => fmtDate(o.date) },
          { header: 'Disponible', cell: (o) => `${o.availableT} / ${o.totalCapacityT} t` },
          { header: 'Tarif', cell: (o) => `${offerPriceLabel(o).amount} ${offerPriceLabel(o).unit}` },
          { header: 'Statut', cell: (o) => <Badge tone={o.status === 'ouverte' ? 'success' : o.status === 'annulee' ? 'danger' : 'neutral'}>{{ ouverte: 'Actif', complete: 'Complet', annulee: 'Annulé', terminee: 'Terminé' }[o.status]}</Badge> },
        ]} />
    </>
  )
}

export function NewOfferPage() {
  const { db, user } = useAuth()
  const navigate = useNavigate()
  const vehicles = db.vehicles.filter((v) => v.ownerId === user!.id && v.active)
  const [f, setF] = useState({ vehicleId: vehicles[0]?.id ?? '', from: user!.city, to: '', date: '', total: String(vehicles[0]?.capacityT ?? ''), avail: String(vehicles[0]?.capacityT ?? ''), mode: 'tonne' as PricingMode, price: '', notes: '', goods: ['generales'] as GoodsType[] })
  const [error, setError] = useState('')
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))
  const pick = (id: string) => { const v = vehicles.find((x) => x.id === id); setF((p) => ({ ...p, vehicleId: id, total: String(v?.capacityT ?? ''), avail: String(v?.capacityT ?? ''), goods: v?.goodsAccepted ?? p.goods })) }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const res = run((d) => L.createOffer(d, user!.id, { vehicleId: f.vehicleId, from: f.from.trim(), to: f.to.trim(), date: f.date, totalCapacityT: Number(f.total.replace(',', '.')), availableT: Number(f.avail.replace(',', '.')), goodsAccepted: f.goods, pricingMode: f.mode, price: Number(f.price.replace(/\s/g, '')), notes: f.notes.trim() || undefined }))
    res.ok ? navigate(`/transporteur/trajets/${res.value.id}`) : setError(res.error)
  }
  if (user!.status !== 'actif') return <><PageHeader title="Publier un trajet" /><Notice tone="warning">Votre compte doit être validé par MUTLOG avant de publier un trajet.</Notice></>
  if (!vehicles.length) return <><PageHeader title="Publier un trajet" /><Notice tone="warning">Enregistrez d'abord un véhicule. <Link to="/transporteur/vehicules" className="underline">Ajouter un véhicule</Link></Notice></>
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
          <Notice>MUTLOG perçoit une commission de {db.settings.commissionPct} % ({db.settings.commissionBearer === 'transporteur' ? 'prélevée sur votre montant' : 'ajoutée au prix payé par les clients'}).</Notice>
          <Button type="submit" size="lg">Publier mon offre</Button>
        </Card>
      </form>
    </>
  )
}

export function OfferDetailPage() {
  const { id } = useParams()
  const { db, user } = useAuth()
  const flash = useFlash()
  const o = db.offers.find((x) => x.id === id && x.transporterId === user!.id)
  if (!o) return <Notice tone="danger">Trajet introuvable.</Notice>
  const res = db.reservations.filter((r) => r.offerId === o.id)
  const corr = o.status === 'ouverte' ? compatibleRequests(o, db.requests.filter((r) => r.status === 'recherche'), db.settings).length : 0
  const p = offerPriceLabel(o)
  const cancel = async () => { if (!(await ask({ message: 'Annuler ce trajet ?', confirmLabel: 'Annuler le trajet' }))) return; const r = run((d) => L.cancelOffer(d, user!.id, o.id)); r.ok ? flash.ok('Trajet annulé.') : flash.err(r.error) }
  return (
    <>
      <PageHeader title={`${o.from} → ${o.to}`} description={`Départ le ${fmtDate(o.date)} · ${p.amount} ${p.unit}`} action={<Badge tone={o.status === 'ouverte' ? 'success' : 'neutral'}>{o.status}</Badge>} />
      <div className="space-y-6">
        {flash.node}
        {corr > 0 && <Correspondence offer={o} count={corr} />}
        <RouteMap from={o.from} to={o.to} height={300} />
        <Card className="p-5 text-sm"><p>Capacité : <strong>{fmtT(o.availableT)}</strong> disponibles sur {fmtT(o.totalCapacityT)} · {o.goodsAccepted.map((g) => GOODS_LABEL[g]).join(', ')}</p>
          {['ouverte', 'complete'].includes(o.status) && <Button variant="outline" className="mt-4" onClick={cancel}>Annuler le trajet</Button>}</Card>
        <Card><CardHeader title="Réservations liées" />
          {res.length === 0 ? <EmptyState title="Aucune réservation pour le moment" /> : <ul className="mt-3 divide-y divide-line">{res.map((r) => <li key={r.id} className="flex justify-between px-5 py-3 text-sm"><span>{db.users.find((u) => u.id === r.clientId)?.firstName} · {fmtT(r.weightT)}</span><Badge tone={r.status === 'confirmee' ? 'success' : r.status === 'en_attente' ? 'pending' : 'danger'}>{r.status.replace('_', ' ')}</Badge></li>)}</ul>}
        </Card>
      </div>
    </>
  )
}

function usePoolingAnswer() {
  const { user } = useAuth()
  const flash = useFlash()
  const answer = async (id: string, accept: boolean) => {
    if (!accept && !(await ask({ message: 'Refuser ce regroupement ?', confirmLabel: 'Refuser' }))) return
    const res = run((d) => L.respondPooling(d, user!.id, id, accept))
    res.ok ? flash.ok(accept ? `Transport confirmé : ${res.value}` : 'Regroupement refusé.') : flash.err(res.error)
  }
  return { answer, flash }
}

export function ReceivedRequestsPage() {
  const { db, user } = useAuth()
  const { answer, flash } = usePoolingAnswer()
  const mineOffer = (id: string) => db.offers.find((o) => o.id === id && o.transporterId === user!.id)
  const toConfirm = db.poolings.filter((p) => p.status === 'validee' && mineOffer(p.offerId))
  const waiting = db.reservations.filter((r) => r.transporterId === user!.id && r.status === 'en_attente')
  return (
    <>
      <PageHeader title="Demandes reçues" description="Acceptez ou refusez les regroupements validés par MUTLOG." />
      <div className="space-y-6">
        {flash.node}
        {toConfirm.length === 0 ? <Card><EmptyState title="Aucun regroupement à confirmer" text="Vous serez notifié dès que MUTLOG validera un regroupement sur l'un de vos trajets." /></Card> : toConfirm.map((p) => {
          const o = mineOffer(p.offerId)!
          return <PoolingCard key={p.id} offer={o} vehicleLabel={db.vehicles.find((v) => v.id === o.vehicleId)?.type} finance={p.finance} status={<Badge tone="pending">À confirmer</Badge>}
            rows={p.shares.map((s) => ({ key: s.requestId, label: db.users.find((u) => u.id === s.clientId)?.firstName ?? 'Client', weightT: s.weightT, payable: s.amount }))}
            actions={<><Button size="lg" onClick={() => answer(p.id, true)}>Accepter</Button><Button size="lg" variant="outline" onClick={() => answer(p.id, false)}>Refuser</Button><Button size="lg" variant="ghost" asChild><Link to={`/transporteur/demandes/${p.id}`}>Détails</Link></Button></>} />
        })}
        {waiting.length > 0 && <Card><CardHeader title="Réservations en attente de regroupement" /><ul className="mt-3 divide-y divide-line">{waiting.map((r) => { const o = db.offers.find((x) => x.id === r.offerId); return <li key={r.id} className="flex justify-between gap-3 px-5 py-3 text-sm"><span>{o?.from} → {o?.to} · {fmtT(r.weightT)}</span><span className="text-muted">MUTLOG prépare le regroupement</span></li> })}</ul></Card>}
      </div>
    </>
  )
}

/** Détails d'une demande reçue (direction UI/UX §1) : trajet, marchandises de chaque client, exigences, montants. */
export function ReceivedRequestDetailPage() {
  const { id } = useParams()
  const { db, user } = useAuth()
  const { answer, flash } = usePoolingAnswer()
  const p = db.poolings.find((x) => x.id === id)
  const o = p && db.offers.find((x) => x.id === p.offerId && x.transporterId === user!.id)
  if (!p || !o) return <Notice tone="danger">Demande introuvable.</Notice>
  const reqs = p.requestIds.map((rid) => db.requests.find((r) => r.id === rid)!).filter(Boolean)
  return (
    <>
      <PageHeader title={`${o.from} → ${o.to}`} description={`Regroupement de ${p.shares.length} client(s) · départ le ${fmtDate(o.date)}`} />
      <div className="space-y-6">
        {flash.node}
        <RouteMap from={o.from} to={o.to} height={260} />
        <PoolingCard offer={o} vehicleLabel={db.vehicles.find((v) => v.id === o.vehicleId)?.type} finance={p.finance} status={<Badge tone={p.status === 'validee' ? 'pending' : p.status === 'confirmee' ? 'success' : 'neutral'}>{p.status === 'validee' ? 'À confirmer' : p.status}</Badge>}
          rows={p.shares.map((s) => ({ key: s.requestId, label: db.users.find((u) => u.id === s.clientId)?.firstName ?? 'Client', weightT: s.weightT, payable: s.amount }))}
          actions={p.status === 'validee' ? <><Button size="lg" onClick={() => answer(p.id, true)}>Accepter</Button><Button size="lg" variant="outline" onClick={() => answer(p.id, false)}>Refuser</Button></> : undefined} />
        <Card className="p-5"><h2 className="text-base font-semibold text-ink">Marchandises</h2>
          <ul className="mt-3 divide-y divide-line text-sm">{reqs.map((r) => <li key={r.id} className="py-3"><p className="font-medium text-ink">{db.users.find((u) => u.id === r.clientId)?.firstName} · {GOODS_LABEL[r.goods]} · {fmtT(r.weightT)}{r.parcels ? ` · ${r.parcels} colis` : ''}</p><p className="text-muted">{r.description || 'Sans description'}{r.requirements ? ` — Exigences : ${r.requirements}` : ''}</p></li>)}</ul>
          <p className="mt-3 text-xs text-muted">Les coordonnées des clients vous sont communiquées après la confirmation du transport.</p></Card>
      </div>
    </>
  )
}

export function CarrierReservationsPage() {
  const { db, user } = useAuth()
  const rows = db.reservations.filter((r) => r.transporterId === user!.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <>
      <PageHeader title="Mes réservations" />
      <DataTable rows={rows} rowKey={(r) => r.id} empty={<EmptyState title="Aucune réservation" />} columns={[
        { header: 'Trajet', cell: (r) => { const o = db.offers.find((x) => x.id === r.offerId); return <span className="font-semibold">{o?.from} → {o?.to}</span> } },
        { header: 'Client', cell: (r) => db.users.find((u) => u.id === r.clientId)?.firstName },
        { header: 'Poids', cell: (r) => fmtT(r.weightT) }, { header: 'Reçue le', cell: (r) => fmtDate(r.createdAt) },
        { header: 'Statut', cell: (r) => <Badge tone={r.status === 'confirmee' ? 'success' : r.status === 'en_attente' ? 'pending' : 'danger'}>{r.status.replace('_', ' ')}</Badge> },
      ]} />
    </>
  )
}

export function VehiclesPage({ adminView = false }: { adminView?: boolean }) {
  return adminView && adminApiMode ? <AdminVehiclesPage /> : <VehiclesDemoPage adminView={adminView} />
}

function AdminVehiclesPage() {
  const flash = useFlash()
  const [edit, setEdit] = useState<Partial<Vehicle> | null>(null)
  const vehicles = useAdminResource(adminApi.vehicles, [] as AdminVehicle[])
  const owners = useAdminResource(() => adminApi.users('?role=transporteur&per_page=100'), [] as ApiUser[])
  const toggle = async (vehicle: AdminVehicle, key: 'active' | 'available') => {
    try {
      await adminApi.updateVehicle(vehicle.id, {
        type: vehicle.type, brand: vehicle.brand ?? '', plate: vehicle.plate, capacityT: vehicle.capacityT,
        volumeM3: vehicle.volumeM3, goodsAccepted: vehicle.goodsAccepted, available: key === 'available' ? !vehicle.available : vehicle.available,
        active: key === 'active' ? !vehicle.active : vehicle.active,
      })
      vehicles.reload()
    } catch (cause) {
      flash.err(cause instanceof Error ? cause.message : 'Impossible de modifier le véhicule.')
    }
  }
  const rows = vehicles.data.map((vehicle) => ({ ...vehicle, id: String(vehicle.id), ownerId: String(vehicle.ownerId), brand: vehicle.brand ?? '' }))
  const ownerName = (id: string) => {
    const owner = owners.data.find((item) => String(item.id) === id)
    return owner?.company || owner?.displayName || (owner ? `${owner.firstName} ${owner.lastName}` : '—')
  }
  return (
    <>
      <PageHeader title="Véhicules" description="Type, capacité et disponibilité." action={<Button size="lg" onClick={() => setEdit({ goodsAccepted: ['generales'], available: true, active: true })}><Plus className="h-4 w-4" /> Ajouter un véhicule</Button>} />
      {flash.node}
      {(vehicles.error || owners.error) && <Notice tone="danger">{vehicles.error || owners.error}</Notice>}
      {vehicles.loading && <Card className="p-6 text-center text-sm text-muted">Chargement des véhicules…</Card>}
      <DataTable rows={rows} rowKey={(vehicle) => vehicle.id} empty={<EmptyState title="Aucun véhicule" />} columns={[
        { header: 'Véhicule', cell: (vehicle) => <span><strong>{vehicle.type}</strong><br /><span className="text-xs text-muted">{vehicle.brand} · {vehicle.plate}</span></span> },
        { header: 'Propriétaire', cell: (vehicle) => ownerName(vehicle.ownerId) },
        { header: 'Capacité', cell: (vehicle) => `${vehicle.capacityT} t · ${vehicle.volumeM3} m³` },
        { header: 'Disponible', cell: (vehicle) => <Button size="sm" variant={vehicle.available ? 'primary' : 'outline'} onClick={() => void toggle(vehicle, 'available')}>{vehicle.available ? 'Oui' : 'Non'}</Button> },
        { header: 'Actif', cell: (vehicle) => <Button size="sm" variant={vehicle.active ? 'primary' : 'outline'} onClick={() => void toggle(vehicle, 'active')}>{vehicle.active ? 'Oui' : 'Non'}</Button> },
        { header: '', cell: (vehicle) => <Button size="sm" variant="ghost" onClick={() => setEdit(vehicle)}>Modifier</Button> },
      ]} />
      {edit && <AdminVehicleModal vehicle={edit} owners={owners.data} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); vehicles.reload(); flash.ok('Véhicule enregistré.') }} />}
    </>
  )
}

function AdminVehicleModal({ vehicle, owners, onClose, onSaved }: { vehicle: Partial<Vehicle>; owners: ApiUser[]; onClose: () => void; onSaved: () => void }) {
  const [owner, setOwner] = useState(String(vehicle.ownerId ?? owners[0]?.id ?? ''))
  const [form, setForm] = useState({ type: vehicle.type ?? '', brand: vehicle.brand ?? '', plate: vehicle.plate ?? '', capacity: String(vehicle.capacityT ?? ''), volume: String(vehicle.volumeM3 ?? ''), goods: vehicle.goodsAccepted ?? ['generales'] as GoodsType[] })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setError('')
    setSaving(true)
    try {
      const input = { type: form.type, brand: form.brand, plate: form.plate, capacityT: Number(form.capacity.replace(',', '.')), volumeM3: Number(form.volume.replace(',', '.')) || 0, goodsAccepted: form.goods, available: vehicle.available ?? true, active: vehicle.active ?? true }
      if (vehicle.id) await adminApi.updateVehicle(vehicle.id, input)
      else await adminApi.createVehicle({ ...input, ownerId: owner })
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer le véhicule.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal title={vehicle.id ? 'Modifier le véhicule' : 'Ajouter un véhicule'} onClose={onClose}>
      <div className="space-y-3">
        {error && <Notice tone="danger">{error}</Notice>}
        {!vehicle.id && <Field label="Propriétaire" htmlFor="admin-vehicle-owner" required><select id="admin-vehicle-owner" className={sel} value={owner} onChange={(event) => setOwner(event.target.value)}>{owners.map((item) => <option key={item.id} value={item.id}>{item.company || item.displayName || `${item.firstName} ${item.lastName}`}</option>)}</select></Field>}
        <Field label="Type de véhicule" htmlFor="admin-vehicle-type" required><Input id="admin-vehicle-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} placeholder="Camion 12 tonnes" /></Field>
        <Field label="Marque" htmlFor="admin-vehicle-brand"><Input id="admin-vehicle-brand" value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} /></Field>
        <Field label="Immatriculation" htmlFor="admin-vehicle-plate" required><Input id="admin-vehicle-plate" value={form.plate} onChange={(event) => setForm({ ...form, plate: event.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Capacité (t)" htmlFor="admin-vehicle-capacity" required><Input id="admin-vehicle-capacity" inputMode="decimal" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></Field><Field label="Volume (m³)" htmlFor="admin-vehicle-volume"><Input id="admin-vehicle-volume" inputMode="decimal" value={form.volume} onChange={(event) => setForm({ ...form, volume: event.target.value })} /></Field></div>
        <fieldset><legend className="mb-1.5 text-sm font-medium">Marchandises acceptées</legend><div className="flex flex-wrap gap-2">{GOODS_OPTIONS.map(([key, label]) => <label key={key} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${form.goods.includes(key) ? 'border-primary bg-primary text-white' : 'border-line'}`}><input type="checkbox" className="sr-only" checked={form.goods.includes(key)} onChange={() => setForm({ ...form, goods: form.goods.includes(key) ? form.goods.filter((item) => item !== key) : [...form.goods, key] })} />{label}</label>)}</div></fieldset>
        <Button size="lg" className="w-full" onClick={() => void save()} disabled={saving || (!vehicle.id && owners.length === 0)}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
      </div>
    </Modal>
  )
}

function VehiclesDemoPage({ adminView = false }: { adminView?: boolean }) {
  const { db, user } = useAuth()
  const flash = useFlash()
  const [edit, setEdit] = useState<Partial<Vehicle> | null>(null)
  const rows = db.vehicles.filter((v) => adminView || v.ownerId === user!.id)
  const toggle = (v: Vehicle, k: 'active' | 'available') => run((d) => { const x = d.vehicles.find((y) => y.id === v.id)!; x[k] = !x[k]; return { ok: true as const, value: undefined } })
  return (
    <>
      <PageHeader title={adminView ? 'Véhicules' : 'Mes véhicules'} description="Type, capacité et disponibilité." action={<Button size="lg" onClick={() => setEdit({ goodsAccepted: ['generales'], available: true, active: true })}><Plus className="h-4 w-4" /> Ajouter un véhicule</Button>} />
      {flash.node}
      <DataTable rows={rows} rowKey={(v) => v.id} empty={<EmptyState title="Aucun véhicule" />} columns={[
        { header: 'Véhicule', cell: (v) => <span><strong>{v.type}</strong><br /><span className="text-xs text-muted">{v.brand} · {v.plate}</span></span> },
        ...(adminView ? [{ header: 'Propriétaire', cell: (v: Vehicle) => userName(db.users.find((u) => u.id === v.ownerId)) }] : []),
        { header: 'Capacité', cell: (v) => `${v.capacityT} t · ${v.volumeM3} m³` },
        { header: 'Disponible', cell: (v) => <Button size="sm" variant={v.available ? 'primary' : 'outline'} onClick={() => toggle(v, 'available')}>{v.available ? 'Oui' : 'Non'}</Button> },
        { header: 'Actif', cell: (v) => <Button size="sm" variant={v.active ? 'primary' : 'outline'} onClick={() => toggle(v, 'active')}>{v.active ? 'Oui' : 'Non'}</Button> },
        { header: '', cell: (v) => <Button size="sm" variant="ghost" onClick={() => setEdit(v)}>Modifier</Button> },
      ]} />
      {edit && <VehicleModal v={edit} ownerId={edit.ownerId ?? user!.id} owners={adminView ? db.users.filter((u) => u.role === 'transporteur') : undefined} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); flash.ok('Véhicule enregistré.') }} />}
    </>
  )
}

function VehicleModal({ v, ownerId, owners, onClose, onSaved }: { v: Partial<Vehicle>; ownerId: string; owners?: { id: string; firstName: string; lastName: string; company?: string }[]; onClose: () => void; onSaved: () => void }) {
  const [owner, setOwner] = useState(owners?.[0]?.id ?? ownerId)
  const [f, setF] = useState({ type: v.type ?? '', brand: v.brand ?? '', plate: v.plate ?? '', cap: String(v.capacityT ?? ''), vol: String(v.volumeM3 ?? ''), goods: v.goodsAccepted ?? (['generales'] as GoodsType[]) })
  const [err, setErr] = useState('')
  const save = () => {
    const res = run((d) => L.saveVehicle(d, v.id ? ownerId : owner, { id: v.id, type: f.type, brand: f.brand, plate: f.plate, capacityT: Number(f.cap.replace(',', '.')), volumeM3: Number(f.vol.replace(',', '.')) || 0, goodsAccepted: f.goods, available: v.available ?? true, active: v.active ?? true }))
    res.ok ? onSaved() : setErr(res.error)
  }
  return (
    <Modal title={v.id ? 'Modifier le véhicule' : 'Ajouter un véhicule'} onClose={onClose}>
      <div className="space-y-3">
        {err && <Notice tone="danger">{err}</Notice>}
        {owners && !v.id && <Field label="Propriétaire" htmlFor="ow" required><select id="ow" className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm" value={owner} onChange={(e) => setOwner(e.target.value)}>{owners.map((u) => <option key={u.id} value={u.id}>{u.company || `${u.firstName} ${u.lastName}`}</option>)}</select></Field>}
        <Field label="Type de véhicule" htmlFor="t" required><Input id="t" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} placeholder="Camion 12 tonnes" /></Field>
        <Field label="Marque" htmlFor="b"><Input id="b" value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} /></Field>
        <Field label="Immatriculation" htmlFor="p" required><Input id="p" value={f.plate} onChange={(e) => setF({ ...f, plate: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Capacité (t)" htmlFor="c" required><Input id="c" inputMode="decimal" value={f.cap} onChange={(e) => setF({ ...f, cap: e.target.value })} /></Field><Field label="Volume (m³)" htmlFor="m"><Input id="m" inputMode="decimal" value={f.vol} onChange={(e) => setF({ ...f, vol: e.target.value })} /></Field></div>
        <fieldset><legend className="mb-1.5 text-sm font-medium">Marchandises acceptées</legend><div className="flex flex-wrap gap-2">{GOODS_OPTIONS.map(([k, l]) => <label key={k} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${f.goods.includes(k) ? 'border-primary bg-primary text-white' : 'border-line'}`}><input type="checkbox" className="sr-only" checked={f.goods.includes(k)} onChange={() => setF({ ...f, goods: f.goods.includes(k) ? f.goods.filter((g) => g !== k) : [...f.goods, k] })} />{l}</label>)}</div></fieldset>
        <Button size="lg" className="w-full" onClick={save}>Enregistrer</Button>
      </div>
    </Modal>
  )
}

export function CarrierTransportsPage() {
  const { db, user } = useAuth()
  const flash = useFlash()
  const rows = carrierTransports(db, user!.id)
  const [open, setOpen] = useState<string | null>(null)
  const [city, setCity] = useState('')
  const step = (tid: string, to: Parameters<typeof L.advanceTransport>[3]) => { const r = run((d) => L.advanceTransport(d, user!.id, tid, to)); r.ok ? flash.ok('Statut mis à jour.') : flash.err(r.error) }
  const sendCity = (tid: string) => { const c = findCity(city); if (!c) return flash.err('Choisissez une localité.'); const r = run((d) => L.addPosition(d, user!.id, tid, c.lat, c.lng, `Passage à ${c.name}`)); r.ok ? flash.ok('Position enregistrée.') : flash.err(r.error) }
  const sendGps = (tid: string) => {
    if (!navigator.geolocation) return flash.err('La géolocalisation n\'est pas disponible sur cet appareil.')
    navigator.geolocation.getCurrentPosition(
      (pos) => { const r = run((d) => L.addPosition(d, user!.id, tid, pos.coords.latitude, pos.coords.longitude, 'Position GPS')); r.ok ? flash.ok('Position enregistrée.') : flash.err(r.error) },
      () => flash.err('Position refusée ou indisponible. Choisissez plutôt une localité.'), { enableHighAccuracy: true, timeout: 10000 })
  }
  return (
    <>
      <PageHeader title="Mes transports" description="Mettez à jour le statut et la position de vos transports confirmés." />
      <div className="space-y-4">
        {flash.node}
        {rows.length === 0 && <Card><EmptyState title="Aucun transport confirmé" /></Card>}
        {rows.map(({ t, p, offer }) => {
          const pays = db.payments.filter((x) => x.transportId === t.id)
          const unpaid = pays.filter((x) => x.status !== 'confirme').length
          const trace = t.events.filter((e) => e.kind === 'position' && e.lat !== undefined).map((e) => ({ lat: e.lat!, lng: e.lng!, label: `${e.label} — ${fmtDateTime(e.at)}` }))
          return (
            <Card key={t.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-ink">{offer.from} → {offer.to}</h2><p className="text-sm text-muted">{t.ref} · départ {fmtDate(offer.date)} · {p.shares.length} client(s) · {fmtT(p.shares.reduce((s, x) => s + x.weightT, 0))}</p></div><StatusBadge status={t.status} /></div>
              <div className="mt-4"><StatusStepper status={t.status} /></div>
              {unpaid > 0 && !['terminee', 'annule'].includes(t.status) && <div className="mt-4"><Notice tone="warning">{unpaid} paiement(s) client non confirmé(s) par MUTLOG.</Notice></div>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {t.status === 'confirmee' && <Button onClick={() => step(t.id, 'en_cours')}>Démarrer le transport</Button>}
                {t.status === 'en_cours' && <Button onClick={() => step(t.id, 'arrive_destination')}>Arrivé à destination</Button>}
                {t.status === 'arrive_destination' && <Button onClick={() => step(t.id, 'livree')}>Marquer comme livré</Button>}
                {t.status === 'livree' && <Badge tone="info">En attente de confirmation du client</Badge>}
                {t.status === 'confirmee' && <Button variant="outline" onClick={async () => (await ask({ message: 'Annuler ce transport ?', confirmLabel: 'Annuler le transport' })) && step(t.id, 'annule')}>Annuler</Button>}
                <Button variant="ghost" onClick={() => setOpen(open === t.id ? null : t.id)}>{open === t.id ? 'Masquer la carte' : 'Carte et positions'}</Button>
              </div>
              {open === t.id && (
                <div className="mt-4 space-y-3">
                  <RouteMap from={offer.from} to={offer.to} trace={trace} height={300} />
                  {t.status === 'en_cours' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" onClick={() => sendGps(t.id)}><LocateFixed className="h-4 w-4" /> Envoyer ma position</Button>
                      <select aria-label="Localité" value={city} onChange={(e) => setCity(e.target.value)} className="h-10 rounded-control border border-line bg-surface px-3 text-sm"><option value="">Passage à…</option>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select>
                      <Button variant="ghost" onClick={() => sendCity(t.id)}>Enregistrer</Button>
                    </div>
                  )}
                  {pays.length > 0 && <div className="flex flex-wrap gap-2">{pays.map((x) => <span key={x.id} className="flex items-center gap-2 text-xs text-muted">{db.users.find((u) => u.id === x.clientId)?.firstName} <PaymentBadge status={x.status} /></span>)}</div>}
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
  const { db, user } = useAuth()
  const trs = carrierTransports(db, user!.id).filter((v) => v.t.status !== 'annule')
  const comms = trs.map((v) => ({ v, c: db.commissions.find((x) => x.transportId === v.t.id) })).filter((x) => x.c)
  const sum = (f: (c: NonNullable<(typeof comms)[0]['c']>) => number, only?: string) => comms.filter((x) => !only || x.c!.status === only).reduce((s, x) => s + f(x.c!), 0)
  const data = monthlyNet(db, user!.id, 6)
  return (
    <>
      <PageHeader title="Revenus" description="Revenus nets après commission MUTLOG." />
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[['Revenus nets perçus', sum((c) => c.netCarrier, 'acquise')], ['Revenus en cours', sum((c) => c.netCarrier, 'prevue')], ['Commissions MUTLOG', sum((c) => c.commission, 'acquise')]].map(([l, v]) => <Card key={l as string} className="p-5"><p className="text-xs text-muted">{l}</p><p className="mt-1 text-2xl font-bold text-ink">{formatFCFA(v as number)}</p></Card>)}
        </div>
        <Card className="p-4"><div className="h-60" role="img" aria-label="Revenus nets par mois"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid vertical={false} stroke="#E2E8F0" /><XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis width={48} tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v: number) => (v >= 1e6 ? `${v / 1e6} M` : `${Math.round(v / 1000)} k`)} /><Tooltip formatter={(v) => formatFCFA(Number(v))} /><Bar dataKey="value" name="Revenu net" fill="#FF7A00" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <DataTable rows={comms} rowKey={(x) => x.c!.id} empty={<EmptyState title="Aucun revenu" />} columns={[
          { header: 'Opération', cell: (x) => x.v.t.ref }, { header: 'Trajet', cell: (x) => `${x.v.offer.from} → ${x.v.offer.to}` },
          { header: 'Brut', cell: (x) => formatFCFA(x.c!.gross) }, { header: 'Commission', cell: (x) => `${formatFCFA(x.c!.commission)} (${x.c!.ratePct} %)` },
          { header: 'Net', cell: (x) => <strong>{formatFCFA(x.c!.netCarrier)}</strong> }, { header: 'Statut', cell: (x) => <Badge tone={x.c!.status === 'acquise' ? 'success' : 'pending'}>{x.c!.status === 'acquise' ? 'Perçu' : 'Prévu'}</Badge> },
        ]} />
      </div>
    </>
  )
}

export function CarrierPaymentsPage() {
  const { db, user } = useAuth()
  const ids = new Set(carrierTransports(db, user!.id).map((v) => v.t.id))
  const rows = db.payments.filter((p) => ids.has(p.transportId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <>
      <PageHeader title="Mes paiements" description="Paiements des clients sur vos transports (vérifiés par MUTLOG)." />
      <DataTable rows={rows} rowKey={(p) => p.id} empty={<EmptyState title="Aucun paiement" />} columns={[
        { header: 'Opération', cell: (p) => db.transports.find((t) => t.id === p.transportId)?.ref }, { header: 'Client', cell: (p) => db.users.find((u) => u.id === p.clientId)?.firstName },
        { header: 'Montant', cell: (p) => formatFCFA(p.amount) }, { header: 'Statut', cell: (p) => <PaymentBadge status={p.status} /> },
      ]} />
    </>
  )
}

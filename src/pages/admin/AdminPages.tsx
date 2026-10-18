import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/tracking/StatusBadge'
import { StatusStepper } from '@/components/tracking/StatusStepper'
import { ask } from '@/components/shared/confirm'
import { DataTable, EmptyState, fmtDate, fmtDateTime, fmtT, Notice, PaymentBadge, Stars, Tabs, useFlash } from '@/components/shared/ui-bits'
import RouteMap from '@/features/maps/RouteMap'
import { useAuth } from '@/features/auth/useAuth'
import { adminApiMode } from '@/services/api'
import { adminApi, sharedApi, type AdminAuditRecord, type AdminPayment, type AdminReview, type AdminTransport, type RemoteOffer } from '@/services/mutlogApi'
import { nextStatuses, STATUS_LABEL } from '@/domain/status'
import type { Payment, Settings } from '@/domain/types'
import { formatFCFA } from '@/lib/format'
import { userName } from '@/store/logic'
import * as L from '@/store/logic'
import { transportViews } from '@/store/selectors'
import { resetDemo, run } from '@/store/store'
import type { OperationStatus } from '@/types/operation'
import { useAdminResource } from './useAdminResource'

const sel = 'h-10 rounded-control border border-line bg-surface px-3 text-sm text-ink'
const DEFAULT_SETTINGS: Settings = {
  commissionPct: 10, commissionBearer: 'transporteur', shareBasis: 'poids', cityRadiusKm: 25,
  dateToleranceDays: 2, paymentInstructions: '',
}

export function AdminOffersPage() {
  const { db, user } = useAuth()
  const flash = useFlash()
  const remote = useAdminResource(adminApi.offers, [] as RemoteOffer[])
  const rows = adminApiMode
    ? remote.data.map((o) => ({ id: String(o.id), from: o.from, to: o.to, transporter: o.transporter?.displayName || `${o.transporter?.firstName ?? ''} ${o.transporter?.lastName ?? ''}`.trim() || '—', date: o.date, availableT: o.availableT, totalCapacityT: o.totalCapacityT, price: o.price, pricingMode: o.pricingMode, status: o.status }))
    : db.offers.map((o) => ({ ...o, transporter: userName(db.users.find((u) => u.id === o.transporterId)) }))
  const cancel = async (id: string) => {
    try {
      if (adminApiMode) {
        await adminApi.cancelOffer(id)
        remote.reload()
      } else {
        const result = run((d) => L.cancelOffer(d, user!.id, id))
        if (!result.ok) return flash.err(result.error)
      }
      flash.ok('Offre annulée.')
    } catch (cause) {
      flash.err(cause instanceof Error ? cause.message : 'Impossible d’annuler cette offre.')
    }
  }
  return (
    <>
      <PageHeader title="Offres de transport" />{flash.node}
      {remote.error && <Notice tone="danger">{remote.error}</Notice>}
      {remote.loading && adminApiMode && <Card className="p-6 text-center text-sm text-muted">Chargement des offres…</Card>}
      <DataTable rows={rows} rowKey={(o) => o.id} columns={[
        { header: 'Trajet', cell: (o) => <strong>{o.from} → {o.to}</strong> }, { header: 'Transporteur', cell: (o) => o.transporter },
        { header: 'Départ', cell: (o) => fmtDate(o.date) }, { header: 'Disponible', cell: (o) => `${o.availableT} / ${o.totalCapacityT} t` },
        { header: 'Tarif', cell: (o) => `${o.price.toLocaleString('fr-FR')} FCFA${o.pricingMode === 'tonne' ? '/t' : ' (forfait)'}` },
        { header: 'Statut', cell: (o) => <Badge tone={o.status === 'ouverte' ? 'success' : o.status === 'annulee' ? 'danger' : 'neutral'}>{o.status}</Badge> },
        { header: '', cell: (o) => o.status === 'ouverte' ? <Button size="sm" variant="ghost" onClick={async () => { if (await ask({ message: 'Annuler cette offre ?', confirmLabel: 'Annuler l\'offre' })) await cancel(o.id) }}>Annuler</Button> : null },
      ]} />
    </>
  )
}

export function AdminReservationsPage() {
  const { db } = useAuth()
  const remote = useAdminResource(adminApi.reservations, [] as Awaited<ReturnType<typeof adminApi.reservations>>)
  const rows = adminApiMode
    ? remote.data.map((r) => ({ id: String(r.id), from: r.offer ? `${r.offer.from} → ${r.offer.to}` : '—', client: r.request?.client?.displayName ?? '—', transporter: r.offer?.transporter?.displayName ?? '—', weightT: r.weightT, status: r.status }))
    : [...db.reservations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r) => {
      const offer = db.offers.find((x) => x.id === r.offerId)
      return { id: r.id, from: offer ? `${offer.from} → ${offer.to}` : '—', client: userName(db.users.find((u) => u.id === r.clientId)), transporter: userName(db.users.find((u) => u.id === r.transporterId)), weightT: r.weightT, status: r.status }
    })
  return (<><PageHeader title="Réservations" /><DataTable rows={rows} rowKey={(r) => r.id} empty={<EmptyState title="Aucune réservation" />} columns={[
    { header: 'Trajet', cell: (r) => <strong>{r.from}</strong> }, { header: 'Client', cell: (r) => r.client },
    { header: 'Transporteur', cell: (r) => r.transporter }, { header: 'Poids', cell: (r) => fmtT(r.weightT) },
    { header: 'Statut', cell: (r) => <Badge tone={r.status === 'confirmee' ? 'success' : r.status === 'en_attente' ? 'pending' : 'danger'}>{r.status.replace('_', ' ')}</Badge> }]} /></>)
}

export function OperationsPage() {
  const { db } = useAuth()
  const remote = useAdminResource(() => adminApi.transports('?per_page=100'), [] as AdminTransport[])
  const rows = adminApiMode
    ? remote.data.map((t) => ({ id: String(t.id), ref: t.ref, from: t.offer.from, to: t.offer.to, transporter: t.offer.transporter?.displayName ?? '—', clients: t.clients?.length ?? 0, gross: t.finance?.gross ?? 0, status: t.status as OperationStatus }))
    : transportViews(db).map((v) => ({ id: v.t.id, ref: v.t.ref, from: v.offer.from, to: v.offer.to, transporter: userName(db.users.find((u) => u.id === v.offer.transporterId)), clients: v.p.shares.length, gross: v.p.finance.gross, status: v.t.status })).sort((a, b) => b.ref.localeCompare(a.ref))
  return (<><PageHeader title="Opérations" description="Toutes les opérations de transport (identifiant unique MUT-AAAA-NNNNNN)." /><DataTable rows={rows} rowKey={(v) => v.id} empty={<EmptyState title="Aucune opération" />} columns={[
    { header: 'Opération', cell: (v) => <strong>{v.ref}</strong> }, { header: 'Trajet', cell: (v) => `${v.from} → ${v.to}` }, { header: 'Transporteur', cell: (v) => v.transporter },
    { header: 'Clients', cell: (v) => v.clients }, { header: 'Montant', cell: (v) => formatFCFA(v.gross) }, { header: 'Statut', cell: (v) => <StatusBadge status={v.status} /> }]} /></>)
}

export function TrackingPage() {
  const { db, user } = useAuth()
  const flash = useFlash()
  const remote = useAdminResource(() => adminApi.transports('?status=confirmee,en_cours,arrive_destination,livree'), [] as AdminTransport[])
  const active = adminApiMode
    ? remote.data.map((t) => ({ id: String(t.id), ref: t.ref, from: t.offer.from, to: t.offer.to, status: t.status as OperationStatus, events: t.events }))
    : transportViews(db).filter((v) => !['terminee', 'annule'].includes(v.t.status)).map((v) => ({ id: v.t.id, ref: v.t.ref, from: v.offer.from, to: v.offer.to, status: v.t.status, events: v.t.events }))
  const [id, setId] = useState(active[0]?.id ?? '')
  useEffect(() => { if (active.length && !active.some((transport) => transport.id === id)) setId(active[0].id) }, [active, id])
  const v = active.find((x) => x.id === id)
  const move = async (to: OperationStatus) => {
    try {
      if (adminApiMode) {
        await sharedApi.updateTransportStatus(id, to)
        remote.reload()
      } else {
        const result = run((d) => L.advanceTransport(d, user!.id, id, to))
        if (!result.ok) return flash.err(result.error)
      }
      flash.ok('Statut mis à jour.')
    } catch (cause) {
      flash.err(cause instanceof Error ? cause.message : 'Impossible de mettre à jour le statut.')
    }
  }
  return (
    <>
      <PageHeader title="Suivi des transports" description="Itinéraire, positions et statut de chaque opération." />{flash.node}
      {remote.error && <Notice tone="danger">{remote.error}</Notice>}
      {remote.loading && adminApiMode && <Card className="p-6 text-center text-sm text-muted">Chargement des transports…</Card>}
      {active.length === 0 ? <Card><EmptyState title="Aucun transport en cours" /></Card> : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <Card><ul className="divide-y divide-line">{active.map((x) => <li key={x.id}><button onClick={() => setId(x.id)} className={`w-full px-4 py-3 text-left text-sm hover:bg-background/70 ${x.id === id ? 'bg-primary-soft' : ''}`}><strong>{x.from} → {x.to}</strong><br /><span className="text-xs text-muted">{x.ref} · {STATUS_LABEL[x.status]}</span></button></li>)}</ul></Card>
          {v && <Card className="space-y-4 p-4"><StatusStepper status={v.status} />
            <RouteMap from={v.from} to={v.to} height={320} trace={v.events.filter((e) => e.kind === 'position' && e.lat !== undefined && e.lng !== undefined).map((e) => ({ lat: e.lat!, lng: e.lng!, label: `${e.label} — ${fmtDateTime(e.at)}` }))} />
            <div className="flex flex-wrap gap-2">{nextStatuses(v.status).map((s) => <Button key={s} size="sm" variant={s === 'annule' ? 'outline' : 'primary'} onClick={() => void move(s)}>{s === 'annule' ? 'Annuler le transport' : `Passer à « ${STATUS_LABEL[s]} »`}</Button>)}</div></Card>}
        </div>)}
    </>
  )
}

export function AdminPaymentsPage() {
  const { db, user } = useAuth()
  const flash = useFlash()
  const [f, setF] = useState<'a_verifier' | 'tous'>('a_verifier')
  const remote = useAdminResource(() => sharedApi.payments('?per_page=100'), [] as AdminPayment[])
  const rows = adminApiMode
    ? remote.data.filter((p) => f === 'tous' || (p.status === 'en_attente' && p.reference)).map((p) => ({ id: String(p.id), transport: p.transportRef ?? '—', client: p.clientName ?? '—', amount: p.amount, reference: p.reference ?? null, status: p.status }))
    : db.payments.filter((p) => f === 'tous' || (p.status === 'en_attente' && p.reference)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((p) => ({ id: p.id, transport: db.transports.find((t) => t.id === p.transportId)?.ref ?? '—', client: userName(db.users.find((u) => u.id === p.clientId)), amount: p.amount, reference: p.reference ?? null, status: p.status }))
  const reviewCount = adminApiMode ? remote.data.filter((p) => p.status === 'en_attente' && p.reference).length : db.payments.filter((p) => p.status === 'en_attente' && p.reference).length
  const set = async (id: string, s: Payment['status']) => {
    try {
      if (adminApiMode) {
        await adminApi.setPaymentStatus(id, { status: s })
        remote.reload()
      } else {
        const result = run((d) => L.setPaymentStatus(d, user!.id, id, s))
        if (!result.ok) return flash.err(result.error)
      }
      flash.ok('Paiement mis à jour.')
    } catch (cause) {
      flash.err(cause instanceof Error ? cause.message : 'Impossible de mettre à jour le paiement.')
    }
  }
  return (
    <>
      <PageHeader title="Paiements" description="Validation manuelle des paiements Mobile Money déclarés par les clients." />{flash.node}
      {remote.error && <Notice tone="danger">{remote.error}</Notice>}
      {remote.loading && adminApiMode && <Card className="p-6 text-center text-sm text-muted">Chargement des paiements…</Card>}
      <Tabs value={f} onChange={setF} tabs={[{ key: 'a_verifier', label: 'À vérifier', count: reviewCount }, { key: 'tous', label: 'Tous', count: adminApiMode ? remote.data.length : db.payments.length }]} />
      <DataTable rows={rows} rowKey={(p) => p.id} empty={<EmptyState title="Aucun paiement à vérifier" />} columns={[
        { header: 'Opération', cell: (p) => p.transport }, { header: 'Client', cell: (p) => p.client },
        { header: 'Montant', cell: (p) => <strong>{formatFCFA(p.amount)}</strong> }, { header: 'Référence', cell: (p) => p.reference ?? '—' }, { header: 'Statut', cell: (p) => <PaymentBadge status={p.status} /> },
        { header: 'Actions', cell: (p) => <span className="flex flex-wrap justify-end gap-1.5">{p.status === 'en_attente' && p.reference && <><Button size="sm" onClick={() => void set(p.id, 'confirme')}>Confirmer</Button><Button size="sm" variant="outline" onClick={() => void set(p.id, 'echoue')}>Échoué</Button></>}{p.status === 'confirme' && <Button size="sm" variant="ghost" onClick={async () => (await ask({ message: 'Marquer ce paiement comme remboursé ?', confirmLabel: 'Rembourser', danger: false })) && set(p.id, 'rembourse')}>Rembourser</Button>}</span> }]} />
    </>
  )
}

export function AdminReviewsPage() {
  const { db, user } = useAuth()
  const flash = useFlash()
  const remote = useAdminResource(sharedApi.reviews, [] as AdminReview[])
  const rows = adminApiMode
    ? remote.data.map((r) => ({ id: String(r.id), rating: r.rating, from: r.author?.displayName ?? r.author?.firstName ?? '—', to: r.target?.displayName ?? r.target?.firstName ?? '—', comment: r.comment, reported: r.reported }))
    : [...db.reviews].sort((a, b) => Number(b.reported) - Number(a.reported) || b.createdAt.localeCompare(a.createdAt)).map((r) => ({ id: r.id, rating: r.rating, from: userName(db.users.find((u) => u.id === r.fromId)), to: userName(db.users.find((u) => u.id === r.toId)), comment: r.comment, reported: r.reported }))
  const remove = async (id: string) => {
    if (!(await ask({ message: 'Supprimer cet avis ?', confirmLabel: 'Supprimer' }))) return
    try {
      if (adminApiMode) {
        await adminApi.deleteReview(id)
        remote.reload()
      } else {
        run((d) => { d.reviews = d.reviews.filter((r) => r.id !== id); L.log(d, user!.id, 'avis_supprime', id); return { ok: true as const, value: undefined } })
      }
    } catch (cause) {
      flash.err(cause instanceof Error ? cause.message : 'Impossible de supprimer cet avis.')
    }
  }
  return (<><PageHeader title="Évaluations" /><DataTable rows={rows} rowKey={(r) => r.id} empty={<EmptyState title="Aucune évaluation" />} columns={[
    { header: 'Note', cell: (r) => <Stars value={r.rating} size={14} /> }, { header: 'De', cell: (r) => r.from }, { header: 'Pour', cell: (r) => r.to },
    { header: 'Commentaire', cell: (r) => r.comment ?? '—' }, { header: 'Signalement', cell: (r) => r.reported ? <Badge tone="danger">Signalé</Badge> : '—' }, { header: '', cell: (r) => <Button size="sm" variant="ghost" onClick={() => void remove(r.id)}>Supprimer</Button> }]} /></>)
}

export function StatsPage() {
  const { db } = useAuth()
  const remote = useAdminResource(adminApi.stats, { done: 0, poolingsMulti: 0, avgRating: null, topRoutes: [], commissionByMonth: {} } as Awaited<ReturnType<typeof adminApi.stats>>)
  if (adminApiMode) {
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const key = date.toISOString().slice(0, 7)
      return { key, label: date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''), value: remote.data.commissionByMonth[key] ?? 0 }
    })
    const routes = remote.data.topRoutes.map(({ route, count }) => ({ name: route, value: count }))
    return (
      <>
        <PageHeader title="Statistiques" description="Indicateurs d'activité de la plateforme." />
        {remote.error && <Notice tone="danger">{remote.error}</Notice>}
        {remote.loading && <p className="py-4 text-sm text-muted">Chargement des statistiques…</p>}
        <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-5"><p className="text-xs text-muted">Opérations terminées</p><p className="mt-1 text-2xl font-bold">{remote.data.done}</p></Card>
          <Card className="p-5"><p className="text-xs text-muted">Dont mutualisées (plusieurs clients)</p><p className="mt-1 text-2xl font-bold">{remote.data.poolingsMulti}</p></Card>
          <Card className="p-5"><p className="text-xs text-muted">Note moyenne des transporteurs</p><p className="mt-1 text-2xl font-bold">{remote.data.avgRating?.toFixed(1) ?? '—'}</p></Card></div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-4"><h2 className="px-1 text-base font-semibold">Commissions acquises par mois</h2><div className="mt-3 h-60" role="img" aria-label="Commissions par mois"><ResponsiveContainer width="100%" height="100%"><BarChart data={months}><CartesianGrid vertical={false} stroke="#E2E8F0" /><XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis width={44} tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v: number) => `${Math.round(v / 1000)} k`} /><Tooltip formatter={(v) => formatFCFA(Number(v))} /><Bar dataKey="value" name="Commissions" fill="#FF7A00" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
            <Card className="p-4"><h2 className="px-1 text-base font-semibold">Trajets les plus demandés</h2><div className="mt-3 h-60" role="img" aria-label="Trajets les plus fréquents"><ResponsiveContainer width="100%" height="100%"><BarChart data={routes} layout="vertical" margin={{ left: 30 }}><CartesianGrid horizontal={false} stroke="#E2E8F0" /><XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} fontSize={11} /><Tooltip /><Bar dataKey="value" name="Opérations" fill="#123E68" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div></Card></div></div>
      </>
    )
  }
  const routes = Object.entries(transportViews(db).reduce<Record<string, number>>((m, v) => { const k = `${v.offer.from} → ${v.offer.to}`; m[k] = (m[k] ?? 0) + 1; return m }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }))
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - (5 - i)); return { key: d.toISOString().slice(0, 7), label: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''), value: 0 } })
  db.commissions.filter((c) => c.status === 'acquise').forEach((c) => { const t = db.transports.find((x) => x.id === c.transportId); const m = t && months.find((x) => x.key === (t.events[t.events.length - 1].at.slice(0, 7))); if (m) m.value += c.commission })
  const done = transportViews(db).filter((v) => v.t.status === 'terminee')
  const pooled = done.filter((v) => v.p.shares.length > 1).length
  return (
    <>
      <PageHeader title="Statistiques" description="Indicateurs d'activité de la plateforme." />
      <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-xs text-muted">Opérations terminées</p><p className="mt-1 text-2xl font-bold">{done.length}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted">Dont mutualisées (plusieurs clients)</p><p className="mt-1 text-2xl font-bold">{pooled}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted">Note moyenne des transporteurs</p><p className="mt-1 text-2xl font-bold">{db.reviews.length ? (db.reviews.reduce((s, r) => s + r.rating, 0) / db.reviews.length).toFixed(1) : '—'}</p></Card></div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-4"><h2 className="px-1 text-base font-semibold">Commissions acquises par mois</h2><div className="mt-3 h-60" role="img" aria-label="Commissions par mois"><ResponsiveContainer width="100%" height="100%"><BarChart data={months}><CartesianGrid vertical={false} stroke="#E2E8F0" /><XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis width={44} tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v: number) => `${Math.round(v / 1000)} k`} /><Tooltip formatter={(v) => formatFCFA(Number(v))} /><Bar dataKey="value" name="Commissions" fill="#FF7A00" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
          <Card className="p-4"><h2 className="px-1 text-base font-semibold">Trajets les plus demandés</h2><div className="mt-3 h-60" role="img" aria-label="Trajets les plus fréquents"><ResponsiveContainer width="100%" height="100%"><BarChart data={routes} layout="vertical" margin={{ left: 30 }}><CartesianGrid horizontal={false} stroke="#E2E8F0" /><XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} fontSize={11} /><Tooltip /><Bar dataKey="value" name="Opérations" fill="#123E68" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div></Card></div></div>
    </>
  )
}

export function AuditPage() {
  const { db } = useAuth()
  const remote = useAdminResource(() => adminApi.audit('?per_page=200'), [] as AdminAuditRecord[])
  const rows = adminApiMode ? remote.data.map((row) => ({ ...row, id: String(row.id) })) : db.audit.slice(0, 200).map((a) => ({ id: a.id, actor: userName(db.users.find((u) => u.id === a.actorId)), action: a.action, detail: a.detail, createdAt: a.createdAt }))
  return (<><PageHeader title="Journal d'activité" description="Actions importantes enregistrées sur la plateforme (CDC §22)." />
    {remote.error && <Notice tone="danger">{remote.error}</Notice>}
    <DataTable rows={rows} rowKey={(a) => a.id} empty={<EmptyState title="Aucune activité enregistrée" />} columns={[
      { header: 'Date', cell: (a) => fmtDateTime(a.createdAt) }, { header: 'Utilisateur', cell: (a) => a.actor ?? '—' }, { header: 'Action', cell: (a) => a.action.replace(/_/g, ' ') }, { header: 'Détail', cell: (a) => a.detail }]} /></>)
}



type ContactStatus = 'nouveau' | 'lu' | 'traite'

type ContactMessageRecord = {
  id: number
  name: string
  phone: string | null
  message: string
  status: string
  createdAt: string | null
}

const CONTACT_STATUS_LABEL: Record<string, string> = { nouveau: 'Nouveau', lu: 'Lu', traite: 'Traité' }
const contactTone = (status: string) => (status === 'nouveau' ? 'pending' : status === 'traite' ? 'success' : 'neutral') as 'pending' | 'success' | 'neutral'

/**
 * Messages envoyés depuis le formulaire public. On y arrive depuis la notification
 * (lien /admin/messages-contact?message=ID) : le message s'ouvre et passe à « Lu ».
 */
export function ContactMessagesPage() {
  const flash = useFlash()
  const [params, setParams] = useSearchParams()
  const [messages, setMessages] = useState<ContactMessageRecord[]>([])
  const [loading, setLoading] = useState(adminApiMode)
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'tous' | ContactStatus>('tous')
  const wanted = Number(params.get('message')) || null
  const [selectedId, setSelectedId] = useState<number | null>(wanted)
  const autoRead = useRef(new Set<number>())

  useEffect(() => {
    if (!adminApiMode) return
    let active = true
    const load = (silent: boolean) =>
      adminApi.contactMessages()
        .then((result) => {
          if (!active) return
          const raw = result && typeof result === 'object' && 'data' in result
            ? (result as { data: unknown }).data
            : result
          setMessages(Array.isArray(raw) ? raw as ContactMessageRecord[] : [])
        })
        .catch((cause: unknown) => {
          if (active && !silent) flash.err(cause instanceof Error ? cause.message : 'Impossible de charger les messages de contact.')
        })
        .finally(() => { if (active) setLoading(false) })
    void load(false)
    // Un nouveau message apparaît sans recharger la page.
    const timer = setInterval(() => { if (document.visibilityState !== 'hidden') void load(true) }, 30_000)
    return () => { active = false; clearInterval(timer) }
  }, [reloadKey])

  // Arrivée depuis une notification déjà sur la page : on ouvre le message demandé.
  useEffect(() => { if (wanted) setSelectedId(wanted) }, [wanted])

  const changeStatus = async (id: number, status: ContactStatus) => {
    const previous = messages.find((m) => m.id === id)?.status
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, status } : m)))
    try {
      await adminApi.updateContactMessage(id, status)
    } catch (cause) {
      setMessages((list) => list.map((m) => (m.id === id && previous ? { ...m, status: previous } : m)))
      flash.err(cause instanceof Error ? cause.message : 'Impossible de mettre à jour le statut.')
    }
  }

  const select = (id: number) => {
    setSelectedId(id)
    setParams({ message: String(id) }, { replace: true })
  }

  const selected = messages.find((message) => message.id === selectedId)

  // Ouvrir un message nouveau le marque comme lu (une seule tentative par message).
  useEffect(() => {
    if (!selected || selected.status !== 'nouveau' || autoRead.current.has(selected.id)) return
    autoRead.current.add(selected.id)
    void changeStatus(selected.id, 'lu')
  }, [selected?.id, selected?.status])

  const normalizedQuery = query.trim().toLocaleLowerCase('fr')
  const filtered = messages.filter((message) =>
    (filter === 'tous' || message.status === filter) &&
    `${message.name} ${message.phone ?? ''} ${message.message}`.toLocaleLowerCase('fr').includes(normalizedQuery),
  )
  const newCount = messages.filter((message) => message.status === 'nouveau').length

  return (
    <>
      <PageHeader
        title="Messages de contact"
        description="Messages reçus depuis le formulaire public de MUTLOG."
        action={adminApiMode ? <Button variant="outline" onClick={() => { setLoading(true); setReloadKey((k) => k + 1) }}>Actualiser</Button> : undefined}
      />
      {flash.node}
      {!adminApiMode ? (
        <Card className="p-5"><h2 className="font-semibold">API non configurée</h2><p className="mt-2 text-sm text-muted">Configurez VITE_API_URL pour consulter ici les messages enregistrés par Laravel. Le mode démonstration transmet uniquement une notification locale.</p></Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">{loading ? 'Chargement des messages…' : `${filtered.length} message${filtered.length > 1 ? 's' : ''}${newCount ? ` · ${newCount} nouveau${newCount > 1 ? 'x' : ''}` : ''}`}</p>
            <div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row">
              <select aria-label="Filtrer par statut" className={sel} value={filter} onChange={(e) => setFilter(e.target.value as 'tous' | ContactStatus)}>
                <option value="tous">Tous les statuts</option>
                <option value="nouveau">Nouveaux</option>
                <option value="lu">Lus</option>
                <option value="traite">Traités</option>
              </select>
              <div className="w-full"><Input aria-label="Rechercher un message" placeholder="Rechercher par nom, téléphone ou contenu…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
            </div>
          </div>
          {loading ? <Card className="p-8 text-center text-sm text-muted">Chargement des messages de contact…</Card> : filtered.length === 0 ? (
            <EmptyState title={query || filter !== 'tous' ? 'Aucun résultat' : 'Aucun message reçu'} text={query || filter !== 'tous' ? 'Modifiez votre recherche ou le filtre.' : 'Les nouveaux messages envoyés depuis la page Contact apparaîtront ici.'} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-3">
                {filtered.map((message) => (
                  <button key={message.id} type="button" onClick={() => select(message.id)} className={`w-full rounded-card border p-4 text-left transition hover:border-primary ${selectedId === message.id ? 'border-primary bg-primary/5' : 'border-line bg-surface'}`}>
                    <div className="flex items-start justify-between gap-3"><strong className="text-sm">{message.name}</strong><Badge tone={contactTone(message.status)}>{CONTACT_STATUS_LABEL[message.status] ?? message.status}</Badge></div>
                    <p className="mt-1 text-xs text-muted">{message.phone || 'Téléphone non renseigné'}{message.createdAt ? ` · ${fmtDateTime(message.createdAt)}` : ''}</p>
                    <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-ink">{message.message}</p>
                  </button>
                ))}
              </div>
              <Card className="h-fit p-5">
                {selected ? <>
                  <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{selected.name}</h2><p className="mt-1 text-sm text-muted">{selected.phone || 'Aucun numéro de téléphone'}</p></div><Badge tone={contactTone(selected.status)}>{CONTACT_STATUS_LABEL[selected.status] ?? selected.status}</Badge></div>
                  {selected.createdAt && <p className="mt-3 text-xs text-muted">Reçu le {fmtDateTime(selected.createdAt)}</p>}
                  <div className="mt-5 whitespace-pre-wrap break-words rounded-control bg-background p-4 text-sm leading-6">{selected.message}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selected.phone && <Button onClick={() => window.open(`tel:${selected.phone}`, '_self')} variant="outline">Appeler le contact</Button>}
                    {selected.status === 'traite'
                      ? <Button variant="ghost" onClick={() => void changeStatus(selected.id, 'lu')}>Rouvrir</Button>
                      : <Button onClick={() => void changeStatus(selected.id, 'traite')}>Marquer comme traité</Button>}
                  </div>
                </> : <div className="py-10 text-center text-sm text-muted">Sélectionnez un message pour lire son contenu complet.</div>}
              </Card>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export function SettingsPage() {
  const { db } = useAuth()
  const flash = useFlash()
  const [s, setS] = useState<Settings>(() => adminApiMode ? DEFAULT_SETTINGS : db.settings)
  const [loading, setLoading] = useState(adminApiMode)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!adminApiMode) return
    let active = true
    setLoadError('')
    adminApi.settings()
      .then((result) => {
        if (!active) return
        const raw = result && typeof result === 'object' && 'data' in result
          ? (result as { data: unknown }).data
          : result
        if (!raw || typeof raw !== 'object') return
        const data = raw as Record<string, unknown>
        setS((current) => ({
          ...current,
          commissionPct: Number(data.commissionPct ?? data.commission_pct ?? current.commissionPct),
          commissionBearer: (data.commissionBearer ?? data.commission_bearer ?? current.commissionBearer) as Settings['commissionBearer'],
          shareBasis: (data.shareBasis ?? data.share_basis ?? current.shareBasis) as Settings['shareBasis'],
          cityRadiusKm: Number(data.cityRadiusKm ?? data.city_radius_km ?? current.cityRadiusKm),
          dateToleranceDays: Number(data.dateToleranceDays ?? data.date_tolerance_days ?? current.dateToleranceDays),
          paymentInstructions: String(data.paymentInstructions ?? data.payment_instructions ?? current.paymentInstructions),
        }))
      })
      .catch((cause) => {
        if (active) setLoadError(cause instanceof Error ? cause.message : 'Impossible de charger les paramètres.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!(s.commissionPct >= 5 && s.commissionPct <= 10)) return flash.err('Le taux de commission doit être compris entre 5 % et 10 % (cahier des charges).')
    if (!(s.cityRadiusKm >= 0 && s.cityRadiusKm <= 500)) return flash.err('Le rayon de matching doit être compris entre 0 et 500 km.')
    if (!(Number.isInteger(s.dateToleranceDays) && s.dateToleranceDays >= 0 && s.dateToleranceDays <= 30)) return flash.err('La tolérance de date doit être un nombre entier entre 0 et 30 jours.')
    if (!s.paymentInstructions.trim() || s.paymentInstructions.length > 500) return flash.err('Les consignes de paiement sont obligatoires et limitées à 500 caractères.')

    setSaving(true)
    try {
      if (adminApiMode) {
        const result = await adminApi.updateSettings({
          commissionPct: s.commissionPct,
          commissionBearer: s.commissionBearer,
          shareBasis: s.shareBasis,
          cityRadiusKm: s.cityRadiusKm,
          dateToleranceDays: s.dateToleranceDays,
          paymentInstructions: s.paymentInstructions.trim(),
        })
        const raw = result && typeof result === 'object' && 'data' in result
          ? (result as { data: unknown }).data
          : result
        if (raw && typeof raw === 'object') {
          const data = raw as Record<string, unknown>
          setS((current) => ({
            ...current,
            commissionPct: Number(data.commissionPct ?? data.commission_pct ?? s.commissionPct),
            commissionBearer: (data.commissionBearer ?? data.commission_bearer ?? s.commissionBearer) as Settings['commissionBearer'],
            shareBasis: (data.shareBasis ?? data.share_basis ?? s.shareBasis) as Settings['shareBasis'],
            cityRadiusKm: Number(data.cityRadiusKm ?? data.city_radius_km ?? s.cityRadiusKm),
            dateToleranceDays: Number(data.dateToleranceDays ?? data.date_tolerance_days ?? s.dateToleranceDays),
            paymentInstructions: String(data.paymentInstructions ?? data.payment_instructions ?? s.paymentInstructions),
          }))
        }
      } else {
        run((d) => { d.settings = s; L.log(d, d.session.userId ?? '', 'parametres_modifies', JSON.stringify(s)); return { ok: true as const, value: undefined } })
      }
      flash.ok('Paramètres enregistrés. Ils s’appliquent aux nouveaux regroupements.')
    } catch (cause) {
      flash.err(cause instanceof Error ? cause.message : 'Impossible d’enregistrer les paramètres.')
    } finally {
      setSaving(false)
    }
  }
  const num = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) })
  return (
    <>
      <PageHeader title="Paramètres" description="Commission, répartition du prix et règles de matching." />
      <form onSubmit={save} noValidate className="max-w-2xl space-y-6">{flash.node}
        {loadError && <Notice tone="danger">{loadError}</Notice>}
        {loading && <p className="text-sm text-muted">Chargement des paramètres depuis le serveur…</p>}
        <Card className="space-y-4 p-5">
          <h2 className="text-base font-semibold">Commission MUTLOG</h2>
          <Field label="Taux (%)" htmlFor="c" hint="Entre 5 et 10 %."><Input id="c" type="number" step="0.5" min={5} max={10} value={s.commissionPct} onChange={num('commissionPct')} disabled={loading || saving} /></Field>
          <Field label="Qui supporte la commission ?" htmlFor="b"><select id="b" className={sel + ' w-full'} value={s.commissionBearer} disabled={loading || saving} onChange={(e) => setS({ ...s, commissionBearer: e.target.value as Settings['commissionBearer'] })}><option value="transporteur">Le transporteur (déduite de son montant)</option><option value="clients">Les clients (ajoutée à leur part)</option></select></Field>
          <Field label="Répartition du prix entre clients" htmlFor="r"><select id="r" className={sel + ' w-full'} value={s.shareBasis} disabled={loading || saving} onChange={(e) => setS({ ...s, shareBasis: e.target.value as Settings['shareBasis'] })}><option value="poids">Au prorata du poids</option><option value="volume">Au prorata du volume (si renseigné)</option></select></Field>
        </Card>
        <Card className="space-y-4 p-5"><h2 className="text-base font-semibold">Matching</h2>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Rayon « départ compatible » (km)" htmlFor="k"><Input id="k" type="number" min={0} max={500} value={s.cityRadiusKm} onChange={num('cityRadiusKm')} disabled={loading || saving} /></Field><Field label="Tolérance de date (± jours)" htmlFor="j"><Input id="j" type="number" min={0} max={30} value={s.dateToleranceDays} onChange={num('dateToleranceDays')} disabled={loading || saving} /></Field></div></Card>
        <Card className="space-y-3 p-5"><h2 className="text-base font-semibold">Paiement</h2><Field label="Consignes affichées au client" htmlFor="pi"><textarea id="pi" rows={3} maxLength={500} disabled={loading || saving} className="w-full rounded-control border border-line p-3 text-sm" value={s.paymentInstructions} onChange={(e) => setS({ ...s, paymentInstructions: e.target.value })} /></Field><p className="text-xs text-muted">{s.paymentInstructions.length}/500 caractères</p></Card>
        <div className="flex flex-wrap gap-3"><Button type="submit" size="lg" disabled={loading || saving || !!loadError}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>{!adminApiMode && <Button type="button" size="lg" variant="outline" onClick={async () => (await ask({ message: 'Remplacer toutes les données par le jeu de démonstration ?', confirmLabel: 'Réinitialiser' })) && resetDemo()}>Réinitialiser les données de démonstration</Button>}</div>
      </form>
    </>
  )
}

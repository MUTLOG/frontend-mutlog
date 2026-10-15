import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/tracking/StatusBadge'
import { StatusStepper } from '@/components/tracking/StatusStepper'
import { ask } from '@/components/shared/confirm'
import { DataTable, EmptyState, fmtDate, fmtDateTime, fmtT, PaymentBadge, Stars, Tabs, useFlash } from '@/components/shared/ui-bits'
import RouteMap from '@/features/maps/RouteMap'
import { useAuth } from '@/features/auth/useAuth'
import { nextStatuses, STATUS_LABEL } from '@/domain/status'
import type { Payment, Settings } from '@/domain/types'
import { formatFCFA } from '@/lib/format'
import { userName } from '@/store/logic'
import * as L from '@/store/logic'
import { transportViews } from '@/store/selectors'
import { resetDemo, run } from '@/store/store'
import type { OperationStatus } from '@/types/operation'

const sel = 'h-10 rounded-control border border-line bg-surface px-3 text-sm text-ink'

export function AdminOffersPage() {
  const { db, user } = useAuth()
  const flash = useFlash()
  const rows = [...db.offers].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <>
      <PageHeader title="Offres de transport" />{flash.node}
      <DataTable rows={rows} rowKey={(o) => o.id} columns={[
        { header: 'Trajet', cell: (o) => <strong>{o.from} → {o.to}</strong> }, { header: 'Transporteur', cell: (o) => userName(db.users.find((u) => u.id === o.transporterId)) },
        { header: 'Départ', cell: (o) => fmtDate(o.date) }, { header: 'Disponible', cell: (o) => `${o.availableT} / ${o.totalCapacityT} t` },
        { header: 'Tarif', cell: (o) => `${o.price.toLocaleString('fr-FR')} FCFA${o.pricingMode === 'tonne' ? '/t' : ' (forfait)'}` },
        { header: 'Statut', cell: (o) => <Badge tone={o.status === 'ouverte' ? 'success' : o.status === 'annulee' ? 'danger' : 'neutral'}>{o.status}</Badge> },
        { header: '', cell: (o) => o.status === 'ouverte' ? <Button size="sm" variant="ghost" onClick={async () => { if (await ask({ message: 'Annuler cette offre ?', confirmLabel: 'Annuler l\'offre' })) { const r = run((d) => L.cancelOffer(d, user!.id, o.id)); r.ok ? flash.ok('Offre annulée.') : flash.err(r.error) } }}>Annuler</Button> : null },
      ]} />
    </>
  )
}

export function AdminReservationsPage() {
  const { db } = useAuth()
  const rows = [...db.reservations].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (<><PageHeader title="Réservations" /><DataTable rows={rows} rowKey={(r) => r.id} empty={<EmptyState title="Aucune réservation" />} columns={[
    { header: 'Trajet', cell: (r) => { const o = db.offers.find((x) => x.id === r.offerId); return <strong>{o?.from} → {o?.to}</strong> } }, { header: 'Client', cell: (r) => userName(db.users.find((u) => u.id === r.clientId)) },
    { header: 'Transporteur', cell: (r) => userName(db.users.find((u) => u.id === r.transporterId)) }, { header: 'Poids', cell: (r) => fmtT(r.weightT) },
    { header: 'Statut', cell: (r) => <Badge tone={r.status === 'confirmee' ? 'success' : r.status === 'en_attente' ? 'pending' : 'danger'}>{r.status.replace('_', ' ')}</Badge> }]} /></>)
}

export function OperationsPage() {
  const { db } = useAuth()
  const rows = transportViews(db).sort((a, b) => b.t.ref.localeCompare(a.t.ref))
  return (<><PageHeader title="Opérations" description="Toutes les opérations de transport (identifiant unique MUT-AAAA-NNNNNN)." /><DataTable rows={rows} rowKey={(v) => v.t.id} empty={<EmptyState title="Aucune opération" />} columns={[
    { header: 'Opération', cell: (v) => <strong>{v.t.ref}</strong> }, { header: 'Trajet', cell: (v) => `${v.offer.from} → ${v.offer.to}` }, { header: 'Transporteur', cell: (v) => userName(db.users.find((u) => u.id === v.offer.transporterId)) },
    { header: 'Clients', cell: (v) => v.p.shares.length }, { header: 'Montant', cell: (v) => formatFCFA(v.p.finance.gross) }, { header: 'Statut', cell: (v) => <StatusBadge status={v.t.status} /> }]} /></>)
}

export function TrackingPage() {
  const { db, user } = useAuth()
  const flash = useFlash()
  const active = transportViews(db).filter((v) => !['terminee', 'annule'].includes(v.t.status))
  const [id, setId] = useState(active[0]?.t.id ?? '')
  const v = transportViews(db).find((x) => x.t.id === id)
  const move = (to: OperationStatus) => { const r = run((d) => L.advanceTransport(d, user!.id, id, to)); r.ok ? flash.ok('Statut mis à jour.') : flash.err(r.error) }
  return (
    <>
      <PageHeader title="Suivi des transports" description="Itinéraire, positions et statut de chaque opération." />{flash.node}
      {active.length === 0 ? <Card><EmptyState title="Aucun transport en cours" /></Card> : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <Card><ul className="divide-y divide-line">{active.map((x) => <li key={x.t.id}><button onClick={() => setId(x.t.id)} className={`w-full px-4 py-3 text-left text-sm hover:bg-background/70 ${x.t.id === id ? 'bg-primary-soft' : ''}`}><strong>{x.offer.from} → {x.offer.to}</strong><br /><span className="text-xs text-muted">{x.t.ref} · {STATUS_LABEL[x.t.status]}</span></button></li>)}</ul></Card>
          {v && <Card className="space-y-4 p-4"><StatusStepper status={v.t.status} />
            <RouteMap from={v.offer.from} to={v.offer.to} height={320} trace={v.t.events.filter((e) => e.kind === 'position' && e.lat !== undefined).map((e) => ({ lat: e.lat!, lng: e.lng!, label: `${e.label} — ${fmtDateTime(e.at)}` }))} />
            <div className="flex flex-wrap gap-2">{nextStatuses(v.t.status).map((s) => <Button key={s} size="sm" variant={s === 'annule' ? 'outline' : 'primary'} onClick={() => move(s)}>{s === 'annule' ? 'Annuler le transport' : `Passer à « ${STATUS_LABEL[s]} »`}</Button>)}</div></Card>}
        </div>)}
    </>
  )
}

export function AdminPaymentsPage() {
  const { db, user } = useAuth()
  const flash = useFlash()
  const [f, setF] = useState<'a_verifier' | 'tous'>('a_verifier')
  const rows = db.payments.filter((p) => f === 'tous' || (p.status === 'en_attente' && p.reference)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const set = (id: string, s: Payment['status']) => { const r = run((d) => L.setPaymentStatus(d, user!.id, id, s)); r.ok ? flash.ok('Paiement mis à jour.') : flash.err(r.error) }
  return (
    <>
      <PageHeader title="Paiements" description="Validation manuelle des paiements Mobile Money déclarés par les clients." />{flash.node}
      <Tabs value={f} onChange={setF} tabs={[{ key: 'a_verifier', label: 'À vérifier', count: db.payments.filter((p) => p.status === 'en_attente' && p.reference).length }, { key: 'tous', label: 'Tous', count: db.payments.length }]} />
      <DataTable rows={rows} rowKey={(p) => p.id} empty={<EmptyState title="Aucun paiement à vérifier" />} columns={[
        { header: 'Opération', cell: (p) => db.transports.find((t) => t.id === p.transportId)?.ref }, { header: 'Client', cell: (p) => userName(db.users.find((u) => u.id === p.clientId)) },
        { header: 'Montant', cell: (p) => <strong>{formatFCFA(p.amount)}</strong> }, { header: 'Référence', cell: (p) => p.reference ?? '—' }, { header: 'Statut', cell: (p) => <PaymentBadge status={p.status} /> },
        { header: 'Actions', cell: (p) => <span className="flex flex-wrap justify-end gap-1.5">{p.status === 'en_attente' && p.reference && <><Button size="sm" onClick={() => set(p.id, 'confirme')}>Confirmer</Button><Button size="sm" variant="outline" onClick={() => set(p.id, 'echoue')}>Échoué</Button></>}{p.status === 'confirme' && <Button size="sm" variant="ghost" onClick={async () => (await ask({ message: 'Marquer ce paiement comme remboursé ?', confirmLabel: 'Rembourser', danger: false })) && set(p.id, 'rembourse')}>Rembourser</Button>}</span> }]} />
    </>
  )
}

export function AdminReviewsPage() {
  const { db, user } = useAuth()
  const rows = [...db.reviews].sort((a, b) => Number(b.reported) - Number(a.reported) || b.createdAt.localeCompare(a.createdAt))
  const remove = async (id: string) => { if (!(await ask({ message: 'Supprimer cet avis ?', confirmLabel: 'Supprimer' }))) return; run((d) => { d.reviews = d.reviews.filter((r) => r.id !== id); L.log(d, user!.id, 'avis_supprime', id); return { ok: true as const, value: undefined } }) }
  return (<><PageHeader title="Évaluations" /><DataTable rows={rows} rowKey={(r) => r.id} empty={<EmptyState title="Aucune évaluation" />} columns={[
    { header: 'Note', cell: (r) => <Stars value={r.rating} size={14} /> }, { header: 'De', cell: (r) => userName(db.users.find((u) => u.id === r.fromId)) }, { header: 'Pour', cell: (r) => userName(db.users.find((u) => u.id === r.toId)) },
    { header: 'Commentaire', cell: (r) => r.comment ?? '—' }, { header: 'Signalement', cell: (r) => r.reported ? <Badge tone="danger">Signalé</Badge> : '—' }, { header: '', cell: (r) => <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>Supprimer</Button> }]} /></>)
}

export function StatsPage() {
  const { db } = useAuth()
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
  return (<><PageHeader title="Journal d'activité" description="Actions importantes enregistrées sur la plateforme (CDC §22)." /><DataTable rows={db.audit.slice(0, 200)} rowKey={(a) => a.id} empty={<EmptyState title="Aucune activité enregistrée" />} columns={[
    { header: 'Date', cell: (a) => fmtDateTime(a.createdAt) }, { header: 'Utilisateur', cell: (a) => userName(db.users.find((u) => u.id === a.actorId)) }, { header: 'Action', cell: (a) => a.action.replace(/_/g, ' ') }, { header: 'Détail', cell: (a) => a.detail }]} /></>)
}

export function SettingsPage() {
  const { db } = useAuth()
  const flash = useFlash()
  const [s, setS] = useState<Settings>(db.settings)
  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!(s.commissionPct >= 5 && s.commissionPct <= 10)) return flash.err('Le taux de commission doit être compris entre 5 % et 10 % (cahier des charges).')
    if (!(s.cityRadiusKm >= 0 && s.dateToleranceDays >= 0)) return flash.err('Valeurs invalides.')
    run((d) => { d.settings = s; L.log(d, d.session.userId ?? '', 'parametres_modifies', JSON.stringify(s)); return { ok: true as const, value: undefined } })
    flash.ok('Paramètres enregistrés. Ils s\'appliquent aux nouveaux regroupements.')
  }
  const num = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) })
  return (
    <>
      <PageHeader title="Paramètres" description="Commission, répartition du prix et règles de matching." />
      <form onSubmit={save} noValidate className="max-w-2xl space-y-6">{flash.node}
        <Card className="space-y-4 p-5">
          <h2 className="text-base font-semibold">Commission MUTLOG</h2>
          <Field label="Taux (%)" htmlFor="c" hint="Entre 5 et 10 %."><Input id="c" type="number" step="0.5" min={5} max={10} value={s.commissionPct} onChange={num('commissionPct')} /></Field>
          <Field label="Qui supporte la commission ?" htmlFor="b"><select id="b" className={sel + ' w-full'} value={s.commissionBearer} onChange={(e) => setS({ ...s, commissionBearer: e.target.value as Settings['commissionBearer'] })}><option value="transporteur">Le transporteur (déduite de son montant)</option><option value="clients">Les clients (ajoutée à leur part)</option></select></Field>
          <Field label="Répartition du prix entre clients" htmlFor="r"><select id="r" className={sel + ' w-full'} value={s.shareBasis} onChange={(e) => setS({ ...s, shareBasis: e.target.value as Settings['shareBasis'] })}><option value="poids">Au prorata du poids</option><option value="volume">Au prorata du volume (si renseigné)</option></select></Field>
        </Card>
        <Card className="space-y-4 p-5"><h2 className="text-base font-semibold">Matching</h2>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Rayon « départ compatible » (km)" htmlFor="k"><Input id="k" type="number" min={0} value={s.cityRadiusKm} onChange={num('cityRadiusKm')} /></Field><Field label="Tolérance de date (± jours)" htmlFor="j"><Input id="j" type="number" min={0} value={s.dateToleranceDays} onChange={num('dateToleranceDays')} /></Field></div></Card>
        <Card className="space-y-3 p-5"><h2 className="text-base font-semibold">Paiement</h2><Field label="Consignes affichées au client" htmlFor="pi"><textarea id="pi" rows={3} className="w-full rounded-control border border-line p-3 text-sm" value={s.paymentInstructions} onChange={(e) => setS({ ...s, paymentInstructions: e.target.value })} /></Field></Card>
        <div className="flex flex-wrap gap-3"><Button type="submit" size="lg">Enregistrer</Button><Button type="button" size="lg" variant="outline" onClick={async () => (await ask({ message: 'Remplacer toutes les données par le jeu de démonstration ?', confirmLabel: 'Réinitialiser' })) && resetDemo()}>Réinitialiser les données de démonstration</Button></div>
      </form>
    </>
  )
}

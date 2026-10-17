import { useEffect, useState } from 'react'
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
import { apiEnabled } from '@/services/api'
import { adminApi, type ContactMessage } from '@/services/mutlogApi'
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

export function ContactMessagesPage() {
  const flash = useFlash()
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    if (!apiEnabled) {
      setLoading(false)
      return () => { active = false }
    }
    adminApi.contactMessages()
      .then((result) => {
        if (!active) return
        setMessages(result)
      })
      .catch((cause) => {
        if (active) flash.err(cause instanceof Error ? cause.message : 'Impossible de charger les messages de contact.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const normalizedQuery = query.trim().toLocaleLowerCase('fr')
  const filtered = messages.filter((message) =>
    `${message.name} ${message.phone ?? ''} ${message.message} ${message.status}`.toLocaleLowerCase('fr').includes(normalizedQuery),
  )
  const selected = messages.find((message) => message.id === selectedId)

  return (
    <>
      <PageHeader title="Messages de contact" description="Messages reçus depuis le formulaire public de MUTLOG." />
      {flash.node}
      {!apiEnabled ? (
        <Card className="p-5"><h2 className="font-semibold">API non configurée</h2><p className="mt-2 text-sm text-muted">Configurez VITE_API_URL pour consulter ici les messages enregistrés par Laravel. Le mode démonstration transmet uniquement une notification locale.</p></Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">{loading ? 'Chargement des messages…' : `${filtered.length} message${filtered.length > 1 ? 's' : ''}`}</p>
            <div className="w-full sm:max-w-sm"><Input aria-label="Rechercher un message" placeholder="Rechercher par nom, téléphone ou contenu…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          </div>
          {loading ? <Card className="p-8 text-center text-sm text-muted">Chargement des messages de contact…</Card> : filtered.length === 0 ? (
            <EmptyState title={query ? 'Aucun résultat' : 'Aucun message reçu'} text={query ? 'Modifiez votre recherche.' : 'Les nouveaux messages envoyés depuis la page Contact apparaîtront ici.'} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-3">
                {filtered.map((message) => (
                  <button key={message.id} type="button" onClick={() => setSelectedId(message.id)} className={`w-full rounded-card border p-4 text-left transition hover:border-primary ${selectedId === message.id ? 'border-primary bg-primary/5' : 'border-line bg-surface'}`}>
                    <div className="flex items-start justify-between gap-3"><strong className="text-sm">{message.name}</strong><Badge tone={message.status === 'nouveau' ? 'pending' : 'neutral'}>{message.status || 'reçu'}</Badge></div>
                    <p className="mt-1 text-xs text-muted">{message.phone || 'Téléphone non renseigné'}{message.createdAt ? ` · ${fmtDateTime(message.createdAt)}` : ''}</p>
                    <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-ink">{message.message}</p>
                  </button>
                ))}
              </div>
              <Card className="h-fit p-5">
                {selected ? <>
                  <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{selected.name}</h2><p className="mt-1 text-sm text-muted">{selected.phone || 'Aucun numéro de téléphone'}</p></div><Badge tone={selected.status === 'nouveau' ? 'pending' : 'neutral'}>{selected.status || 'reçu'}</Badge></div>
                  {selected.createdAt && <p className="mt-3 text-xs text-muted">Reçu le {fmtDateTime(selected.createdAt)}</p>}
                  <div className="mt-5 whitespace-pre-wrap break-words rounded-control bg-canvas p-4 text-sm leading-6">{selected.message}</div>
                  {selected.phone && <div className="mt-4"><Button onClick={() => window.open(`tel:${selected.phone}`, '_self')} variant="outline">Appeler le contact</Button></div>}
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
  const [s, setS] = useState<Settings>(db.settings)
  const [loading, setLoading] = useState(apiEnabled)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!apiEnabled) return
    let active = true
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
        if (active) flash.err(cause instanceof Error ? cause.message : 'Impossible de charger les paramètres.')
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
      if (apiEnabled) {
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
        <div className="flex flex-wrap gap-3"><Button type="submit" size="lg" disabled={loading || saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button><Button type="button" size="lg" variant="outline" onClick={async () => (await ask({ message: 'Remplacer toutes les données par le jeu de démonstration ?', confirmLabel: 'Réinitialiser' })) && resetDemo()}>Réinitialiser les données de démonstration</Button></div>
      </form>
    </>
  )
}

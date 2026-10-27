import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Bell, Send } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, EmptyState, fmtDate, fmtDateTime, GOODS_LABEL, Notice, RequestStatusBadge, Stars, Tabs, useFlash } from '@/components/shared/ui-bits'
import { StatusBadge } from '@/components/tracking/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { CallButton } from '@/features/calls/CallButton'
import { useNotifications } from '@/features/notifications/useNotifications'
import { errorMessage, setApiUser, type ApiUser } from '@/services/api'
import {
  authApi, carrierApi, clientApi, sharedApi,
  type AdminReview, type AdminTransport, type ClientRequest, type ClientShipment, type MessagePeer, type RemoteOffer, type ThreadMessage,
} from '@/services/mutlogApi'
import { CITIES } from '@/domain/geo'
import { formatFCFA } from '@/lib/format'
import type { OperationStatus } from '@/types/operation'
import { useResource } from '@/hooks/useResource'

const loading = <p className="text-sm text-muted" role="status">Chargement…</p>
const failure = (message: string, onRetry?: () => void) => (message ? <div className="mb-4"><Notice tone="danger">{message}{onRetry && <Button variant="outline" size="sm" className="ml-3" onClick={onRetry}>Réessayer</Button>}</Notice></div> : null)
const NO_PEERS: MessagePeer[] = []
const NO_MESSAGES: ThreadMessage[] = []
const NO_REVIEWS: AdminReview[] = []

export function NotificationsPage() {
  const navigate = useNavigate()
  const { items: rows, unread, loaded, error, markRead, markAll } = useNotifications()
  const open = (id: string, link?: string) => { void markRead(id); if (link) navigate(link) }
  return (
    <>
      <PageHeader title="Notifications" description={!loaded ? 'Chargement…' : unread ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Vous êtes à jour.'} action={unread ? <Button variant="outline" onClick={() => void markAll()}>Tout marquer comme lu</Button> : undefined} />
      {error && <div className="mb-4"><Notice tone="danger">{error}</Notice></div>}
      <Card>
        {!loaded ? <div className="px-6 py-10 text-center text-sm text-muted">Chargement des notifications…</div> : rows.length === 0 ? <EmptyState title="Aucune notification" /> : (
          <ul className="divide-y divide-line">
            {rows.map((n) => (
              <li key={n.id}>
                <button onClick={() => open(n.id, n.link)} className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-background/70">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${n.read ? 'bg-primary-soft text-muted' : 'bg-accent-soft text-accent'}`}><Bell className="h-4 w-4" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1"><span className={`block text-sm ${n.read ? 'text-ink' : 'font-semibold text-ink'}`}>{n.title}</span><span className="block truncate text-sm text-muted">{n.body}</span></span>
                  <span className="shrink-0 text-xs text-muted">{fmtDateTime(n.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}

/** Messagerie simple par interlocuteur (proposition — décision 3 : pas de temps réel en V1). */
export function MessagesPage() {
  const { user } = useAuth()
  const me = user!
  const [params] = useSearchParams()
  const location = useLocation()
  const [withId, setWithId] = useState(params.get('avec') ?? '')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const flash = useFlash()
  const end = useRef<HTMLDivElement>(null)
  const peers = useResource(() => sharedApi.peers(), NO_PEERS)
  const thread = useResource(() => (withId ? sharedApi.thread(withId) : Promise.resolve(NO_MESSAGES)), NO_MESSAGES, [withId])
  // Interlocuteur issu d'un lien (« Envoyer un message ») qui n'a pas encore d'échange : son nom vient du lien.
  const linkedName = (location.state as { name?: string } | null)?.name
  const nameOf = (id: string) => peers.data.find((p) => String(p.id) === id)?.displayName ?? (id === params.get('avec') ? linkedName : undefined) ?? 'Nouveau contact'
  const list = useMemo(() => {
    const known = peers.data.map((p) => ({ id: String(p.id), name: p.displayName }))
    const linked = params.get('avec')
    return linked && !known.some((p) => p.id === linked) ? [{ id: linked, name: linkedName ?? 'Nouveau contact' }, ...known] : known
  }, [peers.data, params, linkedName])
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [thread.data.length, withId])
  // Nouveaux messages : actualisation douce tant qu'une conversation est ouverte (pas de temps réel en V1).
  const reloadThread = thread.reload
  useEffect(() => {
    if (!withId) return
    const id = setInterval(() => { if (document.visibilityState !== 'hidden') reloadThread() }, 15_000)
    return () => clearInterval(id)
  }, [withId, reloadThread])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sending || !text.trim() || !withId) return
    setSending(true)
    try {
      await sharedApi.sendMessage({ toId: withId, text: text.trim(), transportId: params.get('transport') ?? undefined, offerId: params.get('offre') ?? undefined })
      setText('')
      thread.reload()
      peers.reload()
    } catch (cause) {
      flash.err(errorMessage(cause, 'Envoi impossible.'))
    } finally {
      setSending(false)
    }
  }
  return (
    <>
      <PageHeader title="Messages" description="Échangez avec vos interlocuteurs sur vos opérations." />
      {flash.node}
      {failure(peers.error, peers.reload)}
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <Card className={withId ? 'hidden md:block' : ''}>
          {!peers.loaded ? <p className="px-4 py-6 text-sm text-muted" role="status">Chargement…</p> : list.length === 0 ? <EmptyState title="Aucune conversation" text="Utilisez « Contacter le transporteur » depuis une fiche transport." /> : (
            <ul className="divide-y divide-line">{list.map((p) => <li key={p.id}><button onClick={() => setWithId(p.id)} className={`w-full px-4 py-3 text-left text-sm font-medium hover:bg-background/70 ${withId === p.id ? 'bg-primary-soft' : ''}`}>{p.name}</button></li>)}</ul>
          )}
        </Card>
        <Card className={`flex min-h-[360px] flex-col ${withId ? '' : 'hidden md:flex'}`}>
          {withId ? (
            <>
              <div className="flex items-center justify-between border-b border-line px-4 py-3"><p className="font-semibold text-ink">{nameOf(withId)}</p><div className="flex items-center gap-2"><CallButton peer={{ id: withId, displayName: nameOf(withId) }} /><Button variant="ghost" size="sm" className="md:hidden" onClick={() => setWithId('')}>Retour</Button></div></div>
              <div className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
                {failure(thread.error, thread.reload)}
                {thread.loaded && thread.data.length === 0 && <p className="text-center text-sm text-muted">Écrivez votre premier message.</p>}
                {thread.data.map((m) => <div key={m.id} className={`flex ${String(m.fromId) === String(me.id) ? 'justify-end' : ''}`}><p className={`max-w-[80%] rounded-card px-3.5 py-2 text-sm ${String(m.fromId) === String(me.id) ? 'bg-primary text-white' : 'bg-primary-soft text-ink'}`}>{m.text}<span className="mt-1 block text-[10px] opacity-70">{fmtDateTime(m.createdAt)}</span></p></div>)}
                <div ref={end} />
              </div>
              <form onSubmit={send} className="flex gap-2 border-t border-line p-3"><Input aria-label="Message" value={text} onChange={(e) => setText(e.target.value)} placeholder="Votre message" className="h-11" /><Button type="submit" size="lg" aria-label="Envoyer" disabled={sending}><Send className="h-4 w-4" /></Button></form>
            </>
          ) : <EmptyState title="Sélectionnez une conversation" />}
        </Card>
      </div>
    </>
  )
}

const STATUS_BADGE = { actif: ['success', 'Compte validé'], en_attente: ['pending', 'En attente de validation'], suspendu: ['danger', 'Compte suspendu'] } as const

/** Profil du compte connecté (client, transporteur ou administrateur) : informations, documents, mot de passe. */
export function ProfilePage() {
  const remote = useResource(() => authApi.me(), null as ApiUser | null)
  const flash = useFlash()
  const [f, setF] = useState({ firstName: '', lastName: '', company: '', email: '', address: '', city: '', idNumber: '' })
  const [pw, setPw] = useState({ old: '', next: '' })
  const [busy, setBusy] = useState(false)
  const me = remote.data
  useEffect(() => {
    if (!me) return
    setF({ firstName: me.firstName, lastName: me.lastName, company: me.company ?? '', email: me.email ?? '', address: me.address, city: me.city, idNumber: me.idNumber ?? '' })
  }, [me])
  const carrier = me?.role === 'transporteur'

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    if (!f.firstName.trim() || !f.lastName.trim()) return flash.err('Nom et prénom requis.')
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) return flash.err('Adresse e-mail invalide.')
    setBusy(true)
    try {
      const updated = await authApi.updateProfile({
        firstName: f.firstName.trim(), lastName: f.lastName.trim(), company: f.company.trim() || null,
        email: f.email.trim() || null, address: f.address.trim(), city: f.city, idNumber: f.idNumber.trim() || null,
      })
      setApiUser(updated)
      remote.setData(updated)
      flash.ok('Profil enregistré.')
    } catch (cause) {
      flash.err(errorMessage(cause, 'Impossible d’enregistrer le profil.'))
    } finally {
      setBusy(false)
    }
  }
  const changePw = async (event: React.FormEvent) => {
    event.preventDefault()
    if (pw.next.length < 8) return flash.err('Le nouveau mot de passe doit contenir au moins 8 caractères.')
    try {
      await authApi.changePassword(pw.old, pw.next)
      setPw({ old: '', next: '' })
      flash.ok('Mot de passe modifié.')
    } catch (cause) {
      flash.err(errorMessage(cause, 'Impossible de modifier le mot de passe.'))
    }
  }
  const saveDocuments = async (documents: string[]) => {
    try {
      const updated = await authApi.documents(documents)
      setApiUser(updated)
      remote.setData(updated)
    } catch (cause) {
      flash.err(errorMessage(cause, 'Impossible de mettre à jour les documents.'))
    }
  }
  const documents = me?.documents ?? []
  const [tone, label] = me ? STATUS_BADGE[me.status] : STATUS_BADGE.actif

  return (
    <>
      <PageHeader title="Mon profil" description={carrier ? 'Informations de votre entreprise ou de votre activité.' : 'Vos informations personnelles.'} action={carrier ? <Badge tone={tone}>{label}</Badge> : undefined} />
      <div className="max-w-3xl space-y-6">
        {flash.node}
        {failure(remote.error, remote.reload)}
        {!remote.loaded ? loading : me && <>
          <form onSubmit={(event) => void save(event)} noValidate><Card className="space-y-4 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom" htmlFor="profile-first"><Input id="profile-first" value={f.firstName} onChange={(event) => setF({ ...f, firstName: event.target.value })} /></Field>
              <Field label="Nom" htmlFor="profile-last"><Input id="profile-last" value={f.lastName} onChange={(event) => setF({ ...f, lastName: event.target.value })} /></Field>
              <Field label="Entreprise / structure" htmlFor="profile-company"><Input id="profile-company" value={f.company} onChange={(event) => setF({ ...f, company: event.target.value })} /></Field>
              <Field label="Téléphone (identifiant de connexion)" htmlFor="profile-phone"><Input id="profile-phone" value={me.phone} disabled /></Field>
              <Field label="E-mail" htmlFor="profile-email"><Input id="profile-email" type="email" value={f.email} onChange={(event) => setF({ ...f, email: event.target.value })} /></Field>
              <Field label="Ville" htmlFor="profile-city"><select id="profile-city" value={f.city} onChange={(event) => setF({ ...f, city: event.target.value })} className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm">{CITIES.map((city) => <option key={city.name}>{city.name}</option>)}</select></Field>
              <Field label="Adresse" htmlFor="profile-address"><Input id="profile-address" value={f.address} onChange={(event) => setF({ ...f, address: event.target.value })} /></Field>
              {carrier && <Field label="Numéro d'identification (IFU)" htmlFor="profile-ifu"><Input id="profile-ifu" value={f.idNumber} onChange={(event) => setF({ ...f, idNumber: event.target.value })} /></Field>}
            </div>
            {me.rating && <p className="flex items-center gap-2 text-sm text-muted"><Stars value={me.rating.avg} /> {me.rating.avg.toFixed(1)} sur {me.rating.count} avis</p>}
            <Button type="submit" size="lg" disabled={busy}>Enregistrer</Button>
          </Card></form>
          {carrier && (
            <Card className="space-y-3 p-5 sm:p-6">
              <h2 className="text-base font-semibold text-ink">Documents de l'entreprise</h2>
              <p className="text-sm text-muted">Pièces utiles à la vérification de votre compte (carte d'identité, IFU, carte grise, assurance…). MUTLOG ne les partage pas.</p>
              {documents.length > 0 && <ul className="divide-y divide-line rounded-control border border-line text-sm">{documents.map((n) => <li key={n} className="flex items-center justify-between px-3 py-2"><span className="truncate">{n}</span><button className="text-xs font-medium text-danger hover:underline" onClick={() => void saveDocuments(documents.filter((x) => x !== n))}>Retirer</button></li>)}</ul>}
              <input type="file" multiple accept="image/*,.pdf" aria-label="Ajouter des documents" onChange={(e) => {
                const files = Array.from(e.target.files ?? [])
                if (files.some((x) => x.size > 5 * 1024 * 1024)) return flash.err('Chaque fichier doit faire moins de 5 Mo.')
                void saveDocuments([...new Set([...documents, ...files.map((x) => x.name)])])
                e.target.value = ''
              }} className="block w-full text-sm text-muted file:mr-3 file:rounded-control file:border-0 file:bg-primary-soft file:px-4 file:py-2.5 file:font-semibold file:text-primary" />
            </Card>
          )}
          <form onSubmit={(event) => void changePw(event)} noValidate><Card className="space-y-4 p-5 sm:p-6">
            <h2 className="text-base font-semibold text-ink">Changer de mot de passe</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mot de passe actuel" htmlFor="profile-current-password"><Input id="profile-current-password" type="password" autoComplete="current-password" value={pw.old} onChange={(event) => setPw({ ...pw, old: event.target.value })} /></Field>
              <Field label="Nouveau mot de passe" htmlFor="profile-new-password" hint="8 caractères minimum."><Input id="profile-new-password" type="password" autoComplete="new-password" value={pw.next} onChange={(event) => setPw({ ...pw, next: event.target.value })} /></Field>
            </div>
            <Button type="submit" variant="outline">Modifier le mot de passe</Button>
          </Card></form>
        </>}
      </div>
    </>
  )
}

// ───────────────────────── Historique ─────────────────────────

type HTab = 'demandes' | 'transports' | 'paiements' | 'evaluations'
const NO_REQUESTS: ClientRequest[] = []
const NO_OFFERS: RemoteOffer[] = []
const NO_SHIPMENTS: ClientShipment[] = []
const NO_TRANSPORTS: AdminTransport[] = []

/** Historique (CDC §20) : client = demandes, transports, paiements, évaluations ; transporteur = offres, transports, revenus, évaluations. */
export function HistoryPage() {
  const { user } = useAuth()
  const carrier = user!.role === 'transporteur'
  const [tab, setTab] = useState<HTab>('demandes')
  return (
    <>
      <PageHeader title="Historique" description="Toutes vos opérations passées." />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'demandes', label: carrier ? 'Offres' : 'Demandes' }, { key: 'transports', label: 'Transports' }, { key: 'paiements', label: carrier ? 'Revenus et commissions' : 'Paiements et reçus' }, { key: 'evaluations', label: 'Évaluations' }]} />
      {tab === 'demandes' && (carrier ? <HistoryOffers /> : <HistoryRequests />)}
      {tab === 'transports' && <HistoryTransports carrier={carrier} />}
      {tab === 'paiements' && <HistoryPayments carrier={carrier} />}
      {tab === 'evaluations' && <HistoryReviews />}
    </>
  )
}

function HistoryRequests() {
  const requests = useResource(() => clientApi.requests('?per_page=100'), NO_REQUESTS)
  const rows = useMemo(() => [...requests.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [requests.data])
  if (!requests.loaded) return loading
  return <>{failure(requests.error, requests.reload)}<DataTable rows={rows} rowKey={(r) => String(r.id)} columns={[
    { header: 'Trajet', cell: (r) => <Link className="font-semibold text-primary-2 hover:underline" to={`/client/demandes/${r.id}`}>{r.from} → {r.to}</Link> },
    { header: 'Date', cell: (r) => fmtDate(r.date) }, { header: 'Marchandise', cell: (r) => GOODS_LABEL[r.goods] }, { header: 'Statut', cell: (r) => <RequestStatusBadge status={r.status} /> },
  ]} /></>
}

function HistoryOffers() {
  const offers = useResource(() => carrierApi.offers(), NO_OFFERS)
  const rows = useMemo(() => [...offers.data].sort((a, b) => b.date.localeCompare(a.date)), [offers.data])
  if (!offers.loaded) return loading
  return <>{failure(offers.error, offers.reload)}<DataTable rows={rows} rowKey={(o) => String(o.id)} columns={[
    { header: 'Trajet', cell: (o) => `${o.from} → ${o.to}` }, { header: 'Date', cell: (o) => fmtDate(o.date) }, { header: 'Capacité', cell: (o) => `${o.totalCapacityT} t` },
    { header: 'Statut', cell: (o) => <Badge tone={o.status === 'annulee' ? 'danger' : o.status === 'ouverte' ? 'success' : 'neutral'}>{o.status}</Badge> },
  ]} /></>
}

function HistoryTransports({ carrier }: { carrier: boolean }) {
  const shipments = useResource(() => (carrier ? Promise.resolve(NO_SHIPMENTS) : clientApi.shipments()), NO_SHIPMENTS, [carrier])
  const transports = useResource(() => (carrier ? carrierApi.transports() : Promise.resolve(NO_TRANSPORTS)), NO_TRANSPORTS, [carrier])
  const rows: Array<{ id: string; ref: string; offer: RemoteOffer; status: string }> = (carrier ? transports.data : shipments.data).map((t) => ({ id: String(t.id), ref: t.ref, offer: t.offer, status: t.status }))
  if (!(carrier ? transports.loaded : shipments.loaded)) return loading
  return <>{failure(shipments.error || transports.error, () => { shipments.reload(); transports.reload() })}<DataTable rows={rows} rowKey={(v) => v.id} columns={[
    { header: 'Opération', cell: (v) => v.ref }, { header: 'Trajet', cell: (v) => `${v.offer.from} → ${v.offer.to}` },
    { header: 'Date', cell: (v) => fmtDate(v.offer.date) }, { header: 'Statut', cell: (v) => <StatusBadge status={v.status as OperationStatus} /> },
  ]} /></>
}

function HistoryPayments({ carrier }: { carrier: boolean }) {
  const shipments = useResource(() => (carrier ? Promise.resolve(NO_SHIPMENTS) : clientApi.shipments()), NO_SHIPMENTS, [carrier])
  const transports = useResource(() => (carrier ? carrierApi.transports() : Promise.resolve(NO_TRANSPORTS)), NO_TRANSPORTS, [carrier])
  if (!(carrier ? transports.loaded : shipments.loaded)) return loading
  if (carrier) {
    const rows = transports.data.filter((t) => t.finance && t.status !== 'annule')
    return <>{failure(transports.error, transports.reload)}<DataTable rows={rows} rowKey={(t) => String(t.id)} columns={[
      { header: 'Opération', cell: (t) => t.ref }, { header: 'Montant brut', cell: (t) => formatFCFA(t.finance!.gross) },
      { header: 'Commission', cell: (t) => `${formatFCFA(t.finance!.commission)} (${t.finance!.ratePct} %)` }, { header: 'Net', cell: (t) => <strong>{formatFCFA(t.finance!.netCarrier)}</strong> },
    ]} /></>
  }
  const rows = shipments.data.flatMap((s) => (s.payment ? [{ payment: s.payment, ref: s.ref }] : []))
  return <>{failure(shipments.error, shipments.reload)}<DataTable rows={rows} rowKey={(x) => String(x.payment.id)} columns={[
    { header: 'Reçu', cell: (x) => x.payment.receiptNo ?? '—' }, { header: 'Opération', cell: (x) => x.ref },
    { header: 'Montant', cell: (x) => formatFCFA(x.payment.amount) }, { header: 'Date', cell: (x) => fmtDate(x.payment.confirmedAt ?? x.payment.createdAt ?? '') },
  ]} /></>
}

function HistoryReviews() {
  const { user } = useAuth()
  const received = useResource(() => sharedApi.reviews('?per_page=100'), NO_REVIEWS)
  const given = useResource(() => sharedApi.reviews('?scope=given&per_page=100'), NO_REVIEWS)
  const rows = useMemo(() => [...received.data, ...given.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [received.data, given.data])
  if (!received.loaded || !given.loaded) return loading
  return <>{failure(received.error || given.error, () => { received.reload(); given.reload() })}<DataTable rows={rows} rowKey={(r) => String(r.id)} columns={[
    { header: 'Note', cell: (r) => <Stars value={r.rating} size={14} /> },
    { header: 'Sens', cell: (r) => (String(r.fromId) === String(user!.id) ? `Donnée à ${r.target?.displayName ?? '—'}` : `Reçue de ${r.author?.displayName ?? '—'}`) },
    { header: 'Commentaire', cell: (r) => r.comment ?? '—' }, { header: 'Date', cell: (r) => fmtDate(r.createdAt) },
  ]} /></>
}

// ───────────────────────── Évaluations ─────────────────────────

type Todo = { key: string; transportId: string | number; toId: string | number; label: string }

/** Évaluations (CDC §21) : reçues, données, et opérations en attente d'évaluation. */
export function EvaluationsPage() {
  const { user } = useAuth()
  const me = user!
  const carrier = me.role === 'transporteur'
  const flash = useFlash()
  const [draft, setDraft] = useState<Record<string, { rating: number; comment: string }>>({})
  const [busy, setBusy] = useState(false)
  const profile = useResource(() => authApi.me(), null as ApiUser | null)
  const received = useResource(() => sharedApi.reviews('?per_page=100'), NO_REVIEWS)
  const given = useResource(() => sharedApi.reviews('?scope=given&per_page=100'), NO_REVIEWS)
  const shipments = useResource(() => (carrier ? Promise.resolve(NO_SHIPMENTS) : clientApi.shipments()), NO_SHIPMENTS, [carrier])
  const transports = useResource(() => (carrier ? carrierApi.transports() : Promise.resolve(NO_TRANSPORTS)), NO_TRANSPORTS, [carrier])
  const ready = received.loaded && given.loaded && (carrier ? transports.loaded : shipments.loaded)

  // Le client évalue le transporteur ; le transporteur évalue chaque client de l'opération.
  const todo = useMemo<Todo[]>(() => {
    const already = new Set(given.data.map((r) => `${r.transportId}:${r.toId}`))
    const items: Todo[] = []
    if (carrier) {
      transports.data.filter((t) => ['livree', 'terminee'].includes(t.status)).forEach((t) => (t.clients ?? []).forEach((c) => {
        if (!already.has(`${t.id}:${c.clientId}`)) items.push({ key: `${t.id}:${c.clientId}`, transportId: t.id, toId: c.clientId, label: `${t.ref} · ${t.offer.from} → ${t.offer.to} — ${c.name}` })
      }))
    } else {
      shipments.data.filter((t) => ['livree', 'terminee'].includes(t.status) && t.offer.transporter).forEach((t) => {
        const to = t.offer.transporter!
        if (!already.has(`${t.id}:${to.id}`)) items.push({ key: `${t.id}:${to.id}`, transportId: t.id, toId: to.id, label: `${t.ref} · ${t.offer.from} → ${t.offer.to} — ${to.displayName ?? 'Transporteur'}` })
      })
    }
    return items
  }, [carrier, transports.data, shipments.data, given.data])

  const reload = () => { received.reload(); given.reload(); profile.reload() }
  const submit = async (item: Todo) => {
    if (busy) return
    const d = draft[item.key] ?? { rating: 5, comment: '' }
    setBusy(true)
    try {
      await sharedApi.reviewTransport(item.transportId, { toId: item.toId, rating: d.rating, comment: d.comment.trim() || undefined })
      flash.ok('Évaluation envoyée.')
      reload()
    } catch (cause) {
      flash.err(errorMessage(cause, 'Envoi de l’évaluation impossible.'))
    } finally {
      setBusy(false)
    }
  }
  const report = async (review: AdminReview) => {
    try {
      await sharedApi.reportReview(review.id)
      flash.ok('Avis signalé à MUTLOG.')
      received.reload()
    } catch (cause) {
      flash.err(errorMessage(cause, 'Signalement impossible.'))
    }
  }
  const avg = profile.data?.rating
  return (
    <>
      <PageHeader title={carrier ? 'Avis' : 'Évaluations'} description={avg ? `Note moyenne : ${avg.avg.toFixed(1)} / 5 (${avg.count} avis)` : 'Aucun avis reçu pour le moment.'} />
      <div className="space-y-6">
        {flash.node}
        {failure(received.error || given.error || shipments.error || transports.error, () => { received.reload(); given.reload(); shipments.reload(); transports.reload() })}
        {!ready ? loading : <>
          {todo.length > 0 && (
            <Card className="p-5">
              <h2 className="text-base font-semibold text-ink">À évaluer</h2>
              <ul className="mt-3 space-y-4">
                {todo.map((item) => { const d = draft[item.key] ?? { rating: 5, comment: '' }; return (
                  <li key={item.key} className="rounded-control border border-line p-4">
                    <p className="text-sm font-semibold text-ink">{item.label}</p>
                    <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label="Note">{[1, 2, 3, 4, 5].map((i) => <button key={i} type="button" role="radio" aria-checked={d.rating === i} onClick={() => setDraft({ ...draft, [item.key]: { ...d, rating: i } })} className={`h-9 w-9 rounded-full text-sm font-bold ${i <= d.rating ? 'bg-accent text-white' : 'bg-primary-soft text-primary'}`}>{i}</button>)}</div>
                    <Input aria-label="Commentaire" className="mt-2" placeholder="Commentaire (facultatif)" value={d.comment} onChange={(e) => setDraft({ ...draft, [item.key]: { ...d, comment: e.target.value } })} />
                    <Button size="sm" className="mt-3" disabled={busy} onClick={() => void submit(item)}>Envoyer</Button>
                  </li>) })}
              </ul>
            </Card>
          )}
          <Card>
            <div className="px-5 pt-5"><h2 className="text-base font-semibold text-ink">Avis reçus</h2></div>
            {received.data.length === 0 ? <EmptyState title="Aucun avis reçu" /> : (
              <ul className="mt-2 divide-y divide-line">
                {received.data.map((r) => (
                  <li key={r.id} className="space-y-1 px-5 py-4">
                    <div className="flex items-center justify-between"><Stars value={r.rating} /><span className="text-xs text-muted">{fmtDate(r.createdAt)}</span></div>
                    <p className="text-sm text-ink">{r.comment ?? 'Sans commentaire'}</p>
                    <p className="text-xs text-muted">{r.author?.displayName ?? '—'}</p>
                    {!r.reported ? <button className="text-xs font-medium text-danger hover:underline" onClick={() => void report(r)}>Signaler cet avis</button> : <span className="text-xs text-muted">Signalé à MUTLOG</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>}
      </div>
    </>
  )
}

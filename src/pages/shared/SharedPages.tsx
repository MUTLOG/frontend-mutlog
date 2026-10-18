import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Bell, Send } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTable, EmptyState, fmtDate, fmtDateTime, Notice, Stars, Tabs, useFlash, GOODS_LABEL } from '@/components/shared/ui-bits'
import { StatusBadge } from '@/components/tracking/StatusBadge'
import { useAuth } from '@/features/auth/useAuth'
import { useNotifications } from '@/features/notifications/useNotifications'
import { adminApiMode, setApiUser, type ApiUser } from '@/services/api'
import { authApi } from '@/services/mutlogApi'
import { useAdminResource } from '@/pages/admin/useAdminResource'
import { CITIES } from '@/domain/geo'
import { formatFCFA } from '@/lib/format'
import { avgRating, demoHash, userName } from '@/store/logic'
import * as L from '@/store/logic'
import { carrierTransports, clientTransports } from '@/store/selectors'
import { run } from '@/store/store'

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
  const { db, user } = useAuth()
  const [params] = useSearchParams()
  const me = user!
  const [withId, setWithId] = useState(params.get('avec') ?? '')
  const [text, setText] = useState('')
  const flash = useFlash()
  const end = useRef<HTMLDivElement>(null)
  const msgs = db.messages.filter((m) => m.fromId === me.id || m.toId === me.id)
  const peers = Array.from(new Set(msgs.map((m) => (m.fromId === me.id ? m.toId : m.fromId)).concat(params.get('avec') ? [params.get('avec')!] : [])))
  const thread = msgs.filter((m) => m.fromId === withId || m.toId === withId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [thread.length, withId])
  const send = (e: React.FormEvent) => {
    e.preventDefault()
    const res = run((d) => L.sendMessage(d, me.id, withId, text, { transportId: params.get('transport') ?? undefined, offerId: params.get('offre') ?? undefined }))
    res.ok ? setText('') : flash.err(res.error)
  }
  return (
    <>
      <PageHeader title="Messages" description="Échangez avec vos interlocuteurs sur vos opérations." />
      {flash.node}
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <Card className={withId ? 'hidden md:block' : ''}>
          {peers.length === 0 ? <EmptyState title="Aucune conversation" text="Utilisez « Contacter le transporteur » depuis une fiche transport." /> : (
            <ul className="divide-y divide-line">{peers.map((id) => <li key={id}><button onClick={() => setWithId(id)} className={`w-full px-4 py-3 text-left text-sm font-medium hover:bg-background/70 ${withId === id ? 'bg-primary-soft' : ''}`}>{userName(db.users.find((u) => u.id === id))}</button></li>)}</ul>
          )}
        </Card>
        <Card className={`flex min-h-[360px] flex-col ${withId ? '' : 'hidden md:flex'}`}>
          {withId ? (
            <>
              <div className="flex items-center justify-between border-b border-line px-4 py-3"><p className="font-semibold text-ink">{userName(db.users.find((u) => u.id === withId))}</p><Button variant="ghost" size="sm" className="md:hidden" onClick={() => setWithId('')}>Retour</Button></div>
              <div className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
                {thread.length === 0 && <p className="text-center text-sm text-muted">Écrivez votre premier message.</p>}
                {thread.map((m) => <div key={m.id} className={`flex ${m.fromId === me.id ? 'justify-end' : ''}`}><p className={`max-w-[80%] rounded-card px-3.5 py-2 text-sm ${m.fromId === me.id ? 'bg-primary text-white' : 'bg-primary-soft text-ink'}`}>{m.text}<span className="mt-1 block text-[10px] opacity-70">{fmtDateTime(m.createdAt)}</span></p></div>)}
                <div ref={end} />
              </div>
              <form onSubmit={send} className="flex gap-2 border-t border-line p-3"><Input aria-label="Message" value={text} onChange={(e) => setText(e.target.value)} placeholder="Votre message" className="h-11" /><Button type="submit" size="lg" aria-label="Envoyer"><Send className="h-4 w-4" /></Button></form>
            </>
          ) : <EmptyState title="Sélectionnez une conversation" />}
        </Card>
      </div>
    </>
  )
}

export function ProfilePage() {
  const { user } = useAuth()
  return user?.role === 'admin' && adminApiMode ? <AdminProfilePage /> : <ProfileDemoPage />
}

function AdminProfilePage() {
  const remote = useAdminResource(authApi.me, null as ApiUser | null)
  const flash = useFlash()
  const [f, setF] = useState({ firstName: '', lastName: '', company: '', email: '', address: '', city: '', idNumber: '' })
  const [pw, setPw] = useState({ old: '', next: '' })
  useEffect(() => {
    if (!remote.data) return
    const { firstName, lastName, company, email, address, city, idNumber } = remote.data
    setF({ firstName, lastName, company: company ?? '', email: email ?? '', address, city, idNumber: idNumber ?? '' })
  }, [remote.data])
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!f.firstName.trim() || !f.lastName.trim()) return flash.err('Nom et prénom requis.')
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) return flash.err('Adresse e-mail invalide.')
    try {
      const updated = await authApi.updateProfile({
        firstName: f.firstName.trim(), lastName: f.lastName.trim(), company: f.company.trim() || null,
        email: f.email.trim() || null, address: f.address.trim(), city: f.city, idNumber: f.idNumber.trim() || null,
      })
      setApiUser(updated)
      remote.reload()
      flash.ok('Profil enregistré.')
    } catch (cause) {
      flash.err(cause instanceof Error ? cause.message : 'Impossible d’enregistrer le profil.')
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
      flash.err(cause instanceof Error ? cause.message : 'Impossible de modifier le mot de passe.')
    }
  }
  return (
    <>
      <PageHeader title="Mon profil" description="Vos informations personnelles." />
      <div className="max-w-3xl space-y-6">
        {flash.node}
        {remote.loading && <Card className="p-6 text-center text-sm text-muted">Chargement du profil…</Card>}
        {remote.error && <Notice tone="danger">{remote.error}</Notice>}
        {remote.data && <>
          <form onSubmit={(event) => void save(event)} noValidate><Card className="space-y-4 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom" htmlFor="admin-profile-first"><Input id="admin-profile-first" value={f.firstName} onChange={(event) => setF({ ...f, firstName: event.target.value })} /></Field>
              <Field label="Nom" htmlFor="admin-profile-last"><Input id="admin-profile-last" value={f.lastName} onChange={(event) => setF({ ...f, lastName: event.target.value })} /></Field>
              <Field label="Entreprise / structure" htmlFor="admin-profile-company"><Input id="admin-profile-company" value={f.company} onChange={(event) => setF({ ...f, company: event.target.value })} /></Field>
              <Field label="Téléphone (identifiant de connexion)" htmlFor="admin-profile-phone"><Input id="admin-profile-phone" value={remote.data.phone} disabled /></Field>
              <Field label="E-mail" htmlFor="admin-profile-email"><Input id="admin-profile-email" type="email" value={f.email} onChange={(event) => setF({ ...f, email: event.target.value })} /></Field>
              <Field label="Ville" htmlFor="admin-profile-city"><select id="admin-profile-city" value={f.city} onChange={(event) => setF({ ...f, city: event.target.value })} className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm">{CITIES.map((city) => <option key={city.name}>{city.name}</option>)}</select></Field>
              <Field label="Adresse" htmlFor="admin-profile-address"><Input id="admin-profile-address" value={f.address} onChange={(event) => setF({ ...f, address: event.target.value })} /></Field>
            </div>
            <Button type="submit" size="lg" disabled={!remote.data || remote.loading}>Enregistrer</Button>
          </Card></form>
          <form onSubmit={(event) => void changePw(event)} noValidate><Card className="space-y-4 p-5 sm:p-6">
            <h2 className="text-base font-semibold text-ink">Changer de mot de passe</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mot de passe actuel" htmlFor="admin-profile-current-password"><Input id="admin-profile-current-password" type="password" autoComplete="current-password" value={pw.old} onChange={(event) => setPw({ ...pw, old: event.target.value })} /></Field>
              <Field label="Nouveau mot de passe" htmlFor="admin-profile-new-password" hint="8 caractères minimum."><Input id="admin-profile-new-password" type="password" autoComplete="new-password" value={pw.next} onChange={(event) => setPw({ ...pw, next: event.target.value })} /></Field>
            </div>
            <Button type="submit" variant="outline">Modifier le mot de passe</Button>
          </Card></form>
        </>}
      </div>
    </>
  )
}

function ProfileDemoPage() {
  const { db, user } = useAuth()
  const me = user!
  const flash = useFlash()
  const [f, setF] = useState({ firstName: me.firstName, lastName: me.lastName, company: me.company ?? '', email: me.email ?? '', address: me.address, city: me.city, idNumber: me.idNumber ?? '' })
  const [pw, setPw] = useState({ old: '', next: '' })
  const rating = avgRating(db, me.id)
  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.firstName.trim() || !f.lastName.trim()) return flash.err('Nom et prénom requis.')
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) return flash.err('Adresse e-mail invalide.')
    run((d) => { const u = d.users.find((x) => x.id === me.id)!; Object.assign(u, { firstName: f.firstName.trim(), lastName: f.lastName.trim(), company: f.company.trim() || undefined, email: f.email.trim() || undefined, address: f.address.trim(), city: f.city, idNumber: f.idNumber.trim() || undefined }); L.log(d, me.id, 'profil_modifie', ''); return { ok: true as const, value: undefined } })
    flash.ok('Profil enregistré.')
  }
  const changePw = (e: React.FormEvent) => {
    e.preventDefault()
    const res = run((d) => {
      const u = d.users.find((x) => x.id === me.id)!
      if (u.passwordHash !== demoHash(pw.old)) return { ok: false as const, error: 'Mot de passe actuel incorrect.' }
      if (pw.next.length < 8) return { ok: false as const, error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' }
      u.passwordHash = demoHash(pw.next); L.log(d, me.id, 'mot_de_passe_modifie', '')
      return { ok: true as const, value: undefined }
    })
    if (res.ok) { setPw({ old: '', next: '' }); flash.ok('Mot de passe modifié.') } else flash.err(res.error)
  }
  return (
    <>
      <PageHeader title="Mon profil" description={me.role === 'transporteur' ? 'Informations de votre entreprise ou de votre activité.' : 'Vos informations personnelles.'} action={me.role === 'transporteur' ? <Badge tone={me.status === 'actif' ? 'success' : me.status === 'en_attente' ? 'pending' : 'danger'}>{{ actif: 'Compte validé', en_attente: 'En attente de validation', suspendu: 'Compte suspendu' }[me.status]}</Badge> : undefined} />
      <div className="max-w-3xl space-y-6">
        {flash.node}
        <form onSubmit={save} noValidate><Card className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" htmlFor="a"><Input id="a" value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} /></Field>
            <Field label="Nom" htmlFor="b"><Input id="b" value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} /></Field>
            <Field label="Entreprise / structure" htmlFor="c"><Input id="c" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
            <Field label="Téléphone (identifiant de connexion)" htmlFor="d"><Input id="d" value={me.phone} disabled /></Field>
            <Field label="E-mail" htmlFor="e"><Input id="e" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="Ville" htmlFor="g"><select id="g" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm">{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select></Field>
            <Field label="Adresse" htmlFor="h"><Input id="h" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
            {me.role === 'transporteur' && <Field label="Numéro d'identification (IFU)" htmlFor="i"><Input id="i" value={f.idNumber} onChange={(e) => setF({ ...f, idNumber: e.target.value })} /></Field>}
          </div>
          {rating && <p className="flex items-center gap-2 text-sm text-muted"><Stars value={rating.avg} /> {rating.avg.toFixed(1)} sur {rating.count} avis</p>}
          <Button type="submit" size="lg">Enregistrer</Button>
        </Card></form>
        {me.role === 'transporteur' && (
          <Card className="space-y-3 p-5 sm:p-6">
            <h2 className="text-base font-semibold text-ink">Documents de l'entreprise</h2>
            <p className="text-sm text-muted">Pièces utiles à la vérification de votre compte (carte d'identité, IFU, carte grise, assurance…). MUTLOG ne les partage pas.</p>
            {me.documents.length > 0 && <ul className="divide-y divide-line rounded-control border border-line text-sm">{me.documents.map((n) => <li key={n} className="flex items-center justify-between px-3 py-2"><span className="truncate">{n}</span><button className="text-xs font-medium text-danger hover:underline" onClick={() => run((d) => L.setDocuments(d, me.id, me.documents.filter((x) => x !== n)))}>Retirer</button></li>)}</ul>}
            <input type="file" multiple accept="image/*,.pdf" aria-label="Ajouter des documents" onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.some((x) => x.size > 5 * 1024 * 1024)) return flash.err('Chaque fichier doit faire moins de 5 Mo.'); run((d) => L.setDocuments(d, me.id, [...new Set([...me.documents, ...files.map((x) => x.name)])])); e.target.value = '' }} className="block w-full text-sm text-muted file:mr-3 file:rounded-control file:border-0 file:bg-primary-soft file:px-4 file:py-2.5 file:font-semibold file:text-primary" />
          </Card>
        )}
        <form onSubmit={changePw} noValidate><Card className="space-y-4 p-5 sm:p-6">
          <h2 className="text-base font-semibold text-ink">Changer de mot de passe</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mot de passe actuel" htmlFor="o"><Input id="o" type="password" autoComplete="current-password" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} /></Field>
            <Field label="Nouveau mot de passe" htmlFor="n" hint="8 caractères minimum."><Input id="n" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
          </div>
          <Button type="submit" variant="outline">Modifier le mot de passe</Button>
        </Card></form>
      </div>
    </>
  )
}

type HTab = 'demandes' | 'transports' | 'paiements' | 'evaluations'
/** Historique (CDC §20) : client = demandes, transports, paiements, évaluations ; transporteur = offres, transports, revenus, évaluations. */
export function HistoryPage() {
  const { db, user } = useAuth()
  const me = user!
  const carrier = me.role === 'transporteur'
  const [tab, setTab] = useState<HTab>('demandes')
  const trs = carrier ? carrierTransports(db, me.id) : clientTransports(db, me.id)
  const reviews = db.reviews.filter((r) => r.fromId === me.id || r.toId === me.id)
  return (
    <>
      <PageHeader title="Historique" description="Toutes vos opérations passées." />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'demandes', label: carrier ? 'Offres' : 'Demandes' }, { key: 'transports', label: 'Transports' }, { key: 'paiements', label: carrier ? 'Revenus et commissions' : 'Paiements et reçus' }, { key: 'evaluations', label: 'Évaluations' }]} />
      {tab === 'demandes' && (carrier
        ? <DataTable rows={db.offers.filter((o) => o.transporterId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))} rowKey={(o) => o.id} columns={[{ header: 'Trajet', cell: (o) => `${o.from} → ${o.to}` }, { header: 'Date', cell: (o) => fmtDate(o.date) }, { header: 'Capacité', cell: (o) => `${o.totalCapacityT} t` }, { header: 'Statut', cell: (o) => <Badge tone={o.status === 'annulee' ? 'danger' : o.status === 'ouverte' ? 'success' : 'neutral'}>{o.status}</Badge> }]} />
        : <DataTable rows={db.requests.filter((r) => r.clientId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))} rowKey={(r) => r.id} columns={[{ header: 'Trajet', cell: (r) => <Link className="font-semibold text-primary-2 hover:underline" to={`/client/demandes/${r.id}`}>{r.from} → {r.to}</Link> }, { header: 'Date', cell: (r) => fmtDate(r.date) }, { header: 'Marchandise', cell: (r) => GOODS_LABEL[r.goods] }, { header: 'Statut', cell: (r) => <StatusBadge status={r.status} /> }]} />)}
      {tab === 'transports' && <DataTable rows={trs} rowKey={(v) => v.t.id} columns={[{ header: 'Opération', cell: (v) => v.t.ref }, { header: 'Trajet', cell: (v) => `${v.offer.from} → ${v.offer.to}` }, { header: 'Date', cell: (v) => fmtDate(v.offer.date) }, { header: 'Statut', cell: (v) => <StatusBadge status={v.t.status} /> }]} />}
      {tab === 'paiements' && (carrier
        ? <DataTable rows={db.commissions.filter((c) => trs.some((v) => v.t.id === c.transportId))} rowKey={(c) => c.id} columns={[{ header: 'Opération', cell: (c) => db.transports.find((t) => t.id === c.transportId)?.ref }, { header: 'Montant brut', cell: (c) => formatFCFA(c.gross) }, { header: 'Commission', cell: (c) => `${formatFCFA(c.commission)} (${c.ratePct} %)` }, { header: 'Net', cell: (c) => <strong>{formatFCFA(c.netCarrier)}</strong> }]} />
        : <DataTable rows={db.payments.filter((p) => p.clientId === me.id)} rowKey={(p) => p.id} columns={[{ header: 'Reçu', cell: (p) => p.receiptNo ?? '—' }, { header: 'Opération', cell: (p) => db.transports.find((t) => t.id === p.transportId)?.ref }, { header: 'Montant', cell: (p) => formatFCFA(p.amount) }, { header: 'Date', cell: (p) => fmtDate(p.confirmedAt ?? p.createdAt) }]} />)}
      {tab === 'evaluations' && <DataTable rows={reviews} rowKey={(r) => r.id} columns={[{ header: 'Note', cell: (r) => <Stars value={r.rating} size={14} /> }, { header: 'Sens', cell: (r) => (r.fromId === me.id ? `Donnée à ${userName(db.users.find((u) => u.id === r.toId))}` : `Reçue de ${userName(db.users.find((u) => u.id === r.fromId))}`) }, { header: 'Commentaire', cell: (r) => r.comment ?? '—' }, { header: 'Date', cell: (r) => fmtDate(r.createdAt) }]} />}
    </>
  )
}

/** Évaluations (CDC §21) : reçues, données, et opérations en attente d'évaluation. */
export function EvaluationsPage() {
  const { db, user } = useAuth()
  const me = user!
  const flash = useFlash()
  const [draft, setDraft] = useState<Record<string, { rating: number; comment: string }>>({})
  const carrier = me.role === 'transporteur'
  const views = carrier ? carrierTransports(db, me.id) : clientTransports(db, me.id)
  // Le client évalue le transporteur ; le transporteur évalue chaque client de l'opération.
  const todo = views.filter((v) => ['livree', 'terminee'].includes(v.t.status)).flatMap((v) => {
    const targets = carrier ? v.p.shares.map((s) => s.clientId) : [v.offer.transporterId]
    return targets.filter((to) => !db.reviews.some((r) => r.transportId === v.t.id && r.fromId === me.id && r.toId === to)).map((to) => ({ v, to }))
  })
  const received = db.reviews.filter((r) => r.toId === me.id)
  const avg = avgRating(db, me.id)
  const submit = (tid: string, to: string, key: string) => {
    const d = draft[key] ?? { rating: 5, comment: '' }
    const res = run((x) => L.submitReview(x, me.id, tid, to, d.rating, d.comment))
    res.ok ? flash.ok('Évaluation envoyée.') : flash.err(res.error)
  }
  return (
    <>
      <PageHeader title={carrier ? 'Avis' : 'Évaluations'} description={avg ? `Note moyenne : ${avg.avg.toFixed(1)} / 5 (${avg.count} avis)` : 'Aucun avis reçu pour le moment.'} />
      <div className="space-y-6">
        {flash.node}
        {todo.length > 0 && (
          <Card className="p-5">
            <h2 className="text-base font-semibold text-ink">À évaluer</h2>
            <ul className="mt-3 space-y-4">
              {todo.map(({ v, to }) => { const key = v.t.id + to; const d = draft[key] ?? { rating: 5, comment: '' }; return (
                <li key={key} className="rounded-control border border-line p-4">
                  <p className="text-sm font-semibold text-ink">{v.t.ref} · {v.offer.from} → {v.offer.to} — {userName(db.users.find((u) => u.id === to))}</p>
                  <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label="Note">{[1, 2, 3, 4, 5].map((i) => <button key={i} type="button" role="radio" aria-checked={d.rating === i} onClick={() => setDraft({ ...draft, [key]: { ...d, rating: i } })} className={`h-9 w-9 rounded-full text-sm font-bold ${i <= d.rating ? 'bg-accent text-white' : 'bg-primary-soft text-primary'}`}>{i}</button>)}</div>
                  <Input aria-label="Commentaire" className="mt-2" placeholder="Commentaire (facultatif)" value={d.comment} onChange={(e) => setDraft({ ...draft, [key]: { ...d, comment: e.target.value } })} />
                  <Button size="sm" className="mt-3" onClick={() => submit(v.t.id, to, key)}>Envoyer</Button>
                </li>) })}
            </ul>
          </Card>
        )}
        <Card>
          <div className="px-5 pt-5"><h2 className="text-base font-semibold text-ink">Avis reçus</h2></div>
          {received.length === 0 ? <EmptyState title="Aucun avis reçu" /> : (
            <ul className="mt-2 divide-y divide-line">
              {received.map((r) => (
                <li key={r.id} className="space-y-1 px-5 py-4">
                  <div className="flex items-center justify-between"><Stars value={r.rating} /><span className="text-xs text-muted">{fmtDate(r.createdAt)}</span></div>
                  <p className="text-sm text-ink">{r.comment ?? 'Sans commentaire'}</p>
                  <p className="text-xs text-muted">{userName(db.users.find((u) => u.id === r.fromId))}</p>
                  {!r.reported ? <button className="text-xs font-medium text-danger hover:underline" onClick={() => run((d) => L.reportReview(d, me.id, r.id))}>Signaler cet avis</button> : <span className="text-xs text-muted">Signalé à MUTLOG</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

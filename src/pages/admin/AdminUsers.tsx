import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { ask } from '@/components/shared/confirm'
import { DataTable, EmptyState, fmtDate, fmtT, Modal, Notice, Stars, useFlash } from '@/components/shared/ui-bits'
import { useAuth } from '@/features/auth/useAuth'
import { adminApiMode, type ApiUser } from '@/services/api'
import { adminApi } from '@/services/mutlogApi'
import { CITIES } from '@/domain/geo'
import type { Role, User, UserType } from '@/domain/types'
import { formatPhone } from '@/domain/phone'
import { avgRating, userName } from '@/store/logic'
import * as L from '@/store/logic'
import { run } from '@/store/store'
import { useAdminResource } from './useAdminResource'

const sel = 'h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink'
const USER_TYPES: Record<string, string> = {
  producteur: 'Producteur agricole', cooperative: 'Coopérative', commercant: 'Commerçant / grossiste', pme: 'PME / entreprise', autre_client: 'Autre client',
  transporteur_independant: 'Transporteur indépendant', entreprise_transport: 'Entreprise de transport', gestionnaire_flotte: 'Gestionnaire de flotte', proprietaire_camion: 'Propriétaire de camion', admin: 'Administrateur',
}

/** Utilisateurs, clients, transporteurs (CDC §18) : créer, modifier, suspendre, supprimer, consulter ; vérifier un transporteur. */
export function UsersPage({ only }: { only?: Role }) {
  return adminApiMode ? <UsersPageApi only={only} /> : <UsersPageDemo only={only} />
}

function UsersPageApi({ only }: { only?: Role }) {
  const [q, setQ] = useState('')
  const [create, setCreate] = useState(false)
  const [edit, setEdit] = useState<ApiUser | null>(null)
  const [view, setView] = useState<ApiUser | null>(null)
  const flash = useFlash()
  const query = useMemo(() => {
    const params = new URLSearchParams({ per_page: '100' })
    if (only) params.set('role', only)
    if (q.trim()) params.set('q', q.trim())
    return `?${params.toString()}`
  }, [only, q])
  const remote = useAdminResource(() => adminApi.users(query), [] as ApiUser[], [query])
  const act = async (id: string | number, status: ApiUser['status']) => {
    try {
      await adminApi.setUserStatus(id, { status })
      flash.ok('Compte mis à jour.')
      remote.reload()
    } catch (cause) {
      flash.err(cause instanceof Error ? cause.message : 'Impossible de mettre à jour ce compte.')
    }
  }
  const del = async (u: ApiUser) => {
    const label = u.displayName || `${u.firstName} ${u.lastName}`
    if (!(await ask({ message: `Supprimer le compte de ${label} ? Cette action est définitive.`, confirmLabel: 'Supprimer' }))) return
    try {
      await adminApi.deleteUser(u.id)
      flash.ok('Compte supprimé.')
      remote.reload()
    } catch (cause) {
      flash.err(cause instanceof Error ? cause.message : 'Impossible de supprimer ce compte.')
    }
  }
  const title = only === 'client' ? 'Clients' : only === 'transporteur' ? 'Transporteurs' : 'Utilisateurs'
  const label = (u: ApiUser) => u.company || u.displayName || `${u.firstName} ${u.lastName}`.trim()
  return (
    <>
      <PageHeader title={title} description={only === 'transporteur' ? 'Vérifiez les informations, consultez les véhicules, validez ou suspendez.' : undefined} action={<Button onClick={() => setCreate(true)}>Créer un compte</Button>} />
      <div className="space-y-4">
        {flash.node}
        {remote.error && <Notice tone="danger">{remote.error}</Notice>}
        <Input aria-label="Rechercher" placeholder="Rechercher un nom, un téléphone, une ville" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        {remote.loading && <Card className="p-6 text-center text-sm text-muted">Chargement des utilisateurs…</Card>}
        <DataTable rows={remote.data} rowKey={(u) => String(u.id)} empty={<EmptyState title="Aucun utilisateur" />} columns={[
          { header: 'Nom', cell: (u) => <button className="text-left" onClick={() => setView(u)}><strong className="text-primary-2 hover:underline">{label(u)}</strong><br /><span className="text-xs text-muted">{formatPhone(u.phone)} · {u.city}</span></button> },
          { header: 'Profil', cell: (u) => USER_TYPES[u.userType] ?? u.role },
          { header: 'Note', cell: (u) => u.rating ? <span className="flex items-center gap-1"><Stars value={u.rating.avg} size={13} /> {u.rating.avg.toFixed(1)}</span> : '—' },
          { header: 'Statut', cell: (u) => <Badge tone={u.status === 'actif' ? 'success' : u.status === 'en_attente' ? 'pending' : 'danger'}>{{ actif: u.role === 'transporteur' ? 'Validé' : 'Actif', en_attente: 'À valider', suspendu: 'Suspendu' }[u.status]}</Badge> },
          { header: 'Actions', cell: (u) => <span className="flex flex-wrap justify-end gap-1.5">
            {u.role !== 'admin' && u.status !== 'actif' && <Button size="sm" onClick={() => void act(u.id, 'actif')}>{u.status === 'en_attente' ? 'Valider' : 'Réactiver'}</Button>}
            {u.role !== 'admin' && u.status === 'actif' && <Button size="sm" variant="outline" onClick={() => void act(u.id, 'suspendu')}>Suspendre</Button>}
            <Button size="sm" variant="ghost" onClick={() => setEdit(u)}>Modifier</Button>
            {u.role !== 'admin' && <Button size="sm" variant="ghost" onClick={() => void del(u)}>Supprimer</Button>}
          </span> },
        ]} />
      </div>
      {!only && <AdminAccountsPanel />}
      {create && <CreateUserModal onClose={() => setCreate(false)} onDone={() => { setCreate(false); flash.ok('Compte créé et activé. Communiquez le mot de passe provisoire à l’utilisateur.'); remote.reload() }} />}
      {edit && <EditApiUserModal user={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); flash.ok('Compte modifié.'); remote.reload() }} />}
      {view && <UserDetailApiModal user={view} onClose={() => setView(null)} onStatus={(status) => { void act(view.id, status); setView(null) }} />}
    </>
  )
}

function EditApiUserModal({ user, onClose, onDone }: { user: ApiUser; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ firstName: user.firstName, lastName: user.lastName, company: user.company ?? '', email: user.email ?? '', address: user.address, city: user.city, idNumber: user.idNumber ?? '', userType: user.userType })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setError('')
    setSaving(true)
    try {
      await adminApi.updateUser(user.id, form)
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de modifier ce compte.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal title="Modifier le compte" onClose={onClose}>
      <div className="space-y-3">
        {error && <Notice tone="danger">{error}</Notice>}
        <div className="grid grid-cols-2 gap-3"><Field label="Prénom" htmlFor="api-edit-first-name"><Input id="api-edit-first-name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field><Field label="Nom" htmlFor="api-edit-last-name"><Input id="api-edit-last-name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field></div>
        <Field label="Entreprise / structure" htmlFor="api-edit-company"><Input id="api-edit-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
        <Field label="Type d'utilisateur" htmlFor="api-edit-user-type"><select id="api-edit-user-type" className={sel} value={form.userType} onChange={(e) => setForm({ ...form, userType: e.target.value })}>{Object.entries(USER_TYPES).filter(([key]) => (user.role === 'admin' ? key === 'admin' : user.role === 'client' ? !['admin', 'transporteur_independant', 'entreprise_transport', 'gestionnaire_flotte', 'proprietaire_camion'].includes(key) : ['transporteur_independant', 'entreprise_transport', 'gestionnaire_flotte', 'proprietaire_camion'].includes(key))).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
        <Field label="E-mail" htmlFor="api-edit-email"><Input id="api-edit-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Ville" htmlFor="api-edit-city"><select id="api-edit-city" className={sel} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>{CITIES.map((city) => <option key={city.name}>{city.name}</option>)}</select></Field><Field label="Adresse" htmlFor="api-edit-address"><Input id="api-edit-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field></div>
        {user.role === 'transporteur' && <Field label="N° d'identification (IFU)" htmlFor="api-edit-id-number"><Input id="api-edit-id-number" value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} /></Field>}
        <Button size="lg" className="w-full" onClick={() => void save()} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
      </div>
    </Modal>
  )
}

function UserDetailApiModal({ user, onClose, onStatus }: { user: ApiUser; onClose: () => void; onStatus: (status: ApiUser['status']) => void }) {
  const [details, setDetails] = useState<Awaited<ReturnType<typeof adminApi.user>> | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    adminApi.user(user.id)
      .then((result) => { if (active) setDetails(result) })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Impossible de charger le détail du compte.') })
    return () => { active = false }
  }, [user.id])
  const name = user.displayName || `${user.firstName} ${user.lastName}`
  return (
    <Modal title={name} onClose={onClose}>
      {error && <Notice tone="danger">{error}</Notice>}
      {!details && !error ? <p className="py-8 text-center text-sm text-muted">Chargement du compte…</p> : details && <>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {([['Profil', USER_TYPES[details.userType] ?? details.role], ['Téléphone', formatPhone(details.phone)], ['E-mail', details.email ?? '—'], ['Ville', details.city], ['Adresse', details.address], ['Inscrit le', details.createdAt ? fmtDate(details.createdAt) : '—'], ...(details.role === 'transporteur' ? [['N° d’identification (IFU)', details.idNumber ?? 'Non renseigné']] : [])] as [string, string][]).map(([key, value]) => <div key={key}><dt className="text-xs text-muted">{key}</dt><dd className="font-medium text-ink">{value}</dd></div>)}
        </dl>
        {details.rating && <p className="mt-3 flex items-center gap-2 text-sm"><Stars value={details.rating.avg} /> {details.rating.avg.toFixed(1)} ({details.rating.count} avis)</p>}
        {details.role === 'transporteur' && <>
          <h3 className="mt-5 text-sm font-semibold text-ink">Documents</h3>
          {details.documents?.length ? <ul className="mt-1 list-disc pl-5 text-sm text-ink">{details.documents.map((doc) => <li key={doc}>{doc}</li>)}</ul> : <p className="text-sm text-muted">Aucun document fourni.</p>}
          <h3 className="mt-5 text-sm font-semibold text-ink">Véhicules ({details.vehicles.length})</h3>
          {details.vehicles.length ? <ul className="mt-1 divide-y divide-line rounded-control border border-line text-sm">{details.vehicles.map((vehicle) => <li key={vehicle.id} className="flex justify-between px-3 py-2"><span>{vehicle.type} · {vehicle.plate}</span><span className="text-muted">{fmtT(vehicle.capacityT)} · {vehicle.available && vehicle.active ? 'disponible' : 'indisponible'}</span></li>)}</ul> : <p className="text-sm text-muted">Aucun véhicule enregistré.</p>}
          {details.status !== 'actif' && <Notice tone="warning">Ce transporteur n'est pas encore validé : il ne peut pas publier de trajet.</Notice>}
        </>}
        {details.role !== 'admin' && <div className="mt-5 flex gap-3">{details.status !== 'actif' ? <Button size="lg" className="flex-1" onClick={() => onStatus('actif')}>{details.status === 'en_attente' ? 'Valider le compte' : 'Réactiver'}</Button> : <Button size="lg" variant="outline" className="flex-1" onClick={() => onStatus('suspendu')}>Suspendre</Button>}</div>}
      </>}
    </Modal>
  )
}

function UsersPageDemo({ only }: { only?: Role }) {
  const { db, user } = useAuth()
  const flash = useFlash()
  const [q, setQ] = useState('')
  const [create, setCreate] = useState(false)
  const [edit, setEdit] = useState<User | null>(null)
  const [view, setView] = useState<User | null>(null)
  const rows = db.users.filter((u) => (!only || u.role === only) && (!q || `${userName(u)} ${u.phone} ${u.city}`.toLowerCase().includes(q.toLowerCase())))
  const act = (id: string, s: User['status']) => { const r = run((d) => L.setUserStatus(d, user!.id, id, s)); r.ok ? flash.ok('Compte mis à jour.') : flash.err(r.error) }
  const del = async (u: User) => {
    if (!(await ask({ message: `Supprimer le compte de ${userName(u)} ? Cette action est définitive.`, confirmLabel: 'Supprimer' }))) return
    const r = run((d) => L.deleteUser(d, user!.id, u.id)); r.ok ? flash.ok('Compte supprimé.') : flash.err(r.error)
  }
  const title = only === 'client' ? 'Clients' : only === 'transporteur' ? 'Transporteurs' : 'Utilisateurs'
  return (
    <>
      <PageHeader title={title} description={only === 'transporteur' ? 'Vérifiez les informations, consultez les véhicules, validez ou suspendez.' : undefined} action={<Button onClick={() => setCreate(true)}>Créer un compte</Button>} />
      <div className="space-y-4">
        {flash.node}
        <Input aria-label="Rechercher" placeholder="Rechercher un nom, un téléphone, une ville" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <DataTable rows={rows} rowKey={(u) => u.id} empty={<EmptyState title="Aucun utilisateur" />} columns={[
          { header: 'Nom', cell: (u) => <button className="text-left" onClick={() => setView(u)}><strong className="text-primary-2 hover:underline">{userName(u)}</strong><br /><span className="text-xs text-muted">{formatPhone(u.phone)} · {u.city}</span></button> },
          { header: 'Profil', cell: (u) => USER_TYPES[u.userType] ?? u.role },
          { header: 'Note', cell: (u) => { const r = avgRating(db, u.id); return r ? <span className="flex items-center gap-1"><Stars value={r.avg} size={13} /> {r.avg.toFixed(1)}</span> : '—' } },
          { header: 'Statut', cell: (u) => <Badge tone={u.status === 'actif' ? 'success' : u.status === 'en_attente' ? 'pending' : 'danger'}>{{ actif: u.role === 'transporteur' ? 'Validé' : 'Actif', en_attente: 'À valider', suspendu: 'Suspendu' }[u.status]}</Badge> },
          { header: 'Actions', cell: (u) => (
            <span className="flex flex-wrap justify-end gap-1.5">
              {u.role !== 'admin' && u.status !== 'actif' && <Button size="sm" onClick={() => act(u.id, 'actif')}>{u.status === 'en_attente' ? 'Valider' : 'Réactiver'}</Button>}
              {u.role !== 'admin' && u.status === 'actif' && <Button size="sm" variant="outline" onClick={() => act(u.id, 'suspendu')}>Suspendre</Button>}
              <Button size="sm" variant="ghost" onClick={() => setEdit(u)}>Modifier</Button>
              {u.role !== 'admin' && <Button size="sm" variant="ghost" onClick={() => del(u)}>Supprimer</Button>}
            </span>) },
        ]} />
      </div>
      {create && <CreateUserModal onClose={() => setCreate(false)} onDone={() => { setCreate(false); flash.ok('Compte créé et activé. Communiquez le mot de passe provisoire à l\'utilisateur.') }} />}
      {!only && <AdminAccountsPanel />}
      {edit && <EditUserModal u={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); flash.ok('Compte modifié.') }} />}
      {view && <UserDetailModal u={view} onClose={() => setView(null)} onStatus={(s) => { act(view.id, s); setView(null) }} />}
    </>
  )
}

function AdminAccountsPanel() {
  const { user } = useAuth()
  const flash = useFlash()
  const [admins, setAdmins] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(adminApiMode)
  const [error, setError] = useState('')
  const [create, setCreate] = useState(false)
  const [edit, setEdit] = useState<ApiUser | null>(null)

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      setAdmins(await adminApi.users('?role=admin&per_page=100') as ApiUser[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger les administrateurs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (adminApiMode) void refresh()
  }, [])

  const remove = async (admin: ApiUser) => {
    if (!(await ask({ message: `Supprimer le compte administrateur de ${admin.firstName} ${admin.lastName} ? Cette action est définitive.`, confirmLabel: 'Supprimer' }))) return
    try {
      await adminApi.deleteUser(admin.id)
      flash.ok('Administrateur supprimé.')
      await refresh()
    } catch (cause) {
      flash.err(cause instanceof Error ? cause.message : 'Impossible de supprimer cet administrateur.')
    }
  }

  const setStatus = async (admin: ApiUser, status: ApiUser['status']) => {
    try {
      await adminApi.setUserStatus(admin.id, { status })
      flash.ok(status === 'actif' ? 'Administrateur réactivé.' : 'Administrateur suspendu.')
      await refresh()
    } catch (cause) {
      flash.err(cause instanceof Error ? cause.message : 'Impossible de modifier le statut.')
    }
  }

  return (
    <section className="mt-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold">Administrateurs</h2><p className="text-sm text-muted">Gérez les comptes ayant accès à l’espace d’administration.</p></div>
        {adminApiMode && <Button onClick={() => setCreate(true)}>Ajouter un administrateur</Button>}
      </div>
      {flash.node}
      {!adminApiMode ? (
        <Card className="p-4"><Notice tone="info">La gestion des administrateurs nécessite une connexion à l’API. Configurez VITE_API_URL pour créer et gérer des comptes persistants.</Notice></Card>
      ) : error ? (
        <Notice tone="danger">{error}</Notice>
      ) : loading ? (
        <Card className="p-6 text-center text-sm text-muted">Chargement des administrateurs…</Card>
      ) : (
        <DataTable rows={admins} rowKey={(admin) => String(admin.id)} empty={<EmptyState title="Aucun administrateur" />} columns={[
          { header: 'Nom', cell: (admin) => <strong>{admin.firstName} {admin.lastName}</strong> },
          { header: 'Téléphone', cell: (admin) => formatPhone(admin.phone) },
          { header: 'E-mail', cell: (admin) => admin.email || '—' },
          { header: 'Statut', cell: (admin) => <Badge tone={admin.status === 'actif' ? 'success' : 'danger'}>{admin.status === 'actif' ? 'Actif' : 'Suspendu'}</Badge> },
          { header: 'Actions', cell: (admin) => {
            const isSelf = String(admin.id) === user?.id
            return <span className="flex flex-wrap justify-end gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setEdit(admin)}>Modifier</Button>
              {!isSelf && (admin.status === 'actif'
                ? <Button size="sm" variant="outline" onClick={() => void setStatus(admin, 'suspendu')}>Suspendre</Button>
                : <Button size="sm" onClick={() => void setStatus(admin, 'actif')}>Réactiver</Button>)}
              {!isSelf && <Button size="sm" variant="ghost" onClick={() => void remove(admin)}>Supprimer</Button>}
            </span>
          } },
        ]} />
      )}
      {create && <AdminAccountModal onClose={() => setCreate(false)} onDone={async () => { setCreate(false); flash.ok('Administrateur créé et activé. Communiquez-lui son mot de passe provisoire.'); await refresh() }} />}
      {edit && <EditAdminAccountModal admin={edit} onClose={() => setEdit(null)} onDone={async () => { setEdit(null); flash.ok('Administrateur modifié.'); await refresh() }} />}
    </section>
  )
}

function AdminAccountModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', city: 'Cotonou', address: '', password: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await adminApi.createUser({ ...form, role: 'admin', userType: 'admin' })
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de créer cet administrateur.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Ajouter un administrateur" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        {error && <Notice tone="danger">{error}</Notice>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom" htmlFor="admin-first-name" required><Input id="admin-first-name" autoComplete="given-name" required maxLength={100} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
          <Field label="Nom" htmlFor="admin-last-name" required><Input id="admin-last-name" autoComplete="family-name" required maxLength={100} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
        </div>
        <Field label="Téléphone" htmlFor="admin-phone" required><Input id="admin-phone" type="tel" autoComplete="tel" required maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="E-mail" htmlFor="admin-email"><Input id="admin-email" type="email" autoComplete="email" maxLength={190} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ville" htmlFor="admin-city" required><select id="admin-city" className={sel} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>{CITIES.map((city) => <option key={city.name}>{city.name}</option>)}</select></Field>
          <Field label="Adresse" htmlFor="admin-address" required><Input id="admin-address" autoComplete="street-address" required maxLength={255} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        </div>
        <Field label="Mot de passe provisoire" htmlFor="admin-password" required hint="8 caractères minimum."><Input id="admin-password" type="password" autoComplete="new-password" required minLength={8} maxLength={100} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Button size="lg" className="w-full" type="submit" disabled={saving}>{saving ? 'Création…' : 'Créer l’administrateur'}</Button>
      </form>
    </Modal>
  )
}

function EditAdminAccountModal({ admin, onClose, onDone }: { admin: ApiUser; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ firstName: admin.firstName, lastName: admin.lastName, email: admin.email ?? '', city: admin.city, address: admin.address })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await adminApi.updateUser(admin.id, { ...form, userType: 'admin' })
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de modifier cet administrateur.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Modifier l’administrateur" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        {error && <Notice tone="danger">{error}</Notice>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom" htmlFor="edit-admin-first-name" required><Input id="edit-admin-first-name" required maxLength={100} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
          <Field label="Nom" htmlFor="edit-admin-last-name" required><Input id="edit-admin-last-name" required maxLength={100} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
        </div>
        <Field label="E-mail" htmlFor="edit-admin-email"><Input id="edit-admin-email" type="email" maxLength={190} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ville" htmlFor="edit-admin-city" required><select id="edit-admin-city" className={sel} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>{CITIES.map((city) => <option key={city.name}>{city.name}</option>)}</select></Field>
          <Field label="Adresse" htmlFor="edit-admin-address" required><Input id="edit-admin-address" required maxLength={255} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        </div>
        <Button size="lg" className="w-full" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
      </form>
    </Modal>
  )
}

function UserDetailModal({ u, onClose, onStatus }: { u: User; onClose: () => void; onStatus: (s: User['status']) => void }) {
  const { db } = useAuth()
  const vehicles = db.vehicles.filter((v) => v.ownerId === u.id)
  const rating = avgRating(db, u.id)
  return (
    <Modal title={userName(u)} onClose={onClose}>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {([['Profil', USER_TYPES[u.userType]], ['Téléphone', formatPhone(u.phone)], ['E-mail', u.email ?? '—'], ['Ville', u.city], ['Adresse', u.address], ['Inscrit le', fmtDate(u.createdAt)], ...(u.role === 'transporteur' ? [['N° d\'identification (IFU)', u.idNumber ?? 'Non renseigné']] : [])] as [string, string][]).map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-medium text-ink">{v}</dd></div>)}
      </dl>
      {rating && <p className="mt-3 flex items-center gap-2 text-sm"><Stars value={rating.avg} /> {rating.avg.toFixed(1)} ({rating.count} avis)</p>}
      {u.role === 'transporteur' && (
        <>
          <h3 className="mt-5 text-sm font-semibold text-ink">Documents</h3>
          {u.documents.length ? <ul className="mt-1 list-disc pl-5 text-sm text-ink">{u.documents.map((d) => <li key={d}>{d}</li>)}</ul> : <p className="text-sm text-muted">Aucun document fourni.</p>}
          <h3 className="mt-5 text-sm font-semibold text-ink">Véhicules ({vehicles.length})</h3>
          {vehicles.length ? <ul className="mt-1 divide-y divide-line rounded-control border border-line text-sm">{vehicles.map((v) => <li key={v.id} className="flex justify-between px-3 py-2"><span>{v.type} · {v.plate}</span><span className="text-muted">{fmtT(v.capacityT)} · {v.available && v.active ? 'disponible' : 'indisponible'}</span></li>)}</ul> : <p className="text-sm text-muted">Aucun véhicule enregistré.</p>}
          {u.status !== 'actif' && <Notice tone="warning">Ce transporteur n'est pas encore validé : il ne peut pas publier de trajet.</Notice>}
        </>
      )}
      {u.role !== 'admin' && (
        <div className="mt-5 flex gap-3">
          {u.status !== 'actif' ? <Button size="lg" className="flex-1" onClick={() => onStatus('actif')}>{u.status === 'en_attente' ? 'Valider le compte' : 'Réactiver'}</Button> : <Button size="lg" variant="outline" className="flex-1" onClick={() => onStatus('suspendu')}>Suspendre</Button>}
        </div>
      )}
    </Modal>
  )
}

function EditUserModal({ u, onClose, onDone }: { u: User; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth()
  const [f, setF] = useState({ firstName: u.firstName, lastName: u.lastName, company: u.company ?? '', email: u.email ?? '', address: u.address, city: u.city, idNumber: u.idNumber ?? '', userType: u.userType })
  const [err, setErr] = useState('')
  const save = () => { const r = run((d) => L.updateUser(d, user!.id, u.id, f)); r.ok ? onDone() : setErr(r.error) }
  return (
    <Modal title="Modifier le compte" onClose={onClose}>
      <div className="space-y-3">
        {err && <Notice tone="danger">{err}</Notice>}
        <div className="grid grid-cols-2 gap-3"><Field label="Prénom" htmlFor="a"><Input id="a" value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} /></Field><Field label="Nom" htmlFor="b"><Input id="b" value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} /></Field></div>
        <Field label="Entreprise / structure" htmlFor="c"><Input id="c" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
        <Field label="Type d'utilisateur" htmlFor="t"><select id="t" className={sel} value={f.userType} onChange={(e) => setF({ ...f, userType: e.target.value as UserType })}>{Object.entries(USER_TYPES).filter(([k]) => (u.role === 'admin' ? k === 'admin' : u.role === 'client' ? !['admin', 'transporteur_independant', 'entreprise_transport', 'gestionnaire_flotte', 'proprietaire_camion'].includes(k) : ['transporteur_independant', 'entreprise_transport', 'gestionnaire_flotte', 'proprietaire_camion'].includes(k))).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="E-mail" htmlFor="e"><Input id="e" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Ville" htmlFor="v"><select id="v" className={sel} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select></Field><Field label="Adresse" htmlFor="ad"><Input id="ad" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field></div>
        {u.role === 'transporteur' && <Field label="N° d'identification (IFU)" htmlFor="i"><Input id="i" value={f.idNumber} onChange={(e) => setF({ ...f, idNumber: e.target.value })} /></Field>}
        <Button size="lg" className="w-full" onClick={save}>Enregistrer</Button>
      </div>
    </Modal>
  )
}

function CreateUserModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { user } = useAuth()
  const [f, setF] = useState({ role: 'client' as 'client' | 'transporteur', firstName: '', lastName: '', phone: '', city: 'Cotonou', password: '' })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (adminApiMode) {
      setErr('')
      setSaving(true)
      try {
        await adminApi.createUser({ role: f.role, userType: f.role === 'client' ? 'autre_client' : 'transporteur_independant', firstName: f.firstName, lastName: f.lastName, phone: f.phone, address: f.city, city: f.city, password: f.password })
        onDone()
      } catch (cause) {
        setErr(cause instanceof Error ? cause.message : 'Impossible de créer ce compte.')
      } finally {
        setSaving(false)
      }
      return
    }
    const res = run((d) => {
      const r = L.register(d, { role: f.role, userType: (f.role === 'client' ? 'autre_client' : 'transporteur_independant') as UserType, firstName: f.firstName, lastName: f.lastName, phone: f.phone, address: f.city, city: f.city, password: f.password })
      if (r.ok) { r.value.status = 'actif'; L.log(d, user!.id, 'compte_cree_par_admin', r.value.id) }
      return r
    })
    res.ok ? onDone() : setErr(res.error)
  }
  return (
    <Modal title="Créer un compte" onClose={onClose}><div className="space-y-3">
      {err && <Notice tone="danger">{err}</Notice>}
      <Field label="Profil" htmlFor="r"><select id="r" className={sel} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as 'client' | 'transporteur' })}><option value="client">Client</option><option value="transporteur">Transporteur</option></select></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Prénom" htmlFor="a"><Input id="a" value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} /></Field><Field label="Nom" htmlFor="b"><Input id="b" value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} /></Field></div>
      <Field label="Téléphone" htmlFor="p"><Input id="p" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
      <Field label="Ville" htmlFor="c"><select id="c" className={sel} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select></Field>
      <Field label="Mot de passe provisoire" htmlFor="w" hint="8 caractères minimum."><Input id="w" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
      <Button size="lg" className="w-full" onClick={() => void save()} disabled={saving}>{saving ? 'Création…' : 'Créer'}</Button></div></Modal>
  )
}

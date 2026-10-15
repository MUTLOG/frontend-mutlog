import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { ask } from '@/components/shared/confirm'
import { DataTable, EmptyState, fmtDate, fmtT, Modal, Notice, Stars, useFlash } from '@/components/shared/ui-bits'
import { useAuth } from '@/features/auth/useAuth'
import { CITIES } from '@/domain/geo'
import type { Role, User, UserType } from '@/domain/types'
import { formatPhone } from '@/domain/phone'
import { avgRating, userName } from '@/store/logic'
import * as L from '@/store/logic'
import { run } from '@/store/store'

const sel = 'h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink'
const USER_TYPES: Record<string, string> = {
  producteur: 'Producteur agricole', cooperative: 'Coopérative', commercant: 'Commerçant / grossiste', pme: 'PME / entreprise', autre_client: 'Autre client',
  transporteur_independant: 'Transporteur indépendant', entreprise_transport: 'Entreprise de transport', gestionnaire_flotte: 'Gestionnaire de flotte', proprietaire_camion: 'Propriétaire de camion', admin: 'Administrateur',
}

/** Utilisateurs, clients, transporteurs (CDC §18) : créer, modifier, suspendre, supprimer, consulter ; vérifier un transporteur. */
export function UsersPage({ only }: { only?: Role }) {
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
      {edit && <EditUserModal u={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); flash.ok('Compte modifié.') }} />}
      {view && <UserDetailModal u={view} onClose={() => setView(null)} onStatus={(s) => { act(view.id, s); setView(null) }} />}
    </>
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
  const save = () => {
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
      <Button size="lg" className="w-full" onClick={save}>Créer</Button></div></Modal>
  )
}

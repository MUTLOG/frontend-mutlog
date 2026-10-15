import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { Correspondence } from '@/components/matching/Correspondence'
import { MatchCard } from '@/components/matching/MatchCard'
import { PoolingCard, poolingStatusBadge, type PoolingRow } from '@/components/mutualisation/PoolingCard'
import { RequestBadge, EmptyState, DataTable, fmtDate, fmtT, GOODS_LABEL, Notice, offerPriceLabel, Tabs, useFlash } from '@/components/shared/ui-bits'
import { ask } from '@/components/shared/confirm'
import { useAuth } from '@/features/auth/useAuth'
import { CITIES } from '@/domain/geo'
import { compatibleRequests, findMatches } from '@/domain/matching'
import { suggestPooling } from '@/domain/pooling'
import { computeFinance, computeShares, transportTotal } from '@/domain/pricing'
import { nextStatuses, STATUS_LABEL } from '@/domain/status'
import type { TransportRequest } from '@/domain/types'
import { today, userName } from '@/store/logic'
import * as L from '@/store/logic'
import { run } from '@/store/store'
import type { OperationStatus } from '@/types/operation'

const sel = 'h-10 rounded-control border border-line bg-surface px-3 text-sm text-ink'

/** Demandes de transport (CDC §18) : consulter, rechercher, filtrer, modifier le statut, affecter un transporteur. */
export function AdminRequestsPage() {
  const { db, user } = useAuth()
  const flash = useFlash()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [city, setCity] = useState('')
  const rows = db.requests.filter((r) => (!status || r.status === status) && (!city || r.from === city || r.to === city)
    && (!q || `${r.from} ${r.to} ${r.description} ${userName(db.users.find((u) => u.id === r.clientId))}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const change = async (id: string, s: OperationStatus) => {
    if (s === 'annule' && !(await ask({ message: 'Annuler cette demande ? Le client sera prévenu.', confirmLabel: 'Annuler la demande' }))) return
    const r = run((d) => L.setRequestStatusAdmin(d, user!.id, id, s)); r.ok ? flash.ok('Statut modifié.') : flash.err(r.error)
  }
  return (
    <>
      <PageHeader title="Demandes de transport" />
      <div className="space-y-4">
        {flash.node}
        <div className="flex flex-wrap gap-2">
          <Input aria-label="Rechercher" placeholder="Rechercher (ville, client, description)" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:max-w-xs" />
          <select aria-label="Statut" className={sel} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tous les statuts</option>{(Object.keys(STATUS_LABEL) as OperationStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
          <select aria-label="Ville" className={sel} value={city} onChange={(e) => setCity(e.target.value)}><option value="">Toutes les villes</option>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select>
        </div>
        <DataTable rows={rows} rowKey={(r) => r.id} empty={<EmptyState title="Aucune demande" />} columns={[
          { header: 'Trajet', cell: (r) => <span><strong>{r.from} → {r.to}</strong><br /><span className="text-xs text-muted">{fmtDate(r.date)}</span></span> },
          { header: 'Client', cell: (r) => userName(db.users.find((u) => u.id === r.clientId)) },
          { header: 'Charge', cell: (r) => `${fmtT(r.weightT)} · ${GOODS_LABEL[r.goods]}` },
          { header: 'Statut', cell: (r) => <RequestBadge db={db} r={r} /> },
          { header: 'Actions', cell: (r) => (
            <span className="flex flex-wrap items-center justify-end gap-1.5">
              {r.status === 'recherche' && <Button size="sm" variant="outline" asChild><Link to={`/admin/matching?demande=${r.id}`}>Affecter</Link></Button>}
              {!r.poolingId && nextStatuses(r.status).length > 0 && (
                <select aria-label="Modifier le statut" className={sel + ' h-8 text-xs'} value="" onChange={(e) => e.target.value && change(r.id, e.target.value as OperationStatus)}>
                  <option value="">Statut…</option>{nextStatuses(r.status).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>)}
            </span>) },
        ]} />
      </div>
    </>
  )
}

/** Matching (direction UI/UX §3 et CDC §10) : par demande ou par offre. */
export function MatchingPage() {
  const { db, user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<'demande' | 'offre'>('demande')
  const flash = useFlash()
  const active = (id: string) => db.users.find((u) => u.id === id)?.status === 'actif'
  const open = db.requests.filter((r) => r.status === 'recherche')
  const rid = params.get('demande') ?? open[0]?.id ?? ''
  const r = open.find((x) => x.id === rid)
  const matches = r ? findMatches(r, db.offers, db.settings, active) : []
  const assign = (offerId: string) => { const res = run((d) => L.reserve(d, r!.clientId, r!.id, offerId)); res.ok ? flash.ok('Transporteur affecté : la réservation apparaît dans les mutualisations.') : flash.err(res.error) }
  const offers = db.offers.filter((o) => o.status === 'ouverte' && o.date >= today()).map((o) => ({ o, n: compatibleRequests(o, open, db.settings).length })).filter((x) => x.n > 0)
  void user
  return (
    <>
      <PageHeader title="Matching MUTLOG" description="Compatibilité entre demandes et offres : départ, destination, date, capacité, marchandise, disponibilité." />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'demande', label: 'Par demande', count: open.length }, { key: 'offre', label: 'Par offre', count: offers.length }]} />
      {flash.node}
      {tab === 'offre' ? (
        offers.length === 0 ? <Card><EmptyState title="Aucune correspondance pour le moment" /></Card> : (
          <div className="space-y-3">{offers.map(({ o, n }) => <Correspondence key={o.id} offer={o} count={n} action={<Button asChild size="sm"><Link to={`/admin/mutualisations?offre=${o.id}`}>Créer le regroupement</Link></Button>} />)}</div>
        )
      ) : open.length === 0 ? <Card><EmptyState title="Aucune demande en recherche" /></Card> : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card><ul className="divide-y divide-line">{open.map((x) => <li key={x.id}><button onClick={() => setParams({ demande: x.id })} className={`w-full px-4 py-3 text-left text-sm hover:bg-background/70 ${x.id === rid ? 'bg-primary-soft' : ''}`}><strong>{x.from} → {x.to}</strong><br /><span className="text-xs text-muted">{fmtDate(x.date)} · {fmtT(x.weightT)} · {userName(db.users.find((u) => u.id === x.clientId))}</span></button></li>)}</ul></Card>
          <div className="space-y-4">
            {r && (
              <Card className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Demande client</p>
                <p className="mt-1 text-lg font-bold text-ink">{r.from} → {r.to}</p>
                <p className="text-sm text-muted">{fmtDate(r.date)} · Marchandise : {GOODS_LABEL[r.goods]} · Poids : {fmtT(r.weightT)}</p>
                {r.requirements && <p className="mt-1 text-sm text-ink">Exigences : {r.requirements}</p>}</Card>
            )}
            <Card>
              <div className="px-5 pt-5"><h2 className="text-base font-semibold text-ink">Correspondances trouvées{r ? ` (${matches.length})` : ''}</h2></div>
              {matches.length === 0 ? <EmptyState title="Aucune offre compatible" /> : (
                <ul className="mt-2 divide-y divide-line">{matches.map((m) => (
                  <li key={m.offer.id}><MatchCard m={m} transporter={userName(db.users.find((u) => u.id === m.offer.transporterId))} price={`${offerPriceLabel(m.offer).amount} ${offerPriceLabel(m.offer).unit}`}
                    actions={<><Button size="sm" variant="outline" asChild><Link to={`/transports/${m.offer.id}`}>Voir le transport</Link></Button><Button size="sm" onClick={() => assign(m.offer.id)}>Affecter</Button></>} /></li>
                ))}</ul>)}
            </Card>
          </div>
        </div>)}
    </>
  )
}

/** Mutualisations (direction UI/UX §4, CDC §11) : visualiser, créer, modifier, valider, refuser un regroupement. */
export function PoolingsPage() {
  const { db, user } = useAuth()
  const flash = useFlash()
  const [params] = useSearchParams()
  const [offerId, setOfferId] = useState(params.get('offre') ?? '')
  const [editing, setEditing] = useState<string | null>(null)
  const open = db.offers.filter((o) => o.status === 'ouverte' && o.date >= today())
  const offer = db.offers.find((o) => o.id === offerId)
  const [picked, setPicked] = useState<string[]>(() => {
    const o = db.offers.find((x) => x.id === params.get('offre'))
    return o ? suggestPooling(o, compatibleRequests(o, db.requests.filter((r) => r.status === 'recherche'), db.settings)).map((r) => r.id) : []
  })

  const cands = useMemo<TransportRequest[]>(() => {
    if (!offer) return []
    const inEdit = editing ? db.poolings.find((p) => p.id === editing)?.requestIds ?? [] : []
    return compatibleRequests(offer, db.requests.filter((r) => r.status === 'recherche' || inEdit.includes(r.id)), db.settings)
  }, [offer, db.requests, db.settings, editing, db.poolings])
  const chosen = cands.filter((c) => picked.includes(c.id))
  const total = chosen.reduce((s, r) => s + r.weightT, 0)
  const over = offer ? total > offer.availableT + 1e-9 : false
  const draft = useMemo(() => {
    if (!offer || !chosen.length || over) return null
    const gross = transportTotal(offer, total)
    const finance = computeFinance(gross, db.settings.commissionPct, db.settings.commissionBearer)
    const shares = computeShares(gross, chosen.map((r) => ({ requestId: r.id, clientId: r.clientId, weightT: r.weightT, volumeM3: r.volumeM3 })), db.settings.shareBasis, finance)
    return { finance, shares }
  }, [offer, chosen, over, total, db.settings])

  const choose = (id: string) => {
    setOfferId(id); setEditing(null)
    const o = db.offers.find((x) => x.id === id)
    setPicked(o ? suggestPooling(o, compatibleRequests(o, db.requests.filter((r) => r.status === 'recherche'), db.settings)).map((r) => r.id) : [])
  }
  const save = () => {
    const res = run<unknown>((d) => (editing ? L.updatePooling(d, user!.id, editing, picked) : L.proposePooling(d, user!.id, offerId, picked)))
    if (res.ok) { flash.ok(editing ? 'Regroupement modifié.' : 'Regroupement créé. Validez-le pour l\'envoyer au transporteur.'); setEditing(null); setOfferId(''); setPicked([]) } else flash.err(res.error)
  }
  const edit = (id: string) => { const p = db.poolings.find((x) => x.id === id)!; setEditing(id); setOfferId(p.offerId); setPicked(p.requestIds); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }) }
  const validate = (id: string) => { const r = run((d) => L.validatePooling(d, user!.id, id)); r.ok ? flash.ok('Mutualisation validée : le transporteur est notifié.') : flash.err(r.error) }
  const refuse = async (id: string) => { if (!(await ask({ message: 'Refuser ce regroupement ? Les demandes retournent en recherche.', confirmLabel: 'Refuser' }))) return; const r = run((d) => L.refusePooling(d, user!.id, id)); r.ok ? flash.ok('Regroupement refusé.') : flash.err(r.error) }
  const pools = db.poolings.filter((p) => ['proposee', 'validee'].includes(p.status))
  const nameOf = (id: string) => userName(db.users.find((u) => u.id === id))
  const vehicleOf = (o: { vehicleId: string; totalCapacityT: number }) => { const v = db.vehicles.find((x) => x.id === o.vehicleId); return v ? `${v.type} · ${v.plate}` : undefined }

  return (
    <>
      <PageHeader title="Mutualisations" description="Pour le lancement, l'administrateur valide chaque regroupement avant la confirmation définitive." />
      <div className="space-y-6">
        {flash.node}
        {pools.length > 0 && (
          <section aria-label="Regroupements en cours" className="space-y-4">
            <h2 className="text-lg font-semibold text-ink">Regroupements en cours</h2>
            {pools.map((p) => {
              const o = db.offers.find((x) => x.id === p.offerId)!
              return <PoolingCard key={p.id} offer={o} vehicleLabel={vehicleOf(o)} finance={p.finance} status={poolingStatusBadge(p.status)}
                rows={p.shares.map((s) => ({ key: s.requestId, label: nameOf(s.clientId), weightT: s.weightT, payable: s.payable }))}
                actions={p.status === 'proposee' ? <>
                  <Button size="lg" onClick={() => validate(p.id)}>Valider la mutualisation</Button>
                  <Button size="lg" variant="outline" onClick={() => edit(p.id)}>Modifier</Button>
                  <Button size="lg" variant="ghost" onClick={() => refuse(p.id)}>Refuser</Button></> : <Button variant="ghost" onClick={() => refuse(p.id)}>Annuler le regroupement</Button>} />
            })}
          </section>)}

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-ink">{editing ? 'Modifier le regroupement' : 'Nouveau regroupement'}</h2>
          <div className="mt-3"><Field label="Offre de transport" htmlFor="o"><select id="o" className={sel + ' w-full'} value={offerId} onChange={(e) => choose(e.target.value)} disabled={!!editing}><option value="">Choisir une offre…</option>{open.map((o) => <option key={o.id} value={o.id}>{o.from} → {o.to} · {fmtDate(o.date)} · {o.availableT} t disponibles · {nameOf(o.transporterId)}</option>)}</select></Field></div>
          {offer && (
            <div className="mt-5 space-y-4">
              {cands.length === 0 ? <Notice>Aucune demande compatible pour cette offre.</Notice> : (
                <>
                  <p className="text-sm font-semibold text-ink">{cands.length} demande{cands.length > 1 ? 's' : ''} compatible{cands.length > 1 ? 's' : ''}</p>
                  <ul className="divide-y divide-line rounded-control border border-line">{cands.map((r) => (
                    <li key={r.id}><label className="flex cursor-pointer items-start gap-3 px-4 py-3 text-sm">
                      <input type="checkbox" className="mt-1 h-4 w-4" checked={picked.includes(r.id)} onChange={() => setPicked(picked.includes(r.id) ? picked.filter((x) => x !== r.id) : [...picked, r.id])} />
                      <span className="min-w-0 flex-1"><strong>{nameOf(r.clientId)}</strong> · {r.from} → {r.to} · {fmtDate(r.date)}<span className="block text-xs text-muted">{GOODS_LABEL[r.goods]}{r.requirements ? ` · Exigences : ${r.requirements}` : ''}</span></span>
                      <span className="font-medium">{fmtT(r.weightT)}</span></label></li>))}</ul>
                  {over && <Notice tone="danger">La capacité disponible ({fmtT(offer.availableT)}) est dépassée.</Notice>}
                  <PoolingCard offer={offer} vehicleLabel={vehicleOf(offer)} finance={draft?.finance ?? null}
                    rows={chosen.map<PoolingRow>((r) => ({ key: r.id, label: nameOf(r.clientId), weightT: r.weightT, payable: draft?.shares.find((s) => s.requestId === r.id)?.payable }))}
                    actions={<Button size="lg" disabled={!draft} onClick={save}>{editing ? 'Enregistrer les modifications' : 'Créer le regroupement'}</Button>} />
                </>)}
            </div>)}
        </Card>
      </div>
    </>
  )
}

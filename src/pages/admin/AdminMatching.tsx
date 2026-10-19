import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { Correspondence } from '@/components/matching/Correspondence'
import { MatchCard } from '@/components/matching/MatchCard'
import { PoolingCard, poolingStatusBadge } from '@/components/mutualisation/PoolingCard'
import { EmptyState, DataTable, fmtDate, fmtT, GOODS_LABEL, Notice, offerPriceLabel, Tabs, useFlash } from '@/components/shared/ui-bits'
import { ask } from '@/components/shared/confirm'
import { adminApi, type AdminMatch, type AdminPooling, type AdminPoolingPreview, type AdminRequest, type AdminMatchingOffer, type RemoteOffer } from '@/services/mutlogApi'
import { CITIES } from '@/domain/geo'
import { nextStatuses, STATUS_LABEL } from '@/domain/status'
import type { Offer, TransportRequest } from '@/domain/types'
import type { OperationStatus } from '@/types/operation'
import { useResource } from '@/hooks/useResource'

const sel = 'h-10 rounded-control border border-line bg-surface px-3 text-sm text-ink'

/** Demandes de transport (CDC §18) : consulter, rechercher, filtrer, modifier le statut, affecter un transporteur. */
export function AdminRequestsPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [city, setCity] = useState('')
  const flash = useFlash()
  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (status) params.set('status', status)
    if (city) params.set('city', city)
    params.set('per_page', '100')
    return `?${params.toString()}`
  }, [q, status, city])
  const remote = useResource(() => adminApi.requests(query), [] as AdminRequest[])
  const rows = remote.data.filter((r) => !q || `${r.from} ${r.to} ${r.description} ${r.client?.displayName ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  const change = async (request: AdminRequest, nextStatus: OperationStatus) => {
    if (nextStatus === 'annule' && !(await ask({ message: 'Annuler cette demande ? Le client sera prévenu.', confirmLabel: 'Annuler la demande' }))) return
    try {
      await adminApi.setRequestStatus(request.id, nextStatus)
      flash.ok('Statut modifié.')
      remote.reload()
    } catch (cause) {
      flash.err(cause instanceof Error ? cause.message : 'Impossible de modifier le statut.')
    }
  }
  return (
    <>
      <PageHeader title="Demandes de transport" />
      <div className="space-y-4">
        {flash.node}
        {remote.error && <Notice tone="danger">{remote.error}</Notice>}
        <div className="flex flex-wrap gap-2">
          <Input aria-label="Rechercher" placeholder="Rechercher (ville, client, description)" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:max-w-xs" />
          <select aria-label="Statut" className={sel} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tous les statuts</option>{(Object.keys(STATUS_LABEL) as OperationStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
          <select aria-label="Ville" className={sel} value={city} onChange={(e) => setCity(e.target.value)}><option value="">Toutes les villes</option>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select>
        </div>
        {remote.loading && <Card className="p-6 text-center text-sm text-muted">Chargement des demandes…</Card>}
        <DataTable rows={rows} rowKey={(r) => String(r.id)} empty={<EmptyState title="Aucune demande" />} columns={[
          { header: 'Trajet', cell: (r) => <span><strong>{r.from} → {r.to}</strong><br /><span className="text-xs text-muted">{fmtDate(r.date)}</span></span> },
          { header: 'Client', cell: (r) => r.client?.displayName ?? '—' },
          { header: 'Charge', cell: (r) => `${fmtT(r.weightT)} · ${GOODS_LABEL[r.goods as keyof typeof GOODS_LABEL] ?? r.goods}` },
          { header: 'Statut', cell: (r) => <Badge tone={r.status === 'confirmee' || r.status === 'terminee' ? 'success' : r.status === 'annule' ? 'danger' : 'pending'}>{STATUS_LABEL[r.status as OperationStatus] ?? r.status}</Badge> },
          { header: 'Actions', cell: (r) => <span className="flex flex-wrap items-center justify-end gap-1.5">
            {r.status === 'recherche' && <Button size="sm" variant="outline" asChild><Link to={`/admin/matching?demande=${r.id}`}>Affecter</Link></Button>}
            {!r.poolingId && nextStatuses(r.status as OperationStatus).length > 0 && <select aria-label="Modifier le statut" className={sel + ' h-8 text-xs'} value="" onChange={(e) => { if (e.target.value) void change(r, e.target.value as OperationStatus) }}><option value="">Statut…</option>{nextStatuses(r.status as OperationStatus).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>}
          </span> },
        ]} />
      </div>
    </>
  )
}

/** Matching (direction UI/UX §3 et CDC §10) : par demande ou par offre. */
function remoteOfferToDomain(offer: RemoteOffer): Offer {
  return {
    id: String(offer.id), transporterId: String(offer.transporter?.id ?? ''), vehicleId: '',
    from: offer.from, to: offer.to, date: offer.date, totalCapacityT: offer.totalCapacityT, availableT: offer.availableT,
    goodsAccepted: offer.goodsAccepted as Offer['goodsAccepted'], pricingMode: offer.pricingMode, price: offer.price,
    notes: offer.notes, status: offer.status as Offer['status'], createdAt: '',
  }
}

export function MatchingPage() {
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<'demande' | 'offre'>('demande')
  const flash = useFlash()
  const requests = useResource(() => adminApi.requests('?status=recherche&per_page=100'), [] as AdminRequest[])
  const offers = useResource(adminApi.matchingOffers, [] as AdminMatchingOffer[])
  const open = requests.data
  const requestedId = params.get('demande') ?? ''
  const selectedId = open.some((request) => String(request.id) === requestedId) ? requestedId : String(open[0]?.id ?? '')
  const request = open.find((item) => String(item.id) === selectedId)
  const [matches, setMatches] = useState<AdminMatch[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [matchError, setMatchError] = useState('')

  useEffect(() => {
    if (!request) { setMatches([]); return }
    let active = true
    setLoadingMatches(true)
    setMatchError('')
    adminApi.matchingRequest(request.id)
      .then((result) => { if (active) setMatches(result) })
      .catch((cause: unknown) => { if (active) setMatchError(cause instanceof Error ? cause.message : 'Impossible de charger les correspondances.') })
      .finally(() => { if (active) setLoadingMatches(false) })
    return () => { active = false }
  }, [request?.id])

  const assign = async (offerId: string | number) => {
    if (!request) return
    try {
      await adminApi.createPooling({ offerId, requestIds: [request.id] })
      flash.ok('Demande affectée : une mutualisation est créée et doit être validée.')
      requests.reload()
    } catch (cause) {
      flash.err(cause instanceof Error ? cause.message : 'Impossible d’affecter cette demande.')
    }
  }

  return (
    <>
      <PageHeader title="Matching MUTLOG" description="Compatibilité entre demandes et offres : départ, destination, date, capacité, marchandise, disponibilité." />
      {(requests.error || offers.error || matchError) && <Notice tone="danger">{requests.error || offers.error || matchError}</Notice>}
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'demande', label: 'Par demande', count: open.length }, { key: 'offre', label: 'Par offre', count: offers.data.length }]} />
      {tab === 'offre' ? (
        offers.loading ? <Card className="p-6 text-center text-sm text-muted">Chargement des offres compatibles…</Card> :
          offers.data.length === 0 ? <Card><EmptyState title="Aucune correspondance pour le moment" /></Card> :
            <div className="space-y-3">{offers.data.map(({ offer, compatibleRequests }) => <Correspondence key={offer.id} offer={remoteOfferToDomain(offer)} count={compatibleRequests} action={<Button asChild size="sm"><Link to={`/admin/mutualisations?offre=${offer.id}`}>Créer le regroupement</Link></Button>} />)}</div>
      ) : requests.loading ? <Card className="p-6 text-center text-sm text-muted">Chargement des demandes…</Card> : open.length === 0 ? <Card><EmptyState title="Aucune demande en recherche" /> </Card> : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card><ul className="divide-y divide-line">{open.map((item) => <li key={item.id}><button onClick={() => setParams({ demande: String(item.id) })} className={`w-full px-4 py-3 text-left text-sm hover:bg-background/70 ${String(item.id) === selectedId ? 'bg-primary-soft' : ''}`}><strong>{item.from} → {item.to}</strong><br /><span className="text-xs text-muted">{fmtDate(item.date)} · {fmtT(item.weightT)} · {item.client?.displayName ?? 'Client'}</span></button></li>)}</ul></Card>
          <div className="space-y-4">
            {request && <Card className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Demande client</p><p className="mt-1 text-lg font-bold text-ink">{request.from} → {request.to}</p><p className="text-sm text-muted">{fmtDate(request.date)} · Marchandise : {GOODS_LABEL[request.goods as keyof typeof GOODS_LABEL] ?? request.goods} · Poids : {fmtT(request.weightT)}</p>{request.requirements && <p className="mt-1 text-sm text-ink">Exigences : {request.requirements}</p>}</Card>}
            <Card><div className="px-5 pt-5"><h2 className="text-base font-semibold text-ink">Correspondances trouvées{request ? ` (${matches.length})` : ''}</h2></div>
              {loadingMatches ? <p className="p-5 text-sm text-muted">Recherche des offres compatibles…</p> : matches.length === 0 ? <EmptyState title="Aucune offre compatible" /> : (
                <ul className="mt-2 divide-y divide-line">{matches.map((match) => <li key={match.offer.id}><MatchCard m={{ offer: remoteOfferToDomain(match.offer), score: match.score, compatible: true, criteria: match.criteria as import('@/domain/matching').MatchCriterion[] }} transporter={match.offer.transporter?.displayName} price={`${offerPriceLabel(remoteOfferToDomain(match.offer)).amount} ${offerPriceLabel(remoteOfferToDomain(match.offer)).unit}`} actions={<><Button size="sm" variant="outline" asChild><Link to={`/transports/${match.offer.id}`}>Voir le transport</Link></Button><Button size="sm" onClick={() => void assign(match.offer.id)}>Affecter</Button></>} /></li>)}</ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  )
}

/** Mutualisations (direction UI/UX §4, CDC §11) : visualiser, créer, modifier, valider, refuser un regroupement. */
function remoteRequestToDomain(request: AdminRequest): TransportRequest {
  return {
    id: String(request.id), clientId: String(request.client?.id ?? ''), from: request.from, to: request.to, date: request.date,
    goods: request.goods as TransportRequest['goods'], weightT: request.weightT, volumeM3: request.volumeM3, parcels: request.parcels,
    description: request.description, requirements: request.requirements, attachments: request.attachments ?? [], contact: request.contact,
    status: request.status as OperationStatus, poolingId: request.poolingId == null ? undefined : String(request.poolingId), createdAt: request.createdAt ?? '',
  }
}

export function PoolingsPage() {
  const flash = useFlash()
  const [params] = useSearchParams()
  const [offerId, setOfferId] = useState(params.get('offre') ?? '')
  const [editing, setEditing] = useState<string | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [offer, setOffer] = useState<RemoteOffer | null>(null)
  const [candidates, setCandidates] = useState<TransportRequest[]>([])
  const [clientNames, setClientNames] = useState<Record<string, string>>({})
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [candidateError, setCandidateError] = useState('')
  const [preview, setPreview] = useState<AdminPoolingPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const openOffers = useResource(() => adminApi.offers('?status=ouverte'), [] as RemoteOffer[])
  const pools = useResource(() => adminApi.poolings('?status=proposee,validee'), [] as AdminPooling[])

  useEffect(() => {
    if (!offerId) { setOffer(null); setCandidates([]); return }
    let active = true
    setLoadingCandidates(true)
    setCandidateError('')
    const pooling = editing ? pools.data.find((item) => String(item.id) === editing) : undefined
    Promise.all([
      adminApi.poolingCandidates(offerId),
      pooling ? adminApi.requests('?status=mutualisation&per_page=100') : Promise.resolve([] as AdminRequest[]),
    ]).then(([result, pooledRequests]) => {
      if (!active) return
      setOffer(result.offer)
      const selectedIds = new Set((pooling?.shares ?? []).map((share) => String(share.requestId)))
      const mappedCandidates = [...result.candidates, ...pooledRequests.filter((request) => selectedIds.has(String(request.id)))]
        .filter((request, index, all) => all.findIndex((item) => String(item.id) === String(request.id)) === index)
      setClientNames(Object.fromEntries(mappedCandidates.map((request) => [String(request.id), request.client?.displayName ?? 'Client'])))
      const domainCandidates = mappedCandidates.map(remoteRequestToDomain)
      setCandidates(domainCandidates)
      if (pooling) setPicked(pooling.shares.map((share) => String(share.requestId)))
      else setPicked(result.suggestedIds.map(String))
    }).catch((cause: unknown) => {
      if (active) setCandidateError(cause instanceof Error ? cause.message : 'Impossible de charger les demandes compatibles.')
    }).finally(() => { if (active) setLoadingCandidates(false) })
    return () => { active = false }
  }, [offerId, editing, pools.data])

  useEffect(() => {
    if (!offerId || !picked.length) { setPreview(null); return }
    let active = true
    setLoadingPreview(true)
    adminApi.previewPooling({ offerId, requestIds: picked })
      .then((result) => { if (active) setPreview(result) })
      .catch((cause: unknown) => {
        if (active) {
          setPreview(null)
          setCandidateError(cause instanceof Error ? cause.message : 'Impossible de calculer les montants.')
        }
      })
      .finally(() => { if (active) setLoadingPreview(false) })
    return () => { active = false }
  }, [offerId, picked])

  const chosen = candidates.filter((request) => picked.includes(request.id))
  const total = chosen.reduce((sum, request) => sum + request.weightT, 0)
  const over = offer ? total > offer.availableT + 1e-9 : false
  const domainOffer = offer ? remoteOfferToDomain(offer) : null
  const save = async () => {
    if (!offerId || !picked.length) return
    try {
      if (editing) await adminApi.updatePooling(editing, { requestIds: picked })
      else await adminApi.createPooling({ offerId, requestIds: picked })
      flash.ok(editing ? 'Regroupement modifié.' : 'Regroupement créé. Validez-le pour l’envoyer au transporteur.')
      setEditing(null); setOfferId(''); setPicked([])
      pools.reload()
    } catch (cause) {
      flash.err(cause instanceof Error ? cause.message : 'Impossible d’enregistrer le regroupement.')
    }
  }
  const validate = async (id: string | number) => {
    try { await adminApi.validatePooling(id); flash.ok('Mutualisation validée : le transporteur est notifié.'); pools.reload() }
    catch (cause) { flash.err(cause instanceof Error ? cause.message : 'Impossible de valider la mutualisation.') }
  }
  const refuse = async (id: string | number) => {
    if (!(await ask({ message: 'Refuser ce regroupement ? Les demandes retournent en recherche.', confirmLabel: 'Refuser' }))) return
    try { await adminApi.refusePooling(id); flash.ok('Regroupement refusé.'); pools.reload() }
    catch (cause) { flash.err(cause instanceof Error ? cause.message : 'Impossible de refuser ce regroupement.') }
  }
  const beginEdit = (pooling: AdminPooling) => {
    setEditing(String(pooling.id)); setOfferId(String(pooling.offerId)); setPicked(pooling.shares.map((share) => String(share.requestId)))
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }
  return (
    <>
      <PageHeader title="Mutualisations" description="Pour le lancement, l'administrateur valide chaque regroupement avant la confirmation définitive." />
      {flash.node}
      {(openOffers.error || pools.error || candidateError) && <Notice tone="danger">{openOffers.error || pools.error || candidateError}</Notice>}
      {pools.loading && <Card className="p-6 text-center text-sm text-muted">Chargement des mutualisations…</Card>}
      <div className="space-y-6">
        {pools.data.length > 0 && <section aria-label="Regroupements en cours" className="space-y-4"><h2 className="text-lg font-semibold text-ink">Regroupements en cours</h2>
          {pools.data.map((pooling) => {
            const remote = pooling.offer
            if (!remote) return null
            const domain = remoteOfferToDomain(remote)
            return <PoolingCard key={pooling.id} offer={domain} vehicleLabel={remote.vehicle?.type} finance={pooling.finance} status={poolingStatusBadge(pooling.status)}
              rows={pooling.shares.map((share) => ({ key: String(share.requestId), label: share.clientName ?? 'Client', weightT: share.weightT, payable: share.payable }))}
              actions={pooling.status === 'proposee' ? <>
                <Button size="lg" onClick={() => void validate(pooling.id)}>Valider la mutualisation</Button>
                <Button size="lg" variant="outline" onClick={() => beginEdit(pooling)}>Modifier</Button>
                <Button size="lg" variant="ghost" onClick={() => void refuse(pooling.id)}>Refuser</Button>
              </> : <Button variant="ghost" onClick={() => void refuse(pooling.id)}>Annuler le regroupement</Button>} />
          })}
        </section>}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-ink">{editing ? 'Modifier le regroupement' : 'Nouveau regroupement'}</h2>
          <div className="mt-3"><Field label="Offre de transport" htmlFor="o"><select id="o" className={sel + ' w-full'} value={offerId} onChange={(e) => { setOfferId(e.target.value); setEditing(null); setPicked([]) }} disabled={!!editing}><option value="">Choisir une offre…</option>{openOffers.data.map((o) => <option key={o.id} value={o.id}>{o.from} → {o.to} · {fmtDate(o.date)} · {o.availableT} t disponibles · {o.transporter?.displayName ?? 'Transporteur'}</option>)}</select></Field></div>
          {loadingCandidates && <p className="mt-4 text-sm text-muted">Chargement des demandes compatibles…</p>}
          {domainOffer && <div className="mt-5 space-y-4">
            {candidates.length === 0 ? <Notice>Aucune demande compatible pour cette offre.</Notice> : <>
              <p className="text-sm font-semibold text-ink">{candidates.length} demande{candidates.length > 1 ? 's' : ''} compatible{candidates.length > 1 ? 's' : ''}</p>
              <ul className="divide-y divide-line rounded-control border border-line">{candidates.map((request) => <li key={request.id}><label className="flex cursor-pointer items-start gap-3 px-4 py-3 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" checked={picked.includes(request.id)} onChange={() => setPicked(picked.includes(request.id) ? picked.filter((id) => id !== request.id) : [...picked, request.id])} /><span className="min-w-0 flex-1"><strong>{clientNames[request.id] ?? 'Client'}</strong> · {request.from} → {request.to} · {fmtDate(request.date)}<span className="block text-xs text-muted">{GOODS_LABEL[request.goods]}{request.requirements ? ` · Exigences : ${request.requirements}` : ''}</span></span><span className="font-medium">{fmtT(request.weightT)}</span></label></li>)}</ul>
              {over && <Notice tone="danger">La capacité disponible ({fmtT(domainOffer.availableT)}) est dépassée.</Notice>}
              {loadingPreview && <p className="text-sm text-muted">Calcul des montants…</p>}
              <PoolingCard offer={domainOffer} vehicleLabel={offer?.vehicle?.type} finance={preview?.finance ?? null}
                rows={chosen.map((request) => ({ key: request.id, label: clientNames[request.id] ?? 'Client', weightT: request.weightT, payable: preview?.shares.find((share) => String(share.requestId) === request.id)?.payable }))}
                actions={<Button size="lg" disabled={!picked.length || over || loadingPreview || !preview} onClick={() => void save()}>{editing ? 'Enregistrer les modifications' : 'Créer le regroupement'}</Button>} />
            </>}
          </div>}
          {editing && <Button variant="ghost" onClick={() => { setEditing(null); setOfferId(''); setPicked([]) }}>Annuler la modification</Button>}
        </Card>
      </div>
    </>
  )
}


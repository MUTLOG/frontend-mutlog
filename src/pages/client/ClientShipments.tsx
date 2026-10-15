import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/tracking/StatusBadge'
import { StatusStepper } from '@/components/tracking/StatusStepper'
import { DataTable, EmptyState, fmtDate, fmtDateTime, fmtT, Modal, Notice, PaymentBadge, StarInput, Stars, useFlash } from '@/components/shared/ui-bits'
import RouteMap from '@/features/maps/RouteMap'
import { useAuth } from '@/features/auth/useAuth'
import { formatPhone } from '@/domain/phone'
import { formatFCFA } from '@/lib/format'
import { userName } from '@/store/logic'
import * as L from '@/store/logic'
import { clientTransports } from '@/store/selectors'
import { run } from '@/store/store'
import type { Payment } from '@/domain/types'

export function ClientReservationsPage() {
  const { db, user } = useAuth()
  const rows = db.reservations.filter((r) => r.clientId === user!.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <>
      <PageHeader title="Mes réservations" description="Une réservation est une demande envoyée à un transport : elle est regroupée par MUTLOG, puis confirmée par le transporteur." />
      <DataTable rows={rows} rowKey={(r) => r.id} empty={<EmptyState title="Aucune réservation" text="Réservez un transport depuis les résultats de recherche." action={<Button asChild><Link to="/rechercher">Trouver un transport</Link></Button>} />}
        columns={[
          { header: 'Trajet', cell: (r) => { const o = db.offers.find((x) => x.id === r.offerId); return <span className="font-semibold text-ink">{o?.from} → {o?.to}</span> } },
          { header: 'Date', cell: (r) => fmtDate(db.offers.find((x) => x.id === r.offerId)?.date ?? r.createdAt) },
          { header: 'Poids', cell: (r) => fmtT(r.weightT) },
          { header: 'Transporteur', cell: (r) => userName(db.users.find((u) => u.id === r.transporterId)) },
          { header: 'Statut', cell: (r) => <Badge tone={r.status === 'confirmee' ? 'success' : r.status === 'en_attente' ? 'pending' : 'danger'}>{{ en_attente: 'En attente', confirmee: 'Confirmée', refusee: 'Refusée', annulee: 'Annulée' }[r.status]}</Badge> },
        ]} />
    </>
  )
}

export function ClientShipmentsPage() {
  const { db, user } = useAuth()
  const rows = clientTransports(db, user!.id)
  return (
    <>
      <PageHeader title="Mes expéditions" description="Vos transports confirmés, en cours et terminés." />
      <DataTable rows={rows} rowKey={(v) => v.t.id} empty={<EmptyState title="Aucune expédition" text="Elles apparaîtront dès qu'un transport est confirmé." />}
        columns={[
          { header: 'Opération', cell: (v) => <Link to={`/client/expeditions/${v.t.id}`} className="font-semibold text-primary-2 hover:underline">{v.t.ref}</Link> },
          { header: 'Trajet', cell: (v) => `${v.offer.from} → ${v.offer.to}` },
          { header: 'Départ', cell: (v) => fmtDate(v.offer.date) },
          { header: 'Ma part', cell: (v) => formatFCFA(v.share.payable) },
          { header: 'Statut', cell: (v) => <StatusBadge status={v.t.status} /> },
        ]} />
    </>
  )
}

export function ShipmentDetailPage() {
  const { id } = useParams()
  const { db, user } = useAuth()
  const flash = useFlash()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [payFor, setPayFor] = useState<Payment | null>(null)
  const v = clientTransports(db, user!.id).find((x) => x.t.id === id)
  if (!v) return <Notice tone="danger">Expédition introuvable.</Notice>

  const carrier = db.users.find((u) => u.id === v.offer.transporterId)
  const payment = db.payments.find((p) => p.transportId === v.t.id && p.clientId === user!.id)
  const trace = v.t.events.filter((e) => e.kind === 'position' && e.lat !== undefined).map((e) => ({ lat: e.lat!, lng: e.lng!, label: `${e.label} — ${fmtDateTime(e.at)}` }))
  const reviewed = db.reviews.some((r) => r.transportId === v.t.id && r.fromId === user!.id)
  const canReview = ['livree', 'terminee'].includes(v.t.status) && !reviewed
  const confirmedPhone = !['annule'].includes(v.t.status) // coordonnées communiquées après confirmation

  const act = (res: ReturnType<typeof run>, okMsg: string) => (res.ok ? flash.ok(okMsg) : flash.err(res.error))

  return (
    <>
      <PageHeader title={`${v.offer.from} → ${v.offer.to}`} description={`Opération ${v.t.ref} · départ le ${fmtDate(v.offer.date)}`} action={<StatusBadge status={v.t.status} />} />
      <div className="space-y-6">
        {flash.node}
        <Card className="p-5"><StatusStepper status={v.t.status} /></Card>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="space-y-3 p-4">
            <h2 className="px-1 text-base font-semibold text-ink">Itinéraire et traçabilité</h2>
            <RouteMap from={v.offer.from} to={v.offer.to} trace={trace} height={340} />
            {v.t.events.length > 0 && (
              <ol className="space-y-2 px-1 text-sm">
                {[...v.t.events].reverse().map((e) => <li key={e.id} className="flex justify-between gap-3"><span className="text-ink">{e.label}</span><span className="text-xs text-muted">{fmtDateTime(e.at)}</span></li>)}
              </ol>
            )}
          </Card>

          <div className="space-y-6">
            <Card className="p-5">
              <h2 className="text-base font-semibold text-ink">Ma participation</h2>
              <p className="mt-2 text-2xl font-bold text-primary">{formatFCFA(v.share.payable)}</p>
              <p className="text-sm text-muted">{fmtT(v.share.weightT)} · part du transport {formatFCFA(v.share.amount)}{v.share.payable > v.share.amount ? ` + commission MUTLOG ${formatFCFA(v.share.payable - v.share.amount)}` : ''}</p>
              {payment && (
                <div className="mt-3 flex items-center justify-between gap-2"><PaymentBadge status={payment.status} />
                  {['en_attente', 'echoue'].includes(payment.status) && v.t.status !== 'annule' && <Button size="sm" onClick={() => setPayFor(payment)}>{payment.reference ? 'Modifier la référence' : 'Payer'}</Button>}
                </div>
              )}
              {payment?.reference && payment.status === 'en_attente' && <p className="mt-2 text-xs text-muted">Référence {payment.reference} en cours de vérification par MUTLOG.</p>}
            </Card>

            <Card className="p-5 text-sm">
              <h2 className="text-base font-semibold text-ink">Transporteur</h2>
              <p className="mt-2 font-medium text-ink">{userName(carrier)}</p>
              {confirmedPhone && <p className="text-muted">Téléphone : {carrier ? formatPhone(carrier.phone) : ''}</p>}
              <Button asChild variant="outline" size="sm" className="mt-3"><Link to={`/client/messages?avec=${carrier?.id}&transport=${v.t.id}`}>Envoyer un message</Link></Button>
            </Card>

            {v.t.status === 'livree' && (
              <Card className="p-5">
                <h2 className="text-base font-semibold text-ink">Confirmer la réception</h2>
                <p className="mt-1 text-sm text-muted">Votre marchandise est livrée. Confirmez pour clôturer l'opération.</p>
                <Button className="mt-3 w-full" onClick={() => act(run((d) => L.advanceTransport(d, user!.id, v.t.id, 'terminee')), 'Opération terminée. Merci !')}>J'ai bien reçu ma marchandise</Button>
              </Card>
            )}
            {canReview && (
              <Card className="p-5">
                <h2 className="text-base font-semibold text-ink">Évaluer le transporteur</h2>
                <StarInput value={rating} onChange={setRating} />
                <textarea aria-label="Commentaire" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Votre commentaire (facultatif)" className="mt-2 w-full rounded-control border border-line p-3 text-sm" />
                <Button className="mt-3 w-full" onClick={() => act(run((d) => L.submitReview(d, user!.id, v.t.id, v.offer.transporterId, rating, comment)), 'Merci pour votre évaluation.')}>Envoyer mon évaluation</Button>
              </Card>
            )}
            {reviewed && <Notice tone="success">Vous avez évalué ce transport. <Stars value={db.reviews.find((r) => r.transportId === v.t.id && r.fromId === user!.id)!.rating} size={14} /></Notice>}
          </div>
        </div>
      </div>
      {payFor && <PayModal payment={payFor} instructions={db.settings.paymentInstructions} onClose={() => setPayFor(null)} onDone={() => { setPayFor(null); flash.ok('Référence envoyée. MUTLOG vérifie votre paiement.') }} />}
    </>
  )
}

function PayModal({ payment, instructions, onClose, onDone }: { payment: Payment; instructions: string; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth()
  const [method, setMethod] = useState<Payment['method']>('mobile_money')
  const [ref, setRef] = useState(payment.reference ?? '')
  const [err, setErr] = useState('')
  const submit = () => {
    const res = run((d) => L.declarePayment(d, user!.id, payment.id, method, ref))
    res.ok ? onDone() : setErr(res.error)
  }
  return (
    <Modal title="Payer ma participation" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-2xl font-bold text-primary">{formatFCFA(payment.amount)}</p>
        <Notice>{instructions}</Notice>
        {err && <Notice tone="danger">{err}</Notice>}
        <Field label="Moyen de paiement" htmlFor="m">
          <select id="m" value={method} onChange={(e) => setMethod(e.target.value as Payment['method'])} className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm">
            <option value="mobile_money">Mobile Money</option><option value="virement">Virement</option><option value="especes">Espèces (agence MUTLOG)</option><option value="autre">Autre</option>
          </select>
        </Field>
        <Field label="Référence de la transaction" htmlFor="ref" required><Input id="ref" className="h-11" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Reçue par SMS" /></Field>
        <Button size="lg" className="w-full" onClick={submit}>J'ai effectué le paiement</Button>
      </div>
    </Modal>
  )
}

export function ClientPaymentsPage() {
  const { db, user } = useAuth()
  const [receipt, setReceipt] = useState<Payment | null>(null)
  const [payFor, setPayFor] = useState<Payment | null>(null)
  const flash = useFlash()
  const rows = db.payments.filter((p) => p.clientId === user!.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const tr = (p: Payment) => db.transports.find((t) => t.id === p.transportId)
  const offer = (p: Payment) => db.offers.find((o) => o.id === tr(p)?.offerId)
  return (
    <>
      <PageHeader title="Mes paiements" description="Paiements à effectuer, historique et reçus." />
      {flash.node}
      <DataTable rows={rows} rowKey={(p) => p.id} empty={<EmptyState title="Aucun paiement" text="Un paiement est créé à la confirmation de votre transport." />}
        columns={[
          { header: 'Opération', cell: (p) => <Link className="font-semibold text-primary-2 hover:underline" to={`/client/expeditions/${p.transportId}`}>{tr(p)?.ref}</Link> },
          { header: 'Trajet', cell: (p) => `${offer(p)?.from} → ${offer(p)?.to}` },
          { header: 'Montant', cell: (p) => formatFCFA(p.amount) },
          { header: 'Statut', cell: (p) => <PaymentBadge status={p.status} /> },
          { header: 'Action', cell: (p) => p.status === 'confirme' ? <Button size="sm" variant="outline" onClick={() => setReceipt(p)}>Reçu</Button> : ['en_attente', 'echoue'].includes(p.status) ? <Button size="sm" onClick={() => setPayFor(p)}>{p.reference ? 'Modifier' : 'Payer'}</Button> : null },
        ]} />
      {payFor && <PayModal payment={payFor} instructions={db.settings.paymentInstructions} onClose={() => setPayFor(null)} onDone={() => { setPayFor(null); flash.ok('Référence envoyée. MUTLOG vérifie votre paiement.') }} />}
      {receipt && (
        <Modal title={`Reçu ${receipt.receiptNo}`} onClose={() => setReceipt(null)}>
          <div id="receipt" className="space-y-1.5 text-sm">
            <p className="text-lg font-bold text-primary">MUTLOG</p>
            <p>Reçu n° <strong>{receipt.receiptNo}</strong></p>
            <p>Opération : {tr(receipt)?.ref} — {offer(receipt)?.from} → {offer(receipt)?.to}</p>
            <p>Client : {userName(user!)}</p>
            <p>Montant payé : <strong>{formatFCFA(receipt.amount)}</strong> ({receipt.method.replace('_', ' ')}, réf. {receipt.reference})</p>
            <p>Confirmé le {receipt.confirmedAt && fmtDate(receipt.confirmedAt)}</p>
          </div>
          <Button className="mt-4 w-full" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimer / enregistrer en PDF</Button>
        </Modal>
      )}
    </>
  )
}

import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/tracking/StatusBadge'
import { StatusStepper } from '@/components/tracking/StatusStepper'
import { DataTable, EmptyState, fmtDate, fmtDateTime, fmtT, Modal, Notice, PaymentBadge, ReservationBadge, StarInput, Stars, useFlash } from '@/components/shared/ui-bits'
import RouteMap from '@/features/maps/RouteMap'
import { useAuth } from '@/features/auth/useAuth'
import { formatPhone } from '@/domain/phone'
import { formatFCFA, userName } from '@/lib/format'
import { useResource } from '@/hooks/useResource'
import { errorMessage } from '@/services/api'
import {
  clientApi, EMPTY_PUBLIC_SETTINGS, publicApi, sharedApi,
  type AdminPayment, type AdminReview, type ClientReservation, type ClientShipment, type PaymentMethod,
} from '@/services/mutlogApi'

const NO_RESERVATIONS: ClientReservation[] = []
const NO_SHIPMENTS: ClientShipment[] = []
const NO_REVIEWS: AdminReview[] = []

export function ClientReservationsPage() {
  const reservations = useResource(() => clientApi.reservations(), NO_RESERVATIONS)
  const rows = useMemo(() => [...reservations.data].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')), [reservations.data])
  return (
    <>
      <PageHeader title="Mes réservations" description="Une réservation est une demande envoyée à un transport : elle est regroupée par MUTLOG, puis confirmée par le transporteur." />
      {reservations.error && <div className="mb-4"><Notice tone="danger">{reservations.error}</Notice></div>}
      {!reservations.loaded ? <p className="text-sm text-muted" role="status">Chargement…</p> : (
        <DataTable rows={rows} rowKey={(r) => String(r.id)} empty={<EmptyState title="Aucune réservation" text="Réservez un transport depuis les résultats de recherche." action={<Button asChild><Link to="/rechercher">Trouver un transport</Link></Button>} />}
          columns={[
            { header: 'Trajet', cell: (r) => <span className="font-semibold text-ink">{r.offer?.from} → {r.offer?.to}</span> },
            { header: 'Date', cell: (r) => fmtDate(r.offer?.date ?? r.createdAt ?? '') },
            { header: 'Poids', cell: (r) => fmtT(r.weightT) },
            { header: 'Transporteur', cell: (r) => r.offer?.transporter?.displayName ?? '—' },
            { header: 'Statut', cell: (r) => <ReservationBadge status={r.status} /> },
          ]} />
      )}
    </>
  )
}

export function ClientShipmentsPage() {
  const shipments = useResource(() => clientApi.shipments(), NO_SHIPMENTS)
  return (
    <>
      <PageHeader title="Mes expéditions" description="Vos transports confirmés, en cours et terminés." />
      {shipments.error && <div className="mb-4"><Notice tone="danger">{shipments.error}</Notice></div>}
      {!shipments.loaded ? <p className="text-sm text-muted" role="status">Chargement…</p> : (
        <DataTable rows={shipments.data} rowKey={(s) => String(s.id)} empty={<EmptyState title="Aucune expédition" text="Elles apparaîtront dès qu'un transport est confirmé." />}
          columns={[
            { header: 'Opération', cell: (s) => <Link to={`/client/expeditions/${s.id}`} className="font-semibold text-primary-2 hover:underline">{s.ref}</Link> },
            { header: 'Trajet', cell: (s) => `${s.offer.from} → ${s.offer.to}` },
            { header: 'Départ', cell: (s) => fmtDate(s.offer.date) },
            { header: 'Ma part', cell: (s) => (s.share ? formatFCFA(s.share.payable) : '—') },
            { header: 'Statut', cell: (s) => <StatusBadge status={s.status} /> },
          ]} />
      )}
    </>
  )
}

export function ShipmentDetailPage() {
  const { id } = useParams()
  const flash = useFlash()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [payFor, setPayFor] = useState<AdminPayment | null>(null)
  const [busy, setBusy] = useState(false)
  const shipment = useResource(() => clientApi.shipment(id!), null as ClientShipment | null, [id])
  const given = useResource(() => sharedApi.reviews('?scope=given'), NO_REVIEWS)
  const s = shipment.data

  if (!shipment.loaded) return <p className="text-sm text-muted" role="status">Chargement…</p>
  if (!s) return <Notice tone="danger">{shipment.errorStatus === 404 || shipment.errorStatus === 403 ? 'Expédition introuvable.' : shipment.error || 'Expédition introuvable.'}</Notice>

  const carrier = s.offer.transporter
  const share = s.share
  const payment = s.payment ?? undefined
  const trace = s.events.filter((e) => e.kind === 'position' && e.lat != null && e.lng != null).map((e) => ({ lat: e.lat as number, lng: e.lng as number, label: `${e.label} — ${fmtDateTime(e.at)}` }))
  const myReview = given.data.find((r) => String(r.transportId) === String(s.id))
  const reviewed = Boolean(myReview)
  const canReview = given.loaded && !given.error && ['livree', 'terminee'].includes(s.status) && !reviewed
  const confirmedPhone = s.status !== 'annule' && Boolean(s.carrierPhone) // coordonnées communiquées après confirmation

  const confirmReceipt = async () => {
    if (busy) return
    setBusy(true)
    try {
      await clientApi.confirmReceipt(s.id)
      flash.ok('Opération terminée. Merci !')
      shipment.reload()
    } catch (cause) {
      flash.err(errorMessage(cause, 'Confirmation impossible.'))
    } finally {
      setBusy(false)
    }
  }
  const sendReview = async () => {
    if (busy || !carrier) return
    setBusy(true)
    try {
      await sharedApi.reviewTransport(s.id, { toId: carrier.id, rating, comment: comment.trim() || undefined })
      flash.ok('Merci pour votre évaluation.')
      given.reload()
    } catch (cause) {
      flash.err(errorMessage(cause, 'Envoi de l’évaluation impossible.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title={`${s.offer.from} → ${s.offer.to}`} description={`Opération ${s.ref} · départ le ${fmtDate(s.offer.date)}`} action={<StatusBadge status={s.status} />} />
      <div className="space-y-6">
        {flash.node}
        <Card className="p-5"><StatusStepper status={s.status} /></Card>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="space-y-3 p-4">
            <h2 className="px-1 text-base font-semibold text-ink">Itinéraire et traçabilité</h2>
            <RouteMap from={s.offer.from} to={s.offer.to} trace={trace} height={340} />
            {s.events.length > 0 && (
              <ol className="space-y-2 px-1 text-sm">
                {[...s.events].reverse().map((e) => <li key={e.id} className="flex justify-between gap-3"><span className="text-ink">{e.label}</span><span className="text-xs text-muted">{fmtDateTime(e.at)}</span></li>)}
              </ol>
            )}
          </Card>

          <div className="space-y-6">
            {share && (
              <Card className="p-5">
                <h2 className="text-base font-semibold text-ink">Ma participation</h2>
                <p className="mt-2 text-2xl font-bold text-primary">{formatFCFA(share.payable)}</p>
                <p className="text-sm text-muted">{fmtT(share.weightT)} · part du transport {formatFCFA(share.amount)}{share.payable > share.amount ? ` + commission MUTLOG ${formatFCFA(share.payable - share.amount)}` : ''}</p>
                {payment && (
                  <div className="mt-3 flex items-center justify-between gap-2"><PaymentBadge status={payment.status} />
                    {['en_attente', 'echoue'].includes(payment.status) && s.status !== 'annule' && <Button size="sm" onClick={() => setPayFor(payment)}>{payment.reference ? 'Modifier la référence' : 'Payer'}</Button>}
                  </div>
                )}
                {payment?.reference && payment.status === 'en_attente' && <p className="mt-2 text-xs text-muted">Référence {payment.reference} en cours de vérification par MUTLOG.</p>}
              </Card>
            )}

            <Card className="p-5 text-sm">
              <h2 className="text-base font-semibold text-ink">Transporteur</h2>
              <p className="mt-2 font-medium text-ink">{carrier?.displayName ?? '—'}</p>
              {confirmedPhone && <p className="text-muted">Téléphone : {formatPhone(s.carrierPhone as string)}</p>}
              {carrier && <Button asChild variant="outline" size="sm" className="mt-3"><Link to={`/client/messages?avec=${carrier.id}&transport=${s.id}`}>Envoyer un message</Link></Button>}
            </Card>

            {s.status === 'livree' && (
              <Card className="p-5">
                <h2 className="text-base font-semibold text-ink">Confirmer la réception</h2>
                <p className="mt-1 text-sm text-muted">Votre marchandise est livrée. Confirmez pour clôturer l'opération.</p>
                <Button className="mt-3 w-full" disabled={busy} onClick={confirmReceipt}>J'ai bien reçu ma marchandise</Button>
              </Card>
            )}
            {canReview && (
              <Card className="p-5">
                <h2 className="text-base font-semibold text-ink">Évaluer le transporteur</h2>
                <StarInput value={rating} onChange={setRating} />
                <textarea aria-label="Commentaire" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Votre commentaire (facultatif)" className="mt-2 w-full rounded-control border border-line p-3 text-sm" />
                <Button className="mt-3 w-full" disabled={busy} onClick={sendReview}>Envoyer mon évaluation</Button>
              </Card>
            )}
            {myReview && <Notice tone="success">Vous avez évalué ce transport. <Stars value={myReview.rating} size={14} /></Notice>}
          </div>
        </div>
      </div>
      {payFor && <PayModal payment={payFor} onClose={() => setPayFor(null)} onDone={() => { setPayFor(null); flash.ok('Référence envoyée. MUTLOG vérifie votre paiement.'); shipment.reload() }} />}
    </>
  )
}

function PayModal({ payment, onClose, onDone }: { payment: AdminPayment; onClose: () => void; onDone: () => void }) {
  const settings = useResource(() => publicApi.settings(), EMPTY_PUBLIC_SETTINGS)
  const [method, setMethod] = useState<PaymentMethod>('mobile_money')
  const [ref, setRef] = useState(payment.reference ?? '')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (busy) return
    if (!ref.trim()) return setErr('La référence de la transaction est obligatoire.')
    setBusy(true)
    setErr('')
    try {
      await clientApi.declarePayment(payment.id, method, ref.trim())
      onDone()
    } catch (cause) {
      setErr(errorMessage(cause, 'Déclaration du paiement impossible.'))
      setBusy(false)
    }
  }
  return (
    <Modal title="Payer ma participation" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-2xl font-bold text-primary">{formatFCFA(payment.amount)}</p>
        {settings.data.paymentInstructions && <Notice>{settings.data.paymentInstructions}</Notice>}
        {err && <Notice tone="danger">{err}</Notice>}
        <Field label="Moyen de paiement" htmlFor="m">
          <select id="m" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className="h-11 w-full rounded-control border border-line bg-surface px-3 text-sm">
            <option value="mobile_money">Mobile Money</option><option value="virement">Virement</option><option value="especes">Espèces (agence MUTLOG)</option><option value="autre">Autre</option>
          </select>
        </Field>
        <Field label="Référence de la transaction" htmlFor="ref" required><Input id="ref" className="h-11" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Reçue par SMS" /></Field>
        <Button size="lg" className="w-full" disabled={busy} onClick={submit}>J'ai effectué le paiement</Button>
      </div>
    </Modal>
  )
}

export function ClientPaymentsPage() {
  const { user } = useAuth()
  const [receipt, setReceipt] = useState<{ payment: AdminPayment; shipment: ClientShipment } | null>(null)
  const [payFor, setPayFor] = useState<AdminPayment | null>(null)
  const flash = useFlash()
  const shipments = useResource(() => clientApi.shipments(), NO_SHIPMENTS)
  const rows = useMemo(
    () => shipments.data
      .flatMap((shipment) => (shipment.payment ? [{ payment: shipment.payment, shipment }] : []))
      .sort((a, b) => (b.payment.createdAt ?? '').localeCompare(a.payment.createdAt ?? '')),
    [shipments.data],
  )
  return (
    <>
      <PageHeader title="Mes paiements" description="Paiements à effectuer, historique et reçus." />
      {flash.node}
      {shipments.error && <div className="mb-4"><Notice tone="danger">{shipments.error}</Notice></div>}
      {!shipments.loaded ? <p className="text-sm text-muted" role="status">Chargement…</p> : (
        <DataTable rows={rows} rowKey={(x) => String(x.payment.id)} empty={<EmptyState title="Aucun paiement" text="Un paiement est créé à la confirmation de votre transport." />}
          columns={[
            { header: 'Opération', cell: (x) => <Link className="font-semibold text-primary-2 hover:underline" to={`/client/expeditions/${x.shipment.id}`}>{x.shipment.ref}</Link> },
            { header: 'Trajet', cell: (x) => `${x.shipment.offer.from} → ${x.shipment.offer.to}` },
            { header: 'Montant', cell: (x) => formatFCFA(x.payment.amount) },
            { header: 'Statut', cell: (x) => <PaymentBadge status={x.payment.status} /> },
            { header: 'Action', cell: (x) => x.payment.status === 'confirme' ? <Button size="sm" variant="outline" onClick={() => setReceipt(x)}>Reçu</Button> : ['en_attente', 'echoue'].includes(x.payment.status) ? <Button size="sm" onClick={() => setPayFor(x.payment)}>{x.payment.reference ? 'Modifier' : 'Payer'}</Button> : null },
          ]} />
      )}
      {payFor && <PayModal payment={payFor} onClose={() => setPayFor(null)} onDone={() => { setPayFor(null); flash.ok('Référence envoyée. MUTLOG vérifie votre paiement.'); shipments.reload() }} />}
      {receipt && (
        <Modal title={`Reçu ${receipt.payment.receiptNo ?? ''}`.trim()} onClose={() => setReceipt(null)}>
          <div id="receipt" className="space-y-1.5 text-sm">
            <p className="text-lg font-bold text-primary">MUTLOG</p>
            <p>Reçu n° <strong>{receipt.payment.receiptNo ?? '—'}</strong></p>
            <p>Opération : {receipt.shipment.ref} — {receipt.shipment.offer.from} → {receipt.shipment.offer.to}</p>
            <p>Client : {userName(user!)}</p>
            <p>Montant payé : <strong>{formatFCFA(receipt.payment.amount)}</strong> ({receipt.payment.method.replace('_', ' ')}, réf. {receipt.payment.reference})</p>
            <p>Confirmé le {receipt.payment.confirmedAt && fmtDate(receipt.payment.confirmedAt)}</p>
          </div>
          <Button className="mt-4 w-full" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimer / enregistrer en PDF</Button>
        </Modal>
      )}
    </>
  )
}

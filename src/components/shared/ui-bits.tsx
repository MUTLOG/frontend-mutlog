import { useEffect, useState, type ReactNode } from 'react'
import { Star, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { GoodsType, Offer, PaymentStatus, Reservation, TransportRequest } from '@/domain/types'
import type { OperationStatus } from '@/types/operation'
import type { Db } from '@/store/db'
import { findMatches } from '@/domain/matching'

export const GOODS_LABEL: Record<GoodsType, string> = {
  generales: 'Marchandises générales', agricoles: 'Produits agricoles', alimentaires: 'Produits alimentaires',
  materiaux: 'Matériaux', equipements: 'Équipements', conteneur: 'Conteneur', fragiles: 'Marchandises fragiles',
}
export const GOODS_OPTIONS = Object.entries(GOODS_LABEL) as [GoodsType, string][]

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
export const fmtT = (t: number) => `${String(t).replace('.', ',')} ${t > 1 ? 'tonnes' : 'tonne'}`

export function offerPriceLabel(o: Pick<Offer, 'pricingMode' | 'price'>) {
  const n = o.price.toLocaleString('fr-FR')
  return o.pricingMode === 'tonne' ? { amount: `${n} FCFA`, unit: 'par tonne' } : { amount: `${n} FCFA`, unit: 'forfait trajet' }
}

const PAY: Record<PaymentStatus, { label: string; tone: React.ComponentProps<typeof Badge>['tone'] }> = {
  en_attente: { label: 'Paiement en attente', tone: 'pending' },
  confirme: { label: 'Paiement confirmé', tone: 'success' },
  echoue: { label: 'Paiement échoué', tone: 'danger' },
  rembourse: { label: 'Remboursé', tone: 'neutral' },
}
export const PaymentBadge = ({ status }: { status: PaymentStatus }) => <Badge tone={PAY[status].tone}>{PAY[status].label}</Badge>

/**
 * Badge d'un statut de demande : « En attente », « Propositions (n) », « Confirmé »…
 * `matchCount` (si connu, ex. fiche détaillée) affiche « Propositions (n) » pendant la recherche ;
 * sinon la liste affiche simplement « En recherche » (le serveur ne renvoie pas ce compteur dans les listes).
 */
export function RequestStatusBadge({ status, matchCount }: { status: OperationStatus; matchCount?: number }) {
  if (status === 'recherche') {
    if (matchCount === undefined) return <Badge tone="pending">En recherche</Badge>
    return matchCount > 0 ? <Badge tone="info">Propositions ({matchCount})</Badge> : <Badge tone="pending">En attente</Badge>
  }
  if (status === 'mutualisation') return <Badge tone="info">Mutualisation en cours</Badge>
  if (status === 'confirmee') return <Badge tone="success">Confirmé</Badge>
  if (status === 'en_cours') return <Badge tone="info">En transit</Badge>
  if (status === 'arrive_destination') return <Badge tone="info">Arrivé</Badge>
  if (status === 'livree') return <Badge tone="success">Livré</Badge>
  if (status === 'terminee') return <Badge tone="success">Terminé</Badge>
  if (status === 'annule') return <Badge tone="danger">Annulé</Badge>
  return <Badge tone="pending">En attente</Badge>
}

/** @deprecated Version « démo » (base locale), encore utilisée par la page admin Demo : à supprimer avec elle. */
export function RequestBadge({ db, r }: { db: Db; r: TransportRequest }) {
  const n = r.status === 'recherche'
    ? findMatches(r, db.offers, db.settings, (id) => db.users.find((u) => u.id === id)?.status === 'actif').length
    : undefined
  return <RequestStatusBadge status={r.status} matchCount={n} />
}

const RESERVATION: Record<Reservation['status'], { label: string; tone: React.ComponentProps<typeof Badge>['tone'] }> = {
  en_attente: { label: 'En attente', tone: 'pending' },
  confirmee: { label: 'Confirmée', tone: 'success' },
  refusee: { label: 'Refusée', tone: 'danger' },
  annulee: { label: 'Annulée', tone: 'danger' },
}
export const ReservationBadge = ({ status }: { status: Reservation['status'] }) => <Badge tone={RESERVATION[status].tone}>{RESERVATION[status].label}</Badge>

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value.toFixed(1)} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} width={size} height={size} className={i <= Math.round(value) ? 'fill-accent text-accent' : 'text-line'} aria-hidden="true" />
      ))}
    </span>
  )
}

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Note">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} sur 5`} onClick={() => onChange(i)} className="rounded p-1">
          <Star width={28} height={28} className={i <= value ? 'fill-accent text-accent' : 'text-line'} />
        </button>
      ))}
    </div>
  )
}

export function Route({ from, to, className }: { from: string; to: string; className?: string }) {
  return <span className={cn('font-semibold text-ink', className)}>{from} <span className="text-muted" aria-label="vers">→</span> {to}</span>
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      {text && <p className="max-w-sm text-sm text-muted">{text}</p>}
      {action}
    </div>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'danger' | 'success'; children: ReactNode }) {
  const cls = { info: 'bg-info-soft text-[#1D4ED8]', warning: 'bg-warning-soft text-[#92400E]', danger: 'bg-danger-soft text-danger', success: 'bg-success-soft text-[#15803D]' }[tone]
  return <p className={cn('rounded-control px-4 py-3 text-sm font-medium', cls)} role={tone === 'danger' ? 'alert' : 'status'}>{children}</p>
}

/** Message de retour d'une action (disparaît seul). */
export function useFlash() {
  const [msg, setMsg] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null)
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 6000); return () => clearTimeout(t) }, [msg])
  return { msg, ok: (text: string) => setMsg({ tone: 'success', text }), err: (text: string) => setMsg({ tone: 'danger', text }), node: msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null }
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-ink/40" aria-label="Fermer" onClick={onClose} />
      <Card className="relative max-h-[90vh] w-full overflow-y-auto rounded-b-none p-5 shadow-pop sm:max-w-md sm:rounded-b-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fermer"><X className="h-5 w-5" /></Button>
        </div>
        {children}
      </Card>
    </div>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string; count?: number }[]; value: T; onChange: (k: T) => void }) {
  return (
    <div className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1" role="tablist">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)}
          className={cn('whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors', value === t.key ? 'bg-primary text-white' : 'bg-surface text-ink ring-1 ring-line hover:bg-primary-soft')}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 opacity-70">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export interface Column<T> { header: string; cell: (row: T) => ReactNode; className?: string }
/** Tableau propre ; sur mobile chaque ligne devient une carte. */
export function DataTable<T>({ rows: all, columns, rowKey, empty, pageSize = 10 }: { rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; empty?: ReactNode; pageSize?: number }) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(all.length / pageSize))
  const current = Math.min(page, pages - 1)
  const rows = all.slice(current * pageSize, (current + 1) * pageSize)
  if (!all.length) return <Card>{empty ?? <EmptyState title="Aucun résultat" />}</Card>
  return (
    <Card className="overflow-hidden">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-background text-xs uppercase tracking-wide text-muted">
            <tr>{columns.map((c) => <th key={c.header} scope="col" className={cn('px-4 py-3 font-semibold', c.className)}>{c.header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => <tr key={rowKey(r)} className="hover:bg-background/60">{columns.map((c) => <td key={c.header} className={cn('px-4 py-3 align-middle', c.className)}>{c.cell(r)}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-line md:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} className="space-y-1.5 px-4 py-3">
            {columns.map((c) => (
              <div key={c.header} className="flex items-start justify-between gap-3 text-sm">
                <span className="shrink-0 text-xs text-muted">{c.header}</span>
                <span className="text-right">{c.cell(r)}</span>
              </div>
            ))}
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <nav className="flex items-center justify-between border-t border-line px-4 py-3 text-sm" aria-label="Pagination">
          <span className="text-muted">{all.length} résultats</span>
          <span className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={current === 0} onClick={() => setPage(current - 1)}>Précédent</Button>
            <span className="text-muted">Page {current + 1} / {pages}</span>
            <Button size="sm" variant="outline" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>Suivant</Button>
          </span>
        </nav>
      )}
    </Card>
  )
}

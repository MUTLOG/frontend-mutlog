import { cityDistanceKm, norm } from './geo'
import type { GoodsType, Offer, Settings, TransportRequest } from './types'

export interface MatchCriterion {
  key: 'origine' | 'destination' | 'date' | 'capacite' | 'marchandise' | 'disponibilite'
  label: string
  ok: boolean
  /** Part du score obtenue, de 0 à 1. */
  ratio: number
}

export interface MatchResult {
  offer: Offer
  /** Score de correspondance, 0 à 100 (CDC §10 : origine, destination, date, capacité, marchandise, disponibilité). */
  score: number
  compatible: boolean
  criteria: MatchCriterion[]
}

const WEIGHTS = { origine: 25, destination: 25, date: 20, capacite: 15, marchandise: 10, disponibilite: 5 } as const

export type MatchInput = Pick<TransportRequest, 'from' | 'to' | 'date' | 'goods' | 'weightT'>

function placeRatio(a: string, b: string, radiusKm: number): number {
  if (norm(a) === norm(b)) return 1
  const d = cityDistanceKm(a, b)
  if (d === null || d > radiusKm) return 0
  return 0.6 + 0.4 * (1 - d / radiusKm) // « compatible » : proche
}

export function daysBetween(a: string, b: string): number {
  return Math.abs(Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000))
}

export function goodsAccepted(accepted: GoodsType[], goods: GoodsType): boolean {
  return accepted.includes(goods) || (accepted.includes('generales') && goods !== 'fragiles')
}

export function scoreMatch(
  req: MatchInput,
  offer: Offer,
  settings: Pick<Settings, 'cityRadiusKm' | 'dateToleranceDays'>,
  transporterActive = true,
): MatchResult {
  const origin = placeRatio(req.from, offer.from, settings.cityRadiusKm)
  const dest = placeRatio(req.to, offer.to, settings.cityRadiusKm)
  const gap = daysBetween(req.date, offer.date)
  const date = gap > settings.dateToleranceDays ? 0 : 1 - gap / (settings.dateToleranceDays + 1)
  const capacity = offer.availableT >= req.weightT ? 1 : 0
  const goods = goodsAccepted(offer.goodsAccepted, req.goods) ? 1 : 0
  const availability = offer.status === 'ouverte' && transporterActive ? 1 : 0

  const criteria: MatchCriterion[] = [
    { key: 'origine', label: 'Départ compatible', ok: origin > 0, ratio: origin },
    { key: 'destination', label: 'Destination compatible', ok: dest > 0, ratio: dest },
    { key: 'date', label: 'Date compatible', ok: date > 0, ratio: date },
    { key: 'capacite', label: 'Capacité suffisante', ok: capacity === 1, ratio: capacity },
    { key: 'marchandise', label: 'Marchandise compatible', ok: goods === 1, ratio: goods },
    { key: 'disponibilite', label: 'Transporteur disponible', ok: availability === 1, ratio: availability },
  ]
  const score = Math.round(criteria.reduce((s, c) => s + WEIGHTS[c.key] * c.ratio, 0))
  return { offer, score, compatible: criteria.every((c) => c.ok), criteria }
}

/** Offres compatibles avec une demande, classées par score décroissant. */
export function findMatches(
  req: MatchInput,
  offers: Offer[],
  settings: Pick<Settings, 'cityRadiusKm' | 'dateToleranceDays'>,
  isTransporterActive: (transporterId: string) => boolean = () => true,
): MatchResult[] {
  return offers
    .map((o) => scoreMatch(req, o, settings, isTransporterActive(o.transporterId)))
    .filter((m) => m.compatible)
    .sort((a, b) => b.score - a.score)
}

/** Demandes compatibles avec une offre (hors contrôle de capacité cumulée). */
export function compatibleRequests<T extends TransportRequest>(
  offer: Offer,
  requests: T[],
  settings: Pick<Settings, 'cityRadiusKm' | 'dateToleranceDays'>,
): T[] {
  return requests.filter((r) => scoreMatch(r, offer, settings).compatible)
}

export interface OfferQuery {
  from?: string
  to?: string
  date?: string
  goods?: GoodsType | ''
  weightT?: number
}

export type OfferSort = 'date' | 'prix' | 'capacite'

/** Recherche publique d'offres (CDC §6 étape 3) : critères facultatifs, tolérance de proximité pour les villes et les dates. */
export function searchOffers(
  offers: Offer[],
  q: OfferQuery,
  settings: Pick<Settings, 'cityRadiusKm' | 'dateToleranceDays'>,
  today: string,
  isTransporterActive: (id: string) => boolean,
  sort: OfferSort = 'date',
): Offer[] {
  const near = (a: string | undefined, b: string) => !a || norm(a) === norm(b) || (cityDistanceKm(a, b) ?? Infinity) <= settings.cityRadiusKm
  return offers
    .filter((o) => o.status === 'ouverte' && o.availableT > 0 && o.date >= today && isTransporterActive(o.transporterId))
    .filter((o) => near(q.from, o.from) && near(q.to, o.to))
    .filter((o) => !q.date || daysBetween(q.date, o.date) <= settings.dateToleranceDays)
    .filter((o) => !q.goods || goodsAccepted(o.goodsAccepted, q.goods))
    .filter((o) => !q.weightT || o.availableT >= q.weightT)
    .sort((a, b) =>
      sort === 'prix' ? a.price - b.price : sort === 'capacite' ? b.availableT - a.availableT : a.date.localeCompare(b.date),
    )
}

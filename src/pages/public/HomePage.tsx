import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck, FileText, Leaf, Route as RouteIcon, ShieldCheck, Truck, Wallet } from 'lucide-react'
import { useTitle } from '@/hooks/useTitle'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import truckImage from '@/assets/mutlog_truck.png'
import { apiEnabled } from '@/services/api'
import { publicApi, type RemoteOffer } from '@/services/mutlogApi'
import type { GoodsType, Offer } from '@/domain/types'
import { useDb } from '@/store/store'
import { searchOffers } from '@/domain/matching'
import { today } from '@/store/logic'
import { fmtDate, fmtT, GOODS_LABEL, offerPriceLabel } from '@/components/shared/ui-bits'

const advantages = [
  { icon: Wallet, title: 'Réduction des coûts', text: 'Partagez un véhicule et ses frais avec d\'autres clients.' },
  { icon: RouteIcon, title: 'Optimisation des trajets', text: 'Moins de camions à moitié vides sur les routes.' },
  { icon: Leaf, title: 'Transport plus durable', text: 'Moins de trajets pour la même quantité transportée.' },
]

const steps = [
  { icon: FileText, title: 'Publiez votre demande', text: 'Départ, destination, date, marchandise et poids : un formulaire court.' },
  { icon: RouteIcon, title: 'Trouvez des correspondances', text: 'MUTLOG compare votre demande aux transports disponibles.' },
  { icon: CalendarCheck, title: 'Réservez et partagez', text: 'MUTLOG regroupe les marchandises compatibles dans un même camion.' },
  { icon: Truck, title: 'Suivez votre transport', text: 'Suivez l\'itinéraire et les étapes jusqu\'à la livraison.' },
]

const audiences = [
  ['Producteurs agricoles', 'Coopératives, organisations de producteurs et producteurs individuels : transportez vos récoltes à moindre coût.'],
  ['Commerçants et grossistes', 'Publiez vos besoins et trouvez rapidement une capacité disponible.'],
  ['PME et entreprises', 'Organisez une partie de vos transports de marchandises, sans flotte dédiée.'],
  ['Transporteurs', 'Valorisez la capacité libre de vos camions et réduisez les trajets à vide.'],
]

export default function HomePage() {
  useTitle()
  const db = useDb()
  const [remoteOffers, setRemoteOffers] = useState<Offer[]>([])
  useEffect(() => {
    if (!apiEnabled) return
    let cancelled = false
    publicApi.offers({ sort: 'date' }).then((items) => {
      if (cancelled) return
      setRemoteOffers(items.slice(0, 3).map((offer: RemoteOffer) => ({
        id: String(offer.id), transporterId: String(offer.transporter?.id ?? ''), vehicleId: '',
        from: offer.from, to: offer.to, date: offer.date, totalCapacityT: Number(offer.totalCapacityT),
        availableT: Number(offer.availableT), goodsAccepted: (offer.goodsAccepted ?? []) as GoodsType[],
        pricingMode: offer.pricingMode, price: Number(offer.price), notes: offer.notes,
        status: (offer.status === 'ouverte' ? 'ouverte' : offer.status === 'complete' ? 'complete' : 'terminee') as Offer['status'], createdAt: '',
      })))
    }).catch(() => { if (!cancelled) setRemoteOffers([]) })
    return () => { cancelled = true }
  }, [])
  const offers = (apiEnabled ? remoteOffers : searchOffers(db.offers, {}, db.settings, today(), (id) => db.users.find((u) => u.id === id)?.status === 'actif')).slice(0, 3)
  return (
    <>
      <section
        className="relative isolate overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${truckImage})` }}
        aria-label="Camion sur une route de montagne"
      >
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white via-white/95 via-[48%] to-white/10" aria-hidden="true" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-white/35 via-transparent to-white/10" aria-hidden="true" />
        <div className="mx-auto grid max-w-[1200px] items-center gap-8 px-4 py-10 sm:px-6 lg:min-h-[580px] lg:grid-cols-2 lg:py-16">
          <div>
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              Le transport<br />plus intelligent,<br /><span className="text-accent-hover">ensemble.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-ink/80">
              MUTLOG vous permet de mutualiser vos transports de marchandises pour réduire vos coûts, optimiser vos trajets et contribuer à un transport plus durable.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/client/demandes/nouvelle">Publier une demande <ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/rechercher">Trouver un transport</Link></Button>
            </div>
            <ul className="mt-9 grid gap-4 sm:grid-cols-3">
              {advantages.map(({ icon: Icon, title }) => (
                <li key={title} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info-soft text-[#1D4ED8]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <span className="text-sm font-medium text-ink">{title}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative hidden min-h-[360px] lg:block">
            <div className="absolute right-2 top-8 flex items-center gap-3 rounded-card border border-white/60 bg-primary/35 px-4 py-3 shadow-card backdrop-blur-md xl:right-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#15803D]"><Leaf className="h-5 w-5" aria-hidden="true" /></span>
              <p className="text-sm font-semibold leading-snug text-white drop-shadow">Des trajets partagés<br />pour un avenir durable</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6" aria-labelledby="how">
        <h2 id="how" className="text-2xl font-bold text-ink">Comment ça marche</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title}>
              <Card className="h-full p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <span className="text-sm font-bold text-muted">Étape {i + 1}</span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {offers.length > 0 && (
        <section className="mx-auto max-w-[1200px] px-4 pb-12 sm:px-6" aria-labelledby="dispo">
          <div className="flex items-end justify-between">
            <h2 id="dispo" className="text-2xl font-bold text-ink">Transports disponibles</h2>
            <Link to="/rechercher" className="text-sm font-semibold text-primary-2 hover:underline">Voir tout</Link>
          </div>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {offers.map((o) => {
              const p = offerPriceLabel(o)
              return (
                <li key={o.id}>
                  <Link to={`/transports/${o.id}`} className="block h-full">
                    <Card className="h-full p-5 transition-shadow hover:shadow-pop">
                      <p className="text-lg font-bold text-ink">{o.from} → {o.to}</p>
                      <p className="mt-1 text-sm text-muted">{fmtDate(o.date)} · {GOODS_LABEL[o.goodsAccepted[0]]}</p>
                      <p className="mt-3 text-sm text-ink">Disponible : <strong>{fmtT(o.availableT)}</strong></p>
                      <p className="mt-3 text-xl font-bold text-primary">{p.amount} <span className="text-xs font-medium text-muted">{p.unit}</span></p>
                    </Card>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="bg-surface">
        <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-bold text-ink">Pour qui ?</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {audiences.map(([t, d]) => (
              <div key={t} className="rounded-card border border-line p-5">
                <h3 className="font-semibold text-ink">{t}</h3>
                <p className="mt-1.5 text-sm text-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
        <div className="flex flex-col items-start gap-4 rounded-card bg-primary p-8 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Prêt à partager votre prochain transport ?</h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-white/80"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Transporteurs vérifiés par MUTLOG, regroupements validés par notre équipe.</p>
          </div>
          <Button asChild size="lg"><Link to="/inscription">Créer mon compte</Link></Button>
        </div>
      </section>
    </>
  )
}

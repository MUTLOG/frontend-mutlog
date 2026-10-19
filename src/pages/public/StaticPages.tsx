
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Handshake,
  Layers,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Star,
  Truck,
  Users,
  Wallet,
} from 'lucide-react'
import { useTitle } from '@/hooks/useTitle'
import { errorMessage } from '@/services/api'
import { contactApi, EMPTY_PUBLIC_SETTINGS, publicApi } from '@/services/mutlogApi'
import { useResource } from '@/hooks/useResource'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Input } from '@/components/ui/input'
import { Notice } from '@/components/shared/ui-bits'
import { LEGAL, isSet } from '@/features/legal/config'

function Page({
  title,
  intro,
  eyebrow,
  children,
}: {
  title: string
  intro?: string
  eyebrow?: string
  children: React.ReactNode
}) {
  useTitle(title)

  return (
    <div className="pb-16">
      <section className="border-b border-line bg-gradient-to-br from-primary-soft via-background to-background">
        <div className="mx-auto max-w-[1120px] px-4 py-12 sm:px-6 sm:py-16">
          {eyebrow && (
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              {eyebrow}
            </p>
          )}
          <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-ink sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          {intro && (
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              {intro}
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-[1120px] px-4 pt-8 sm:px-6 sm:pt-10">
        {children}
      </div>
    </div>
  )
}

const values = [
  {
    icon: Handshake,
    title: 'La mutualisation',
    text: 'Rapprocher les besoins d’expédition et les capacités de transport compatibles.',
  },
  {
    icon: ShieldCheck,
    title: 'Un cadre organisé',
    text: 'Organiser les demandes et vérifier les regroupements selon le processus MUTLOG.',
  },
  {
    icon: MapPin,
    title: 'Une approche locale',
    text: 'Concevoir un service adapté aux besoins logistiques du marché béninois.',
  },
]

export function AboutPage() {
  const audiences = [
    'Producteurs agricoles, coopératives et organisations de producteurs',
    'Commerçants et grossistes',
    'PME et entreprises',
    'Transporteurs : propriétaires de camions, entreprises de transport, gestionnaires de flotte',
  ]

  return (
    <Page
      title="Faire du transport partagé une solution concrète"
      eyebrow="À propos de MUTLOG"
      intro="MUTLOG est une plateforme de mutualisation des moyens de transport logistique. Elle rapproche les personnes et entreprises qui expédient des marchandises des transporteurs disposant de capacités disponibles au Bénin."
    >
      <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-5">
          <Card className="p-6 sm:p-8">
            <h2 className="text-xl font-bold text-ink">
              Le constat
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              Toutes les marchandises ne remplissent pas un véhicule entier.
              Dans le même temps, des transporteurs peuvent disposer d’espace
              disponible sur certains trajets. Lorsque les itinéraires et les
              conditions sont compatibles, ces capacités peuvent être mieux utilisées.
            </p>

            <h2 className="mt-7 text-xl font-bold text-ink">
              Notre réponse
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              MUTLOG facilite la mise en relation, la recherche de trajets
              compatibles et le regroupement de plusieurs demandes dans un
              même véhicule. L’objectif est de rendre le transport partagé
              plus lisible et mieux organisé, depuis la demande jusqu’à la livraison.
            </p>
          </Card>

          <Card className="p-6 sm:p-8">
            <h2 className="text-xl font-bold text-ink">
              Nos principes
            </h2>

            <div className="mt-5 space-y-5">
              {values.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 sm:p-8">
            <h2 className="text-xl font-bold text-ink">À qui s’adresse MUTLOG ?</h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              MUTLOG est pensée pour celles et ceux qui transportent régulièrement
              des marchandises, ou qui disposent de capacités à valoriser.
            </p>
            <ul className="mt-4 space-y-3">
              {audiences.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-6 text-muted">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-6 text-muted">
              La plateforme est conçue pour le téléphone mobile, avec des formulaires courts
              et des boutons clairs, afin de rester simple à utiliser même avec peu d’habitude du numérique.
            </p>
          </Card>

          <Card className="p-6 sm:p-8">
            <h2 className="text-xl font-bold text-ink">Ce que fait MUTLOG, et ce qu’elle ne fait pas</h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <div>
                <h3 className="font-semibold text-ink">MUTLOG s’occupe de</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-muted">
                  <li>mettre en relation clients et transporteurs ;</li>
                  <li>repérer les demandes compatibles et proposer un regroupement ;</li>
                  <li>organiser la validation, le suivi et l’historique des opérations ;</li>
                  <li>calculer la participation de chacun et la commission.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-ink">MUTLOG n’est pas</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-muted">
                  <li>un transporteur : le transport est réalisé par le transporteur choisi ;</li>
                  <li>un service qui garantit un regroupement pour chaque demande.</li>
                </ul>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Le détail figure dans les{' '}
                  <Link to="/conditions-utilisation" className="font-semibold text-primary hover:underline">
                    conditions d’utilisation
                  </Link>
                  .
                </p>
              </div>
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="overflow-hidden">
            <div className="bg-primary p-6 text-white sm:p-7">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                Notre mission
              </span>
              <h2 className="mt-3 text-2xl font-extrabold leading-tight">
                Mieux connecter les besoins de transport et les capacités disponibles.
              </h2>
            </div>

            <div className="space-y-4 p-6">
              <div className="flex gap-3">
                <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm leading-6 text-muted">
                  Une plateforme qui relie clients, entreprises et transporteurs.
                </p>
              </div>
              <div className="flex gap-3">
                <Handshake className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm leading-6 text-muted">
                  Une logique de mutualisation lorsque les demandes sont compatibles.
                </p>
              </div>
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm leading-6 text-muted">
                  Un projet conçu pour le marché béninois.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <Building2 className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="mt-4 font-bold text-ink">Qui est derrière MUTLOG ?</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              MUTLOG est une application de l’{LEGAL.editor.status} {LEGAL.editor.name}, dirigée par{' '}
              {LEGAL.editor.director}, {LEGAL.editor.directorTitle.toLowerCase()}.
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              La plateforme a été conçue et réalisée par {LEGAL.developer.name}.
            </p>
            <Link
              to="/mentions-legales"
              className="mt-3 inline-flex items-center text-sm font-semibold text-primary hover:underline"
            >
              Mentions légales
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Card>

          <Card className="p-6">
            <h2 className="font-bold text-ink">Découvrir la plateforme</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Consultez le fonctionnement du service ou contactez l’équipe.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link to="/comment-ca-marche">
                  Comment ça marche
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to="/contact">Nous contacter</Link>
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </Page>
  )
}

const contactSubjects = [
  'Question générale',
  'Réservation ou demande de transport',
  'Offre ou trajet (transporteur)',
  'Mon compte',
  'Problème technique',
]

const faq = [
  {
    q: 'Qui peut s’inscrire sur MUTLOG ?',
    a: 'Les clients (producteurs, commerçants, PME, coopératives) et les transporteurs. L’inscription demande votre nom, votre téléphone, votre localité et un mot de passe ; l’adresse e-mail est facultative.',
  },
  {
    q: 'Comment fonctionne le regroupement des demandes ?',
    a: 'Lorsque plusieurs demandes sont compatibles (trajet, date, capacité, type de marchandise), MUTLOG peut proposer de les regrouper dans un même véhicule. Au lancement, l’équipe MUTLOG valide le regroupement avant la confirmation.',
  },
  {
    q: 'Comment se déroule le paiement ?',
    a: 'Le Mobile Money est la solution visée. Tant que le paiement en ligne n’est pas activé, l’équipe vérifie et valide le paiement manuellement.',
  },
  {
    q: 'Combien coûte le service ?',
    a: 'MUTLOG perçoit une commission, affichée avant la confirmation de l’opération. Le détail est dans les conditions commerciales.',
  },
  {
    q: 'Comment signaler un problème sur un transport ?',
    a: 'Écrivez-nous avec le formulaire ci-contre en indiquant l’identifiant de l’opération (par exemple MUT-2026-000125) et ce qui s’est passé.',
  },
]

export function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    subject: contactSubjects[0],
    message: '',
    website: '', // champ piège anti-spam : jamais rempli par un humain
  })
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const directEmail = isSet(LEGAL.contact.general) ? LEGAL.contact.general : isSet(LEGAL.editor.email) ? LEGAL.editor.email : ''
  const directPhone = isSet(LEGAL.contact.phone) ? LEGAL.contact.phone : isSet(LEGAL.editor.phone) ? LEGAL.editor.phone : ''

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const name = form.name.trim()
    const message = form.message.trim()
    if (!name || !message) {
      setError('Renseignez votre nom et votre message.')
      return
    }
    if (message.length < 10) {
      setError('Votre message doit contenir au moins 10 caractères.')
      return
    }

    setBusy(true)
    try {
      const fullMessage = `Objet : ${form.subject}\n\n${message}`
      await contactApi.send({ name, phone: form.phone.trim() || undefined, message: fullMessage, website: form.website })
      setSent(true)
    } catch (cause) {
      setError(errorMessage(cause, 'Le message n’a pas pu être envoyé. Réessayez.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page
      title="Parlons de votre besoin"
      eyebrow="Contact"
      intro="Une question sur le transport partagé, votre compte ou l’utilisation de la plateforme ? Envoyez un message à l’équipe MUTLOG."
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-8">
            <h2 className="text-xl font-bold text-ink">
              Écrire à l’équipe MUTLOG
            </h2>
            <p className="mb-6 mt-2 text-sm leading-6 text-muted">
              Décrivez votre demande avec suffisamment de détails pour faciliter son traitement.
            </p>

            {sent ? (
              <div className="space-y-4">
                <Notice tone="success">
                  Votre message a bien été transmis à l’équipe MUTLOG. Nous vous répondrons dès que possible.
                </Notice>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSent(false)
                    setForm({ name: '', phone: '', subject: contactSubjects[0], message: '', website: '' })
                  }}
                >
                  Envoyer un autre message
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5" noValidate>
                {error && <Notice tone="danger">{error}</Notice>}

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Nom complet" htmlFor="contact-name" required>
                    <Input
                      id="contact-name"
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="Votre nom"
                    />
                  </Field>

                  <Field label="Téléphone de rappel" htmlFor="contact-phone">
                    <Input
                      id="contact-phone"
                      inputMode="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      placeholder="Ex. : +229 …"
                    />
                  </Field>
                </div>

                <Field label="Sujet" htmlFor="contact-subject">
                  <select
                    id="contact-subject"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="h-10 w-full rounded-control border border-line bg-surface px-3 text-sm text-ink focus-visible:border-primary-2"
                  >
                    {contactSubjects.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Votre message" htmlFor="contact-message" required>
                  <textarea
                    id="contact-message"
                    rows={6}
                    maxLength={2000}
                    value={form.message}
                    onChange={(e) =>
                      setForm({ ...form, message: e.target.value })
                    }
                    placeholder="Expliquez votre question ou votre demande…"
                    className="w-full rounded-control border border-line bg-surface p-3 text-sm leading-6 text-ink placeholder:text-muted focus-visible:border-primary-2"
                  />
                  <span className="mt-1 block text-right text-xs text-muted">
                    {form.message.length}/2000 caractères
                  </span>
                </Field>

                <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  <label htmlFor="contact-website">Ne pas remplir ce champ</label>
                  <input
                    id="contact-website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                  />
                </div>

                <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto">
                  {busy ? 'Envoi…' : 'Envoyer le message'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <p className="text-xs leading-5 text-muted">
                  Évitez d’inclure des mots de passe ou des données sensibles dans votre message.
                  Vos informations servent uniquement à vous répondre, comme décrit dans la{' '}
                  <Link to="/politique-de-confidentialite" className="font-semibold text-primary hover:underline">
                    politique de confidentialité
                  </Link>
                  .
                </p>
              </form>
            )}
          </Card>

          <Card className="p-5 sm:p-8">
            <h2 className="text-xl font-bold text-ink">Questions fréquentes</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              La réponse à votre question s’y trouve peut-être déjà.
            </p>
            <div className="mt-5 divide-y divide-line">
              {faq.map(({ q, a }) => (
                <details key={q} className="group py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink">
                    {q}
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-muted">{a}</p>
                </details>
              ))}
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          {(directEmail || directPhone) && (
            <Card className="p-6">
              <Phone className="h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="mt-4 font-bold text-ink">Nous joindre directement</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {directPhone && (
                  <li>
                    <a href={`tel:${directPhone.replace(/\s/g, '')}`} className="font-semibold text-primary hover:underline">
                      {directPhone}
                    </a>
                  </li>
                )}
                {directEmail && (
                  <li>
                    <a href={`mailto:${directEmail}`} className="break-all font-semibold text-primary hover:underline">
                      {directEmail}
                    </a>
                  </li>
                )}
              </ul>
            </Card>
          )}

          <Card className="p-6">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h2 className="mt-4 font-bold text-ink">
              Pour une réponse utile
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Choisissez le sujet qui correspond à votre demande et, si elle concerne une opération,
              indiquez son identifiant (par exemple MUT-2026-000125).
            </p>
          </Card>

          <Card className="p-6">
            <Clock3 className="h-6 w-6 text-primary" />
            <h2 className="mt-4 font-bold text-ink">Traitement des demandes</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              L’équipe pourra consulter votre demande depuis son espace de notifications.
              Aucun délai de réponse précis n’est annoncé pour le moment.
            </p>
          </Card>

          <Card className="p-6">
            <CircleHelp className="h-6 w-6 text-primary" />
            <h2 className="mt-4 font-bold text-ink">Besoin d’un repère ?</h2>
            <Link
              to="/comment-ca-marche"
              className="mt-3 inline-flex items-center text-sm font-semibold text-primary hover:underline"
            >
              Voir comment ça marche
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Card>
        </aside>
      </div>
    </Page>
  )
}

export function ServicesPage() {
  const blocks = [
    {
      icon: PackageCheck,
      title: 'Pour les clients',
      subtitle: 'Préparer une expédition',
      items: [
        'Publier une demande de transport',
        'Rechercher des offres compatibles',
        'Réserver une capacité disponible',
        'Consulter le statut de son opération',
      ],
    },
    {
      icon: Truck,
      title: 'Pour les transporteurs',
      subtitle: 'Valoriser les capacités disponibles',
      items: [
        'Enregistrer ses véhicules',
        'Publier un trajet et sa capacité',
        'Recevoir des demandes compatibles',
        'Gérer les transports confirmés',
      ],
    },
    {
      icon: ShieldCheck,
      title: 'Organisation MUTLOG',
      subtitle: 'Faciliter le regroupement',
      items: [
        'Vérifier les informations opérationnelles',
        'Valider les regroupements au lancement',
        'Organiser les participations aux frais',
        'Faciliter le suivi des opérations',
      ],
    },
  ]

  const features = [
    { icon: Search, title: 'Recherche et correspondances', text: 'Départ, destination, date, capacité et type de marchandise sont comparés pour afficher les trajets pertinents.' },
    { icon: Layers, title: 'Mutualisation', text: 'Plusieurs demandes compatibles peuvent partager un même véhicule et en répartir le coût.' },
    { icon: Wallet, title: 'Paiement', text: 'Le Mobile Money est visé ; en attendant, l’équipe vérifie et valide les paiements.' },
    { icon: RouteIcon, title: 'Suivi des opérations', text: 'Chaque opération a un identifiant unique et un statut, de la demande jusqu’à la livraison.' },
    { icon: Bell, title: 'Notifications', text: 'Vous êtes prévenu aux étapes importantes : correspondance, confirmation, départ, livraison.' },
    { icon: Star, title: 'Évaluations', text: 'Après la livraison, clients et transporteurs peuvent noter l’opération.' },
  ]

  return (
    <Page
      title="Des services autour du transport partagé"
      eyebrow="Nos services"
      intro="MUTLOG organise la rencontre entre les besoins d’expédition et les capacités de transport disponibles."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {blocks.map(({ icon: Icon, title, subtitle, items }) => (
          <Card key={title} className="p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Icon className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-lg font-bold text-ink">{title}</h2>
            <p className="mt-1 text-sm font-medium text-primary">{subtitle}</p>
            <ul className="mt-5 space-y-3">
              {items.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-5 text-muted">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <section className="mt-10" aria-labelledby="services-inclus">
        <h2 id="services-inclus" className="text-xl font-bold text-ink sm:text-2xl">Ce que vous trouvez sur la plateforme</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <Card key={title} className="flex gap-4 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Card className="mt-10 p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Exemple illustratif</p>
        <h2 className="mt-2 text-xl font-bold text-ink sm:text-2xl">Un camion, trois clients</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Sur un trajet Lokossa → Cotonou, un camion de 10 tonnes a 4 tonnes disponibles. Trois demandes
          compatibles sont regroupées après validation de l’équipe MUTLOG.
        </p>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-control bg-background p-4">
            <dt className="text-muted">Clients</dt>
            <dd className="mt-1 font-semibold text-ink">1 t + 2 t + 1 t = 4 t sur 10 t</dd>
          </div>
          <div className="rounded-control bg-background p-4">
            <dt className="text-muted">Prix du transport</dt>
            <dd className="mt-1 font-semibold text-ink">200 000 FCFA, partagés</dd>
          </div>
          <div className="rounded-control bg-background p-4">
            <dt className="text-muted">Commission MUTLOG (10 %)</dt>
            <dd className="mt-1 font-semibold text-ink">20 000 FCFA</dd>
          </div>
          <div className="rounded-control bg-background p-4">
            <dt className="text-muted">Net du transporteur</dt>
            <dd className="mt-1 font-semibold text-ink">180 000 FCFA</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-5 text-muted">
          Exemple chiffré à titre d’illustration. Le taux de commission (entre 5 % et 10 %) et la règle de répartition
          applicables sont affichés avant toute confirmation. Voir les{' '}
          <Link to="/conditions-commerciales" className="font-semibold text-primary hover:underline">
            conditions commerciales
          </Link>
          .
        </p>
      </Card>

      <div className="mt-8 rounded-2xl bg-primary p-6 text-white sm:p-8">
        <h2 className="text-xl font-bold sm:text-2xl">
          Vous avez un besoin de transport ?
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
          Créez un compte pour consulter les fonctionnalités disponibles selon votre profil.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild className="bg-white text-primary hover:bg-white/90">
            <Link to="/inscription">
              Découvrir MUTLOG
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
            <Link to="/rechercher">Rechercher un transport</Link>
          </Button>
        </div>
      </div>
    </Page>
  )
}

export function HowItWorksPage() {
  const steps = [
    ['Inscription', 'Créez votre compte et choisissez votre profil : client ou transporteur.'],
    ['Publication', 'Le client renseigne le départ, la destination, la date et les caractéristiques de la marchandise.'],
    ['Recherche de compatibilité', 'MUTLOG rapproche les demandes et les offres selon les itinéraires, les dates et les capacités.'],
    ['Validation du regroupement', 'Pour la première version, l’équipe MUTLOG vérifie le regroupement avant confirmation.'],
    ['Confirmation', 'Le transporteur confirme sa disponibilité et les clients prennent connaissance des conditions.'],
    ['Transport et livraison', 'Les utilisateurs consultent les informations et statuts disponibles sur la plateforme.'],
    ['Évaluation', 'Après la livraison, les utilisateurs peuvent partager leur appréciation de l’opération.'],
  ]

  return (
    <Page
      title="Comment fonctionne MUTLOG ?"
      eyebrow="Un parcours organisé"
      intro="De la demande de transport à la livraison, les étapes facilitent la mise en relation entre clients et transporteurs."
    >
      <ol className="grid gap-4 md:grid-cols-2">
        {steps.map(([title, text], index) => (
          <li key={title}>
            <Card className="flex h-full gap-4 p-5 sm:p-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-base font-bold text-white">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h2 className="font-bold text-ink">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      <div className="mt-7 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link to="/inscription">
            Créer un compte
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/recherche">Voir les transports</Link>
        </Button>
      </div>
    </Page>
  )
}

export function TermsPage() {
  const settings = useResource(() => publicApi.settings(), EMPTY_PUBLIC_SETTINGS).data

  return (
    <Page
      title="Conditions d’utilisation"
      eyebrow="Cadre d’utilisation"
      intro="Résumé des principales règles de fonctionnement. Les conditions complètes doivent être validées avant la mise en production."
    >
      <Card className="space-y-5 p-6 sm:p-8">
        <section>
          <h2 className="font-bold text-ink">Commission MUTLOG</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {settings.commissionPct > 0 ? `La commission configurée est de ${settings.commissionPct} %. ` : ''}
            Le montant applicable doit être présenté avant confirmation de l’opération.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-ink">Mutualisation</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Les demandes sont regroupées lorsque leurs caractéristiques et itinéraires
            sont compatibles. Le regroupement suit le processus de validation en vigueur.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-ink">Paiements</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Les moyens de paiement disponibles, les étapes de vérification et les
            montants applicables doivent être présentés avant le paiement.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-ink">Données personnelles</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Les informations de compte et d’opération doivent être utilisées pour
            les besoins du service et accessibles selon les droits des utilisateurs.
          </p>
        </section>

        <Notice tone="warning">
          Cette page est un résumé informatif. Elle ne remplace pas des conditions
          contractuelles validées juridiquement.
        </Notice>
      </Card>
    </Page>
  )
}

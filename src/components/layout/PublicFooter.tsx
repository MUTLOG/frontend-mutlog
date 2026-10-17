import { Link } from 'react-router-dom'
import { ArrowUpRight, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { publicNav } from '@/routes/navigation'
import { LEGAL, LEGAL_PAGES, isSet } from '@/features/legal/config'

const platformLinks = [
  { to: '/services', label: 'Nos services' },
  { to: '/comment-ca-marche', label: 'Comment ça marche' },
  { to: '/rechercher', label: 'Trouver un transport' },
]

export function PublicFooter() {
  const infoLinks = publicNav.filter((item) => ['/a-propos', '/contact'].includes(item.to))
  const { general, phone } = LEGAL.contact
  const editorEmail = isSet(general) ? general : isSet(LEGAL.editor.email) ? LEGAL.editor.email : ''
  const editorPhone = isSet(phone) ? phone : isSet(LEGAL.editor.phone) ? LEGAL.editor.phone : ''

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.1fr]">
          <div>
            <Link to="/" aria-label="MUTLOG — accueil" className="inline-flex">
              <Logo />
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-muted">
              La plateforme de mutualisation du transport logistique au Bénin.
              MUTLOG rapproche les besoins d’expédition des capacités de transport disponibles.
            </p>

            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>Un projet conçu pour le marché béninois</span>
              </li>
              {editorPhone && (
                <li className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <a href={`tel:${editorPhone.replace(/\s/g, '')}`} className="hover:text-primary">{editorPhone}</a>
                </li>
              )}
              {editorEmail && (
                <li className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <a href={`mailto:${editorEmail}`} className="break-all hover:text-primary">{editorEmail}</a>
                </li>
              )}
            </ul>
          </div>

          <nav aria-label="Découvrir MUTLOG">
            <h2 className="text-sm font-bold text-ink">Découvrir</h2>
            <ul className="mt-4 space-y-3">
              {platformLinks.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="text-sm text-muted transition-colors hover:text-primary">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Informations">
            <h2 className="text-sm font-bold text-ink">Informations</h2>
            <ul className="mt-4 space-y-3">
              {infoLinks.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="text-sm text-muted transition-colors hover:text-primary">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Informations légales">
            <h2 className="text-sm font-bold text-ink">Informations légales</h2>
            <ul className="mt-4 space-y-3">
              {LEGAL_PAGES.map((item) => (
                <li key={item.path}>
                  <Link to={item.path} className="text-sm text-muted transition-colors hover:text-primary">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-sm font-bold text-ink">Accéder à MUTLOG</h2>
            <p className="mt-4 text-sm leading-6 text-muted">
              Vous expédiez des marchandises ou proposez des capacités de transport ?
              Découvrez l’espace correspondant à votre activité.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <Link
                to="/inscription"
                className="inline-flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                Créer un compte
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>

              <Link
                to="/connexion"
                className="inline-flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-background"
              >
                Se connecter
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-5 text-xs text-muted lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p>© {new Date().getFullYear()} MUTLOG. Tous droits réservés.</p>
            <p>
              Application de {LEGAL.editor.name} · Conçue et réalisée par {LEGAL.developer.name}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Des opérations organisées
            </span>
            <Link to="/mentions-legales" className="hover:text-primary">Mentions légales</Link>
            <Link to="/conditions-utilisation" className="hover:text-primary">Conditions d’utilisation</Link>
            <Link to="/politique-de-confidentialite" className="hover:text-primary">Confidentialité</Link>
            <Link to="/contact" className="hover:text-primary">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

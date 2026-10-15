import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { publicNav } from '@/routes/navigation'

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-2 max-w-xs text-sm text-muted">Le transport plus intelligent, ensemble. Mutualisation du transport de marchandises au Bénin.</p>
        </div>
        <nav aria-label="Pied de page" className="flex flex-wrap gap-x-6 gap-y-2">
          {publicNav.map((item) => (
            <Link key={item.to} to={item.to} className="text-sm text-ink hover:text-primary">{item.label}</Link>
          ))}
        </nav>
      </div>
      <p className="border-t border-line py-4 text-center text-xs text-muted">© {new Date().getFullYear()} MUTLOG. Tous droits réservés.</p>
    </footer>
  )
}

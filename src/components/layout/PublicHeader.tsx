import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth, homeFor } from '@/features/auth/useAuth'
import { publicNav } from '@/routes/navigation'

export function PublicHeader() {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn('text-sm font-medium transition-colors hover:text-primary', isActive ? 'text-primary' : 'text-ink')

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-6 px-4 sm:px-6">
        <Link to="/" aria-label="MUTLOG — accueil">
          <Logo />
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-7 lg:flex">
          {publicNav.map((item) => (
            <NavLink key={item.to} to={item.to} end className={linkCls}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <Button asChild><Link to={homeFor(user.role)}>Mon espace</Link></Button>
          ) : (
            <>
              <Button asChild variant="outline"><Link to="/connexion">Se connecter</Link></Button>
              <Button asChild><Link to="/inscription">S'inscrire</Link></Button>
            </>
          )}
        </div>

        <Button variant="ghost" size="sm" className="lg:hidden" aria-expanded={open} aria-controls="menu-public"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open && (
        <div id="menu-public" className="border-t border-line bg-surface px-4 pb-5 pt-3 lg:hidden">
          <nav aria-label="Navigation principale" className="flex flex-col">
            {publicNav.map((item) => (
              <NavLink key={item.to} to={item.to} end onClick={() => setOpen(false)}
                className={(s) => cn(linkCls(s), 'rounded-control px-2 py-3')}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {user ? (
              <Button asChild size="lg" className="col-span-2"><Link to={homeFor(user.role)} onClick={() => setOpen(false)}>Mon espace</Link></Button>
            ) : (
              <>
                <Button asChild variant="outline" size="lg"><Link to="/connexion" onClick={() => setOpen(false)}>Se connecter</Link></Button>
                <Button asChild size="lg"><Link to="/inscription" onClick={() => setOpen(false)}>S'inscrire</Link></Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

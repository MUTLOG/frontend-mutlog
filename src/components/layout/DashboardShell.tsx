import { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut, Menu, Search, X } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SpaceConfig } from '@/routes/navigation'
import { useAuth } from '@/features/auth/useAuth'
import { useNotifications } from '@/features/notifications/useNotifications'
import { CallProvider } from '@/features/calls/CallProvider'
import { userName } from '@/lib/format'
import { useIdleLogout } from '@/hooks/useIdleLogout'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

function SidebarNav({ space, onNavigate }: { space: SpaceConfig; onNavigate?: () => void }) {
  return (
    <nav aria-label={space.title} className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
      {space.nav.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'bg-primary text-white' : 'text-ink hover:bg-primary-soft',
            )
          }
        >
          <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

/**
 * Coque commune des espaces connectés (Client, Transporteur, Administrateur).
 * Desktop : barre latérale fixe. Mobile : tiroir ouvert par le bouton menu.
 */
export function DashboardShell({ space }: { space: SpaceConfig }) {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { unread } = useNotifications()
  const roleLabel = { client: 'Client', transporteur: 'Transporteur', admin: 'Administrateur' }[space.key]
  const displayName = user ? userName(user) : ''
  useIdleLogout(30, () => { logout(); navigate('/connexion', { state: { expired: true } }) })
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <CallProvider>
      <div className="min-h-screen bg-background lg:pl-60">
        <a href="#contenu" className="sr-only rounded-control bg-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60]">Aller au contenu</a>
        {/* Barre latérale desktop */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
          <Link to="/" className="px-5 py-5" aria-label="MUTLOG — accueil">
            <Logo />
          </Link>
          <SidebarNav space={space} />
        </aside>

        {/* Tiroir mobile */}
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <button className="absolute inset-0 bg-ink/40" aria-label="Fermer le menu" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-surface shadow-pop">
              <div className="flex items-center justify-between px-5 py-4">
                <Logo />
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label="Fermer le menu">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <SidebarNav space={space} onNavigate={() => setOpen(false)} />
            </aside>
          </div>
        )}

        {/* Barre supérieure */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
            <Menu className="h-5 w-5" />
          </Button>
          <p className="text-base font-semibold text-ink">{space.title}</p>

          <form className="relative ml-auto hidden w-full max-w-md md:block" role="search"
            onSubmit={(e) => { e.preventDefault(); const q = String(new FormData(e.currentTarget).get('q') ?? '').trim(); const root = space.key === 'client' ? '/client/rechercher' : '/rechercher'; navigate(q ? `${root}?to=${encodeURIComponent(q)}` : root) }}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              name="q"
              type="search"
              aria-label="Rechercher un transport, une ville"
              placeholder="Rechercher un transport, une ville…"
              className="h-10 w-full rounded-control border border-line bg-background pl-9 pr-3 text-sm placeholder:text-muted focus-visible:border-primary-2"
            />
          </form>

          <div className="ml-auto flex items-center gap-3 md:ml-4">
            <Link
              to={`${space.base}/notifications`}
              className="relative rounded-full p-2 text-primary hover:bg-primary-soft"
              aria-label={unread > 0 ? `${unread} notifications non lues` : 'Notifications'}
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white ring-2 ring-surface" aria-hidden="true">{unread}</span>
              )}
            </Link>
            <Link to={`${space.base}/profil`} className="flex items-center gap-2.5 rounded-control p-1 hover:bg-primary-soft">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {initials(displayName)}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block max-w-[140px] truncate text-sm font-semibold text-ink">{displayName}</span>
                <span className="block text-xs text-muted">{roleLabel}</span>
              </span>
            </Link>
            <Button variant="ghost" size="sm" aria-label="Se déconnecter" title="Se déconnecter" onClick={() => { logout(); navigate('/') }}>
              <LogOut className="h-[18px] w-[18px]" />
            </Button>
          </div>
        </header>

        <main id="contenu" tabIndex={-1} className="mx-auto w-full max-w-[1200px] px-4 py-6 outline-none sm:px-6">
          <Outlet />
        </main>
      </div>
    </CallProvider>
  )
}

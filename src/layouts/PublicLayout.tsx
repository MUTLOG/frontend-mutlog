import { Outlet } from 'react-router-dom'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a href="#contenu" className="sr-only rounded-control bg-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60]">Aller au contenu</a>
      <PublicHeader />
      <main id="contenu" tabIndex={-1} className="flex-1 outline-none"><Outlet /></main>
      <PublicFooter />
    </div>
  )
}

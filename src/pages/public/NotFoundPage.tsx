import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-20 text-center sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Page introuvable</h1>
      <p className="mt-2 text-sm text-muted">Le lien est peut-être incorrect, ou la page a été déplacée.</p>
      <Button asChild className="mt-6"><Link to="/">Retour à l'accueil</Link></Button>
    </div>
  )
}

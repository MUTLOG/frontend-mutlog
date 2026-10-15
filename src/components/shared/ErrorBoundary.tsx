import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: unknown) { console.error('MUTLOG — erreur d\'affichage', error) }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center" role="alert">
        <h1 className="text-2xl font-bold text-ink">Un problème est survenu</h1>
        <p className="text-sm text-muted">La page n'a pas pu s'afficher. Vos données ne sont pas perdues. Rechargez la page ; si le problème continue, contactez MUTLOG.</p>
        <Button size="lg" onClick={() => window.location.assign('/')}>Retour à l'accueil</Button>
      </div>
    )
  }
}

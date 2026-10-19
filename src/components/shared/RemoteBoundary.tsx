import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Notice } from '@/components/shared/ui-bits'

/** Affiche « Chargement… », l'erreur de l'API avec un bouton Réessayer, ou le contenu. */
export function RemoteBoundary({ loading, error, onRetry, children }: { loading: boolean; error: string; onRetry?: () => void; children: ReactNode }) {
  if (loading) return <Card className="p-8 text-center text-sm text-muted" role="status" aria-live="polite">Chargement…</Card>
  if (error) {
    return (
      <div className="space-y-3">
        <Notice tone="danger">{error}</Notice>
        {onRetry && <Button variant="outline" onClick={onRetry}>Réessayer</Button>}
      </div>
    )
  }
  return <>{children}</>
}

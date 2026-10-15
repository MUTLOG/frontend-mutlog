import type { ReactNode } from 'react'
import { useTitle } from '@/hooks/useTitle'

/** En-tête de page des espaces connectés : titre, sous-titre, action principale à droite. */
export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  useTitle(title)
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

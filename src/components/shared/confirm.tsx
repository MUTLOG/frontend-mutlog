import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from './ui-bits'

interface AskOptions { title?: string; message: string; confirmLabel?: string; danger?: boolean }
type Pending = AskOptions & { resolve: (v: boolean) => void }

let setPending: ((p: Pending | null) => void) | null = null

/** Remplace window.confirm : `if (!(await ask('Annuler ce trajet ?'))) return`. */
export function ask(opts: string | AskOptions): Promise<boolean> {
  const o = typeof opts === 'string' ? { message: opts } : opts
  return new Promise((resolve) => {
    if (!setPending) return resolve(window.confirm(o.message)) // secours si l'hôte n'est pas monté
    setPending({ ...o, resolve })
  })
}

export function ConfirmHost() {
  const [p, set] = useState<Pending | null>(null)
  useEffect(() => { setPending = set; return () => { setPending = null } }, [])
  if (!p) return null
  const done = (v: boolean) => { p.resolve(v); set(null) }
  return (
    <Modal title={p.title ?? 'Confirmation'} onClose={() => done(false)}>
      <p className="text-sm text-ink">{p.message}</p>
      <div className="mt-5 flex gap-3">
        <Button variant={p.danger === false ? 'primary' : 'danger'} size="lg" className="flex-1" onClick={() => done(true)}>{p.confirmLabel ?? 'Confirmer'}</Button>
        <Button variant="outline" size="lg" className="flex-1" onClick={() => done(false)}>Retour</Button>
      </div>
    </Modal>
  )
}

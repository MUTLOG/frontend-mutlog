import { cn } from '@/lib/utils'
import logoImage from '@/assets/mutlog-logo.png'

/**
 * Logo MUTLOG — symbole fourni comme référence par le porteur du projet.
 * Le symbole est conservé sans redessin; seule sa taille d'affichage varie.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={logoImage}
      alt=""
      aria-hidden="true"
      className={cn('h-14 w-18 object-contain', className)}
      draggable={false}
    />
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="text-xl font-extrabold tracking-tight text-primary">MUTLOG</span>
    </span>
  )
}

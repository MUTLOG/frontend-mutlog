import { cn } from '@/lib/utils'

/**
 * Logo MUTLOG — version provisoire (monogramme X bleu/orange + mot-symbole).
 * À remplacer par les fichiers graphiques officiels du porteur du projet.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden="true">
      <path d="M6 6l20 20" stroke="#0B2A4A" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M26 6L6 26" stroke="#FF7A00" strokeWidth="6.5" strokeLinecap="round" />
    </svg>
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

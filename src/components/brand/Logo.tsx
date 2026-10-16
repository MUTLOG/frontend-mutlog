import { cn } from '@/lib/utils'

/** Symbole MUTLOG : chevron bleu marine et accents orange/bleu. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('h-8 w-8 shrink-0', className)}
      role="img"
      aria-label="Symbole MUTLOG"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13 10.5c-2.5-2.2-6.3-1.8-8.2.8-1.8 2.5-1.2 5.8 1 8.2l18.1 19.7c2.2 2.4 5.8 2.5 8.1.2l4.4-4.4L13 10.5Z"
        fill="#0B2A4A"
      />
      <path
        d="M51 10.5c2.5-2.2 6.3-1.8 8.2.8 1.8 2.5 1.2 5.8-1 8.2L40.1 39.2c-2.2 2.4-5.8 2.5-8.1.2l-4.4-4.4L51 10.5Z"
        fill="#0B2A4A"
      />
      <path
        d="M21.5 37.2 9.2 50.5c-2.8 3-.7 7.8 3.4 7.8h10.7c3.6 0 6.9-1.5 9.4-4.1l6.5-6.8-8.4-9.2c-2.5-2.7-6.8-3.1-9.3-1Z"
        fill="#F04438"
      />
      <path
        d="m42.5 37.2 12.3 13.3c2.8 3 .7 7.8-3.4 7.8H40.7c-3.6 0-6.9-1.5-9.4-4.1l-6.5-6.8 8.4-9.2c2.5-2.7 6.8-3.1 9.3-1Z"
        fill="#0B2A4A"
      />
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

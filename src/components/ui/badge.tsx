import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5',
  {
    variants: {
      tone: {
        neutral: 'bg-primary-soft text-primary',
        pending: 'bg-accent-soft text-[#B45309]', // « En attente »
        info: 'bg-info-soft text-[#1D4ED8]', // « Propositions (3) »
        success: 'bg-success-soft text-[#166534]', // « Confirmé », « Disponible », « Vérifié », « Actif »
        warning: 'bg-warning-soft text-[#B45309]',
        danger: 'bg-danger-soft text-danger',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}

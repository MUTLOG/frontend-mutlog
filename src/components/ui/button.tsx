import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Action principale : orange (publier, réserver, rechercher)
        accent: 'bg-accent text-white hover:bg-accent-hover',
        // Navigation / action secondaire : bleu MUTLOG
        primary: 'bg-primary text-white hover:bg-primary-2',
        outline: 'border border-line bg-surface text-primary hover:bg-primary-soft',
        ghost: 'text-primary hover:bg-primary-soft',
        danger: 'bg-danger text-white hover:bg-red-700',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base', // cibles tactiles confortables (mobile / producteurs ruraux)
      },
    },
    defaultVariants: { variant: 'accent', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  },
)
Button.displayName = 'Button'

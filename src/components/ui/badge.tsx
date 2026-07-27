import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Chips/Tags: label-sm, fondo gris oscuro, radio 4px (prosa §Components).
const badgeVariants = cva('inline-flex items-center rounded text-label-sm uppercase px-2 py-0.5', {
  variants: {
    variant: {
      default: 'bg-interactive text-surface-variant',
      copper: 'bg-copper/15 text-copper',
      outline: 'border border-outline-variant text-outline',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }

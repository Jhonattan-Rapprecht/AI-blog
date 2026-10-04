import * as React from 'react'
import { Loader2, type LucideIcon } from 'lucide-react'
import { Slot } from 'radix-ui'
import { Button } from '@/components/ui/button'

export interface PrimaryButtonProps extends React.ComponentProps<'button'> {
  /** Leading lucide icon; sized by the design system (size-4). */
  icon?: LucideIcon
  /** Shows a spinner in place of the icon and disables the button. */
  loading?: boolean
  /** Label shown while loading (ignored with asChild). */
  loadingText?: React.ReactNode
  size?: 'sm' | 'default' | 'lg'
  /** Render as the child element, e.g. a router <Link>. */
  asChild?: boolean
}

export function PrimaryButton({
  icon: Icon,
  loading = false,
  loadingText,
  size = 'default',
  asChild = false,
  disabled,
  className,
  children,
  ...props
}: PrimaryButtonProps) {
  const leading = loading
    ? <Loader2 key="icon" className="animate-spin" />
    : Icon ? <Icon key="icon" /> : null
  const label = !asChild && loading && loadingText ? loadingText : children

  return (
    <Button
      variant="default"
      size={size}
      asChild={asChild}
      className={className}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild
        // Slottable lets the icon render inside the child element (e.g. <Link>).
        ? [leading, <Slot.Slottable key="child">{label}</Slot.Slottable>]
        : <>{leading}{label}</>}
    </Button>
  )
}

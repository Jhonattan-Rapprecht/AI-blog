import { cn } from '@/lib/utils'

export function NativeSelect({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'border-input bg-transparent h-9 w-full min-w-0 rounded-md border px-3 text-sm shadow-xs outline-none',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50',
        '[&>option]:bg-popover [&>option]:text-popover-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}

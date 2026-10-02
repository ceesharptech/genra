import * as React from 'react'
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full text-sm font-medium whitespace-nowrap transition-all duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 gap-2 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs',
        primary:
          'bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs',
        brand:
          'bg-brand text-brand-foreground hover:bg-brand-hover shadow-xs font-semibold',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border',
        outline:
          'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs',
        link: 'text-brand hover:underline underline-offset-4 p-0 h-auto active:scale-100 rounded-none',
      },
      size: {
        default: 'h-10 px-5 py-2 text-sm rounded-full',
        sm: 'h-8 px-3.5 text-xs rounded-full',
        md: 'h-10 px-4 text-sm rounded-full',
        lg: 'h-12 px-6 text-base rounded-full',
        icon: 'size-10 rounded-full p-0',
        'icon-sm': 'size-8 rounded-full p-0',
        'icon-lg': 'size-12 rounded-full p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

interface ButtonProps
  extends ButtonPrimitive.Props,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-loading={loading ? '' : undefined}
      aria-busy={loading}
      disabled={disabled || loading}
      className={cn(
        buttonVariants({ variant, size, className }),
        loading && 'relative cursor-wait'
      )}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg
            className="size-4 animate-spin shrink-0 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3.5"
            />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="sr-only">Loading...</span>
        </span>
      )}
      <span
        className={cn(
          'inline-flex items-center justify-center gap-2',
          loading && 'invisible'
        )}
      >
        {children}
      </span>
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
export type { ButtonProps }

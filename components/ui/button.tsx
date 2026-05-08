import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base styles — pill-shaped, smooth transitions, focus ring
  [
    'inline-flex items-center justify-center gap-2',
    'rounded-full font-sans font-medium whitespace-nowrap',
    'transition-all duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-40',
    'select-none',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        // Blue — primary CTA
        primary: [
          'bg-accent text-white',
          'hover:bg-accent-hover active:bg-accent-dark',
          'shadow-sm hover:shadow',
        ],
        // Black — high-contrast CTA
        dark: [
          'bg-ink text-white',
          'hover:bg-ink-800 active:bg-ink-700',
          'shadow-sm hover:shadow',
        ],
        // Light grey — secondary action
        secondary: [
          'bg-mist text-ink',
          'hover:bg-hairline active:bg-hairline/80',
        ],
        // Text with underline — tertiary/inline
        ghost: [
          'bg-transparent text-accent underline-offset-2',
          'hover:underline hover:text-accent-hover',
        ],
        // Hairline border — outlined action
        outline: [
          'border border-hairline bg-transparent text-ink',
          'hover:bg-mist active:bg-hairline/60',
        ],
        // Gold = legacy alias for dark
        gold: [
          'bg-ink text-white',
          'hover:bg-ink-800 active:bg-ink-700',
          'shadow-sm hover:shadow',
        ],
        // Destructive — delete / reject
        destructive: [
          'bg-red-600 text-white',
          'hover:bg-red-700 active:bg-red-800',
          'shadow-sm hover:shadow',
        ],
      },
      size: {
        sm: 'h-8 px-4 text-[13px] [&_svg]:size-3.5',
        md: 'h-10 px-5 text-[14px] [&_svg]:size-4',
        lg: 'h-12 px-7 text-[15px] [&_svg]:size-4',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin"
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
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }

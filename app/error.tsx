'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error for diagnostics
    console.error('Unhandled application error:', error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <div className="max-w-md space-y-4">
        <p className="text-destructive font-mono text-xs font-semibold tracking-wider uppercase">
          Error
        </p>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
          Something went wrong
        </h1>
        <p className="text-subtle text-sm">
          An unexpected error occurred while loading this view. You can try
          again or return home.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="default" size="default" onClick={() => reset()}>
            Try again
          </Button>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'default' })
            )}
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

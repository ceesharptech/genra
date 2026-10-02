import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <div className="max-w-md space-y-4">
        <p className="text-brand font-mono text-xs font-semibold tracking-wider uppercase">
          404 Error
        </p>
        <h1 className="font-bricolage text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
          Page not found
        </h1>
        <p className="text-subtle text-sm">
          The page or resource you are looking for doesn&apos;t exist or may
          have been moved.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: 'default', size: 'default' })
            )}
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

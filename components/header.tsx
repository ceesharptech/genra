import Link from 'next/link'
import { HugeiconsIcon } from '@hugeicons/react'
import { Search01Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/theme-toggle'

export function Header() {
  return (
    <header className="border-border bg-background/85 sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="group flex items-center gap-2 transition-opacity hover:opacity-90"
            aria-label="Genra Home"
          >
            <span className="bg-foreground text-background flex size-5 items-center justify-center rounded-md font-mono text-xs leading-none font-bold">
              G
            </span>
            <span className="text-foreground text-base font-semibold tracking-tight">
              Genra
            </span>
            <span
              className="bg-brand size-1.5 rounded-full"
              aria-hidden="true"
            />
          </Link>

          {/* Search input placeholder (non-functional in Phase 00) */}
          <div className="relative hidden md:block">
            <HugeiconsIcon
              icon={Search01Icon}
              className="text-subtle pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2"
            />
            <Input
              type="search"
              placeholder="Search creations, tools, prompts..."
              disabled
              aria-label="Search creations, tools, prompts"
              className="bg-surface border-border h-8 w-64 cursor-not-allowed rounded-md pl-8 text-xs opacity-80 lg:w-80"
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="default"
            size="sm"
            disabled
            title="Authentication is introduced in Phase 01"
            className="h-8 cursor-not-allowed px-3 text-xs font-medium"
          >
            Log in
          </Button>
        </div>
      </div>
    </header>
  )
}

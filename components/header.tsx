'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/components/auth/user-menu'
import { cn } from '@/lib/utils'

export function Header() {
  const pathname = usePathname()
  if (pathname === '/login' || pathname === '/signup') {
    return null
  }

  return (
    <header className="bg-background/85 sticky top-0 z-40 w-full backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand and Primary Navigation */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="group flex items-center gap-1.5 transition-opacity hover:opacity-90"
            aria-label="Genra Home"
          >
            <Image
              src="/images/genra-logo.png"
              alt="Genra Logo"
              width={28}
              height={28}
              className="h-6 w-5 shrink-0 rounded-full"
              priority
            />
            <span className="font-albert-sans text-foreground text-xl font-semibold tracking-tight">
              Genra
            </span>
          </Link>

          {/* Primary Navigation */}
          <nav
            className="hidden items-center gap-6 text-sm font-normal md:flex"
            aria-label="Main Navigation"
          >
            <Link
              href="/discover"
              className={cn(
                'hover:text-foreground transition-colors',
                pathname.startsWith('/discover')
                  ? 'text-foreground font-medium'
                  : 'text-foreground/80'
              )}
            >
              Discover
            </Link>
            <Link
              href="/prompts"
              className={cn(
                'hover:text-foreground transition-colors',
                pathname.startsWith('/prompts')
                  ? 'text-foreground font-medium'
                  : 'text-foreground/80'
              )}
            >
              Prompts
            </Link>
            <Link
              href="/resources"
              className={cn(
                'hover:text-foreground transition-colors',
                pathname.startsWith('/resources')
                  ? 'text-foreground font-medium'
                  : 'text-foreground/80'
              )}
            >
              Resources
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

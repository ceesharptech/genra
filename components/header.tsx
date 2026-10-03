'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/components/auth/user-menu'

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
              className="size-5 shrink-0 rounded-full"
              priority
            />
            <span className="font-bricolage text-foreground text-xl font-semibold tracking-tight">
              Genra
            </span>
          </Link>

          {/* Dribbble-style Left Navigation */}
          <nav
            className="hidden items-center gap-6 text-sm font-normal md:flex"
            aria-label="Main Navigation"
          >
            <Link
              href="/"
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/#categories-heading"
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              Creations
            </Link>
            <Link
              href="/#categories-heading"
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              Tools
            </Link>
            <Link
              href="/#categories-heading"
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              Prompts
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

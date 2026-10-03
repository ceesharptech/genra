'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'

export function Footer() {
  const pathname = usePathname()
  if (pathname === '/login' || pathname === '/signup') {
    return null
  }

  return (
    <footer className="border-border bg-background mt-auto w-full border-t transition-colors">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-90"
            aria-label="Genra Home"
          >
            <Image
              src="/images/genra-logo.png"
              alt="Genra Logo"
              width={22}
              height={22}
              className="size-5.5 rounded-full"
            />
            <span className="font-bricolage text-foreground text-sm font-semibold tracking-tight">
              Genra
            </span>
          </Link>
          <p className="text-subtle text-xs">
            &copy; {new Date().getFullYear()} Genra. Discovery & learning
            platform for AI-made work.
          </p>
          <p className="text-muted-foreground text-[11px]">
            Explore what creators built and learn how it was made.
          </p>
        </div>

        <div className="text-subtle flex items-center gap-6 text-xs">
          <span className="hover:text-foreground cursor-default transition-colors">
            Explore
          </span>
          <span className="hover:text-foreground cursor-default transition-colors">
            Tools
          </span>
          <span className="hover:text-foreground cursor-default transition-colors">
            Prompts
          </span>
          <div className="sm:hidden">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  )
}

import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth/server'
import { safeRedirectPath } from '@/lib/auth/redirect'
import { LoginForm } from '@/components/auth/login-form'
import { ThemeToggle } from '@/components/theme-toggle'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign up',
  description:
    'Create your Genra account to discover, learn from, and share AI creations.',
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string
    intent?: string
    error?: string
  }>
}) {
  const { next, intent, error } = await searchParams
  const safeNext = safeRedirectPath(next, '/')

  // If already signed in, redirect appropriately
  const user = await getCurrentUser()
  if (user) {
    const profile = await getCurrentProfile()
    if (!profile || !profile.onboarded_at) {
      redirect(`/onboarding?next=${encodeURIComponent(safeNext)}`)
    } else {
      const target = intent
        ? safeNext.includes('?')
          ? `${safeNext}&intent=${encodeURIComponent(intent)}`
          : `${safeNext}?intent=${encodeURIComponent(intent)}`
        : safeNext
      redirect(target)
    }
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      {/* Left side: Navigation + Auth form */}
      <div className="bg-background flex flex-col justify-between p-6 sm:p-10 lg:p-12">
        {/* Top bar with Logo and Theme toggle */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="group flex items-center gap-2.5 transition-opacity hover:opacity-90"
            aria-label="Genra Home"
          >
            <Image
              src="/images/genra-logo.png"
              alt="Genra Logo"
              width={28}
              height={28}
              className="size-7 shrink-0 rounded-full"
              priority
            />
            <span className="font-bricolage text-foreground text-xl font-semibold tracking-tight">
              Genra
            </span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Center: Auth Form Container */}
        <div className="mx-auto w-full max-w-sm py-10">
          <LoginForm
            mode="signup"
            next={safeNext}
            intent={intent}
            errorParam={error}
          />
        </div>

        {/* Bottom spacer / subtle text */}
        <div className="text-muted-foreground/60 hidden text-center text-xs sm:block">
          Genra &middot; The discovery and learning platform for AI-made work
        </div>
      </div>

      {/* Right side: Visual Artwork Showcase */}
      <div className="relative hidden h-full w-full overflow-hidden bg-neutral-950 lg:block">
        <Image
          src="/images/auth-bg.jpg"
          alt="AI Digital Art Creation Showcase"
          fill
          priority
          sizes="50vw"
          className="object-cover object-left"
        />
        {/* Subtle vignette/gradient */}
        <div className="from-background/60 pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-40" />

        {/* Creator Credit Badge in bottom right */}
        <div className="absolute right-6 bottom-6 z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3.5 py-1.5 font-mono text-xs font-medium text-white/90 shadow-lg backdrop-blur-md">
            @glebich
          </span>
        </div>
      </div>
    </div>
  )
}

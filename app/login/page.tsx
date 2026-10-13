import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth/server'
import { safeRedirectPath } from '@/lib/auth/redirect'
import { LoginForm } from '@/components/auth/login-form'
import { ThemeToggle } from '@/components/theme-toggle'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign in · Genra',
  description: 'Sign in to Genra to like, save, and publish creations.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function LoginPage({
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
      <div className="bg-background flex min-h-screen flex-col justify-between p-6 sm:p-10 lg:p-12">
        {/* Top bar with Logo and Theme toggle */}
        <div className="flex items-center justify-between">
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
            <span className="font-albert text-foreground text-xl font-semibold tracking-tight">
              Genra
            </span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Center: Auth Form Container - vertically centered */}
        <div className="mx-auto my-auto w-full max-w-sm space-y-4 py-8 sm:py-10">
          <LoginForm
            mode="login"
            next={safeNext}
            intent={intent}
            errorParam={error}
          />
          {/* <p className="text-center text-[11px] text-muted-foreground/75 leading-relaxed">
            By continuing, you agree to Genra&rsquo;s{' '}
            <Link href="/terms" className="underline hover:text-foreground">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-foreground">
              Privacy Policy
            </Link>.
          </p> */}
        </div>

        {/* Bottom footer text (keeps balance on all screen heights) */}
        <div className="text-muted-foreground/60 text-center text-xs">
          <span className="hidden sm:inline">
            Genra &middot; The discovery and learning platform for AI-made work
          </span>
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
          className="object-cover object-top"
        />
        {/* Subtle vignette/gradient */}
        <div className="from-background/60 pointer-events-none absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-40" />

        {/* Creator Credit Badge in bottom right */}
        <div className="absolute right-6 bottom-6 z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3.5 py-1.5 font-sans text-xs font-medium text-white/90 shadow-lg backdrop-blur-md">
            @magnific
          </span>
        </div>
      </div>
    </div>
  )
}

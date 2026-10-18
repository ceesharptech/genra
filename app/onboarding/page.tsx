import { redirect } from 'next/navigation'
import Image from 'next/image'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth/server'
import { safeRedirectPath } from '@/lib/auth/redirect'
import { OnboardingForm } from '@/components/profile/onboarding-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Welcome to Genra — Set Up Your Profile',
  description: 'Choose your Genra username and customize your profile.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string
  }>
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/onboarding')
  }

  const profile = await getCurrentProfile()
  const { next } = await searchParams
  const safeNext = safeRedirectPath(next, '/')

  // If already onboarded, redirect away to avoid redirect loops
  if (profile && profile.onboarded_at) {
    redirect(safeNext)
  }

  // Pre-fill initial username and display name
  const initialUsername =
    profile?.username ||
    user.email?.split('@')[0]?.replace(/[^a-zA-Z0-9_]/g, '') ||
    'user'
  const initialDisplayName =
    profile?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    ''
  const initialAvatarUrl =
    profile?.avatar_url || user.user_metadata?.avatar_url || null

  return (
    <div className="flex min-h-[calc(100vh-14rem)] flex-col items-center justify-center px-4 py-12">
      <div className="border-border bg-card w-full max-w-md rounded-xl border p-6 shadow-xs sm:p-8">
        <div className="mb-6 text-center">
          <Image
            src="/images/genra-logo.png"
            alt="Genra Logo"
            width={48}
            height={48}
            className="mx-auto h-8 w-7 rounded-full shadow-xs"
            priority
          />
          <h1 className="font-bricolage text-foreground mt-3 text-xl font-semibold tracking-tight">
            Welcome to Genra
          </h1>
          <p className="text-muted-foreground mt-1 text-xs">
            Choose a unique username to represent your AI creations and tools.
          </p>
        </div>

        <OnboardingForm
          userId={user.id}
          initialUsername={initialUsername}
          initialDisplayName={initialDisplayName}
          initialAvatarUrl={initialAvatarUrl}
          next={safeNext}
        />
      </div>
    </div>
  )
}

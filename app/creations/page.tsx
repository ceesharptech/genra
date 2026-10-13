import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth/server'
import { listMyCreations } from '@/lib/data/creations'
import { CreationsDashboard } from '@/components/creations/creations-dashboard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Creations · Genra',
  description: 'Manage your AI-created projects and drafts on Genra.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function MyCreationsPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/creations')
  }

  const profile = await getCurrentProfile()
  if (!profile || !profile.onboarded_at) {
    redirect('/onboarding?next=/creations')
  }

  const { data: creations, error } = await listMyCreations(user.id)

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8 sm:px-6 sm:py-10">
      <CreationsDashboard initialCreations={creations} error={error} />
    </div>
  )
}

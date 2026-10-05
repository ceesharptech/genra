import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth/server'
import { savedCards } from '@/lib/data/engagement'
import { SavedView } from '@/components/saved/saved-view'

export const metadata: Metadata = {
  title: 'Saved creations — Genra',
  description: 'Creations you have bookmarked on Genra.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function SavedPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?next=/saved')
  }

  const { data, hasMore, error } = await savedCards({ limit: 24 })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Header section */}
      <div className="mb-8 space-y-1">
        <h1 className="font-bricolage text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
          Saved creations
        </h1>
        <p className="text-muted-foreground text-sm">
          Creations you have bookmarked to revisit or learn from.
        </p>
      </div>

      <SavedView
        initialCreations={data}
        initialHasMore={hasMore}
        error={error}
      />
    </div>
  )
}

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/server'
import { buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Globe02Icon,
  Settings01Icon,
  Link01Icon,
} from '@hugeicons/core-free-icons'
import type { Metadata } from 'next'

interface ProfilePageProps {
  params: Promise<{
    username: string
  }>
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, headline, bio')
    .eq('username', username)
    .maybeSingle()

  if (!profile) {
    return {
      title: 'User Not Found',
    }
  }

  const title = profile.display_name
    ? `${profile.display_name} (@${profile.username})`
    : `@${profile.username}`

  return {
    title: `${title} | Genra`,
    description:
      profile.headline ||
      profile.bio ||
      `Explore AI creations, prompts, and tools by ${title} on Genra.`,
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params
  const supabase = await createClient()

  // Case-insensitive query via citext
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle()

  if (error || !profile) {
    notFound()
  }

  const currentUser = await getCurrentUser()
  const isOwnProfile = currentUser?.id === profile.id

  const displayName = profile.display_name || profile.username
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 1)
    .toUpperCase()

  const socialLinks = (profile.social_links as Record<string, string>) || {}
  const activeSocials = Object.entries(socialLinks).filter(([, url]) =>
    Boolean(url && url.startsWith('https://'))
  )

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Profile Header */}
      <div className="flex flex-col gap-5 sm:gap-6">
        <Avatar className="border-border size-24 shrink-0 border sm:size-22 md:size-28">
          {profile.avatar_url && (
            <AvatarImage src={profile.avatar_url} alt={displayName} />
          )}
          <AvatarFallback className="bg-surface-2 text-foreground text-3xl font-semibold sm:text-4xl">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col flex-wrap items-baseline gap-0">
              <h1 className="font-bricolage text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
                {displayName}
              </h1>
              <span className="text-muted-foreground font-sans text-xs sm:text-sm">
                @{profile.username}
              </span>
            </div>

            {isOwnProfile && (
              <Link
                href="/settings"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'h-8 gap-1.5 text-xs font-medium'
                )}
              >
                <HugeiconsIcon icon={Settings01Icon} className="size-3.5" />
                Edit profile
              </Link>
            )}
          </div>

          {(profile.headline || profile.bio) && (
            <div className="flex flex-col gap-1 pt-1">
              {profile.headline && (
                <p className="text-foreground/90 text-sm font-medium">
                  {profile.headline}
                </p>
              )}
              {profile.bio && (
                <p className="text-muted-foreground max-w-2xl text-sm/relaxed whitespace-pre-wrap">
                  {profile.bio}
                </p>
              )}
            </div>
          )}

          {/* Links */}
          {(profile.website_url || activeSocials.length > 0) && (
            <div className="text-muted-foreground flex flex-wrap items-center gap-3 pt-2 text-xs">
              {profile.website_url && (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <HugeiconsIcon icon={Globe02Icon} className="size-3.5" />
                  <span>{new URL(profile.website_url).hostname}</span>
                </a>
              )}

              {activeSocials.map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="hover:text-foreground flex items-center gap-1 capitalize transition-colors"
                >
                  <HugeiconsIcon icon={Link01Icon} className="size-3.5" />
                  <span>{platform === 'x' ? 'X' : platform}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-border my-8 h-px" />

      {/* Creations / Empty state */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bricolage text-foreground text-base font-semibold tracking-tight">
            Creations
          </h2>
          <span className="text-muted-foreground text-xs">0 published</span>
        </div>

        <div className="border-border bg-surface-1/50 flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
          <div className="bg-surface-2 text-muted-foreground mx-auto mb-3 flex size-10 items-center justify-center rounded-full">
            <span className="font-mono text-sm font-bold">0</span>
          </div>
          <h3 className="font-bricolage text-foreground text-sm font-medium">
            No creations yet
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm text-xs">
            {isOwnProfile
              ? "You haven't published any AI creations yet. When creation authoring opens in Phase 02, your work will appear here."
              : `${displayName} has not published any AI creations yet.`}
          </p>
        </div>
      </section>
    </div>
  )
}

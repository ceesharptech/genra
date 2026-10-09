import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/server'
import { discoverCards } from '@/lib/data/creations'
import { getProfileByUsername } from '@/lib/data/profile'
import { getSiteUrl } from '@/lib/site'
import { buildProfileJsonLd, safeJsonLdReplacer } from '@/lib/seo/json-ld'
import { CreationGrid } from '@/components/creations/creation-grid'
import { LoadMore } from '@/components/creations/load-more'
import { buttonVariants, Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Globe02Icon,
  Settings01Icon,
  Link01Icon,
  PlusSignIcon,
  DashboardSquare01Icon,
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
  const profile = await getProfileByUsername(username)

  if (!profile) {
    return {
      title: 'User Not Found · Genra',
      robots: { index: false, follow: false },
    }
  }

  const displayName = profile.display_name || profile.username
  const title = `${displayName} (@${profile.username})`
  const description =
    profile.headline ||
    profile.bio ||
    `Explore AI creations, prompts, and tools by ${displayName} on Genra.`
  const siteUrl = getSiteUrl()
  const canonicalUrl = `${siteUrl}/u/${profile.username}`
  const ogImageUrl = `${siteUrl}/u/${profile.username}/og`

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${title} · Genra`,
      description,
      url: canonicalUrl,
      siteName: 'Genra',
      type: 'profile',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${displayName}'s profile on Genra`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} · Genra`,
      description,
      images: [ogImageUrl],
    },
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params

  // Concurrently load profile, user session, and creations
  const [profile, currentUser, cardsRes] = await Promise.all([
    getProfileByUsername(username),
    getCurrentUser(),
    discoverCards({
      creator_username: username,
      sort: 'new',
      limit: 24,
    }),
  ])

  if (!profile) {
    notFound()
  }

  const jsonLd = buildProfileJsonLd(profile)

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

  const creations = cardsRes.data || []
  const hasMore = cardsRes.hasMore

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Structured Data (Schema.org JSON-LD) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd, safeJsonLdReplacer),
        }}
      />

      {/* Profile Header */}
      <div className="flex max-w-7xl flex-col gap-5 sm:gap-6">
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
              <div className="flex items-center gap-2">
                <Link
                  href="/creations"
                  className={cn(
                    buttonVariants({ variant: 'secondary', size: 'sm' }),
                    'h-8 gap-1.5 rounded-full text-xs font-medium'
                  )}
                >
                  <HugeiconsIcon
                    icon={DashboardSquare01Icon}
                    className="size-3.5"
                  />
                  Dashboard
                </Link>
                <Link
                  href="/settings"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'h-8 gap-1.5 rounded-full text-xs font-medium'
                  )}
                >
                  <HugeiconsIcon icon={Settings01Icon} className="size-3.5" />
                  Edit profile
                </Link>
              </div>
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

      {/* Published Creations Grid */}
      <section
        className="space-y-6"
        aria-labelledby="profile-creations-heading"
      >
        <div className="border-border flex items-center justify-between pb-3">
          <h2
            id="profile-creations-heading"
            className="font-bricolage text-foreground text-xl font-semibold tracking-tight"
          >
            Published creations
          </h2>
          <span className="text-muted-foreground text-xs tabular-nums">
            {creations.length}{' '}
            {creations.length === 1 ? 'creation' : 'creations'}
          </span>
        </div>

        {creations.length === 0 ? (
          <div className="border-border flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-16 text-center">
            <h3 className="text-foreground text-base font-medium">
              No creations yet
            </h3>
            <p className="text-text-subtle mt-1.5 max-w-sm text-sm">
              {isOwnProfile
                ? "You haven't published any creations yet. Share your first AI-built project with the community."
                : `${displayName} has not published any creations yet.`}
            </p>
            {isOwnProfile && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link href="/new">
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5 rounded-full"
                  >
                    <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
                    Create something new
                  </Button>
                </Link>
                <Link href="/creations">
                  <Button variant="outline" size="sm" className="rounded-full">
                    View drafts in dashboard
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            <CreationGrid creations={creations} priorityCount={4} />
            <LoadMore
              initialHasMore={hasMore}
              initialOffset={creations.length}
              params={{ creator_username: username, sort: 'new' }}
              limit={24}
            />
          </>
        )}
      </section>
    </div>
  )
}

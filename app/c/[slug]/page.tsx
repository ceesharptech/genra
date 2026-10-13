import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth/server'
import {
  getPublishedCreationBySlug,
  relatedCreations,
  discoverCards,
} from '@/lib/data/creations'
import { getEngagementState } from '@/lib/data/engagement'
import { CreationView } from '@/components/creations/creation-view'
import { ViewTracker } from '@/components/creations/view-tracker'
import { JoinCard } from '@/components/creations/join-card'
import {
  CreationGrid,
  CreationGridSkeleton,
} from '@/components/creations/creation-grid'
import { MarkdownView } from '@/components/ui/markdown-view'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { buildCreationDescription } from '@/lib/seo/metadata'
import { buildCreationJsonLd, safeJsonLdReplacer } from '@/lib/seo/json-ld'

interface CreationPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({
  params,
}: CreationPageProps): Promise<Metadata> {
  const { slug } = await params
  const creation = await getPublishedCreationBySlug(slug)

  if (!creation) {
    return {
      title: 'Creation Not Found · Genra',
      robots: { index: false, follow: false },
    }
  }

  const creatorName =
    creation.creator?.display_name || creation.creator?.username || 'Creator'
  const description = buildCreationDescription({
    title: creation.title,
    summary: creation.summary,
    description: creation.description,
    creatorName,
    tools: creation.tools.map((t) => t.tool),
  })

  const canonicalUrl = `/c/${slug}`
  const ogImageUrl = `/c/${slug}/og?v=${new Date(creation.updated_at).getTime()}`

  return {
    title: creation.title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'article',
      url: canonicalUrl,
      title: creation.title,
      description,
      publishedTime: creation.published_at || undefined,
      modifiedTime: creation.updated_at,
      authors: [creatorName],
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: creation.title,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: creation.title,
      description,
      images: [ogImageUrl],
    },
    ...(creation.status !== 'published'
      ? {
          robots: {
            index: false,
            follow: false,
          },
        }
      : {}),
  }
}

async function RelatedCreationsSection({ creationId }: { creationId: string }) {
  const { data: related } = await relatedCreations(creationId, 4)

  if (!related || related.length === 0) {
    return null
  }

  return (
    <section
      className="border-border space-y-6 border-t pt-10"
      aria-labelledby="related-heading"
    >
      <div className="flex items-center justify-between">
        <h2
          id="related-heading"
          className="font-bricolage text-foreground text-2xl font-semibold tracking-tight"
        >
          Related creations
        </h2>
        <Link
          href="/discover"
          className="group text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium transition-colors"
        >
          <span>Explore all</span>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <CreationGrid creations={related} priorityCount={0} />
    </section>
  )
}

async function MoreFromCreatorSection({
  creatorUsername,
  currentCreationId,
}: {
  creatorUsername: string
  currentCreationId: string
}) {
  const { data: creatorCards } = await discoverCards({
    creator_username: creatorUsername,
    limit: 5,
  })

  // Filter out the currently viewed creation
  const filtered = (creatorCards || [])
    .filter((c) => c.id !== currentCreationId)
    .slice(0, 4)

  if (filtered.length === 0) {
    return null
  }

  return (
    <section
      className="border-border space-y-6 border-t pt-10"
      aria-labelledby="more-creator-heading"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2
          id="more-creator-heading"
          className="font-bricolage text-foreground text-2xl font-semibold tracking-tight"
        >
          More from this creator
        </h2>
        <Link
          href={`/u/${creatorUsername}`}
          className="group text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium transition-colors"
        >
          <span>View profile</span>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <CreationGrid creations={filtered} priorityCount={0} />
    </section>
  )
}

export default async function CreationPage({ params }: CreationPageProps) {
  const { slug } = await params

  // ≤ 2 sequential DB round-trips: run creation and auth check in parallel
  const [creation, currentUser] = await Promise.all([
    getPublishedCreationBySlug(slug),
    getCurrentUser(),
  ])

  if (!creation) {
    notFound()
  }

  const isOwner = currentUser?.id === creation.creator_id

  // Non-published creations are only visible to their creator
  if (creation.status !== 'published' && !isOwner) {
    notFound()
  }

  // Pre-render markdown on server
  const descriptionNode = creation.description ? (
    <MarkdownView content={creation.description} />
  ) : null

  const stepBodyNodes: Record<string, React.ReactNode> = {}
  for (const step of creation.steps) {
    if (step.body) {
      stepBodyNodes[step.id] = <MarkdownView content={step.body} />
    }
  }

  // Fetch viewer engagement state (runs likes + saves in parallel; 0 DB queries if signed out)
  const engagementState = await getEngagementState(
    'creation',
    [creation.id],
    currentUser?.id
  )
  const initialLiked = engagementState.likedIds.includes(creation.id)
  const initialSaved = engagementState.savedIds.includes(creation.id)

  const pageDescription = buildCreationDescription({
    title: creation.title,
    summary: creation.summary,
    description: creation.description,
    creatorName: creation.creator?.display_name || creation.creator?.username,
    tools: creation.tools.map((t) => t.tool),
  })
  const jsonLd = buildCreationJsonLd(creation, pageDescription)

  const cookieStore = await cookies()
  const isJoinDismissed = cookieStore.get('genra_join_dismissed')?.value === '1'

  return (
    <>
      {/* Structured Data (JSON-LD) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdReplacer(jsonLd) }}
      />

      {/* View count tracker (only counts published creations, deduplicated by cookie) */}
      {creation.status === 'published' && (
        <ViewTracker creationId={creation.id} />
      )}

      <CreationView
        creation={creation}
        isOwner={isOwner}
        isSignedIn={Boolean(currentUser)}
        initialLiked={initialLiked}
        initialSaved={initialSaved}
        descriptionNode={descriptionNode}
        stepBodyNodes={stepBodyNodes}
      />

      {/* Discovery sections below main creation content */}
      <div className="mx-auto w-full max-w-5xl space-y-12 px-4 pb-20 sm:px-6">
        {!currentUser && !isJoinDismissed && <JoinCard />}

        <Suspense fallback={<CreationGridSkeleton count={4} />}>
          <RelatedCreationsSection creationId={creation.id} />
        </Suspense>

        {creation.creator?.username && (
          <Suspense fallback={<CreationGridSkeleton count={4} />}>
            <MoreFromCreatorSection
              creatorUsername={creation.creator.username}
              currentCreationId={creation.id}
            />
          </Suspense>
        )}
      </div>
    </>
  )
}

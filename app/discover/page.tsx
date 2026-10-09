import type { Metadata } from 'next'
import Link from 'next/link'
import {
  listCategories,
  popularTools,
  discoverCards,
} from '@/lib/data/creations'
import { parseDiscoverParams } from '@/lib/creations/filters'
import { DiscoverFilterBar } from '@/components/discover/discover-filter-bar'
import { CreationGrid } from '@/components/creations/creation-grid'
import { LoadMore } from '@/components/creations/load-more'
import { Button } from '@/components/ui/button'

import { getSiteUrl } from '@/lib/site'

export const revalidate = 60

interface DiscoverPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({
  searchParams,
}: DiscoverPageProps): Promise<Metadata> {
  const resolved = await searchParams
  const siteUrl = getSiteUrl()

  // Filter keys with actual non-empty values
  const activeKeys = Object.keys(resolved).filter((k) => {
    const val = resolved[k]
    return (
      val !== undefined &&
      val !== '' &&
      !(Array.isArray(val) && val.length === 0)
    )
  })

  const category =
    typeof resolved.category === 'string' && resolved.category.trim() !== ''
      ? resolved.category.trim()
      : undefined

  // Indexable only with no parameters OR only 'category'
  const isIndexable =
    activeKeys.length === 0 ||
    (activeKeys.length === 1 && activeKeys[0] === 'category')

  const canonicalUrl = category
    ? `${siteUrl}/discover?category=${encodeURIComponent(category)}`
    : `${siteUrl}/discover`

  const title = category
    ? `Discover ${category.charAt(0).toUpperCase() + category.slice(1)} AI Creations · Genra`
    : 'Discover AI Creations · Genra'

  return {
    title,
    description:
      'Explore creations made with AI tools, models, and workflows. Inspect real prompts and techniques.',
    alternates: {
      canonical: canonicalUrl,
    },
    robots: isIndexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
  }
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const resolvedParams = await searchParams
  const filters = parseDiscoverParams(resolvedParams)

  // Maximum 2 sequential DB round-trips: run all three parallel queries concurrently
  const [categories, popularToolsRes, cardsRes] = await Promise.all([
    listCategories(),
    popularTools(30),
    discoverCards({
      q: filters.q,
      category: filters.category,
      tool_slugs: filters.tools,
      sort: filters.sort,
      limit: 24,
      offset: 0,
    }),
  ])

  const creations = cardsRes.data
  const hasMore = cardsRes.hasMore
  const totalShown = creations.length

  const activeCategory = categories.find((c) => c.slug === filters.category)

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Sticky Filter Bar */}
      <DiscoverFilterBar
        categories={categories}
        popularToolsList={popularToolsRes.data}
        filters={filters}
      />

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 space-y-6">
        {/* Results Header / Summary */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h1 className="font-bricolage text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {filters.q
              ? `Results for “${filters.q}”`
              : activeCategory
              ? activeCategory.name
              : 'All Creations'}
          </h1>
          <p className="text-xs text-text-subtle tabular-nums">
            {totalShown === 0
              ? '0 creations'
              : `${totalShown}${hasMore ? '+' : ''} creations`}
          </p>
        </div>

        {/* Creation Grid with Empty State */}
        <CreationGrid
          creations={creations}
          priorityCount={8}
          emptyTitle="No creations match your search"
          emptyMessage="Try adjusting your keywords, removing specific tool filters, or selecting a different category."
          emptyAction={
            <Link href="/discover">
              <Button variant="secondary" size="sm" className="rounded-full">
                Clear all filters
              </Button>
            </Link>
          }
        />

        {/* Load More Pagination */}
        <LoadMore
          initialHasMore={hasMore}
          initialOffset={creations.length}
          params={{
            q: filters.q,
            category: filters.category,
            tool_slugs: filters.tools,
            sort: filters.sort,
          }}
          limit={24}
        />
      </div>
    </div>
  )
}

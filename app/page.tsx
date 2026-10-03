import { Suspense } from 'react'
import Link from 'next/link'
import {
  discoverCards,
  categoryCounts,
  popularTools,
} from '@/lib/data/creations'
import {
  CreationGrid,
  CreationGridSkeleton,
} from '@/components/creations/creation-grid'
import { HeroSearch } from '@/components/home/hero-search'
import { Skeleton } from '@/components/ui/skeleton'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon, SparklesIcon } from '@hugeicons/core-free-icons'

export const revalidate = 60 // Cache for 60 seconds

async function TrendingSection() {
  const { data: trending, error } = await discoverCards({
    sort: 'trending',
    limit: 8,
  })

  if (error || trending.length === 0) {
    return null
  }

  return (
    <section className="space-y-6" aria-labelledby="trending-heading">
      <div className="border-border flex items-center justify-between border-b pb-3">
        <div>
          <h2
            id="trending-heading"
            className="font-bricolage text-foreground text-2xl font-semibold tracking-tight"
          >
            Trending now
          </h2>
          <p className="text-text-subtle mt-1 text-sm">
            The most engaging AI creations in the community this week
          </p>
        </div>
        <Link
          href="/discover?sort=trending"
          className="group text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium transition-colors sm:text-sm"
        >
          <span>View all</span>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="size-4 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <CreationGrid creations={trending} priorityCount={4} />
    </section>
  )
}

async function NewCreationsSection() {
  const { data: newest, error } = await discoverCards({
    sort: 'new',
    limit: 8,
  })

  if (error || newest.length === 0) {
    return null
  }

  return (
    <section className="space-y-6" aria-labelledby="newest-heading">
      <div className="border-border flex items-center justify-between border-b pb-3">
        <div>
          <h2
            id="newest-heading"
            className="font-bricolage text-foreground text-2xl font-semibold tracking-tight"
          >
            Recently published
          </h2>
          <p className="text-text-subtle mt-1 text-sm">
            Fresh creations and new techniques shared by creators
          </p>
        </div>
        <Link
          href="/discover?sort=new"
          className="group text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium transition-colors sm:text-sm"
        >
          <span>View all</span>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="size-4 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <CreationGrid creations={newest} priorityCount={0} />
    </section>
  )
}

async function CategoriesGridSection() {
  const { data: categories } = await categoryCounts()

  if (!categories || categories.length === 0) {
    return null
  }

  return (
    <section className="space-y-6" aria-labelledby="categories-heading">
      <div className="border-border border-b pb-3">
        <h2
          id="categories-heading"
          className="font-bricolage text-foreground text-2xl font-semibold tracking-tight"
        >
          Explore by category
        </h2>
        <p className="text-text-subtle mt-1 text-sm">
          Find creations tailored to specific creative disciplines
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/discover?category=${encodeURIComponent(cat.slug)}`}
            className="group border-border bg-card hover:border-border-strong hover:bg-surface flex flex-col justify-between rounded-lg border p-4 transition-all duration-150"
          >
            <span className="text-foreground group-hover:text-foreground text-sm font-medium transition-colors">
              {cat.name}
            </span>
            <span className="text-text-subtle mt-2 text-xs tabular-nums">
              {cat.creation_count}{' '}
              {cat.creation_count === 1 ? 'creation' : 'creations'}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

async function PopularToolsSection() {
  const { data: tools } = await popularTools(24)

  if (!tools || tools.length === 0) {
    return null
  }

  return (
    <section className="space-y-6" aria-labelledby="tools-heading">
      <div className="border-border border-b pb-3">
        <h2
          id="tools-heading"
          className="font-bricolage text-foreground text-2xl font-semibold tracking-tight"
        >
          Popular AI tools
        </h2>
        <p className="text-text-subtle mt-1 text-sm">
          Browse creations created with your favorite models, tools, and editors
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tools.map((tool) => (
          <Link
            key={tool.slug}
            href={`/discover?tools=${encodeURIComponent(tool.slug)}`}
            className="border-border bg-card text-muted-foreground hover:border-border-strong hover:bg-secondary hover:text-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-normal transition-colors"
          >
            <span>{tool.name}</span>
            <span className="bg-surface-2 text-text-subtle rounded-full px-1.5 py-0.5 text-[10px] tabular-nums">
              {tool.creation_count}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

function SectionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="border-border border-b pb-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <CreationGridSkeleton count={8} />
    </div>
  )
}

export default async function HomePage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-16 px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center pt-4 pb-6 text-center sm:pt-8 sm:pb-10">
        <div className="border-border bg-surface-2 text-muted-foreground mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
          <HugeiconsIcon icon={SparklesIcon} className="text-brand size-3.5" />
          <span>The open discovery platform for AI creations</span>
        </div>

        <h1 className="font-bricolage text-foreground max-w-4xl text-4xl font-semibold tracking-tighter text-balance sm:text-5xl lg:text-6xl">
          Discover what creators build with AI
        </h1>

        <p className="text-text-subtle mt-4 max-w-2xl text-base text-pretty sm:text-lg">
          Browse real websites, apps, designs, videos, and workflows. Inspect
          the exact tools, prompts, and steps behind every output.
        </p>

        {/* Hero Search */}
        <div className="mt-8 flex w-full justify-center">
          <HeroSearch />
        </div>

        {/* Quick Suggestion Links */}
        <div className="text-text-subtle mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-muted-foreground">Try searching:</span>
          <Link
            href="/discover?category=websites-apps"
            className="border-border hover:bg-secondary hover:text-foreground rounded-full border px-2.5 py-1 transition-colors"
          >
            Websites
          </Link>
          <Link
            href="/discover?category=images-art"
            className="border-border hover:bg-secondary hover:text-foreground rounded-full border px-2.5 py-1 transition-colors"
          >
            Images
          </Link>
          <Link
            href="/discover?tools=midjourney"
            className="border-border hover:bg-secondary hover:text-foreground rounded-full border px-2.5 py-1 transition-colors"
          >
            Midjourney
          </Link>
          <Link
            href="/discover?tools=cursor"
            className="border-border hover:bg-secondary hover:text-foreground rounded-full border px-2.5 py-1 transition-colors"
          >
            Cursor
          </Link>
          <Link
            href="/discover?tools=chatgpt"
            className="border-border hover:bg-secondary hover:text-foreground rounded-full border px-2.5 py-1 transition-colors"
          >
            ChatGPT
          </Link>
        </div>
      </section>

      {/* Main Content Sections with independent Suspense boundaries */}
      <Suspense fallback={<SectionSkeleton />}>
        <TrendingSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <CategoriesGridSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <NewCreationsSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <PopularToolsSection />
      </Suspense>
    </div>
  )
}

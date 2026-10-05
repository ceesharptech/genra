import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  discoverCards,
  categoryCounts,
} from '@/lib/data/creations'
import {
  CreationGrid,
  CreationGridSkeleton,
} from '@/components/creations/creation-grid'
import { HeroSearch } from '@/components/home/hero-search'
import { HeroDynamicText } from '@/components/home/hero-dynamic-text'
import { Skeleton } from '@/components/ui/skeleton'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'

export const revalidate = 60 // Cache for 60 seconds

const CATEGORY_IMAGE_MAP: Record<string, string> = {
  websites: '/images/categories/websites.jpg',
  apps: '/images/categories/apps.jpg',
  images: '/images/categories/images.jpg',
  video: '/images/categories/video.jpg',
  agents: '/images/categories/agents.jpg',
  automations: '/images/categories/automations.jpg',
  design: '/images/categories/design.jpg',
  '3d': '/images/categories/3d.jpg',
  workflows: '/images/categories/automations.jpg',
  code: '/images/categories/websites.jpg',
}

async function TrendingSection() {
  const { data: trending, error } = await discoverCards({
    sort: 'trending',
    limit: 6,
  })

  if (error || trending.length === 0) {
    return null
  }

  return (
    <section className="space-y-6" aria-labelledby="trending-heading">
      <div className="flex items-center justify-between pb-1">
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

      <CreationGrid creations={trending} priorityCount={3} />
    </section>
  )
}

async function CategoriesGridSection() {
  const { data: categories } = await categoryCounts()

  if (!categories || categories.length === 0) {
    return null
  }

  // Filter for categories with custom visual artwork, limited to top 8
  const featured = categories
    .filter((cat) => CATEGORY_IMAGE_MAP[cat.slug])
    .slice(0, 8)

  return (
    <section className="space-y-6" aria-labelledby="categories-heading">
      <div className="flex items-center justify-between pb-1">
        <div>
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
        <Link
          href="/discover"
          className="group text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium transition-colors sm:text-sm"
        >
          <span>All categories</span>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="size-4 transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 sm:gap-3.5">
        {featured.map((cat) => {
          const imageSrc = CATEGORY_IMAGE_MAP[cat.slug]
          return (
            <Link
              key={cat.slug}
              href={`/discover?category=${encodeURIComponent(cat.slug)}`}
              className="group flex flex-col focus-visible:outline-none"
            >
              {/* Minimal High-Quality Preview Tile (Compact Size) */}
              <div className="bg-surface-2 ring-border/50 shadow-2xs relative aspect-[4/3] w-full overflow-hidden rounded-lg ring-1 transition-all duration-300 ease-out group-hover:scale-[1.03] group-hover:shadow-xs group-focus-visible:ring-2 group-focus-visible:ring-brand">
                {imageSrc && (
                  <Image
                    src={imageSrc}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 12vw"
                    className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                  />
                )}
                <div
                  className="pointer-events-none absolute inset-0 ring-1 ring-black/5 ring-inset dark:ring-white/10"
                  aria-hidden="true"
                />
              </div>

              {/* Title & Count beneath artwork */}
              <div className="mt-2 flex flex-col px-0.5">
                <span className="text-foreground group-hover:text-brand truncate text-xs font-semibold tracking-tight transition-colors">
                  {cat.name}
                </span>
                <span className="text-text-subtle text-[11px] tabular-nums">
                  {cat.creation_count}{' '}
                  {cat.creation_count === 1 ? 'creation' : 'creations'}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function SectionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="pb-1">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <CreationGridSkeleton count={6} />
    </div>
  )
}

export default async function HomePage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-16 px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center pt-4 pb-6 text-center sm:pt-8 sm:pb-10">
        {/* Eyebrow Pill with Overlapping 3D AI App Icons */}
        <div className="border-border bg-surface-2 text-muted-foreground mb-6 inline-flex items-center gap-2.5 rounded-full border py-1 pr-3.5 pl-1.5 text-xs shadow-2xs transition-colors">
          <div className="flex items-center -space-x-1.5">
            {[
              { src: '/images/ai-icons/claude-ai-logo.png', alt: 'Claude' },
              { src: '/images/ai-icons/chatgpt-ai-logo.png', alt: 'ChatGPT' },
              { src: '/images/ai-icons/gemini-ai-logo.png', alt: 'Gemini' },
              { src: '/images/ai-icons/grok-ai-logo.png', alt: 'Grok' },
            ].map((tool, idx) => (
              <div
                key={tool.alt}
                className="border-border/80 bg-card shadow-2xs hover:border-brand relative size-5 overflow-hidden rounded-[5px] border p-0.5 transition-all duration-200 ease-out hover:z-30 hover:scale-135 hover:shadow-sm"
                style={{ zIndex: 10 + idx }}
                title={tool.alt}
              >
                <Image
                  src={tool.src}
                  alt={tool.alt}
                  width={20}
                  height={20}
                  className="size-full object-contain"
                />
              </div>
            ))}
          </div>

          <span className="text-foreground/90 font-medium">
            The open discovery platform for AI creations
          </span>
        </div>

        <h1 className="font-bricolage text-foreground max-w-4xl text-4xl font-semibold tracking-tighter text-balance sm:text-5xl lg:text-6xl">
          Discover what creators are{' '}
          <HeroDynamicText />
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
            href="/discover?category=websites"
            className="border-border hover:bg-secondary hover:text-foreground rounded-full border px-2.5 py-1 transition-colors"
          >
            Websites
          </Link>
          <Link
            href="/discover?category=images"
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
    </div>
  )
}

import { Suspense } from 'react'
import { discoverCards, categoryCounts } from '@/lib/data/creations'
import {
  CreationGrid,
  CreationGridSkeleton,
} from '@/components/creations/creation-grid'
import { HeroSwappingIcon } from '@/components/home/hero-swapping-icon'
import { HeroCtaButtons } from '@/components/home/hero-cta-buttons'
import { TrendingSearch } from '@/components/home/trending-search'
import { CategoryShowcase } from '@/components/home/category-showcase'
import { Skeleton } from '@/components/ui/skeleton'

export const revalidate = 60 // Cache for 60 seconds

async function TrendingCreations() {
  const { data: trending, error } = await discoverCards({
    sort: 'trending',
    limit: 8,
  })

  if (error || !trending || trending.length === 0) {
    return null
  }

  return <CreationGrid creations={trending} priorityCount={4} />
}

async function CategoriesGridSection() {
  const { data: categories } = await categoryCounts()

  const categoryData = (categories || []).map((cat) => ({
    slug: cat.slug,
    name: cat.name,
    count: cat.creation_count,
  }))

  return (
    <section
      className="mt-18 space-y-8 sm:mt-16 sm:space-y-10 lg:mt-28"
      aria-labelledby="categories-heading"
    >
      <div className="text-center">
        <h2
          id="categories-heading"
          className="font-bricolage text-foreground text-3xl font-semibold tracking-tighter text-balance sm:text-4xl lg:text-5xl"
        >
          One library
          <br className="hidden sm:inline" /> for all your builds.
        </h2>
      </div>

      <CategoryShowcase categories={categoryData} />
    </section>
  )
}

function SectionSkeleton() {
  return (
    <div className="mt-10 space-y-8 sm:mt-16 sm:space-y-10 lg:mt-20">
      <div className="flex flex-col items-center justify-center text-center">
        <Skeleton className="h-10 w-72 sm:h-12 sm:w-96" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3.5">
            <Skeleton className="aspect-[4/3] w-full rounded-3xl sm:aspect-[16/11]" />
            <div className="flex flex-col items-center gap-1.5 pt-0.5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3.5 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function HomePage() {
  return (
    <div className="relative mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      {/* =========================================================================
          [EXPERIMENTAL] HERO GRADIENT CONTAINER
          To remove this container:
          1. Delete the outer <div> and its closing </div> tag (marked below).
          2. Change the inner <section> padding back to:
             "flex flex-col items-center justify-center pt-8 pb-10 text-center sm:pt-14 sm:pb-16 lg:pt-18 lg:pb-20"
          ========================================================================= */}
      <div className="border-border/70 via-background dark:via-background/90 relative overflow-hidden rounded-[24px] border bg-gradient-to-br from-[#F6F3FF]/70 to-[#EFF6FF]/70 p-6 py-28 shadow-2xs transition-colors sm:rounded-[32px] sm:p-12 sm:py-20 lg:p-16 lg:py-32 dark:border-white/[0.08] dark:from-[#774CFF]/[0.08] dark:to-[#3B82F6]/[0.06]">
        {/* Soft corner ambient blooms (soft sky blue top-right, soft brand lavender bottom-left) */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-[#DBEAFE]/80 blur-3xl dark:bg-[#3B82F6]/15"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 size-80 rounded-full bg-[#EAE3FF]/90 blur-3xl dark:bg-[#774CFF]/15"
          aria-hidden="true"
        />

        {/* Hero Section Content */}
        <section className="relative z-10 flex flex-col items-center justify-center text-center">
          <h1 className="font-bricolage text-foreground max-w-4xl text-4xl font-medium tracking-tighter text-balance sm:text-5xl lg:text-6xl">
            Discover what creators are building with AI <HeroSwappingIcon />
          </h1>

          <p className="text-muted-foreground mt-4 max-w-xl text-base font-normal text-pretty sm:mt-5 sm:text-lg">
            The open discovery platform for AI-made work. Browse creations,
            prompts, and the process.
          </p>

          <div className="mt-8 sm:mt-10">
            <HeroCtaButtons />
          </div>
        </section>
      </div>
      {/* === END [EXPERIMENTAL] HERO GRADIENT CONTAINER === */}

      {/* Trending Section: Search, Suggestions & Creations */}
      <section
        className="space-y-6 sm:space-y-7"
        aria-label="Trending Creations"
      >
        <TrendingSearch />

        <Suspense fallback={<CreationGridSkeleton count={8} />}>
          <TrendingCreations />
        </Suspense>
      </section>

      <Suspense fallback={<SectionSkeleton />}>
        <CategoriesGridSection />
      </Suspense>
    </div>
  )
}

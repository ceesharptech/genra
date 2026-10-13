import { Suspense } from 'react'
import { discoverCards, categoryCounts } from '@/lib/data/creations'
import { CreationGrid } from '@/components/creations/creation-grid'
import { HeroSection } from '@/components/home/hero-section'
import { TrendingSearch } from '@/components/home/trending-search'
import { CategoryShowcase } from '@/components/home/category-showcase'

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

function SpinnerFallback() {
  return (
    <div className="flex min-h-36 w-full items-center justify-center py-12">
      <div
        className="size-8 animate-spin rounded-full border-2 border-border border-t-foreground"
        role="status"
        aria-label="Loading content"
      />
    </div>
  )
}

export default async function HomePage() {
  return (
    <div className="relative mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <HeroSection />

      {/* Trending Section: Search, Suggestions & Creations (strictly no animation) */}
      <section
        className="space-y-6 sm:space-y-7"
        aria-label="Trending Creations"
      >
        <TrendingSearch />

        <Suspense fallback={<SpinnerFallback />}>
          <TrendingCreations />
        </Suspense>
      </section>

      <Suspense fallback={<SpinnerFallback />}>
        <CategoriesGridSection />
      </Suspense>
    </div>
  )
}

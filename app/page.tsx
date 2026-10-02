import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'

export const revalidate = 60 // Cache for 60 seconds

export default async function HomePage() {
  const supabase = await createClient()

  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name, slug, sort_order')
    .order('sort_order')

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero section */}
      <div className="max-w-3xl space-y-4">
        <div className="border-border bg-surface-2 text-subtle inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs">
          <span className="bg-brand size-2 animate-pulse rounded-full" />
          Phase 00 Foundation Active
        </div>
        <h1 className="text-foreground text-3xl leading-tight font-semibold tracking-tight sm:text-5xl">
          Discover what creators build with AI — and exactly how it was made.
        </h1>
        <p className="text-subtle max-w-2xl text-base leading-relaxed sm:text-lg">
          Genra connects outputs with their creative process: prompts, tools,
          workflows, and resources in one discoverable library.
        </p>
      </div>

      {/* Categories from Supabase */}
      <section className="mt-14 space-y-4" aria-labelledby="categories-heading">
        <div className="border-border flex items-center justify-between border-b pb-3">
          <h2
            id="categories-heading"
            className="text-subtle font-mono text-sm font-semibold tracking-wider uppercase"
          >
            Seeded Taxonomy Categories
          </h2>
          <span className="text-subtle font-mono text-xs">
            {categories?.length ?? 0} Categories from Database
          </span>
        </div>

        {error ? (
          <div className="border-destructive/20 bg-destructive-soft text-destructive rounded-lg border p-4 text-xs">
            Failed to load categories from database: {error.message}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-2">
            {categories?.map((cat) => (
              <Badge
                key={cat.id}
                variant="secondary"
                className="hover:border-border-strong cursor-default px-3 py-1 text-xs font-normal transition-colors"
              >
                {cat.name}
              </Badge>
            ))}
          </div>
        )}
      </section>

      {/* Foundation verification grid */}
      <section
        className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="System status"
      >
        <div className="border-border bg-card space-y-2 rounded-xl border p-5">
          <p className="text-subtle font-mono text-xs uppercase">Database</p>
          <p className="text-foreground text-sm font-medium">
            PostgreSQL 17 on Supabase
          </p>
          <p className="text-subtle text-xs">
            22 tables with Row-Level Security, triggers, and seed data.
          </p>
        </div>

        <div className="border-border bg-card space-y-2 rounded-xl border p-5">
          <p className="text-subtle font-mono text-xs uppercase">
            Design System
          </p>
          <p className="text-foreground text-sm font-medium">
            Monochrome + Brand #774CFF
          </p>
          <p className="text-subtle text-xs">
            Geist Sans & Mono, light by default, dark mode supported.
          </p>
        </div>

        <div className="border-border bg-card space-y-2 rounded-xl border p-5">
          <p className="text-subtle font-mono text-xs uppercase">
            Clients & Auth
          </p>
          <p className="text-foreground text-sm font-medium">
            Typed Supabase SSR
          </p>
          <p className="text-subtle text-xs">
            Cookie-based sessions with middleware auto-refresh.
          </p>
        </div>

        <div className="border-border bg-card space-y-2 rounded-xl border p-5">
          <p className="text-subtle font-mono text-xs uppercase">AI Seam</p>
          <p className="text-foreground text-sm font-medium">
            NoopEnrichment Provider
          </p>
          <p className="text-subtle text-xs">
            Clean extension point ready for post-MVP enrichment.
          </p>
        </div>
      </section>
    </div>
  )
}

import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { discoverResources } from '@/lib/data/library';
import { popularTools } from '@/lib/data/creations';
import { resourcesQuerySchema, type ResourcesQuery } from '@/lib/validation/library';
import { ResourcesFilterBar } from '@/components/library/resources-filter-bar';
import { ResourceGrid, ResourceGridSkeleton } from '@/components/library/resource-grid';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const q = typeof resolvedParams.q === 'string' ? resolvedParams.q.trim() : '';
  const kind = typeof resolvedParams.kind === 'string' ? resolvedParams.kind.trim() : '';
  const tool = typeof resolvedParams.tool === 'string' ? resolvedParams.tool.trim() : '';
  const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page, 10) : 1;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://genra.co';
  let canonicalUrl = `${siteUrl}/resources`;
  if (kind && !tool && !q) {
    canonicalUrl = `${siteUrl}/resources?kind=${encodeURIComponent(kind)}`;
  } else if (tool && !kind && !q) {
    canonicalUrl = `${siteUrl}/resources?tool=${encodeURIComponent(tool)}`;
  }

  const isFacetCombination = Boolean((kind && tool) || q || page > 1);
  const robots = isFacetCombination
    ? { index: false, follow: true }
    : { index: true, follow: true };

  const titlePrefix = kind ? `${kind.replace('_', ' ')} AI Resources` : (tool ? `${tool} Resources` : 'AI Resources & Tools');
  const title = `${titlePrefix} | Genra`;
  const description =
    'Guides, templates, datasets, UI kits, workflows and assets created and curated by the AI builder community. Learn and build faster.';

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Genra',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function ResourcesPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;

  const parsedQuery = resourcesQuerySchema.safeParse({
    q: resolvedParams.q,
    kind: resolvedParams.kind,
    tool: resolvedParams.tool,
    sort: resolvedParams.sort,
    page: resolvedParams.page,
  });

  const query: ResourcesQuery = parsedQuery.success
    ? parsedQuery.data
    : { q: '', tool: '', sort: 'popular', page: 1 };

  // Fetch resources and tools in parallel
  const [resourcesRes, toolsRes] = await Promise.all([
    discoverResources({
      q: query.q,
      kind: query.kind,
      toolSlug: query.tool,
      sort: query.sort,
      offset: 0,
      limit: 24,
    }),
    popularTools(40),
  ]);

  const items = resourcesRes.data;
  const tools = toolsRes.data;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Resources
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Guides, templates, datasets, and workflows curated by AI builders.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <ResourcesFilterBar popularTools={tools} filters={query} />

        {/* Resources Grid */}
        <Suspense fallback={<ResourceGridSkeleton count={9} />}>
          <ResourceGrid
            initialResources={items}
            queryParams={{
              q: query.q,
              kind: query.kind,
              toolSlug: query.tool,
              sort: query.sort,
            }}
            emptyTitle={
              query.q || query.kind || query.tool
                ? 'No matching resources found'
                : 'No resources yet'
            }
            emptyMessage={
              query.q || query.kind || query.tool
                ? 'Try clearing your filters or search terms to discover more resources.'
                : 'Be the first to share a tutorial, template, or guide with the Genra community.'
            }
          />
        </Suspense>
      </main>
    </div>
  );
}

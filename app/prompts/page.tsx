import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { discoverPrompts } from '@/lib/data/library';
import { popularTools } from '@/lib/data/creations';
import { promptsQuerySchema, type PromptsQuery } from '@/lib/validation/library';
import { PromptsFilterBar } from '@/components/library/prompts-filter-bar';
import { PromptGrid, PromptGridSkeleton } from '@/components/library/prompt-grid';

import { getSiteUrl } from '@/lib/site';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const resolvedParams = await searchParams;
  const q = typeof resolvedParams.q === 'string' ? resolvedParams.q.trim() : '';
  const tool = typeof resolvedParams.tool === 'string' ? resolvedParams.tool.trim() : '';
  const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page, 10) : 1;

  const siteUrl = getSiteUrl();
  const canonicalUrl = tool ? `${siteUrl}/prompts?tool=${encodeURIComponent(tool)}` : `${siteUrl}/prompts`;

  const isFacetCombination = Boolean(q || page > 1);
  const robots = isFacetCombination
    ? { index: false, follow: true }
    : { index: true, follow: true };

  const title = tool
    ? `${tool} Prompts — AI Prompts Library | Genra`
    : 'AI Prompts Library — Copy & Run AI Prompts | Genra';
  const description = tool
    ? `Browse, copy, and run tested prompts for ${tool}. Inspect parameters, system prompts, and see what creations were built with them.`
    : 'Discover tested, reusable prompts for leading AI models and workflows. Copy in one click, adapt to your needs, and build.';

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

export default async function PromptsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;

  const parsedQuery = promptsQuerySchema.safeParse({
    q: resolvedParams.q,
    tool: resolvedParams.tool,
    sort: resolvedParams.sort,
    page: resolvedParams.page,
  });

  const query: PromptsQuery = parsedQuery.success
    ? parsedQuery.data
    : { q: '', tool: '', sort: 'popular', page: 1 };

  // Fetch prompts and tools in parallel
  const [promptsRes, toolsRes] = await Promise.all([
    discoverPrompts({
      q: query.q,
      toolSlug: query.tool,
      sort: query.sort,
      offset: 0,
      limit: 24,
    }),
    popularTools(40),
  ]);

  const items = promptsRes.data;
  const tools = toolsRes.data;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Prompts
              </h1>
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                Tested, reusable prompts across top AI models and workflows. Copy, adapt, and run.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <PromptsFilterBar popularTools={tools} filters={query} />

        {/* Prompts Grid */}
        <Suspense fallback={<PromptGridSkeleton count={9} />}>
          <PromptGrid
            initialPrompts={items}
            queryParams={{
              q: query.q,
              toolSlug: query.tool,
              sort: query.sort,
            }}
            emptyTitle={query.q || query.tool ? 'No matching prompts found' : 'No prompts yet'}
            emptyMessage={
              query.q || query.tool
                ? 'Try clearing your search query or tool filter to discover more prompts.'
                : 'Be the first to share a prompt with the Genra community.'
            }
          />
        </Suspense>
      </main>
    </div>
  );
}

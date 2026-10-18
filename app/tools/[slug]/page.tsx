import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getToolPage, discoverPrompts, discoverResources } from '@/lib/data/library';
import { discoverCards } from '@/lib/data/creations';
import { getSiteUrl } from '@/lib/site';
import { CreationGrid, CreationGridSkeleton } from '@/components/creations/creation-grid';
import { PromptGrid, PromptGridSkeleton } from '@/components/library/prompt-grid';
import { ResourceGrid, ResourceGridSkeleton } from '@/components/library/resource-grid';
import { buttonVariants } from '@/components/ui/button';
import { buildToolJsonLd, safeJsonLdReplacer } from '@/lib/seo/json-ld';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AiSettingIcon,
  CheckmarkCircle02Icon,
  LinkSquare01Icon,
  Layers01Icon,
  DocumentCodeIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const res = await getToolPage(slug);
  const tool = res.data;

  if (!tool) {
    return {
      title: 'Tool Not Found · Genra',
      robots: { index: false, follow: false },
    };
  }

  // 404 for unverified tools with 0 creations
  if (!tool.is_verified && tool.published_creations_count === 0) {
    return {
      title: 'Tool Not Found · Genra',
      robots: { index: false, follow: false },
    };
  }

  const siteUrl = getSiteUrl();
  const tab = resolvedSearchParams.tab;
  const canonicalUrl = tab ? `${siteUrl}/tools/${slug}?tab=${encodeURIComponent(tab)}` : `${siteUrl}/tools/${slug}`;
  const ogImageUrl = `${siteUrl}/tools/${slug}/og`;

  const robots = tool.is_verified
    ? { index: true, follow: true }
    : { index: false, follow: true };

  const title = `${tool.name} — AI Creations, Prompts & Resources | Genra`;
  const description = `Explore creations, prompts, and resources built with ${tool.name}. See real workflows and learn how creators use it.`;

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
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: tool.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ToolDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { tab = 'creations' } = await searchParams;

  const res = await getToolPage(slug);
  const tool = res.data;

  if (!tool) {
    notFound();
  }

  // Unverified tool with 0 creations returns 404 per AGENTS.md
  if (!tool.is_verified && tool.published_creations_count === 0) {
    notFound();
  }

  const activeTab = tab === 'prompts' ? 'prompts' : tab === 'resources' ? 'resources' : 'creations';

  // Fetch active tab items
  const [creationsRes, promptsRes, resourcesRes] = await Promise.all([
    activeTab === 'creations'
      ? discoverCards({ tool_slugs: [slug], limit: 24, offset: 0 })
      : Promise.resolve({ data: [] }),
    activeTab === 'prompts'
      ? discoverPrompts({ toolSlug: slug, limit: 24, offset: 0 })
      : Promise.resolve({ data: [] }),
    activeTab === 'resources'
      ? discoverResources({ toolSlug: slug, limit: 24, offset: 0 })
      : Promise.resolve({ data: [] }),
  ]);

  const jsonLd = buildToolJsonLd(tool);

  return (
    <div className="min-h-screen bg-background">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdReplacer(jsonLd) }}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Tool Header */}
        <header className="rounded-2xl border border-border/70 bg-card p-6 shadow-2xs sm:p-8 space-y-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* Tool Logo */}
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-surface-2 p-2 shadow-2xs">
                {tool.logo_url ? (
                  <Image
                    src={tool.logo_url}
                    alt={tool.name}
                    width={44}
                    height={44}
                    className="size-10 object-contain rounded-lg"
                  />
                ) : (
                  <HugeiconsIcon icon={AiSettingIcon} className="size-7 text-muted-foreground" />
                )}
              </div>

              {/* Tool Info */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {tool.name}
                  </h1>
                  {tool.is_verified && (
                    <span
                      title="Verified AI Tool"
                      className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand dark:bg-brand-950/60 dark:text-brand-300"
                    >
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3" />
                      <span>Verified</span>
                    </span>
                  )}
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
                    {tool.kind.replace('_', ' ')}
                  </span>
                </div>

                {tool.vendor && (
                  <p className="text-xs text-muted-foreground">
                    by <span className="font-medium text-foreground">{tool.vendor}</span>
                  </p>
                )}
              </div>
            </div>

            {/* External website link */}
            {tool.website_url && (
              <div className="flex items-center">
                <a
                  href={tool.website_url}
                  target="_blank"
                  rel="nofollow ugc noopener"
                  className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5 shadow-2xs' })}
                >
                  <span>Visit website</span>
                  <HugeiconsIcon icon={LinkSquare01Icon} className="size-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* Related / Hierarchy Tools */}
          {(tool.parent || tool.children.length > 0 || tool.related_tools.length > 0) && (
            <div className="border-t border-border/40 pt-4 flex flex-wrap items-center gap-2 text-xs">
              {tool.parent && (
                <div className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span>Part of</span>
                  <Link
                    href={`/tools/${tool.parent.slug}`}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {tool.parent.name}
                  </Link>
                  <span className="text-border">·</span>
                </div>
              )}

              {tool.children.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground">Includes:</span>
                  {tool.children.map((ct) => (
                    <Link
                      key={ct.slug}
                      href={`/tools/${ct.slug}`}
                      className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <span>{ct.name}</span>
                    </Link>
                  ))}
                </div>
              )}

              {tool.related_tools.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground">Related:</span>
                  {tool.related_tools.map((rt) => (
                    <Link
                      key={rt.slug}
                      href={`/tools/${rt.slug}`}
                      className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <span>{rt.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </header>

        {/* Tab Navigation */}
        <div className="mt-8 mb-6 border-b border-border/60">
          <nav className="flex space-x-6" aria-label="Tabs">
            <Link
              href={`/tools/${slug}`}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors',
                activeTab === 'creations'
                  ? 'border-brand text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              <HugeiconsIcon icon={Layers01Icon} className="size-4" />
              <span>Creations</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                {tool.published_creations_count}
              </span>
            </Link>

            <Link
              href={`/tools/${slug}?tab=prompts`}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors',
                activeTab === 'prompts'
                  ? 'border-brand text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              <HugeiconsIcon icon={DocumentCodeIcon} className="size-4" />
              <span>Prompts</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                {tool.public_prompts_count}
              </span>
            </Link>

            <Link
              href={`/tools/${slug}?tab=resources`}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors',
                activeTab === 'resources'
                  ? 'border-brand text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              <HugeiconsIcon icon={AiSettingIcon} className="size-4" />
              <span>Resources</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                {tool.public_resources_count}
              </span>
            </Link>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'creations' && (
          <Suspense fallback={<CreationGridSkeleton count={6} />}>
            <CreationGrid
              creations={creationsRes.data}
              emptyTitle={`No creations made with ${tool.name} yet`}
              emptyMessage={`Be the first to publish a project built using ${tool.name}.`}
              emptyAction={
                <Link href="/new" className={buttonVariants({ size: 'sm' })}>
                  Publish a creation
                </Link>
              }
            />
          </Suspense>
        )}

        {activeTab === 'prompts' && (
          <Suspense fallback={<PromptGridSkeleton count={6} />}>
            <PromptGrid
              initialPrompts={promptsRes.data}
              queryParams={{ toolSlug: slug }}
              emptyTitle={`No prompts for ${tool.name} yet`}
              emptyMessage={`Share a tested prompt that works great with ${tool.name}.`}
              emptyAction={
                <Link href="/prompts/new" className={buttonVariants({ size: 'sm' })}>
                  Share a prompt
                </Link>
              }
            />
          </Suspense>
        )}

        {activeTab === 'resources' && (
          <Suspense fallback={<ResourceGridSkeleton count={6} />}>
            <ResourceGrid
              initialResources={resourcesRes.data}
              queryParams={{ toolSlug: slug }}
              emptyTitle={`No resources for ${tool.name} yet`}
              emptyMessage={`Share a guide, template, or workflow for ${tool.name}.`}
              emptyAction={
                <Link href="/resources/new" className={buttonVariants({ size: 'sm' })}>
                  Share a resource
                </Link>
              }
            />
          </Suspense>
        )}
      </main>
    </div>
  );
}

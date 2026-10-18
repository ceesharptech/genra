import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import { getResource, creationsUsingItem } from '@/lib/data/library';
import { getEngagementState } from '@/lib/data/engagement';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { LikeButton } from '@/components/engagement/like-button';
import { SaveButton } from '@/components/engagement/save-button';
import { ReportButton } from '@/components/moderation/report-button';
import { CreationGrid } from '@/components/creations/creation-grid';
import { MarkdownView } from '@/components/ui/markdown-view';
import { buildResourceJsonLd, safeJsonLdReplacer } from '@/lib/seo/json-ld';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AiSettingIcon,
  DocumentCodeIcon,
  Edit01Icon,
  Layers01Icon,
  LockIcon,
  ArrowLeft01Icon,
  LinkSquare01Icon,
  Link01Icon,
} from '@hugeicons/core-free-icons';

import { getSiteUrl } from '@/lib/site';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const res = await getResource(id);
  const resource = res.data;

  if (!resource) {
    return {
      title: 'Resource Not Found · Genra',
      robots: { index: false, follow: false },
    };
  }

  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/resources/${id}`;
  const ogImageUrl = `${siteUrl}/resources/${id}/og`;

  const toolName = resource.tool?.name ? ` for ${resource.tool.name}` : '';
  const title = `${resource.title} — AI Resource${toolName} | Genra`;
  const description =
    resource.description?.slice(0, 160).trim() ||
    `AI resource, guide, and workflow created by @${resource.author.username} on Genra.`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: resource.is_public ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Genra',
      type: 'article',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: resource.title,
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

export default async function ResourceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  const [resourceRes, creationsRes] = await Promise.all([
    getResource(id, user?.id),
    creationsUsingItem('resource', id, 12, 0),
  ]);

  const resource = resourceRes.data;
  if (!resource) {
    notFound();
  }

  const creations = creationsRes.data;
  const isAuthor = Boolean(user && user.id === resource.author.id);

  // Fetch engagement state if signed in
  const engagement = user
    ? await getEngagementState('resource', [resource.id], user.id)
    : { likedIds: [], savedIds: [] };

  const isLiked = engagement.likedIds.includes(resource.id);
  const isSaved = engagement.savedIds.includes(resource.id);

  const authorName = resource.author.display_name || resource.author.username;
  const initials = (authorName.charAt(0) || 'U').toUpperCase();

  const jsonLd = buildResourceJsonLd(resource);

  return (
    <div className="min-h-screen bg-background">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdReplacer(jsonLd) }}
      />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb / Back button */}
        <div className="mb-6">
          <Link
            href="/resources"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
            <span>Back to resources</span>
          </Link>
        </div>

        {/* Moderation Locked Notice */}
        {resource.moderation_locked && isAuthor && (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive flex items-start gap-2.5">
            <HugeiconsIcon icon={LockIcon} className="size-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-sm">Removed by moderators</p>
              <p className="text-destructive/90">
                This resource violated platform policies and cannot be published or shared.{' '}
                <Link href="/content-policy" className="underline font-semibold hover:text-foreground">
                  See Content Policy
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Header section */}
        <header className="space-y-4 border-b border-border/60 pb-6">
          {/* Top badges: kind, tool, private */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground capitalize">
              <HugeiconsIcon icon={DocumentCodeIcon} className="size-3.5 text-muted-foreground" />
              <span>{resource.kind.replace('_', ' ')}</span>
            </span>

            {resource.tool && (
              <Link
                href={`/tools/${resource.tool.slug}`}
                className="inline-flex items-center gap-1.5 rounded-md bg-muted/80 px-2.5 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <HugeiconsIcon icon={AiSettingIcon} className="size-3.5 text-muted-foreground" />
                <span>{resource.tool.name}</span>
              </Link>
            )}

            {!resource.is_public && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <HugeiconsIcon icon={LockIcon} className="size-3" />
                <span>Private</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {resource.title}
          </h1>

          {/* Description snippet */}
          {resource.description && (
            <p className="text-base leading-relaxed text-muted-foreground">
              {resource.description}
            </p>
          )}

          {/* Author row & Action buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
            <Link
              href={`/u/${resource.author.username}`}
              className="group flex items-center gap-3"
            >
              <Avatar className="size-9 ring-1 ring-border">
                {resource.author.avatar_url && (
                  <AvatarImage src={resource.author.avatar_url} alt={authorName} />
                )}
                <AvatarFallback className="bg-surface-2 text-xs font-medium text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground group-hover:underline">
                  {authorName}
                </p>
                <p className="text-xs text-muted-foreground">
                  @{resource.author.username}
                </p>
              </div>
            </Link>

            {/* Engagement and actions */}
            <div className="flex flex-wrap items-center gap-2">
              <LikeButton
                targetType="resource"
                targetId={resource.id}
                initialLiked={isLiked}
                initialCount={resource.like_count}
                isSignedIn={Boolean(user)}
              />

              <SaveButton
                targetType="resource"
                targetId={resource.id}
                initialSaved={isSaved}
                initialCount={resource.save_count}
                isSignedIn={Boolean(user)}
              />

              {resource.url && (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="nofollow ugc noopener"
                  className={buttonVariants({ variant: 'default', size: 'sm', className: 'gap-1.5 shadow-2xs' })}
                >
                  <span>Visit resource</span>
                  <HugeiconsIcon icon={LinkSquare01Icon} className="size-3.5" />
                </a>
              )}

              {!isAuthor && (
                <ReportButton
                  targetType="resource"
                  targetId={resource.id}
                  targetTitle={resource.title}
                  isSignedIn={Boolean(user)}
                />
              )}

              {isAuthor && (
                <Link
                  href={`/resources/${resource.id}/edit`}
                  className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5' })}
                >
                  <HugeiconsIcon icon={Edit01Icon} className="size-3.5" />
                  <span>Edit</span>
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* External Link Card if URL present */}
        {resource.url && (
          <div className="mt-8 rounded-xl border border-border/80 bg-surface-1 p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                  <HugeiconsIcon icon={Link01Icon} className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {resource.url}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    External link provided by creator
                  </p>
                </div>
              </div>

              <a
                href={resource.url}
                target="_blank"
                rel="nofollow ugc noopener"
                className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5 shrink-0' })}
              >
                <span>Open link</span>
                <HugeiconsIcon icon={LinkSquare01Icon} className="size-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Markdown Guide Body */}
        {resource.body && (
          <section className="mt-8 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Guide & Notes
            </h2>
            <div className="rounded-xl border border-border/80 bg-surface-1 p-6 shadow-2xs">
              <MarkdownView content={resource.body} />
            </div>
          </section>
        )}

        {/* Used in creations section */}
        <section className="mt-14 space-y-6">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Layers01Icon} className="size-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Used in creations
              </h2>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {creations.length} {creations.length === 1 ? 'creation' : 'creations'}
            </span>
          </div>

          <CreationGrid
            creations={creations}
            emptyTitle="Not linked to any creations yet"
            emptyMessage="When creators publish projects that reference this resource, they'll appear here."
          />
        </section>
      </main>
    </div>
  );
}

import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import { getCollectionPage } from '@/lib/data/collections';
import { CollectionItemCard } from '@/components/collections/collection-item-card';
import { CollectionSettingsDialog } from '@/components/collections/collection-settings-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ReportButton } from '@/components/moderation/report-button';
import { buildCollectionJsonLd, safeJsonLdReplacer } from '@/lib/seo/json-ld';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  Folder01Icon,
  LockIcon,
  Layers01Icon,
} from '@hugeicons/core-free-icons';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const res = await getCollectionPage(id);
  const collection = res.data;

  if (!collection) {
    return {
      title: 'Collection Not Found · Genra',
      robots: { index: false, follow: false },
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://genra.co';
  const canonicalUrl = `${siteUrl}/collections/${id}`;
  const ogImageUrl = `${siteUrl}/collections/${id}/og`;

  const title = `${collection.title} — Curated by @${collection.owner.username} | Genra`;
  const description =
    collection.description?.slice(0, 160).trim() ||
    `Curated collection of AI creations, prompts, and resources on Genra.`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: collection.is_public ? { index: true, follow: true } : { index: false, follow: false },
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
          alt: collection.title,
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

export default async function CollectionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  const res = await getCollectionPage(id, user?.id);
  const collection = res.data;

  if (!collection) {
    notFound();
  }

  const isOwner = Boolean(user && user.id === collection.owner.id);
  if (!collection.is_public && !isOwner) {
    notFound();
  }

  const ownerName = collection.owner.display_name || collection.owner.username;
  const initials = (ownerName.charAt(0) || 'U').toUpperCase();

  const jsonLd = buildCollectionJsonLd(collection);

  return (
    <div className="min-h-screen bg-background">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdReplacer(jsonLd) }}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <div className="mb-6">
          <Link
            href={`/u/${collection.owner.username}?tab=collections`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
            <span>@{collection.owner.username}&rsquo;s collections</span>
          </Link>
        </div>

        {/* Collection Header */}
        <header className="rounded-2xl border border-border/70 bg-card p-6 shadow-2xs sm:p-8 space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                  <HugeiconsIcon icon={Folder01Icon} className="size-3 text-muted-foreground" />
                  <span>Collection</span>
                </span>

                {!collection.is_public && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <HugeiconsIcon icon={LockIcon} className="size-3" />
                    <span>Private</span>
                  </span>
                )}

                <span className="text-xs text-muted-foreground tabular-nums">
                  {collection.item_count} {collection.item_count === 1 ? 'item' : 'items'}
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {collection.title}
              </h1>

              {collection.description && (
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {collection.description}
                </p>
              )}
            </div>

            {/* Owner Controls or Report button */}
            {isOwner ? (
              <div className="shrink-0">
                <CollectionSettingsDialog
                  collection={{
                    id: collection.id,
                    title: collection.title,
                    description: collection.description,
                    is_public: collection.is_public,
                    owner_username: collection.owner.username,
                  }}
                />
              </div>
            ) : (
              <div className="shrink-0">
                <ReportButton
                  targetType="collection"
                  targetId={collection.id}
                  targetTitle={collection.title}
                  isSignedIn={Boolean(user)}
                  variant="outline"
                  size="sm"
                  showLabel
                />
              </div>
            )}
          </div>

          {/* Curator profile link */}
          <div className="border-t border-border/40 pt-4">
            <Link
              href={`/u/${collection.owner.username}`}
              className="group inline-flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Avatar className="size-6 ring-1 ring-border">
                {collection.owner.avatar_url && (
                  <AvatarImage src={collection.owner.avatar_url} alt={ownerName} />
                )}
                <AvatarFallback className="bg-surface-2 text-[10px] font-medium text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span>
                Curated by <span className="font-medium text-foreground underline-offset-4 group-hover:underline">@{collection.owner.username}</span>
              </span>
            </Link>
          </div>
        </header>

        {/* Collection Items Grid */}
        <section className="mt-10 space-y-6">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Layers01Icon} className="size-4.5 text-muted-foreground" />
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Items in collection ({collection.items.length})
              </h2>
            </div>
          </div>

          {collection.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 px-4 text-center">
              <div className="rounded-full bg-surface-2 p-3 text-muted-foreground">
                <HugeiconsIcon icon={Folder01Icon} className="size-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-medium text-foreground">No items in this collection yet</h3>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                {isOwner
                  ? 'Browse creations, prompts, and resources across Genra and click "Save to collection" to add items here.'
                  : 'The curator has not added any items to this collection yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {collection.items.map((item) => (
                <CollectionItemCard
                  key={`${item.target_type}-${item.target_id}`}
                  item={item}
                  collectionId={collection.id}
                  isOwner={isOwner}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

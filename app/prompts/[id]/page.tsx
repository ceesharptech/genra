import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import { getPrompt, creationsUsingItem } from '@/lib/data/library';
import { getEngagementState } from '@/lib/data/engagement';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buttonVariants } from '@/components/ui/button';
import { LikeButton } from '@/components/engagement/like-button';
import { SaveButton } from '@/components/engagement/save-button';
import { CopyPromptButton } from '@/components/engagement/copy-prompt-button';
import { ForkPromptButton } from '@/components/library/fork-prompt-button';
import { CreationGrid } from '@/components/creations/creation-grid';
import { buildPromptJsonLd, safeJsonLdReplacer } from '@/lib/seo/json-ld';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AiSettingIcon,
  DocumentCodeIcon,
  Edit01Icon,
  GitForkIcon,
  Layers01Icon,
  LockIcon,
  ArrowLeft01Icon,
} from '@hugeicons/core-free-icons';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const res = await getPrompt(id);
  const prompt = res.data;

  if (!prompt) {
    return {
      title: 'Prompt Not Found · Genra',
      robots: { index: false, follow: false },
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://genra.co';
  const canonicalUrl = `${siteUrl}/prompts/${id}`;
  const ogImageUrl = `${siteUrl}/prompts/${id}/og`;

  const toolName = prompt.model_tool?.name ? ` for ${prompt.model_tool.name}` : '';
  const title = `${prompt.title} — AI Prompt${toolName} | Genra`;
  const description =
    prompt.body.slice(0, 160).replace(/\s+/g, ' ').trim() ||
    `Tested AI prompt created by @${prompt.author.username} on Genra.`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: prompt.is_public ? { index: true, follow: true } : { index: false, follow: false },
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
          alt: prompt.title,
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

export default async function PromptDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  const [promptRes, creationsRes] = await Promise.all([
    getPrompt(id, user?.id),
    creationsUsingItem('prompt', id, 12, 0),
  ]);

  const prompt = promptRes.data;
  if (!prompt) {
    notFound();
  }

  const creations = creationsRes.data;
  const isAuthor = Boolean(user && user.id === prompt.author.id);

  // Fetch engagement state if signed in
  const engagement = user
    ? await getEngagementState('prompt', [prompt.id], user.id)
    : { likedIds: [], savedIds: [] };

  const isLiked = engagement.likedIds.includes(prompt.id);
  const isSaved = engagement.savedIds.includes(prompt.id);

  const authorName = prompt.author.display_name || prompt.author.username;
  const initials = (authorName.charAt(0) || 'U').toUpperCase();

  const wordCount = prompt.body.trim().split(/\s+/).filter(Boolean).length;
  const charCount = prompt.body.length;

  const jsonLd = buildPromptJsonLd(prompt);

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
            href="/prompts"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
            <span>Back to prompts</span>
          </Link>
        </div>

        {/* Header section */}
        <header className="space-y-4 border-b border-border/60 pb-6">
          {/* Top badges: kind, tool, private */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground capitalize">
              <HugeiconsIcon icon={DocumentCodeIcon} className="size-3.5 text-muted-foreground" />
              <span>{prompt.kind} prompt</span>
            </span>

            {prompt.model_tool && (
              <Link
                href={`/tools/${prompt.model_tool.slug}`}
                className="inline-flex items-center gap-1.5 rounded-md bg-muted/80 px-2.5 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <HugeiconsIcon icon={AiSettingIcon} className="size-3.5 text-muted-foreground" />
                <span>{prompt.model_tool.name}</span>
              </Link>
            )}

            {!prompt.is_public && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <HugeiconsIcon icon={LockIcon} className="size-3" />
                <span>Private</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {prompt.title}
          </h1>

          {/* Fork parent banner if applicable */}
          {prompt.fork_parent && (
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <HugeiconsIcon icon={GitForkIcon} className="size-4 shrink-0 text-muted-foreground" />
              <span>
                Forked from{' '}
                <Link
                  href={`/prompts/${prompt.fork_parent.id}`}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {prompt.fork_parent.title}
                </Link>
                {prompt.fork_parent.author && (
                  <> by @{prompt.fork_parent.author.username}</>
                )}
              </span>
            </div>
          )}

          {/* Author row & Action buttons */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
            <Link
              href={`/u/${prompt.author.username}`}
              className="group flex items-center gap-3"
            >
              <Avatar className="size-9 ring-1 ring-border">
                {prompt.author.avatar_url && (
                  <AvatarImage src={prompt.author.avatar_url} alt={authorName} />
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
                  @{prompt.author.username}
                </p>
              </div>
            </Link>

            {/* Engagement and actions */}
            <div className="flex flex-wrap items-center gap-2">
              <LikeButton
                targetType="prompt"
                targetId={prompt.id}
                initialLiked={isLiked}
                initialCount={prompt.like_count}
                isSignedIn={Boolean(user)}
              />

              <SaveButton
                targetType="prompt"
                targetId={prompt.id}
                initialSaved={isSaved}
                initialCount={prompt.save_count}
                isSignedIn={Boolean(user)}
              />

              <ForkPromptButton
                promptId={prompt.id}
                isSignedIn={Boolean(user)}
              />

              {isAuthor && (
                <Link
                  href={`/prompts/${prompt.id}/edit`}
                  className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-1.5' })}
                >
                  <HugeiconsIcon icon={Edit01Icon} className="size-3.5" />
                  <span>Edit</span>
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Prompt Body Box */}
        <section className="mt-8 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-mono">
              {wordCount} words · {charCount} characters
            </span>
            <CopyPromptButton
              promptId={prompt.id}
              promptBody={prompt.body}
              isSignedIn={Boolean(user)}
              className="bg-card shadow-2xs border border-border/80 px-3 py-1.5"
            />
          </div>

          <div className="group relative overflow-hidden rounded-xl border border-border/80 bg-surface-1 p-5 shadow-2xs dark:bg-surface-2">
            <pre className="font-mono text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words select-text">
              {prompt.body}
            </pre>
          </div>
        </section>

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
            emptyMessage="When creators publish projects made with this prompt, they'll appear here."
          />
        </section>
      </main>
    </div>
  );
}

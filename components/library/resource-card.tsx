import React from 'react';
import Link from 'next/link';
import type { ResourceCardItem } from '@/lib/data/library';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  FavouriteIcon,
  Bookmark02Icon,
  Layers01Icon,
  Link01Icon,
  DocumentCodeIcon,
  AiSettingIcon,
} from '@hugeicons/core-free-icons';

interface ResourceCardProps {
  resource: ResourceCardItem;
}

function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(num);
}

function formatKindLabel(kind: string): string {
  return kind.replace('_', ' ');
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const authorName = resource.author_display_name || resource.author_username || 'Creator';
  const initials = (authorName.charAt(0) || 'U').toUpperCase();

  return (
    <article className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4.5 transition-all duration-200 hover:border-foreground/20 hover:shadow-sm">
      <div className="flex flex-col gap-3">
        {/* Header row: Kind badge + Tool chip + Link/Host indicator */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Kind badge (neutral, never color-coded per AGENTS.md) */}
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground capitalize">
              <HugeiconsIcon icon={DocumentCodeIcon} className="size-3 text-muted-foreground" />
              <span>{formatKindLabel(resource.kind)}</span>
            </span>

            {/* Tool chip if present */}
            {resource.tool_name && resource.tool_slug && (
              <Link
                href={`/tools/${resource.tool_slug}`}
                className="relative z-10 inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <HugeiconsIcon icon={AiSettingIcon} className="size-3" />
                <span>{resource.tool_name}</span>
              </Link>
            )}

            {/* Host badge */}
            {resource.url_host ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                <HugeiconsIcon icon={Link01Icon} className="size-2.5" />
                <span>{resource.url_host}</span>
              </span>
            ) : (
              <span className="inline-flex items-center rounded-md bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                Hosted guide
              </span>
            )}
          </div>

          {resource.used_in_count > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <HugeiconsIcon icon={Layers01Icon} className="size-3 text-muted-foreground" />
              <span>
                {resource.used_in_count} {resource.used_in_count === 1 ? 'creation' : 'creations'}
              </span>
            </span>
          )}
        </div>

        {/* Title (stretched-link pattern) */}
        <h3 className="text-sm font-semibold text-foreground leading-snug tracking-tight">
          <Link
            href={`/resources/${resource.id}`}
            className="focus-visible:ring-brand rounded-xs focus-visible:ring-2 focus-visible:outline-none after:absolute after:inset-0 after:content-['']"
          >
            {resource.title}
          </Link>
        </h3>

        {/* Description preview snippet */}
        {resource.description_preview && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {resource.description_preview}
          </p>
        )}
      </div>

      {/* Footer: Author & Metrics */}
      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
        <Link
          href={`/u/${resource.author_username}`}
          className="group/author relative z-10 flex min-w-0 items-center gap-2 rounded-xs focus-visible:ring-1 focus-visible:outline-none"
        >
          <Avatar className="size-5 shrink-0 ring-1 ring-border">
            {resource.author_avatar_url && (
              <AvatarImage src={resource.author_avatar_url} alt={authorName} />
            )}
            <AvatarFallback className="bg-surface-2 text-[10px] font-medium text-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-xs font-medium text-muted-foreground transition-colors group-hover/author:text-foreground">
            @{resource.author_username}
          </span>
        </Link>

        {/* Read-only metrics */}
        <div className="flex shrink-0 items-center gap-2.5 text-xs text-muted-foreground tabular-nums">
          <span className="inline-flex items-center gap-1" title={`${resource.like_count} likes`}>
            <HugeiconsIcon icon={FavouriteIcon} className="size-3.5 text-muted-foreground/80" />
            <span>{formatCompactNumber(resource.like_count)}</span>
          </span>
          <span className="inline-flex items-center gap-1" title={`${resource.save_count} saves`}>
            <HugeiconsIcon icon={Bookmark02Icon} className="size-3.5 text-muted-foreground/80" />
            <span>{formatCompactNumber(resource.save_count)}</span>
          </span>
        </div>
      </div>
    </article>
  );
}

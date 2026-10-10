import React from 'react';
import Link from 'next/link';
import type { PromptCardItem } from '@/lib/data/library';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  FavouriteIcon,
  Bookmark02Icon,
  Copy01Icon,
  Layers01Icon,
  GitForkIcon,
  AiSettingIcon,
} from '@hugeicons/core-free-icons';

interface PromptCardProps {
  prompt: PromptCardItem;
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

export function PromptCard({ prompt }: PromptCardProps) {
  const authorName = prompt.author_display_name || prompt.author_username || 'Creator';
  const initials = (authorName.charAt(0) || 'U').toUpperCase();

  return (
    <article className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4.5 transition-all duration-200 hover:border-foreground/20 hover:shadow-sm">
      <div className="flex flex-col gap-3">
        {/* Header row: Model chip / Kind badge + Fork badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {prompt.model_tool_name && prompt.model_tool_slug ? (
              <Link
                href={`/tools/${prompt.model_tool_slug}`}
                className="relative z-10 inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/80"
              >
                <HugeiconsIcon icon={AiSettingIcon} className="size-3 text-muted-foreground" />
                <span>{prompt.model_tool_name}</span>
              </Link>
            ) : (
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground uppercase">
                {prompt.kind}
              </span>
            )}

            {prompt.fork_of_id && (
              <span
                className="inline-flex items-center gap-0.5 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                title="Forked prompt"
              >
                <HugeiconsIcon icon={GitForkIcon} className="size-3" />
                <span>Fork</span>
              </span>
            )}
          </div>

          {prompt.used_in_count > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <HugeiconsIcon icon={Layers01Icon} className="size-3 text-muted-foreground" />
              <span>
                {prompt.used_in_count} {prompt.used_in_count === 1 ? 'creation' : 'creations'}
              </span>
            </span>
          )}
        </div>

        {/* Title (with stretched-link pattern) */}
        <h3 className="text-sm font-semibold text-foreground leading-snug tracking-tight">
          <Link
            href={`/prompts/${prompt.id}`}
            className="focus-visible:ring-brand rounded-xs focus-visible:ring-2 focus-visible:outline-none after:absolute after:inset-0 after:content-['']"
          >
            {prompt.title}
          </Link>
        </h3>

        {/* Mono 3-line body preview */}
        <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground line-clamp-3 select-none">
          {prompt.body_preview}
        </div>
      </div>

      {/* Footer: Author & Metrics */}
      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
        {/* Author row (relative z-10 so clicking author works independently) */}
        <Link
          href={`/u/${prompt.author_username}`}
          className="group/author relative z-10 flex min-w-0 items-center gap-2 rounded-xs focus-visible:ring-1 focus-visible:outline-none"
        >
          <Avatar className="size-5 shrink-0 ring-1 ring-border">
            {prompt.author_avatar_url && (
              <AvatarImage src={prompt.author_avatar_url} alt={authorName} />
            )}
            <AvatarFallback className="bg-surface-2 text-[10px] font-medium text-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-xs font-medium text-muted-foreground transition-colors group-hover/author:text-foreground">
            @{prompt.author_username}
          </span>
        </Link>

        {/* Read-only metrics */}
        <div className="flex shrink-0 items-center gap-2.5 text-xs text-muted-foreground tabular-nums">
          <span className="inline-flex items-center gap-1" title={`${prompt.like_count} likes`}>
            <HugeiconsIcon icon={FavouriteIcon} className="size-3.5 text-muted-foreground/80" />
            <span>{formatCompactNumber(prompt.like_count)}</span>
          </span>
          <span className="inline-flex items-center gap-1" title={`${prompt.save_count} saves`}>
            <HugeiconsIcon icon={Bookmark02Icon} className="size-3.5 text-muted-foreground/80" />
            <span>{formatCompactNumber(prompt.save_count)}</span>
          </span>
          <span className="inline-flex items-center gap-1" title={`${prompt.copy_count} copies`}>
            <HugeiconsIcon icon={Copy01Icon} className="size-3.5 text-muted-foreground/80" />
            <span>{formatCompactNumber(prompt.copy_count)}</span>
          </span>
        </div>
      </div>
    </article>
  );
}

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { CreationCardItem } from '@/lib/data/creations'
import { getMediaUrl } from '@/lib/data/media'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  FavouriteIcon,
  Comment01Icon,
  AiSettingIcon,
} from '@hugeicons/core-free-icons'

interface CreationCardProps {
  creation: CreationCardItem
  priority?: boolean
}

export function CreationCard({ creation, priority = false }: CreationCardProps) {
  const coverUrl = getMediaUrl(creation.cover_storage_path)
  const creatorName =
    creation.creator_display_name || creation.creator_username || 'Creator'
  const initials = (creatorName.charAt(0) || 'U').toUpperCase()

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all duration-150 hover:border-border-strong">
      {/* 4:3 Cover Media */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2">
        {coverUrl ? (
          <>
            <Image
              src={coverUrl}
              alt={creation.cover_alt || creation.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw"
              className="object-cover transition-transform duration-150 ease-out group-hover:scale-[1.02] motion-reduce:group-hover:scale-100"
              priority={priority}
            />
            {/* Subtle inner border to prevent bleed on light backgrounds */}
            <div
              className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/5 dark:ring-white/10"
              aria-hidden="true"
            />
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-text-subtle">
            <div className="rounded-full bg-surface p-2.5">
              <HugeiconsIcon icon={AiSettingIcon} className="size-5 text-text-subtle" />
            </div>
            <span className="mt-2 text-xs text-text-subtle">
              {creation.category_name || 'AI Creation'}
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col justify-between gap-3 p-3.5">
        <div className="space-y-2">
          {/* Title with stretched link */}
          <h3 className="line-clamp-2 text-sm font-medium tracking-tight text-foreground transition-colors">
            <Link
              href={`/c/${creation.slug}`}
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand after:absolute after:inset-0 after:z-0"
            >
              {creation.title}
            </Link>
          </h3>

          {/* Tool Chips (Z-10 to be clickable above stretched link) */}
          {creation.tools && creation.tools.length > 0 && (
            <div className="relative z-10 flex flex-wrap items-center gap-1">
              {creation.tools.slice(0, 3).map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/discover?tools=${encodeURIComponent(tool.slug)}`}
                  className="inline-flex items-center rounded-sm border border-border bg-secondary/60 px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
                >
                  {tool.name}
                </Link>
              ))}
              {creation.tool_count > 3 && (
                <span className="inline-flex items-center rounded-sm border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] text-text-subtle">
                  +{creation.tool_count - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Creator Row and Read-Only Stats (Z-10) */}
        <div className="relative z-10 flex items-center justify-between border-t border-border/50 pt-2 text-xs text-text-subtle">
          <Link
            href={`/u/${creation.creator_username}`}
            className="flex min-w-0 items-center gap-1.5 rounded-sm py-0.5 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
          >
            <Avatar className="size-5 shrink-0">
              {creation.creator_avatar_url && (
                <AvatarImage src={creation.creator_avatar_url} alt={creatorName} />
              )}
              <AvatarFallback className="bg-surface-2 text-[10px]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs font-normal text-muted-foreground hover:text-foreground">
              {creatorName}
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2.5 tabular-nums text-text-subtle">
            <span
              className="inline-flex items-center gap-1 text-[11px]"
              title={`${creation.like_count} likes`}
            >
              <HugeiconsIcon icon={FavouriteIcon} className="size-3.5 text-muted-foreground" />
              <span>{creation.like_count}</span>
            </span>
            <span
              className="inline-flex items-center gap-1 text-[11px]"
              title={`${creation.comment_count} comments`}
            >
              <HugeiconsIcon icon={Comment01Icon} className="size-3.5 text-muted-foreground" />
              <span>{creation.comment_count}</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

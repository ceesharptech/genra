import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { CreationCardItem } from '@/lib/data/creations'
import { getMediaUrl } from '@/lib/data/media'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  FavouriteIcon,
  EyeIcon,
  AiSettingIcon,
} from '@hugeicons/core-free-icons'

interface CreationCardProps {
  creation: CreationCardItem
  priority?: boolean
}

function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  }
  return String(num)
}

export function CreationCard({
  creation,
  priority = false,
}: CreationCardProps) {
  const coverUrl = getMediaUrl(creation.cover_storage_path)
  const creatorName =
    creation.creator_display_name || creation.creator_username || 'Creator'
  const initials = (creatorName.charAt(0) || 'U').toUpperCase()
  const primaryTool = creation.tools?.[0]

  return (
    <article className="group relative flex flex-col">
      {/* 4:3 Cover Media Thumbnail */}
      <div className="bg-surface-2 relative aspect-[4/3] w-full overflow-hidden rounded-xl shadow-xs transition-shadow duration-200 group-hover:shadow-md">
        <Link
          href={`/c/${creation.slug}`}
          className="focus-visible:ring-brand absolute inset-0 z-0 block focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label={creation.title}
        >
          {coverUrl ? (
            <>
              <Image
                src={coverUrl}
                alt={creation.cover_alt || creation.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw"
                className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
                priority={priority}
              />
              {/* Subtle inner border to prevent bleed on light backgrounds */}
              <div
                className="pointer-events-none absolute inset-0 ring-1 ring-black/5 ring-inset dark:ring-white/10"
                aria-hidden="true"
              />
            </>
          ) : (
            <div className="text-text-subtle flex h-full w-full flex-col items-center justify-center p-6 text-center">
              <div className="bg-surface rounded-full p-2.5">
                <HugeiconsIcon
                  icon={AiSettingIcon}
                  className="text-text-subtle size-5"
                />
              </div>
              <span className="text-text-subtle mt-2 text-xs">
                {creation.category_name || 'AI Creation'}
              </span>
            </div>
          )}

          {/* Hover Overlay with Title and Tags (Desktop hover, visible on focus/touch) */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3.5 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
            <p className="line-clamp-1 text-sm font-semibold tracking-tight text-white drop-shadow-xs">
              {creation.title}
            </p>
            {primaryTool && (
              <p className="mt-0.5 text-[11px] font-normal text-white/80">
                Created with {primaryTool.name}
              </p>
            )}
          </div>
        </Link>
      </div>

      {/* Creator & Stats Row beneath Media (Referencing Dribbble Layout) */}
      <div className="mt-2.5 flex items-center justify-between px-0.5">
        {/* Creator Info */}
        <Link
          href={`/u/${creation.creator_username}`}
          className="group/creator focus-visible:ring-brand flex min-w-0 items-center gap-2 rounded-sm focus-visible:ring-1 focus-visible:outline-none"
        >
          <Avatar className="ring-border size-5.5 shrink-0 ring-1">
            {creation.creator_avatar_url && (
              <AvatarImage
                src={creation.creator_avatar_url}
                alt={creatorName}
              />
            )}
            <AvatarFallback className="bg-surface-2 text-foreground text-[10px] font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-foreground truncate text-xs font-medium group-hover/creator:underline">
            {creatorName}
          </span>
          <span className="bg-secondary text-muted-foreground rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase">
            {primaryTool ? primaryTool.name : 'CREATOR'}
          </span>
        </Link>

        {/* Engagement Stats (Likes + Views) */}
        <div className="text-text-subtle flex shrink-0 items-center gap-3 tabular-nums">
          <span
            className="hover:text-foreground inline-flex items-center gap-1 text-[11px] font-medium transition-colors"
            title={`${creation.like_count} likes`}
          >
            <HugeiconsIcon
              icon={FavouriteIcon}
              className="text-muted-foreground size-3.5"
            />
            <span>{formatCompactNumber(creation.like_count)}</span>
          </span>
          <span
            className="hover:text-foreground inline-flex items-center gap-1 text-[11px] font-medium transition-colors"
            title={`${creation.view_count} views`}
          >
            <HugeiconsIcon
              icon={EyeIcon}
              className="text-muted-foreground size-3.5"
            />
            <span>{formatCompactNumber(creation.view_count)}</span>
          </span>
        </div>
      </div>
    </article>
  )
}

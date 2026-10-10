import React from 'react';
import Link from 'next/link';
import type { UserCollectionCard } from '@/lib/data/collections';
import { HugeiconsIcon } from '@hugeicons/react';
import { Folder01Icon, LockIcon, Layers01Icon } from '@hugeicons/core-free-icons';

interface CollectionCardProps {
  collection: UserCollectionCard;
}

export function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <article className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-5 transition-all duration-200 hover:border-foreground/20 hover:shadow-sm">
      <div className="space-y-3">
        {/* Header row: folder icon + private badge + item count */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-surface-2 p-2 text-muted-foreground group-hover:text-foreground transition-colors">
              <HugeiconsIcon icon={Folder01Icon} className="size-4" />
            </div>
            {!collection.is_public && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                <HugeiconsIcon icon={LockIcon} className="size-2.5" />
                <span>Private</span>
              </span>
            )}
          </div>

          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground tabular-nums">
            <HugeiconsIcon icon={Layers01Icon} className="size-3 text-muted-foreground" />
            <span>{collection.item_count} {collection.item_count === 1 ? 'item' : 'items'}</span>
          </span>
        </div>

        {/* Title (stretched link) */}
        <h3 className="text-base font-semibold text-foreground tracking-tight line-clamp-1">
          <Link
            href={`/collections/${collection.id}`}
            className="focus-visible:ring-brand rounded-xs focus-visible:ring-2 focus-visible:outline-none after:absolute after:inset-0 after:content-['']"
          >
            {collection.title}
          </Link>
        </h3>

        {/* Description */}
        {collection.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {collection.description}
          </p>
        )}
      </div>

      {/* Footer: Curator username */}
      <div className="mt-4 border-t border-border/40 pt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>@{collection.owner_username}</span>
        <span>
          Updated {new Date(collection.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </article>
  );
}

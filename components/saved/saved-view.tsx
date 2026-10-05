'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import type { CreationCardItem } from '@/lib/data/creations';
import { loadMoreSavedAction } from '@/lib/engagement/actions';
import { CreationCard } from '@/components/creations/creation-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Bookmark02Icon,
  Compass01Icon,
  AlertCircleIcon,
  RefreshIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface SavedViewProps {
  initialCreations: CreationCardItem[];
  initialHasMore: boolean;
  error?: string | null;
}

export function SavedView({
  initialCreations,
  initialHasMore,
  error: initialError = null,
}: SavedViewProps) {
  const [items, setItems] = useState<CreationCardItem[]>([]);
  const [offset, setOffset] = useState(initialCreations.length);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(initialError);

  const allCreations = [...initialCreations, ...items];

  const handleLoadMore = () => {
    if (isPending || !hasMore) return;

    startTransition(async () => {
      try {
        const result = await loadMoreSavedAction(offset);
        if (result.error) {
          toast.error(result.error);
          return;
        }

        setItems((prev) => [...prev, ...result.data]);
        setOffset((prev) => prev + result.data.length);
        setHasMore(result.hasMore);
      } catch (err) {
        console.error('Failed to load more saved creations:', err);
        toast.error('Failed to load more saved creations');
      }
    });
  };

  // Error State
  if (error && allCreations.length === 0) {
    return (
      <div className="border-border/80 bg-card mx-auto max-w-lg rounded-2xl border p-8 text-center shadow-xs">
        <div className="bg-destructive/10 text-destructive mx-auto mb-4 flex size-12 items-center justify-center rounded-full">
          <HugeiconsIcon icon={AlertCircleIcon} className="size-6" />
        </div>
        <h2 className="font-bricolage text-foreground text-lg font-semibold tracking-tight">
          Unable to load saved creations
        </h2>
        <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
          {error}
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setError(null);
            window.location.reload();
          }}
          className="mt-5 gap-1.5 rounded-full"
        >
          <HugeiconsIcon icon={RefreshIcon} className="size-3.5" />
          <span>Try again</span>
        </Button>
      </div>
    );
  }

  // Empty State
  if (allCreations.length === 0) {
    return (
      <div className="border-border/60 bg-card/60 mx-auto max-w-md rounded-2xl border p-10 text-center shadow-xs">
        <div className="bg-surface-2 text-muted-foreground mx-auto mb-5 flex size-14 items-center justify-center rounded-full ring-1 ring-black/5 dark:ring-white/10">
          <HugeiconsIcon icon={Bookmark02Icon} className="size-6 stroke-[1.5]" />
        </div>
        <h2 className="font-bricolage text-foreground text-xl font-semibold tracking-tight">
          Nothing saved yet
        </h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-xs text-xs leading-relaxed">
          When you find creations you want to revisit or learn from, click the bookmark icon to save them here.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/discover"
            className={cn(
              buttonVariants({ variant: 'default', size: 'md' }),
              'gap-2 rounded-full px-5 font-medium'
            )}
          >
            <HugeiconsIcon icon={Compass01Icon} className="size-4" />
            <span>Explore creations</span>
          </Link>
        </div>
      </div>
    );
  }

  // Grid of Saved Creations with Load More
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {allCreations.map((creation, index) => (
          <CreationCard
            key={creation.id}
            creation={creation}
            priority={index < 3}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="secondary"
            size="md"
            loading={isPending}
            onClick={handleLoadMore}
            className="min-w-36 rounded-full font-medium"
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

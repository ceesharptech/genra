'use client';

import React, { useState, useTransition } from 'react';
import type { ResourceCardItem } from '@/lib/data/library';
import type { ResourceKind } from '@/lib/validation/library';
import { ResourceCard } from './resource-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { HugeiconsIcon } from '@hugeicons/react';
import { AiSearch01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { loadMoreResourcesAction } from '@/lib/library/actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ResourceGridProps {
  initialResources: ResourceCardItem[];
  queryParams?: {
    q?: string;
    kind?: ResourceKind;
    toolSlug?: string;
    sort?: 'popular' | 'new';
    authorUsername?: string;
  };
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  className?: string;
}

export function ResourceGrid({
  initialResources,
  queryParams,
  emptyTitle = 'No resources found',
  emptyMessage = 'Try adjusting your search terms or filters to find resources.',
  emptyAction,
  className,
}: ResourceGridProps) {
  const [resources, setResources] = useState<ResourceCardItem[]>(initialResources);
  const [offset, setOffset] = useState<number>(initialResources.length);
  const [hasMore, setHasMore] = useState<boolean>(initialResources.length >= 24);
  const [isPending, startTransition] = useTransition();

  const [prevInitialResources, setPrevInitialResources] = useState(initialResources);
  if (initialResources !== prevInitialResources) {
    setPrevInitialResources(initialResources);
    setResources(initialResources);
    setOffset(initialResources.length);
    setHasMore(initialResources.length >= 24);
  }

  const handleLoadMore = () => {
    startTransition(async () => {
      try {
        const nextItems = await loadMoreResourcesAction({
          ...queryParams,
          offset,
          limit: 24,
        });

        if (nextItems.length === 0) {
          setHasMore(false);
          return;
        }

        setResources((prev) => [...prev, ...nextItems]);
        setOffset((prev) => prev + nextItems.length);
        if (nextItems.length < 24) {
          setHasMore(false);
        }
      } catch (err) {
        console.error('Failed to load more resources:', err);
        toast.error('Failed to load more resources. Please try again.');
      }
    });
  };

  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 px-4 text-center">
        <div className="rounded-full bg-surface-2 p-3 text-muted-foreground">
          <HugeiconsIcon icon={AiSearch01Icon} className="size-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-base font-medium text-foreground">{emptyTitle}</h3>
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{emptyMessage}</p>
        {emptyAction && <div className="mt-5">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className={cn('grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3', className)}>
        {resources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="default"
            onClick={handleLoadMore}
            disabled={isPending}
            className="gap-2 rounded-full border-border/80 px-6 font-medium shadow-2xs hover:bg-muted"
          >
            {isPending ? (
              <span className="inline-flex items-center gap-2">
                <span className="size-3.5 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
                <span>Loading...</span>
              </span>
            ) : (
              <>
                <span>Load more resources</span>
                <HugeiconsIcon icon={ArrowDown01Icon} className="size-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export function ResourceGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-4.5 space-y-4"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
              <Skeleton className="h-4 w-14" />
            </div>
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex items-center justify-between border-t border-border/40 pt-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-3.5 w-20" />
            </div>
            <Skeleton className="h-3.5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

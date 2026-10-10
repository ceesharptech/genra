'use client';

import React, { useTransition } from 'react';
import type { CollectionItemEntry } from '@/lib/data/collections';
import type { CreationCardItem } from '@/lib/data/creations';
import type { PromptCardItem, ResourceCardItem } from '@/lib/data/library';
import { CreationCard } from '@/components/creations/creation-card';
import { PromptCard } from '@/components/library/prompt-card';
import { ResourceCard } from '@/components/library/resource-card';
import { removeCollectionItemAction } from '@/lib/collections/actions';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon, Loading03Icon, NoteIcon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

interface CollectionItemCardProps {
  item: CollectionItemEntry;
  collectionId: string;
  isOwner: boolean;
}

export function CollectionItemCard({ item, collectionId, isOwner }: CollectionItemCardProps) {
  const [isRemoving, startTransition] = useTransition();

  const handleRemove = () => {
    startTransition(async () => {
      try {
        const res = await removeCollectionItemAction({
          collectionId,
          targetType: item.target_type,
          targetId: item.target_id,
        });

        if (!res.ok) {
          toast.error(res.error || 'Failed to remove item');
          return;
        }

        toast.success('Item removed from collection');
      } catch (err) {
        console.error('Failed to remove collection item:', err);
        toast.error('An unexpected error occurred');
      }
    });
  };

  return (
    <div className="group/item relative flex flex-col justify-between rounded-xl">
      <div className="flex-1">
        {item.target_type === 'creation' && (
          <CreationCard creation={item.card as CreationCardItem} />
        )}
        {item.target_type === 'prompt' && (
          <PromptCard prompt={item.card as PromptCardItem} />
        )}
        {item.target_type === 'resource' && (
          <ResourceCard resource={item.card as ResourceCardItem} />
        )}
      </div>

      {/* Curator Note if provided */}
      {item.note && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <HugeiconsIcon icon={NoteIcon} className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
          <p className="line-clamp-2 leading-relaxed">
            <span className="font-medium text-foreground">Curator note:</span> {item.note}
          </p>
        </div>
      )}

      {/* Owner remove item button */}
      {isOwner && (
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={isRemoving}
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1 opacity-80 group-hover/item:opacity-100 transition-opacity"
          >
            {isRemoving ? (
              <HugeiconsIcon icon={Loading03Icon} className="size-3 animate-spin" />
            ) : (
              <HugeiconsIcon icon={Delete02Icon} className="size-3" />
            )}
            <span>Remove</span>
          </Button>
        </div>
      )}
    </div>
  );
}

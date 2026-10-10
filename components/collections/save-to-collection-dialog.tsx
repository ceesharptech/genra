'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Folder01Icon,
  FolderAddIcon,
  Tick02Icon,
  Loading03Icon,
  LockIcon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import {
  getMyCollectionsForItemAction,
  addCollectionItemAction,
  removeCollectionItemAction,
  quickCreateCollectionAndAddAction,
} from '@/lib/collections/actions';
import type { CollectionItemTargetType } from '@/lib/validation/library';
import type { MyCollectionItemRow } from '@/lib/data/collections';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SaveToCollectionDialogProps {
  targetType: CollectionItemTargetType;
  targetId: string;
  isSignedIn: boolean;
  trigger?: React.ReactElement;
  className?: string;
}

export function SaveToCollectionDialog({
  targetType,
  targetId,
  isSignedIn,
  trigger,
  className,
}: SaveToCollectionDialogProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [collections, setCollections] = useState<MyCollectionItemRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, startCreateTransition] = useTransition();

  // Quick create state
  const [newTitle, setNewTitle] = useState('');
  const [isNewPublic, setIsNewPublic] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchCollections = async () => {
    setIsLoading(true);
    try {
      const res = await getMyCollectionsForItemAction(targetType, targetId);
      if (res.ok && res.data) {
        setCollections(res.data);
      }
    } catch (err) {
      console.error('Failed to load collections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open && !isSignedIn) {
      const targetUrl = pathname || '/';
      router.push(`/login?next=${encodeURIComponent(targetUrl)}`);
      return;
    }
    setIsOpen(open);
    if (open) {
      fetchCollections();
    }
  };

  const handleToggleCollection = async (item: MyCollectionItemRow) => {
    const isCurrentlyIn = item.contains_item;

    // Optimistic toggle
    setCollections((prev) =>
      prev.map((c) =>
        c.id === item.id
          ? {
              ...c,
              contains_item: !isCurrentlyIn,
              item_count: isCurrentlyIn ? c.item_count - 1 : c.item_count + 1,
            }
          : c
      )
    );

    try {
      if (isCurrentlyIn) {
        const res = await removeCollectionItemAction({
          collectionId: item.id,
          targetType,
          targetId,
        });
        if (!res.ok) {
          toast.error(res.error || 'Failed to remove from collection');
          fetchCollections();
          return;
        }
        toast.success(`Removed from ${item.title}`);
      } else {
        const res = await addCollectionItemAction({
          collectionId: item.id,
          targetType,
          targetId,
        });
        if (!res.ok) {
          toast.error(res.error || 'Failed to add to collection');
          fetchCollections();
          return;
        }
        toast.success(`Added to ${item.title}`);
      }
    } catch (err) {
      console.error('Collection toggle error:', err);
      toast.error('An unexpected error occurred');
      fetchCollections();
    }
  };

  const handleQuickCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    startCreateTransition(async () => {
      try {
        const res = await quickCreateCollectionAndAddAction({
          title: newTitle.trim(),
          is_public: isNewPublic,
          targetType,
          targetId,
        });

        if (!res.ok) {
          toast.error(res.error || 'Failed to create collection');
          return;
        }

        toast.success(`Created collection and added item!`);
        setNewTitle('');
        setShowCreateForm(false);
        fetchCollections();
      } catch (err) {
        console.error('Quick create collection error:', err);
        toast.error('Failed to create collection');
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger
          aria-label="Save to collection"
          className={cn(
            'group relative inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border/80 bg-surface-1 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-150 select-none cursor-pointer hover:border-border hover:bg-surface-2 hover:text-foreground',
            className
          )}
        >
          <HugeiconsIcon icon={Folder01Icon} className="size-3.5" />
          <span>Collection</span>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-md p-5">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Save to collection</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Curate this {targetType} in your collections. Max 50 collections, 200 items each.
          </DialogDescription>
        </DialogHeader>

        {/* Collections List */}
        <div className="py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <HugeiconsIcon icon={Loading03Icon} className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : collections.length === 0 && !showCreateForm ? (
            <div className="rounded-xl border border-dashed border-border py-6 px-4 text-center">
              <HugeiconsIcon icon={Folder01Icon} className="mx-auto size-7 text-muted-foreground/60" />
              <p className="mt-2 text-xs font-medium text-foreground">No collections yet</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Create your first collection below to start curating.
              </p>
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
              {collections.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleToggleCollection(item)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg p-2.5 text-left text-xs transition-colors hover:bg-muted',
                    item.contains_item && 'bg-muted/60 font-medium'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <HugeiconsIcon
                      icon={item.is_public ? ViewIcon : LockIcon}
                      className="size-3.5 shrink-0 text-muted-foreground"
                    />
                    <div className="truncate">
                      <span className="truncate text-foreground">{item.title}</span>
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        {item.item_count} {item.item_count === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded border transition-colors',
                      item.contains_item
                        ? 'border-brand bg-brand text-background'
                        : 'border-border/80 bg-background'
                    )}
                  >
                    {item.contains_item && <HugeiconsIcon icon={Tick02Icon} className="size-3" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Create Section */}
        <div className="border-t border-border/40 pt-3">
          {!showCreateForm ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreateForm(true)}
              className="w-full gap-1.5 h-8 text-xs font-normal"
            >
              <HugeiconsIcon icon={FolderAddIcon} className="size-3.5" />
              <span>Create new collection</span>
            </Button>
          ) : (
            <form onSubmit={handleQuickCreate} className="space-y-3">
              <Input
                type="text"
                placeholder="Collection name (e.g. LLM Agents)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                maxLength={80}
                autoFocus
                className="h-8 text-xs"
              />

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground select-none">
                  <input
                    type="checkbox"
                    checked={isNewPublic}
                    onChange={(e) => setIsNewPublic(e.target.checked)}
                    className="rounded border-border accent-brand"
                  />
                  <span>Public collection</span>
                </label>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateForm(false)}
                    className="h-7 px-2 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isCreating || !newTitle.trim()}
                    className="h-7 px-3 text-xs gap-1"
                  >
                    {isCreating && (
                      <HugeiconsIcon icon={Loading03Icon} className="size-3 animate-spin" />
                    )}
                    <span>Create & add</span>
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

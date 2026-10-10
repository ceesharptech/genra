'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Settings01Icon,
  Delete02Icon,
  Loading03Icon,
  LockIcon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { updateCollectionAction, deleteCollectionAction } from '@/lib/collections/actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CollectionSettingsDialogProps {
  collection: {
    id: string;
    title: string;
    description: string | null;
    is_public: boolean;
    owner_username: string;
  };
}

export function CollectionSettingsDialog({ collection }: CollectionSettingsDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [title, setTitle] = useState(collection.title);
  const [description, setDescription] = useState(collection.description || '');
  const [isPublic, setIsPublic] = useState(collection.is_public);

  const [isPending, startTransition] = useTransition();

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateCollectionAction({
          id: collection.id,
          title: title.trim(),
          description: description.trim() || null,
          is_public: isPublic,
        });

        if (!res.ok) {
          toast.error(res.error || 'Failed to update collection');
          return;
        }

        toast.success('Collection updated');
        setIsOpen(false);
      } catch (err) {
        console.error('Update collection error:', err);
        toast.error('An unexpected error occurred');
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const res = await deleteCollectionAction(collection.id);
        if (!res.ok) {
          toast.error(res.error || 'Failed to delete collection');
          return;
        }

        toast.success('Collection deleted');
        router.push(`/u/${collection.owner_username}?tab=collections`);
      } catch (err) {
        console.error('Delete collection error:', err);
        toast.error('Failed to delete collection');
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'gap-1.5 shadow-2xs cursor-pointer'
        )}
      >
        <HugeiconsIcon icon={Settings01Icon} className="size-3.5" />
        <span>Edit collection</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md p-5">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Collection settings</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update collection title, description, or visibility.
          </DialogDescription>
        </DialogHeader>

        {!isDeleting ? (
          <form onSubmit={handleUpdate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="col-title" className="text-xs font-medium">Title</Label>
              <Input
                id="col-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="col-desc" className="text-xs font-medium">Description (optional)</Label>
              <Textarea
                id="col-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                rows={3}
                className="text-xs"
              />
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border/70 p-3 bg-surface-1">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <HugeiconsIcon
                    icon={isPublic ? ViewIcon : LockIcon}
                    className="size-3.5 text-muted-foreground"
                  />
                  <span>{isPublic ? 'Public collection' : 'Private collection'}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {isPublic ? 'Visible to anyone with the link and on your profile.' : 'Only visible to you.'}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                onClick={() => setIsPublic((prev) => !prev)}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
                  isPublic ? 'bg-brand' : 'bg-muted'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block size-4 transform rounded-full bg-background shadow-lg transition duration-200 ease-in-out',
                    isPublic ? 'translate-x-4' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            <DialogFooter className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleting(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs gap-1"
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                <span>Delete</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
                  {isPending && <HugeiconsIcon icon={Loading03Icon} className="size-3 animate-spin" />}
                  <span>Save</span>
                </Button>
              </div>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-foreground">&ldquo;{collection.title}&rdquo;</span>? This will permanently remove the collection and cannot be undone. Items within the collection will not be deleted.
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDeleting(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
                className="gap-1.5"
              >
                {isPending && <HugeiconsIcon icon={Loading03Icon} className="size-3 animate-spin" />}
                <span>Delete collection</span>
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

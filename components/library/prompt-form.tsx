'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  createPromptAction,
  updatePromptAction,
  deletePromptAction,
} from '@/lib/library/actions';
import { promptKindEnum, type PromptKind } from '@/lib/validation/library';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AiSettingIcon,
  ArrowDown01Icon,
  Cancel01Icon,
  Delete02Icon,
  InformationCircleIcon,
  Loading03Icon,
  LockIcon,
  Tick02Icon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

interface PromptFormProps {
  initialData?: {
    id?: string;
    title: string;
    body: string;
    kind: PromptKind;
    model_tool_id: number | null;
    is_public: boolean;
    used_in_count?: number;
  };
  availableTools: Array<{ id: number; name: string; slug: string }>;
}

export function PromptForm({ initialData, availableTools }: PromptFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const isEditing = Boolean(initialData?.id);
  const usedInCount = initialData?.used_in_count ?? 0;

  const [title, setTitle] = useState(initialData?.title || '');
  const [body, setBody] = useState(initialData?.body || '');
  const [kind, setKind] = useState<PromptKind>(initialData?.kind || 'text');
  const [toolId, setToolId] = useState<number | null>(initialData?.model_tool_id ?? null);
  const [isPublic, setIsPublic] = useState(initialData?.is_public ?? true);

  // Tool search inside selector
  const [toolQuery, setToolQuery] = useState('');
  const [isToolMenuOpen, setIsToolMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const filteredTools = availableTools.filter((t) =>
    t.name.toLowerCase().includes(toolQuery.toLowerCase())
  );
  const selectedTool = availableTools.find((t) => t.id === toolId);

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const charCount = body.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (title.trim().length < 2) {
      toast.error('Title must be at least 2 characters');
      return;
    }
    if (body.trim().length < 3) {
      toast.error('Prompt body must be at least 3 characters');
      return;
    }

    startTransition(async () => {
      try {
        if (isEditing && initialData?.id) {
          const res = await updatePromptAction({
            id: initialData.id,
            title: title.trim(),
            body: body.trim(),
            kind,
            model_tool_id: toolId,
            is_public: isPublic,
          });

          if (!res.ok || !res.data) {
            toast.error(res.error || 'Failed to update prompt');
            return;
          }

          toast.success('Prompt updated successfully');
          router.push(`/prompts/${res.data.id}`);
        } else {
          const res = await createPromptAction({
            title: title.trim(),
            body: body.trim(),
            kind,
            model_tool_id: toolId,
            is_public: isPublic,
          });

          if (!res.ok || !res.data) {
            toast.error(res.error || 'Failed to create prompt');
            return;
          }

          toast.success('Prompt created successfully');
          router.push(`/prompts/${res.data.id}`);
        }
      } catch (err) {
        console.error('Prompt form submission error:', err);
        toast.error('An unexpected error occurred');
      }
    });
  };

  const handleDelete = () => {
    if (!initialData?.id) return;

    startDeleteTransition(async () => {
      try {
        const res = await deletePromptAction(initialData.id!);
        if (!res.ok) {
          toast.error(res.error || 'Failed to delete prompt');
          return;
        }

        toast.success('Prompt deleted');
        router.push('/prompts');
      } catch (err) {
        console.error('Prompt delete error:', err);
        toast.error('Failed to delete prompt');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Notice if editing an item linked in creations */}
      {isEditing && (
        <div className="rounded-xl border border-border/80 bg-surface-1 p-4 text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <HugeiconsIcon icon={InformationCircleIcon} className="size-4 text-muted-foreground" />
            <span>Changes apply everywhere</span>
          </div>
          <p className="leading-relaxed">
            {usedInCount > 0
              ? `This prompt is currently linked in ${usedInCount} ${usedInCount === 1 ? 'creation' : 'creations'}. Any edits to its title or text will immediately reflect on all referencing creations.`
              : 'This prompt will be updated across your profile and any creations that link to it.'}
          </p>
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="prompt-title" className="text-xs font-medium text-foreground">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="prompt-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Master system prompt for TypeScript refactoring"
          maxLength={140}
          required
          className="h-10 text-sm"
        />
        <div className="flex justify-end text-[11px] text-muted-foreground">
          <span>{title.length}/140</span>
        </div>
      </div>

      {/* Row: Kind & Model/Tool */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Kind */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground">Prompt kind</Label>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: 'outline', size: 'default' }),
                'w-full justify-between h-10 px-3 text-xs font-normal cursor-pointer'
              )}
            >
              <span className="capitalize">{kind} prompt</span>
              <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {promptKindEnum.options.map((k) => (
                <DropdownMenuItem
                  key={k}
                  onClick={() => setKind(k)}
                  className="flex items-center justify-between text-xs capitalize"
                >
                  <span>{k}</span>
                  {kind === k && <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Model/Tool selector */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground">Model or tool</Label>
          <DropdownMenu open={isToolMenuOpen} onOpenChange={setIsToolMenuOpen}>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: 'outline', size: 'default' }),
                'w-full justify-between h-10 px-3 text-xs font-normal cursor-pointer'
              )}
            >
              <span className="flex items-center gap-1.5 truncate">
                <HugeiconsIcon icon={AiSettingIcon} className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{selectedTool ? selectedTool.name : 'Select model / tool (optional)'}</span>
              </span>
              <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5 text-muted-foreground shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-2">
              <input
                type="text"
                placeholder="Search tools..."
                value={toolQuery}
                onChange={(e) => setToolQuery(e.target.value)}
                className="focus-visible:ring-brand mb-2 h-8 w-full rounded-md border border-border/60 bg-muted/40 px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:outline-none"
              />
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {toolId !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setToolId(null);
                      setIsToolMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <span>None / clear tool</span>
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                  </button>
                )}
                {filteredTools.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setToolId(t.id);
                      setIsToolMenuOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted',
                      toolId === t.id && 'bg-muted/80 font-medium text-foreground'
                    )}
                  >
                    <span className="truncate">{t.name}</span>
                    {toolId === t.id && (
                      <HugeiconsIcon icon={Tick02Icon} className="size-3 text-foreground" />
                    )}
                  </button>
                ))}
                {filteredTools.length === 0 && (
                  <div className="py-2 text-center text-xs text-muted-foreground">
                    No tools found
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Body textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="prompt-body" className="text-xs font-medium text-foreground">
            Prompt text <span className="text-destructive">*</span>
          </Label>
          <span className="text-[11px] text-muted-foreground">
            {wordCount} words · {charCount}/20,000 chars
          </span>
        </div>
        <Textarea
          id="prompt-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Paste or write your full prompt here..."
          maxLength={20000}
          rows={12}
          required
          className="font-mono text-xs leading-relaxed"
        />
      </div>

      {/* Visibility Toggle */}
      <div className="rounded-xl border border-border/80 bg-surface-1 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <HugeiconsIcon
                icon={isPublic ? ViewIcon : LockIcon}
                className="size-4 text-muted-foreground"
              />
              <span>{isPublic ? 'Public prompt' : 'Private prompt'}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isPublic
                ? 'Visible on your profile, in the prompts library, and searchable across Genra.'
                : 'Only visible to you. Creations linking to this prompt will display a muted fallback to visitors.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            onClick={() => setIsPublic((prev) => !prev)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isPublic ? 'bg-brand' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block size-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out',
                isPublic ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border/40">
        <div>
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
              <span>Delete prompt</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={isEditing ? `/prompts/${initialData?.id}` : '/prompts'}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            Cancel
          </Link>

          <Button type="submit" size="sm" disabled={isPending} className="gap-1.5 px-4 font-medium">
            {isPending && <HugeiconsIcon icon={Loading03Icon} className="size-3.5 animate-spin" />}
            <span>{isEditing ? (isPending ? 'Saving...' : 'Save changes') : (isPending ? 'Creating...' : 'Create prompt')}</span>
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {isEditing && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete prompt?</DialogTitle>
              <DialogDescription className="space-y-2 pt-2">
                <span>Are you sure you want to delete &ldquo;{title}&rdquo;?</span>
                {usedInCount > 0 && (
                  <span className="block text-amber-600 dark:text-amber-400 font-medium">
                    This prompt is linked in {usedInCount} {usedInCount === 1 ? 'creation' : 'creations'}. Deleting it will mark it as &ldquo;no longer available&rdquo; on all referencing creations.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gap-1.5"
              >
                {isDeleting && <HugeiconsIcon icon={Loading03Icon} className="size-3.5 animate-spin" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete prompt'}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </form>
  );
}

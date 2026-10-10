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
  createResourceAction,
  updateResourceAction,
  deleteResourceAction,
} from '@/lib/library/actions';
import { resourceKindEnum, type ResourceKind } from '@/lib/validation/library';
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
  Link01Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

interface ResourceFormProps {
  initialData?: {
    id?: string;
    title: string;
    description: string | null;
    kind: ResourceKind;
    url: string | null;
    body: string | null;
    tool_id: number | null;
    is_public: boolean;
    used_in_count?: number;
  };
  availableTools: Array<{ id: number; name: string; slug: string }>;
}

const KIND_LABELS: Record<ResourceKind, string> = {
  skill: 'Skill',
  template: 'Template',
  ui_kit: 'UI kit',
  workflow: 'Workflow',
  agent: 'Agent',
  mcp_server: 'MCP server',
  reference: 'Reference',
  tutorial: 'Tutorial',
  dataset: 'Dataset',
  asset: 'Asset',
  other: 'Other',
};

export function ResourceForm({ initialData, availableTools }: ResourceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const isEditing = Boolean(initialData?.id);
  const usedInCount = initialData?.used_in_count ?? 0;

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [kind, setKind] = useState<ResourceKind>(initialData?.kind || 'other');
  const [url, setUrl] = useState(initialData?.url || '');
  const [body, setBody] = useState(initialData?.body || '');
  const [toolId, setToolId] = useState<number | null>(initialData?.tool_id ?? null);
  const [isPublic, setIsPublic] = useState(initialData?.is_public ?? true);

  // Tool search inside selector
  const [toolQuery, setToolQuery] = useState('');
  const [isToolMenuOpen, setIsToolMenuOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const filteredTools = availableTools.filter((t) =>
    t.name.toLowerCase().includes(toolQuery.toLowerCase())
  );
  const selectedTool = availableTools.find((t) => t.id === toolId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (title.trim().length < 2) {
      toast.error('Title must be at least 2 characters');
      return;
    }

    const hasUrl = Boolean(url.trim().length > 0);
    const hasBody = Boolean(body.trim().length > 0);

    if (!hasUrl && !hasBody) {
      toast.error('Please provide either an external link URL or markdown notes/guide (or both).');
      return;
    }

    if (hasUrl && !/^https?:\/\/.+/i.test(url.trim())) {
      toast.error('URL must start with http:// or https://');
      return;
    }

    startTransition(async () => {
      try {
        if (isEditing && initialData?.id) {
          const res = await updateResourceAction({
            id: initialData.id,
            title: title.trim(),
            description: description.trim() || null,
            kind,
            url: url.trim() || null,
            body: body.trim() || null,
            tool_id: toolId,
            is_public: isPublic,
          });

          if (!res.ok || !res.data) {
            toast.error(res.error || 'Failed to update resource');
            return;
          }

          toast.success('Resource updated successfully');
          router.push(`/resources/${res.data.id}`);
        } else {
          const res = await createResourceAction({
            title: title.trim(),
            description: description.trim() || null,
            kind,
            url: url.trim() || null,
            body: body.trim() || null,
            tool_id: toolId,
            is_public: isPublic,
          });

          if (!res.ok || !res.data) {
            toast.error(res.error || 'Failed to create resource');
            return;
          }

          toast.success('Resource created successfully');
          router.push(`/resources/${res.data.id}`);
        }
      } catch (err) {
        console.error('Resource form submission error:', err);
        toast.error('An unexpected error occurred');
      }
    });
  };

  const handleDelete = () => {
    if (!initialData?.id) return;

    startDeleteTransition(async () => {
      try {
        const res = await deleteResourceAction(initialData.id!);
        if (!res.ok) {
          toast.error(res.error || 'Failed to delete resource');
          return;
        }

        toast.success('Resource deleted');
        router.push('/resources');
      } catch (err) {
        console.error('Resource delete error:', err);
        toast.error('Failed to delete resource');
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
              ? `This resource is currently linked in ${usedInCount} ${usedInCount === 1 ? 'creation' : 'creations'}. Any edits will immediately reflect on all referencing creations.`
              : 'This resource will be updated across your profile and any creations that link to it.'}
          </p>
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="resource-title" className="text-xs font-medium text-foreground">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="resource-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Next.js App Router AI Boilerplate"
          maxLength={140}
          required
          className="h-10 text-sm"
        />
        <div className="flex justify-end text-[11px] text-muted-foreground">
          <span>{title.length}/140</span>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="resource-desc" className="text-xs font-medium text-foreground">
          Summary description (optional)
        </Label>
        <Textarea
          id="resource-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief overview of what this resource is and how it helps builders..."
          maxLength={500}
          rows={3}
          className="text-xs leading-relaxed"
        />
        <div className="flex justify-end text-[11px] text-muted-foreground">
          <span>{description.length}/500</span>
        </div>
      </div>

      {/* Row: Kind & Tool */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Kind */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground">Resource kind</Label>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: 'outline', size: 'default' }),
                'w-full justify-between h-10 px-3 text-xs font-normal cursor-pointer'
              )}
            >
              <span>{KIND_LABELS[kind]}</span>
              <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-60 overflow-y-auto">
              {resourceKindEnum.options.map((k) => (
                <DropdownMenuItem
                  key={k}
                  onClick={() => setKind(k)}
                  className="flex items-center justify-between text-xs"
                >
                  <span>{KIND_LABELS[k]}</span>
                  {kind === k && <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tool selector */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-foreground">Associated tool</Label>
          <DropdownMenu open={isToolMenuOpen} onOpenChange={setIsToolMenuOpen}>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: 'outline', size: 'default' }),
                'w-full justify-between h-10 px-3 text-xs font-normal cursor-pointer'
              )}
            >
              <span className="flex items-center gap-1.5 truncate">
                <HugeiconsIcon icon={AiSettingIcon} className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{selectedTool ? selectedTool.name : 'Select tool (optional)'}</span>
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

      {/* External URL */}
      <div className="space-y-2">
        <Label htmlFor="resource-url" className="text-xs font-medium text-foreground">
          External URL link (optional)
        </Label>
        <div className="relative">
          <HugeiconsIcon
            icon={Link01Icon}
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="resource-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/... or https://..."
            className="pl-9 h-10 text-xs"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Link to GitHub repo, documentation site, Figma kit, or tool page.
        </p>
      </div>

      {/* Markdown Guide/Body */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="resource-body" className="text-xs font-medium text-foreground">
            Markdown notes or hosted guide (optional)
          </Label>
          <span className="text-[11px] text-muted-foreground">
            {body.length}/20,000 chars
          </span>
        </div>
        <Textarea
          id="resource-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write setup instructions, usage tips, markdown tables, or code snippets..."
          maxLength={20000}
          rows={8}
          className="font-mono text-xs leading-relaxed"
        />
        <p className="text-[11px] text-muted-foreground">
          Note: At least one of External URL or Markdown notes is required.
        </p>
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
              <span>{isPublic ? 'Public resource' : 'Private resource'}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isPublic
                ? 'Visible on your profile, in the resources library, and searchable across Genra.'
                : 'Only visible to you. Creations referencing this resource will display a muted fallback to visitors.'}
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
              <span>Delete resource</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={isEditing ? `/resources/${initialData?.id}` : '/resources'}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            Cancel
          </Link>

          <Button type="submit" size="sm" disabled={isPending} className="gap-1.5 px-4 font-medium">
            {isPending && <HugeiconsIcon icon={Loading03Icon} className="size-3.5 animate-spin" />}
            <span>{isEditing ? (isPending ? 'Saving...' : 'Save changes') : (isPending ? 'Creating...' : 'Create resource')}</span>
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {isEditing && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete resource?</DialogTitle>
              <DialogDescription className="space-y-2 pt-2">
                <span>Are you sure you want to delete &ldquo;{title}&rdquo;?</span>
                {usedInCount > 0 && (
                  <span className="block text-amber-600 dark:text-amber-400 font-medium">
                    This resource is linked in {usedInCount} {usedInCount === 1 ? 'creation' : 'creations'}. Deleting it will mark it as &ldquo;no longer available&rdquo; on all referencing creations.
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
                <span>{isDeleting ? 'Deleting...' : 'Delete resource'}</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </form>
  );
}

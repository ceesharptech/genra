'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CheckmarkCircle02Icon,
  ArrowReloadHorizontalIcon,
  Search01Icon,
  Edit01Icon,
  GitForkIcon,
  Globe02Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  getAdminUnverifiedToolsAction,
  verifyToolAction,
  updateToolAction,
  mergeToolsAction,
  type UnverifiedToolItem,
} from '@/lib/actions/admin';
import {
  toolKindLabels,
  type ToolKind,
} from '@/lib/validation/moderation';
import { cn } from '@/lib/utils';

export function AdminToolsView({ initialTools }: { initialTools?: UnverifiedToolItem[] }) {
  const [tools, setTools] = React.useState<UnverifiedToolItem[]>(initialTools || []);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Edit dialog state
  const [editingTool, setEditingTool] = React.useState<UnverifiedToolItem | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editKind, setEditKind] = React.useState<ToolKind>('ai_app');
  const [editVendor, setEditVendor] = React.useState('');
  const [editWebsiteUrl, setEditWebsiteUrl] = React.useState('');
  const [editLogoUrl, setEditLogoUrl] = React.useState('');

  // Merge dialog state
  const [mergingTool, setMergingTool] = React.useState<UnverifiedToolItem | null>(null);
  const [mergeTargetId, setMergeTargetId] = React.useState('');

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchTools = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAdminUnverifiedToolsAction();
      if (res.success && res.data) {
        setTools(res.data);
      } else {
        toast.error(res.error || 'Failed to fetch unverified tools');
      }
    } catch {
      toast.error('An error occurred while loading tools');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleVerify = async (toolId: number) => {
    try {
      const res = await verifyToolAction(toolId);
      if (res.success) {
        toast.success('Tool verified successfully');
        setTools((prev) => prev.filter((t) => t.id !== toolId));
      } else {
        toast.error(res.error || 'Failed to verify tool');
      }
    } catch {
      toast.error('An error occurred');
    }
  };

  const handleOpenEdit = (tool: UnverifiedToolItem) => {
    setEditingTool(tool);
    setEditName(tool.name);
    setEditKind((tool.kind as ToolKind) || 'ai_app');
    setEditVendor(tool.vendor || '');
    setEditWebsiteUrl(tool.website_url || '');
    setEditLogoUrl(tool.logo_url || '');
  };

  const handleUpdateSubmit = async () => {
    if (!editingTool) return;
    setIsSubmitting(true);
    try {
      const res = await updateToolAction({
        toolId: editingTool.id,
        name: editName,
        kind: editKind,
        vendor: editVendor || null,
        websiteUrl: editWebsiteUrl || null,
        logoUrl: editLogoUrl || null,
      });

      if (res.success) {
        toast.success('Tool details updated successfully');
        setEditingTool(null);
        void fetchTools();
      } else {
        toast.error(res.error || 'Failed to update tool');
      }
    } catch {
      toast.error('An error occurred while updating tool');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMergeSubmit = async () => {
    if (!mergingTool) return;
    const targetIdNum = parseInt(mergeTargetId, 10);
    if (isNaN(targetIdNum) || targetIdNum <= 0) {
      toast.error('Please enter a valid target tool numeric ID');
      return;
    }

    if (targetIdNum === mergingTool.id) {
      toast.error('Cannot merge tool into itself');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await mergeToolsAction({
        fromId: mergingTool.id,
        intoId: targetIdNum,
      });

      if (res.success) {
        toast.success(`Merged tool #${mergingTool.id} into #${targetIdNum}`);
        setMergingTool(null);
        setMergeTargetId('');
        void fetchTools();
      } else {
        toast.error(res.error || 'Failed to merge tool');
      }
    } catch {
      toast.error('An error occurred while merging tools');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTools = React.useMemo(() => {
    if (!searchQuery.trim()) return tools;
    const q = searchQuery.toLowerCase();
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.vendor?.toLowerCase().includes(q)
    );
  }, [tools, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Unverified Tools Queue ({tools.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Community-created tools awaiting verification, metadata enrichment, or deduplication.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <HugeiconsIcon
              icon={Search01Icon}
              className="text-muted-foreground absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2"
            />
            <Input
              type="search"
              placeholder="Filter tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchTools()}
            disabled={isLoading}
            className="h-8 px-2.5 text-xs"
            title="Refresh tools"
          >
            <HugeiconsIcon
              icon={ArrowReloadHorizontalIcon}
              className={cn('size-3.5', isLoading && 'animate-spin')}
            />
          </Button>
        </div>
      </div>

      {/* Tools List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 w-full animate-pulse rounded-xl border border-border/60 bg-card p-5"
            />
          ))}
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">All tools verified</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            There are no unverified tools waiting in the review queue.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between transition-colors hover:border-border"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground text-sm">
                    {tool.name}
                  </span>
                  <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                    #{tool.id}
                  </span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                    {toolKindLabels[tool.kind as ToolKind] || tool.kind}
                  </span>
                  <span className="rounded-md bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                    {tool.usage_count} {tool.usage_count === 1 ? 'creation' : 'creations'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>Slug: <code className="font-mono">{tool.slug}</code></span>
                  {tool.vendor && <span>Vendor: {tool.vendor}</span>}
                  {tool.website_url && (
                    <a
                      href={tool.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-foreground hover:underline"
                    >
                      <HugeiconsIcon icon={Globe02Icon} className="size-3" />
                      <span>{new URL(tool.website_url).hostname}</span>
                    </a>
                  )}
                  <span>Created {new Date(tool.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => void handleVerify(tool.id)}
                  className="h-8 text-xs font-medium"
                >
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5 mr-1" />
                  Verify
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(tool)}
                  className="h-8 text-xs font-medium"
                >
                  <HugeiconsIcon icon={Edit01Icon} className="size-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setMergingTool(tool);
                    setMergeTargetId('');
                  }}
                  className="h-8 text-xs font-medium"
                >
                  <HugeiconsIcon icon={GitForkIcon} className="size-3.5 mr-1" />
                  Merge
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Tool Dialog */}
      <Dialog
        open={Boolean(editingTool)}
        onOpenChange={(open) => {
          if (!open) setEditingTool(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tool Metadata</DialogTitle>
            <DialogDescription>
              Update tool details before or after verifying.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label htmlFor="tool-name" className="text-xs">Tool Name</Label>
              <Input
                id="tool-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="tool-kind" className="text-xs">Tool Kind</Label>
              <select
                id="tool-kind"
                value={editKind}
                onChange={(e) => setEditKind(e.target.value as ToolKind)}
                className="h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {Object.entries(toolKindLabels).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tool-vendor" className="text-xs">Vendor / Creator</Label>
              <Input
                id="tool-vendor"
                value={editVendor}
                onChange={(e) => setEditVendor(e.target.value)}
                placeholder="e.g. OpenAI, Anthropic, Midjourney"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="tool-url" className="text-xs">Website URL</Label>
              <Input
                id="tool-url"
                type="url"
                value={editWebsiteUrl}
                onChange={(e) => setEditWebsiteUrl(e.target.value)}
                placeholder="https://..."
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="tool-logo" className="text-xs">Logo URL</Label>
              <Input
                id="tool-logo"
                type="url"
                value={editLogoUrl}
                onChange={(e) => setEditLogoUrl(e.target.value)}
                placeholder="https://..."
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingTool(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleUpdateSubmit()}
              disabled={isSubmitting || !editName.trim()}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Tool Dialog */}
      <Dialog
        open={Boolean(mergingTool)}
        onOpenChange={(open) => {
          if (!open) {
            setMergingTool(null);
            setMergeTargetId('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Merge Tool</DialogTitle>
            <DialogDescription>
              Merge duplicate tool &ldquo;{mergingTool?.name}&rdquo; into a target tool.
              All creations, prompts, and resources using this tool will be repointed to the target tool.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-md bg-surface-2 p-3 text-xs text-muted-foreground border border-border/40">
              Source Tool: <span className="font-semibold text-foreground">{mergingTool?.name}</span> (#{mergingTool?.id})
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="target-tool-id" className="text-xs">
                Target Tool Numeric ID
              </Label>
              <Input
                id="target-tool-id"
                type="number"
                value={mergeTargetId}
                onChange={(e) => setMergeTargetId(e.target.value)}
                placeholder="e.g. 1"
                className="h-8 text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Enter the ID of the canonical tool to absorb this tool&rsquo;s creations.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMergingTool(null);
                setMergeTargetId('');
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void handleMergeSubmit()}
              disabled={isSubmitting || !mergeTargetId.trim()}
            >
              {isSubmitting ? 'Merging...' : 'Confirm Merge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

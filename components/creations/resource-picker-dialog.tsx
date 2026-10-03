"use client";

import React, { useState, useEffect } from "react";
import type { ResourceKind, Tool } from "@/lib/data/creations";
import {
  quickCreateResourceAction,
  searchResourcesAction,
} from "@/lib/creations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  PlusSignIcon,
  Book01Icon,
  Link01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface SelectedResource {
  resource_id: string;
  position: number;
  note: string | null;
  resource?: {
    id: string;
    title: string;
    kind: ResourceKind;
    url: string | null;
    description: string | null;
    author?: {
      id: string;
      username: string;
      display_name: string | null;
    } | null;
  };
}

interface ResourcePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedResources: SelectedResource[];
  tools: Tool[];
  onAddResource: (item: SelectedResource) => void;
}

const RESOURCE_KINDS: Array<{ value: ResourceKind; label: string }> = [
  { value: "skill", label: "Skill / Cheatsheet" },
  { value: "template", label: "Template" },
  { value: "ui_kit", label: "UI Kit" },
  { value: "workflow", label: "Workflow" },
  { value: "agent", label: "Agent Config" },
  { value: "mcp_server", label: "MCP Server" },
  { value: "reference", label: "Reference" },
  { value: "tutorial", label: "Tutorial" },
  { value: "dataset", label: "Dataset" },
  { value: "asset", label: "Asset Pack" },
  { value: "other", label: "Other" },
];

export function ResourcePickerDialog({
  open,
  onOpenChange,
  selectedResources,
  tools,
  onAddResource,
}: ResourcePickerDialogProps) {
  type SearchedResource = Awaited<ReturnType<typeof searchResourcesAction>>[number];
  const [activeTab, setActiveTab] = useState<"search" | "create">("search");
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<ResourceKind | "all">("all");
  const [results, setResults] = useState<SearchedResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Quick-create form state
  const [newTitle, setNewTitle] = useState("");
  const [newKind, setNewKind] = useState<ResourceKind>("skill");
  const [newUrl, setNewUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newToolId, setNewToolId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search resources
  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const filter = kindFilter === "all" ? undefined : kindFilter;
        const resources = await searchResourcesAction(query, filter, 20);
        if (active) setResults(resources);
      } catch (err) {
        console.error("Error searching resources:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, kindFilter, open]);

  const handleSelectResource = (resource: {
    id: string;
    title: string;
    kind: ResourceKind;
    url?: string | null;
    description?: string | null;
  }) => {
    if (selectedResources.some((r) => r.resource_id === resource.id)) {
      toast.info(`"${resource.title}" is already attached`);
      return;
    }

    onAddResource({
      resource_id: resource.id,
      position: selectedResources.length,
      note: null,
      resource: {
        id: resource.id,
        title: resource.title,
        kind: resource.kind,
        url: resource.url || null,
        description: resource.description || null,
      },
    });

    toast.success(`Attached "${resource.title}"`);
    onOpenChange(false);
  };

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Resource title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await quickCreateResourceAction({
        title: newTitle.trim(),
        kind: newKind,
        url: newUrl.trim() || undefined,
        description: newDescription.trim() || undefined,
        tool_id: newToolId,
        is_public: true,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to create resource");
        return;
      }

      toast.success(`Resource "${res.data.title}" created & attached!`);
      handleSelectResource(res.data);

      // Reset
      setNewTitle("");
      setNewKind("skill");
      setNewUrl("");
      setNewDescription("");
      setNewToolId(null);
      setActiveTab("search");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error?.message || "Failed to create resource");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-bricolage text-2xl">
            Attach Resource
          </DialogTitle>
          <DialogDescription>
            Attach skills, templates, tutorials, MCP servers or datasets you utilized.
          </DialogDescription>

          {/* Navigation Pills */}
          <div className="flex gap-2 pt-2 border-b border-border pb-3">
            <button
              type="button"
              onClick={() => setActiveTab("search")}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                activeTab === "search"
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              Search library
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5",
                activeTab === "create"
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
              Quick-create resource
            </button>
          </div>
        </DialogHeader>

        {activeTab === "search" ? (
          <div className="flex-1 flex flex-col min-h-0 space-y-4 pt-3">
            {/* Search Input & Kind Filters */}
            <div className="space-y-2">
              <div className="relative">
                <HugeiconsIcon icon={Search01Icon} className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search resources by title..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 pr-10 text-sm h-10 rounded-full"
                  autoFocus
                />
                {isLoading && (
                  <HugeiconsIcon icon={Loading03Icon} className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Quick Kind Filter Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setKindFilter("all")}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 whitespace-nowrap transition-colors cursor-pointer text-[11px] font-medium",
                    kindFilter === "all"
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  All kinds
                </button>
                {RESOURCE_KINDS.slice(0, 5).map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKindFilter(k.value)}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 whitespace-nowrap transition-colors cursor-pointer text-[11px] font-medium",
                      kindFilter === k.value
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {results.length > 0 ? (
                results.map((r) => {
                  const isAttached = selectedResources.some(
                    (item) => item.resource_id === r.id
                  );
                  return (
                    <div
                      key={r.id}
                      className={cn(
                        "rounded-2xl border p-4 transition-all flex flex-col justify-between gap-3",
                        isAttached
                          ? "border-border bg-muted/40 opacity-70"
                          : "border-border bg-card hover:border-foreground/30 hover:shadow-xs"
                      )}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {r.title}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground shrink-0">
                            {r.kind.replace("_", " ")}
                          </span>
                        </div>
                        {r.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {r.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                        {r.url ? (
                          <span className="flex items-center gap-1 text-brand truncate max-w-[240px]">
                            <HugeiconsIcon icon={Link01Icon} className="size-3 shrink-0" />
                            {r.url}
                          </span>
                        ) : (
                          <span />
                        )}

                        <Button
                          type="button"
                          variant={isAttached ? "secondary" : "default"}
                          size="sm"
                          disabled={isAttached}
                          onClick={() => handleSelectResource(r)}
                        >
                          {isAttached ? "Attached" : "Attach"}
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : !isLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                  <HugeiconsIcon icon={Book01Icon} className="size-8 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    No resources found
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Can&apos;t find the resource or skill you used? Quick-create one to link it.
                  </p>
                  <Button
                    type="button"
                    variant="brand"
                    size="sm"
                    onClick={() => setActiveTab("create")}
                    className="mt-2"
                  >
                    Quick-create resource
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleQuickCreate}
            className="flex-1 overflow-y-auto space-y-4 pt-3 pr-1"
          >
            <div className="space-y-1.5">
              <Label htmlFor="resource-title">Resource title *</Label>
              <Input
                id="resource-title"
                placeholder="e.g. Tailwind CSS v4 Migration Guide"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="resource-kind">Kind</Label>
                <select
                  id="resource-kind"
                  value={newKind}
                  onChange={(e) => setNewKind(e.target.value as ResourceKind)}
                  className="w-full rounded-full border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  {RESOURCE_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="resource-tool">Related Tool (optional)</Label>
                <select
                  id="resource-tool"
                  value={newToolId || ""}
                  onChange={(e) =>
                    setNewToolId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="w-full rounded-full border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">None / General</option>
                  {tools.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="resource-url">Resource URL (optional)</Label>
              <Input
                id="resource-url"
                type="url"
                placeholder="https://github.com/... or https://..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="resource-description">Description (optional)</Label>
              <Textarea
                id="resource-description"
                placeholder="Brief summary of how this resource helped..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab("search")}
              >
                Back to search
              </Button>
              <Button
                type="submit"
                variant="brand"
                loading={isSubmitting}
              >
                Create and attach
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

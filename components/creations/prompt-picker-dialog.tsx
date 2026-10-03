"use client";

import React, { useState, useEffect } from "react";
import { searchPrompts, type Tool } from "@/lib/data/creations";
import { quickCreatePromptAction } from "@/lib/creations/actions";
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
  FileCodeIcon,
  Copy01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface SelectedPrompt {
  prompt_id: string;
  step_id: string | null;
  position: number;
  note: string | null;
  prompt?: {
    id: string;
    title: string;
    body: string;
    kind: string;
    copy_count: number;
    author?: {
      id: string;
      username: string;
      display_name: string | null;
    } | null;
  };
}

interface PromptPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPrompts: SelectedPrompt[];
  steps: Array<{ id: string; title: string }>;
  tools: Tool[];
  onAddPrompt: (item: SelectedPrompt) => void;
}

export function PromptPickerDialog({
  open,
  onOpenChange,
  selectedPrompts,
  tools,
  onAddPrompt,
}: PromptPickerDialogProps) {
  type SearchedPrompt = Awaited<ReturnType<typeof searchPrompts>>[number];
  const [activeTab, setActiveTab] = useState<"search" | "create">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchedPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Quick-create state
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newKind, setNewKind] = useState<"text" | "system" | "image" | "video" | "audio" | "agent" | "other">("text");
  const [newModelToolId, setNewModelToolId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search prompts
  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const prompts = await searchPrompts(query, 20);
        if (active) setResults(prompts);
      } catch (err) {
        console.error("Error searching prompts:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, open]);

  const handleSelectPrompt = (prompt: {
    id: string;
    title: string;
    body: string;
    kind: string;
    copy_count?: number;
  }) => {
    if (selectedPrompts.some((p) => p.prompt_id === prompt.id)) {
      toast.info(`"${prompt.title}" is already attached`);
      return;
    }

    onAddPrompt({
      prompt_id: prompt.id,
      step_id: null,
      position: selectedPrompts.length,
      note: null,
      prompt: {
        id: prompt.id,
        title: prompt.title,
        body: prompt.body,
        kind: prompt.kind,
        copy_count: prompt.copy_count || 0,
      },
    });

    toast.success(`Attached "${prompt.title}"`);
    onOpenChange(false);
  };

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) {
      toast.error("Title and prompt body are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await quickCreatePromptAction({
        title: newTitle.trim(),
        body: newBody.trim(),
        kind: newKind,
        model_tool_id: newModelToolId,
        is_public: true,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to create prompt");
        return;
      }

      toast.success(`Prompt "${res.data.title}" created & attached!`);
      handleSelectPrompt(res.data);
      // Reset form
      setNewTitle("");
      setNewBody("");
      setNewKind("text");
      setNewModelToolId(null);
      setActiveTab("search");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error?.message || "Failed to create prompt");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-bricolage text-2xl">
            Attach Prompt
          </DialogTitle>
          <DialogDescription>
            Attach the system prompts or user prompts that generated this creation.
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
              Quick-create prompt
            </button>
          </div>
        </DialogHeader>

        {activeTab === "search" ? (
          <div className="flex-1 flex flex-col min-h-0 space-y-4 pt-3">
            <div className="relative">
              <HugeiconsIcon icon={Search01Icon} className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search prompts by title or keywords..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 pr-10 text-sm h-10 rounded-full"
                autoFocus
              />
              {isLoading && (
                <HugeiconsIcon icon={Loading03Icon} className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Prompts Result List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {results.length > 0 ? (
                results.map((p) => {
                  const isAttached = selectedPrompts.some(
                    (item) => item.prompt_id === p.id
                  );
                  return (
                    <div
                      key={p.id}
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
                            {p.title}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground shrink-0">
                            {p.kind}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 font-mono">
                          {p.body}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <HugeiconsIcon icon={Copy01Icon} className="size-3" />
                          {p.copy_count || 0} copies
                        </span>

                        <Button
                          type="button"
                          variant={isAttached ? "secondary" : "default"}
                          size="sm"
                          disabled={isAttached}
                          onClick={() => handleSelectPrompt(p)}
                        >
                          {isAttached ? "Attached" : "Attach"}
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : !isLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
                  <HugeiconsIcon icon={FileCodeIcon} className="size-8 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    No prompts found
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Can&apos;t find what you used? Quick-create a new prompt to add it immediately.
                  </p>
                  <Button
                    type="button"
                    variant="brand"
                    size="sm"
                    onClick={() => setActiveTab("create")}
                    className="mt-2"
                  >
                    Quick-create prompt
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
              <Label htmlFor="prompt-title">Prompt title *</Label>
              <Input
                id="prompt-title"
                placeholder="e.g. Master Design System Generator"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prompt-kind">Kind</Label>
                <select
                  id="prompt-kind"
                  value={newKind}
                  onChange={(e) => setNewKind(e.target.value)}
                  className="w-full rounded-full border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="text">Text / Chat Prompt</option>
                  <option value="system">System Instruction</option>
                  <option value="image">Image Generation</option>
                  <option value="video">Video Generation</option>
                  <option value="audio">Audio / Music</option>
                  <option value="agent">Agentic Workflow</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prompt-model">Target Tool/Model</Label>
                <select
                  id="prompt-model"
                  value={newModelToolId || ""}
                  onChange={(e) =>
                    setNewModelToolId(
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
              <Label htmlFor="prompt-body">Prompt body *</Label>
              <Textarea
                id="prompt-body"
                placeholder="Paste the exact prompt text here..."
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={6}
                required
                className="font-mono text-xs"
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

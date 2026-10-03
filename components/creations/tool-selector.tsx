"use client";

import React, { useState, useEffect, useRef } from "react";
import type { Tool } from "@/lib/data/creations";
import { proposeToolAction, searchToolsAction } from "@/lib/creations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  StarIcon,
  Cancel01Icon,
  PlusSignIcon,
  CheckmarkCircle02Icon,
  Loading03Icon,
  AiSettingIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface SelectedTool {
  tool_id: number;
  role: "primary" | "supporting";
  version: string | null;
  position: number;
  tool?: Tool;
}

interface ToolSelectorProps {
  selectedTools: SelectedTool[];
  onChange: (tools: SelectedTool[]) => void;
  maxTools?: number;
}

export function ToolSelector({
  selectedTools,
  onChange,
  maxTools = 10,
}: ToolSelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showProposeModal, setShowProposeModal] = useState(false);

  // Propose tool form state
  const [proposeName, setProposeName] = useState("");
  const [proposeKind, setProposeKind] = useState<string>("ai_app");
  const [proposeUrl, setProposeUrl] = useState("");
  const [isSubmittingPropose, setIsSubmittingPropose] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const tools = await searchToolsAction(query);
        if (active) {
          setResults(tools);
        }
      } catch (err) {
        console.error("Tool search error:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectTool = (tool: Tool) => {
    if (selectedTools.some((t) => t.tool_id === tool.id)) {
      toast.info(`${tool.name} is already added`);
      setIsOpen(false);
      return;
    }

    if (selectedTools.length >= maxTools) {
      toast.error(`You can attach up to ${maxTools} tools`);
      return;
    }

    const isFirst = selectedTools.length === 0;
    const newTool: SelectedTool = {
      tool_id: tool.id,
      role: isFirst ? "primary" : "supporting",
      version: null,
      position: selectedTools.length,
      tool,
    };

    onChange([...selectedTools, newTool]);
    setQuery("");
    setIsOpen(false);
  };

  const handleRemove = (toolId: number) => {
    const remaining = selectedTools
      .filter((t) => t.tool_id !== toolId)
      .map((t, idx) => ({ ...t, position: idx }));

    const hadPrimary = selectedTools.find((t) => t.tool_id === toolId)?.role === "primary";
    if (hadPrimary && remaining.length > 0) {
      remaining[0].role = "primary";
    }

    onChange(remaining);
  };

  const handleSetPrimary = (toolId: number) => {
    const updated = selectedTools.map((t) => ({
      ...t,
      role: (t.tool_id === toolId ? "primary" : "supporting") as "primary" | "supporting",
    }));
    onChange(updated);
  };

  const handleVersionChange = (toolId: number, version: string) => {
    const updated = selectedTools.map((t) =>
      t.tool_id === toolId ? { ...t, version: version || null } : t
    );
    onChange(updated);
  };

  const handleProposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposeName.trim()) {
      toast.error("Please enter a tool name");
      return;
    }

    setIsSubmittingPropose(true);
    try {
      const res = await proposeToolAction({
        name: proposeName.trim(),
        kind: proposeKind,
        website_url: proposeUrl.trim() || undefined,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to propose tool");
        return;
      }

      toast.success(`Added "${res.data.name}"`);
      handleSelectTool(res.data);
      setShowProposeModal(false);
      setProposeName("");
      setProposeUrl("");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error?.message || "Failed to propose tool");
    } finally {
      setIsSubmittingPropose(false);
    }
  };

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Selected Tools List */}
      {selectedTools.length > 0 && (
        <div className="space-y-2">
          {selectedTools.map((item) => {
            const isPrimary = item.role === "primary";
            return (
              <div
                key={item.tool_id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 transition-colors",
                  isPrimary
                    ? "border-brand/50 bg-brand/5 dark:bg-brand/10"
                    : "border-border bg-card"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                    <HugeiconsIcon icon={AiSettingIcon} className="size-4 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {item.tool?.name || `Tool #${item.tool_id}`}
                      </span>
                      {item.tool?.is_verified && (
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5 text-brand" />
                      )}
                      {isPrimary ? (
                        <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
                          Primary Tool
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(item.tool_id)}
                          className="text-[11px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <HugeiconsIcon icon={StarIcon} className="size-3" />
                          Set as primary
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  <Input
                    type="text"
                    placeholder="Version (e.g. 3.7, Opus)"
                    value={item.version || ""}
                    onChange={(e) =>
                      handleVersionChange(item.tool_id, e.target.value)
                    }
                    className="h-8 w-28 text-xs rounded-full"
                  />

                  <button
                    type="button"
                    onClick={() => handleRemove(item.tool_id)}
                    className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-muted cursor-pointer transition-colors"
                    title="Remove tool"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Search Input & Dropdown */}
      <div className="relative">
        <div className="relative">
          <HugeiconsIcon icon={Search01Icon} className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder={
              selectedTools.length === 0
                ? "Search and add tools used (e.g. Cursor, Claude, Midjourney)..."
                : "Add another tool..."
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="pl-9 pr-10 text-sm h-10 rounded-full"
          />
          {isLoading && (
            <HugeiconsIcon icon={Loading03Icon} className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground pointer-events-none" />
          )}
        </div>

        {/* Dropdown Results */}
        {isOpen && (
          <div className="absolute top-full left-0 z-30 mt-1.5 w-full rounded-2xl border border-border bg-popover p-1 shadow-lg max-h-60 overflow-y-auto">
            {results.length > 0 ? (
              results.map((tool) => {
                const isSelected = selectedTools.some(
                  (t) => t.tool_id === tool.id
                );
                return (
                  <button
                    key={tool.id}
                    type="button"
                    disabled={isSelected}
                    onClick={() => handleSelectTool(tool)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors cursor-pointer",
                      isSelected
                        ? "opacity-50 cursor-not-allowed bg-muted/40"
                        : "hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {tool.name}
                      </span>
                      {tool.is_verified && (
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5 text-brand" />
                      )}
                      <span className="text-[11px] text-muted-foreground uppercase">
                        {tool.kind.replace("_", " ")}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="text-xs text-muted-foreground">
                        Added
                      </span>
                    )}
                  </button>
                );
              })
            ) : !isLoading ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No tools found for &quot;{query}&quot;.
              </div>
            ) : null}

            <div className="border-t border-border mt-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  setProposeName(query);
                  setShowProposeModal(true);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-brand hover:bg-brand/10 transition-colors cursor-pointer"
              >
                <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
                Propose a new tool {query ? `"${query}"` : ""}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Propose Tool Modal */}
      <Dialog open={showProposeModal} onOpenChange={setShowProposeModal}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleProposeSubmit}>
            <DialogHeader>
              <DialogTitle className="font-bricolage text-xl">
                Propose a new tool
              </DialogTitle>
              <DialogDescription>
                Add an AI tool or platform that isn&apos;t in our directory yet. It will be added to your creation immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="tool-name">Tool name *</Label>
                <Input
                  id="tool-name"
                  placeholder="e.g. Claude Code, v0, Suno"
                  value={proposeName}
                  onChange={(e) => setProposeName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tool-kind">Kind</Label>
                <select
                  id="tool-kind"
                  value={proposeKind}
                  onChange={(e) => setProposeKind(e.target.value)}
                  className="w-full rounded-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="ai_app">AI Application</option>
                  <option value="ai_model">AI Model</option>
                  <option value="framework">Framework</option>
                  <option value="library">Library</option>
                  <option value="platform">Platform</option>
                  <option value="design">Design Tool</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tool-url">Website URL (optional)</Label>
                <Input
                  id="tool-url"
                  type="url"
                  placeholder="https://..."
                  value={proposeUrl}
                  onChange={(e) => setProposeUrl(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowProposeModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="brand"
                loading={isSubmittingPropose}
              >
                Add tool
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

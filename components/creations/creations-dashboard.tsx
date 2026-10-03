"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { deleteCreationAction } from "@/lib/creations/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  Edit02Icon,
  ViewIcon,
  Delete02Icon,
  Image01Icon,
  AiSettingIcon,
  WorkflowSquare01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface DashboardCreationItem {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
  published_at: string | null;
  categoryName: string;
  coverStoragePath: string | null;
  toolCount: number;
  stepCount: number;
}

interface CreationsDashboardProps {
  initialCreations: DashboardCreationItem[];
}

export function CreationsDashboard({
  initialCreations,
}: CreationsDashboardProps) {
  const [creations, setCreations] = useState<DashboardCreationItem[]>(initialCreations);
  const [filter, setFilter] = useState<"all" | "published" | "draft" | "archived">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const supabase = createClient();

  const getCoverUrl = (path: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from("creation-media").getPublicUrl(path);
    return data.publicUrl;
  };

  const filteredCreations = creations.filter((c) => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    setDeletingId(id);
    try {
      const res = await deleteCreationAction(id);
      if (!res.ok) {
        toast.error(res.error || "Failed to delete creation");
        return;
      }
      setCreations(creations.filter((c) => c.id !== id));
      toast.success("Creation deleted");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error?.message || "Failed to delete creation");
    } finally {
      setDeletingId(null);
    }
  };

  const counts = {
    all: creations.length,
    published: creations.filter((c) => c.status === "published").length,
    draft: creations.filter((c) => c.status === "draft").length,
    archived: creations.filter((c) => c.status === "archived").length,
  };

  return (
    <div className="space-y-6">
      {/* Header with Title & "New Creation" CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-bricolage text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            My Creations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your AI projects, edit drafts, and view published work.
          </p>
        </div>

        <Link href="/new">
          <Button variant="brand" size="md">
            <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
            New creation
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto text-xs font-semibold">
        {(["all", "published", "draft", "archived"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-colors cursor-pointer capitalize",
              filter === tab
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px]",
                filter === tab ? "bg-background/20 text-background" : "bg-background text-muted-foreground"
              )}
            >
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Creations Grid */}
      {filteredCreations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredCreations.map((item) => {
            const coverUrl = getCoverUrl(item.coverStoragePath);
            return (
              <div
                key={item.id}
                className="group relative flex flex-col rounded-3xl border border-border bg-card overflow-hidden hover:border-foreground/30 hover:shadow-xs transition-all"
              >
                {/* Media Thumbnail */}
                <Link
                  href={`/c/${item.slug}`}
                  className="relative aspect-video w-full bg-muted overflow-hidden block"
                >
                  {coverUrl ? (
                    <Image
                      src={coverUrl}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <HugeiconsIcon icon={Image01Icon} className="size-8" />
                    </div>
                  )}

                  {/* Status Pill */}
                  <div className="absolute top-2.5 left-2.5">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-xs backdrop-blur-md",
                        item.status === "published"
                          ? "bg-emerald-500/90 text-white"
                          : item.status === "archived"
                          ? "bg-muted/90 text-muted-foreground"
                          : "bg-brand/90 text-white"
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                </Link>

                {/* Card Content */}
                <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
                  <div className="space-y-1">
                    <div className="text-[11px] font-medium text-muted-foreground uppercase">
                      {item.categoryName}
                    </div>
                    <Link
                      href={`/c/${item.slug}`}
                      className="block font-bricolage text-base font-semibold text-foreground hover:text-brand line-clamp-1 transition-colors"
                    >
                      {item.title}
                    </Link>
                    {item.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.summary}
                      </p>
                    )}
                  </div>

                  {/* Metadata Stats */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon icon={AiSettingIcon} className="size-3" />
                      {item.toolCount} {item.toolCount === 1 ? "tool" : "tools"}
                    </span>
                    {item.stepCount > 0 && (
                      <span className="flex items-center gap-1">
                        <HugeiconsIcon icon={WorkflowSquare01Icon} className="size-3" />
                        {item.stepCount} steps
                      </span>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/c/${item.slug}/edit`}>
                        <Button variant="secondary" size="sm">
                          <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
                          Edit
                        </Button>
                      </Link>

                      <Link href={`/c/${item.slug}`}>
                        <Button variant="ghost" size="icon-sm" title="View creation">
                          <HugeiconsIcon icon={ViewIcon} className="size-3.5" />
                        </Button>
                      </Link>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(item.id, item.title)}
                      loading={deletingId === item.id}
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete creation"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-card/40 p-12 text-center space-y-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mx-auto">
            <HugeiconsIcon icon={PlusSignIcon} className="size-6 text-foreground" />
          </div>
          <h2 className="font-bricolage text-lg font-bold text-foreground">
            No creations found in {filter}
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {filter === "all"
              ? "Start sharing your AI-assisted work with the community."
              : `You have no creations currently marked as ${filter}.`}
          </p>
          <div className="pt-2">
            <Link href="/new">
              <Button variant="brand" size="sm">
                Create new project
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

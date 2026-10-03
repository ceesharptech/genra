"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  saveCreationAction,
  setCreationStatusAction,
  deleteCreationAction,
} from "@/lib/creations/actions";
import type { Category, Tool } from "@/lib/data/creations";
import { MediaUploader, type MediaItem } from "./media-uploader";
import { ToolSelector, type SelectedTool } from "./tool-selector";
import { TagInput } from "./tag-input";
import { StepsEditor, type StepItem } from "./steps-editor";
import {
  PromptPickerDialog,
  type SelectedPrompt,
} from "./prompt-picker-dialog";
import {
  ResourcePickerDialog,
  type SelectedResource,
} from "./resource-picker-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MarkdownView } from "@/components/ui/markdown-view";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  Loading03Icon,
  ViewIcon,
  GlobeIcon,
  GithubIcon,
  PlusSignIcon,
  Delete02Icon,
  Cancel01Icon,
  Edit02Icon,
  FileCodeIcon,
  Book01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  buildSavePayload,
  serializeCreationSnapshot,
  type CreationFormState,
} from "@/lib/creations/payload";
import {
  AutosaveScheduler,
  type AutosaveStatus,
  type SaveReason,
} from "@/lib/creations/autosave";

export interface CreationEditorInitialData {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  category_id: number | null;
  status: "draft" | "published" | "archived";
  live_url: string | null;
  repo_url: string | null;
  cover_media_id: string | null;
  attributes: Record<string, unknown>;
  tools: SelectedTool[];
  tags: string[];
  steps: StepItem[];
  media: MediaItem[];
  prompts: SelectedPrompt[];
  resources: SelectedResource[];
}

interface CreationEditorProps {
  initialData: CreationEditorInitialData;
  categories: Category[];
  allTools: Tool[];
  userId: string;
}

export function CreationEditor({
  initialData,
  categories,
  allTools,
  userId,
}: CreationEditorProps) {
  const router = useRouter();

  // Core Form State
  const [creationId] = useState(initialData.id);
  const [slug, setSlug] = useState(initialData.slug);
  const [status, setStatus] = useState(initialData.status);
  const [title, setTitle] = useState(initialData.title);
  const [summary, setSummary] = useState(initialData.summary || "");
  const [description, setDescription] = useState(initialData.description || "");
  const [categoryId, setCategoryId] = useState<number | null>(
    initialData.category_id
  );
  const [liveUrl, setLiveUrl] = useState(initialData.live_url || "");
  const [repoUrl, setRepoUrl] = useState(initialData.repo_url || "");
  const [coverMediaId, setCoverMediaId] = useState<string | null>(
    initialData.cover_media_id
  );

  // Sub-items
  const [media, setMedia] = useState<MediaItem[]>(initialData.media || []);
  const [tools, setTools] = useState<SelectedTool[]>(initialData.tools || []);
  const [tags, setTags] = useState<string[]>(initialData.tags || []);
  const [steps, setSteps] = useState<StepItem[]>(initialData.steps || []);
  const [prompts, setPrompts] = useState<SelectedPrompt[]>(
    initialData.prompts || []
  );
  const [resources, setResources] = useState<SelectedResource[]>(
    initialData.resources || []
  );

  // UI state for optional sections
  const [hasSummaryOrDesc, setHasSummaryOrDesc] = useState(
    !!(initialData.summary || initialData.description)
  );
  const [hasLinks, setHasLinks] = useState(
    !!(initialData.live_url || initialData.repo_url)
  );
  const [hasTags, setHasTags] = useState((initialData.tags || []).length > 0);
  const [hasSteps, setHasSteps] = useState(
    (initialData.steps || []).length > 0
  );
  const [hasPrompts, setHasPrompts] = useState(
    (initialData.prompts || []).length > 0
  );
  const [hasResources, setHasResources] = useState(
    (initialData.resources || []).length > 0
  );

  // Dialogs
  const [openPromptDialog, setOpenPromptDialog] = useState(false);
  const [openResourceDialog, setOpenResourceDialog] = useState(false);

  // Save & Sync state
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [previewDescription, setPreviewDescription] = useState(false);

  // Compute current serialized snapshot from form state
  const currentSnapshot = serializeCreationSnapshot({
    creationId,
    title,
    summary,
    description,
    categoryId,
    liveUrl,
    repoUrl,
    coverMediaId,
    attributes: initialData.attributes,
    tools,
    tags,
    steps,
    media,
    prompts,
    resources,
    status,
  });

  // Track the snapshot of the last successfully saved state
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(currentSnapshot);

  // Dirty state is cleanly derived: true if current state differs from last saved state
  const isDirty = currentSnapshot !== lastSavedSnapshot;

  // Mutable ref for async callbacks / event handlers
  const formStateRef = useRef<CreationFormState>({
    creationId,
    title,
    summary,
    description,
    categoryId,
    liveUrl,
    repoUrl,
    coverMediaId,
    attributes: initialData.attributes,
    tools,
    tags,
    steps,
    media,
    prompts,
    resources,
    status,
  });

  // Scheduler ref initialized once in useEffect (avoids ref access or setState cascading during render)
  const schedulerRef = useRef<AutosaveScheduler | null>(null);

  // Sync formStateRef in an effect so it is not updated during render
  useEffect(() => {
    formStateRef.current = {
      creationId,
      title,
      summary,
      description,
      categoryId,
      liveUrl,
      repoUrl,
      coverMediaId,
      attributes: initialData.attributes,
      tools,
      tags,
      steps,
      media,
      prompts,
      resources,
      status,
    };
  });

  // Initialize scheduler and event listeners on mount
  useEffect(() => {
    const scheduler = new AutosaveScheduler({
      initialSnapshot: lastSavedSnapshot,
      getSnapshot: () => serializeCreationSnapshot(formStateRef.current),
      isDraft: () => formStateRef.current.status === "draft",
      debounceMs: 3000,
      retryDelays: [5000, 15000, 45000],
      onStatusChange: (s, err) => {
        setAutosaveStatus(s);
        setAutosaveError(err || null);
        if (s === "saved") {
          setLastSavedSnapshot(serializeCreationSnapshot(formStateRef.current));
        }
      },
      onSave: async (reason: SaveReason) => {
        const payload = buildSavePayload(formStateRef.current, "save");
        const res = await saveCreationAction(payload);
        if (!res.ok) {
          if (reason === "manual") {
            toast.error(res.error || "Failed to save draft");
          }
          return { ok: false, error: res.error };
        }

        setSlug(res.data.slug);

        // Update URL if new draft slug was assigned
        if (
          typeof window !== "undefined" &&
          window.location.pathname.includes("/new") &&
          res.data.slug
        ) {
          window.history.replaceState(null, "", `/c/${res.data.slug}/edit`);
        }

        if (reason === "manual") {
          toast.success(
            formStateRef.current.status === "published"
              ? "Changes saved"
              : "Draft saved"
          );
        }
        return { ok: true };
      },
    });

    schedulerRef.current = scheduler;

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        void scheduler.flush();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (scheduler.isDirty()) {
        void scheduler.flush();
        e.preventDefault();
        e.returnValue = "";
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      scheduler.destroy();
      schedulerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFirstRender = useRef(true);

  // Edit effect: notify scheduler when snapshot changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    schedulerRef.current?.notifyEdit();
  }, [currentSnapshot]);

  const hasUploadingMedia = media.some((m) => m.isUploading);

  // Manual save handler
  const handleManualSave = async () => {
    await schedulerRef.current?.manualSave();
  };

  // Publish Handler
  const handlePublish = async () => {
    if (hasUploadingMedia) {
      toast.error("Waiting for uploads to finish before publishing");
      return;
    }

    // Basic client checks
    if (!title.trim() || title.trim() === "Untitled creation") {
      toast.error("Please enter a title for your creation");
      return;
    }
    if (!categoryId) {
      toast.error("Please select a category");
      return;
    }
    const completedImages = media.filter(
      (m) => !m.isUploading && m.kind === "image" && m.storage_path
    );
    if (!coverMediaId || !completedImages.some((m) => m.id === coverMediaId)) {
      toast.error("Please upload at least one image to serve as cover");
      return;
    }
    if (tools.length === 0) {
      toast.error("Please attach at least one AI tool used");
      return;
    }

    // 1. Block further autosaves immediately
    schedulerRef.current?.block();
    setIsPublishing(true);

    try {
      const payload = buildSavePayload(formStateRef.current, "publish");
      const res = await saveCreationAction(payload);

      if (!res.ok) {
        toast.error(res.error || "Failed to publish creation");
        schedulerRef.current?.unblock();
        setIsPublishing(false);
        return;
      }

      toast.success("Creation published successfully!");
      setStatus("published");
      setSlug(res.data.slug);
      setLastSavedSnapshot(currentSnapshot);

      // Stop all autosave and navigate immediately with replace
      router.replace(`/c/${res.data.slug}`);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error?.message || "Publishing failed");
      schedulerRef.current?.unblock();
      setIsPublishing(false);
    }
  };

  // Unpublish / Archive Handler
  const handleArchive = async () => {
    if (!confirm("Are you sure you want to unpublish this creation? It will no longer be visible publicly.")) {
      return;
    }

    try {
      const res = await setCreationStatusAction(creationId, "archived");
      if (!res.ok) {
        toast.error(res.error || "Failed to unpublish");
        return;
      }
      setStatus("archived");
      toast.success("Creation unpublished and archived");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error?.message || "Failed to unpublish");
    }
  };

  // Delete Handler
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this creation?")) {
      return;
    }

    try {
      const res = await deleteCreationAction(creationId);
      if (!res.ok) {
        toast.error(res.error || "Failed to delete");
        return;
      }
      toast.success("Creation deleted");
      router.push("/creations");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error?.message || "Failed to delete");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Sticky Top Header / Action Bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/creations"
              className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Back to my creations"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
                  {title || "Untitled creation"}
                </h1>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                    status === "published"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : status === "archived"
                      ? "bg-muted text-muted-foreground"
                      : "bg-brand/10 text-brand"
                  )}
                >
                  {status}
                </span>
              </div>

              {/* Saved indicator */}
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {isPublishing ? (
                  <>
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      className="size-3 animate-spin text-brand"
                    />
                    <span>Publishing...</span>
                  </>
                ) : autosaveStatus === "saving" ? (
                  <>
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      className="size-3 animate-spin text-brand"
                    />
                    <span>Saving...</span>
                  </>
                ) : autosaveStatus === "error" ? (
                  <div className="flex items-center gap-1.5 text-destructive">
                    <span>{autosaveError || "Couldn't save"}</span>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={handleManualSave}
                      className="underline font-semibold hover:text-foreground cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                ) : isDirty ? (
                  <>
                    <span className="size-1.5 rounded-full bg-amber-500" />
                    <span>Unsaved changes</span>
                  </>
                ) : (
                  <>
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      className="size-3 text-emerald-500"
                    />
                    <span>Saved</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {status === "published" && slug && (
              <Link
                href={`/c/${slug}`}
                target="_blank"
                className="hidden sm:inline-flex"
              >
                <Button variant="outline" size="sm">
                  <HugeiconsIcon icon={ViewIcon} className="size-3.5" />
                  View public
                </Button>
              </Link>
            )}

            {status === "draft" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleManualSave}
                  loading={autosaveStatus === "saving"}
                  disabled={isPublishing}
                  className="hidden sm:inline-flex"
                >
                  Save draft
                </Button>

                <Button
                  type="button"
                  variant="brand"
                  size="sm"
                  onClick={handlePublish}
                  loading={isPublishing}
                  disabled={isPublishing || hasUploadingMedia}
                  title={
                    hasUploadingMedia
                      ? "Waiting for uploads to finish"
                      : undefined
                  }
                >
                  {hasUploadingMedia ? "Waiting for uploads..." : "Publish"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleManualSave}
                  loading={autosaveStatus === "saving"}
                  disabled={isPublishing || !isDirty}
                >
                  Save changes
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleArchive}
                  disabled={isPublishing}
                  title="Unpublish creation"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                </Button>
              </>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleDelete}
              disabled={isPublishing}
              className="text-muted-foreground hover:text-destructive"
              title="Delete creation"
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Form Body */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <fieldset
          disabled={isPublishing}
          className="border-0 p-0 m-0 space-y-10 min-w-0 disabled:opacity-80"
        >
          {/* ============================================================= */}
          {/* REQUIRED SECTION: Media, Title, Category, Primary Tool       */}
          {/* ============================================================= */}
          <section className="space-y-6">
          {/* Media & Cover Image */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Creation Media *
              </Label>
              <span className="text-xs text-muted-foreground">
                At least 1 cover image required
              </span>
            </div>

            <MediaUploader
              creationId={creationId}
              userId={userId}
              media={media}
              coverMediaId={coverMediaId}
              onChange={(updatedMedia, updatedCover) => {
                setMedia(updatedMedia);
                setCoverMediaId(updatedCover);
              }}
            />
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <Label htmlFor="creation-title" className="text-sm font-semibold">
              Title *
            </Label>
            <Input
              id="creation-title"
              type="text"
              placeholder="Give your creation a descriptive title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 text-lg font-semibold font-bricolage"
              maxLength={140}
              required
            />
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="creation-category" className="text-sm font-semibold">
              Category *
            </Label>
            <select
              id="creation-category"
              value={categoryId || ""}
              onChange={(e) =>
                setCategoryId(e.target.value ? Number(e.target.value) : null)
              }
              className="w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring transition-colors"
              required
            >
              <option value="">Select a category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tools Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Tools Used *
              </Label>
              <span className="text-xs text-muted-foreground">
                At least 1 primary tool required
              </span>
            </div>

            <ToolSelector
              selectedTools={tools}
              onChange={(updatedTools) => setTools(updatedTools)}
            />
          </div>
        </section>

        {/* ============================================================= */}
        {/* OPTIONAL SECTIONS                                            */}
        {/* ============================================================= */}
        <section className="space-y-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              Optional Enrichment
            </h2>
            <span className="text-xs text-muted-foreground">
              Helps others learn how it was made
            </span>
          </div>

          {/* 1. Summary & Description */}
          {hasSummaryOrDesc ? (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  Summary & Description
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setHasSummaryOrDesc(false);
                    setSummary("");
                    setDescription("");
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                >
                  Remove section
                </button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="creation-summary" className="text-xs text-muted-foreground">
                  Short Summary (under 280 characters)
                </Label>
                <Input
                  id="creation-summary"
                  placeholder="One or two sentences summarizing what this is..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  maxLength={280}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="creation-description" className="text-xs text-muted-foreground">
                    Full Description (Markdown supported)
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewDescription(!previewDescription)}
                    className="h-6 text-xs px-2"
                  >
                    {previewDescription ? (
                      <span className="flex items-center gap-1">
                        <HugeiconsIcon icon={Edit02Icon} className="size-3" /> Edit
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <HugeiconsIcon icon={ViewIcon} className="size-3" /> Preview
                      </span>
                    )}
                  </Button>
                </div>

                {previewDescription ? (
                  <div className="rounded-xl border border-border/80 bg-muted/40 p-4 min-h-36">
                    {description.trim() ? (
                      <MarkdownView content={description} />
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        No description entered yet.
                      </p>
                    )}
                  </div>
                ) : (
                  <Textarea
                    id="creation-description"
                    placeholder="Tell the story: background, inspiration, technical architecture, and results..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    className="text-sm resize-y"
                  />
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setHasSummaryOrDesc(true)}
              className="flex w-full items-center justify-between rounded-2xl border border-dashed border-border p-4 text-left text-sm hover:border-foreground/40 hover:bg-card transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <HugeiconsIcon icon={Edit02Icon} className="size-4 text-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Add summary & description</p>
                  <p className="text-xs text-muted-foreground">Explain the concept and breakdown</p>
                </div>
              </div>
              <HugeiconsIcon icon={PlusSignIcon} className="size-4 text-muted-foreground" />
            </button>
          )}

          {/* 2. Live Demo & Repository Links */}
          {hasLinks ? (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Project Links</Label>
                <button
                  type="button"
                  onClick={() => {
                    setHasLinks(false);
                    setLiveUrl("");
                    setRepoUrl("");
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                >
                  Remove section
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="creation-live-url" className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <HugeiconsIcon icon={GlobeIcon} className="size-3" /> Live Demo URL
                  </Label>
                  <Input
                    id="creation-live-url"
                    type="url"
                    placeholder="https://my-app.vercel.app"
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="creation-repo-url" className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <HugeiconsIcon icon={GithubIcon} className="size-3" /> Repository URL
                  </Label>
                  <Input
                    id="creation-repo-url"
                    type="url"
                    placeholder="https://github.com/..."
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setHasLinks(true)}
              className="flex w-full items-center justify-between rounded-2xl border border-dashed border-border p-4 text-left text-sm hover:border-foreground/40 hover:bg-card transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <HugeiconsIcon icon={GlobeIcon} className="size-4 text-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Add live demo & repository links</p>
                  <p className="text-xs text-muted-foreground">Link visitors to the working site or source code</p>
                </div>
              </div>
              <HugeiconsIcon icon={PlusSignIcon} className="size-4 text-muted-foreground" />
            </button>
          )}

          {/* 3. Tags */}
          {hasTags ? (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Tags</Label>
                <button
                  type="button"
                  onClick={() => {
                    setHasTags(false);
                    setTags([]);
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                >
                  Remove section
                </button>
              </div>

              <TagInput
                tags={tags}
                onChange={(updatedTags) => setTags(updatedTags)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setHasTags(true)}
              className="flex w-full items-center justify-between rounded-2xl border border-dashed border-border p-4 text-left text-sm hover:border-foreground/40 hover:bg-card transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <span className="text-xs font-bold">#</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Add tags</p>
                  <p className="text-xs text-muted-foreground">Keywords and technologies (e.g. #nextjs, #canvas)</p>
                </div>
              </div>
              <HugeiconsIcon icon={PlusSignIcon} className="size-4 text-muted-foreground" />
            </button>
          )}

          {/* 4. Process Steps */}
          {hasSteps ? (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Process Steps</Label>
                <button
                  type="button"
                  onClick={() => {
                    setHasSteps(false);
                    setSteps([]);
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                >
                  Remove section
                </button>
              </div>

              <StepsEditor
                steps={steps}
                onChange={(updatedSteps) => setSteps(updatedSteps)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setHasSteps(true);
                if (steps.length === 0) {
                  setSteps([
                    {
                      id: crypto.randomUUID(),
                      position: 0,
                      title: "Step 1",
                      body: "",
                    },
                  ]);
                }
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-dashed border-border p-4 text-left text-sm hover:border-foreground/40 hover:bg-card transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <span className="text-xs font-bold">1..N</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Add process steps</p>
                  <p className="text-xs text-muted-foreground">Step-by-step breakdown of how you generated this</p>
                </div>
              </div>
              <HugeiconsIcon icon={PlusSignIcon} className="size-4 text-muted-foreground" />
            </button>
          )}

          {/* 5. Prompts Used */}
          {hasPrompts ? (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Prompts Used</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenPromptDialog(true)}
                  >
                    <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
                    Attach prompt
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setHasPrompts(false);
                      setPrompts([]);
                    }}
                    className="text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    Remove section
                  </button>
                </div>
              </div>

              {prompts.length > 0 ? (
                <div className="space-y-3">
                  {prompts.map((item, idx) => (
                    <div
                      key={item.prompt_id}
                      className="rounded-2xl border border-border bg-background p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            {item.prompt?.title || `Prompt #${idx + 1}`}
                          </span>
                          {item.prompt?.kind && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                              {item.prompt.kind}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setPrompts(
                              prompts.filter(
                                (p) => p.prompt_id !== item.prompt_id
                              )
                            )
                          }
                          className="text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                        </button>
                      </div>

                      {item.prompt?.body && (
                        <p className="text-xs text-muted-foreground line-clamp-3 font-mono bg-muted/30 p-2.5 rounded-xl">
                          {item.prompt.body}
                        </p>
                      )}

                      {/* Step assignment & note */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                        {steps.length > 0 && (
                          <select
                            value={item.step_id || ""}
                            onChange={(e) => {
                              const stepVal = e.target.value || null;
                              setPrompts(
                                prompts.map((p) =>
                                  p.prompt_id === item.prompt_id
                                    ? { ...p, step_id: stepVal }
                                    : p
                                )
                              );
                            }}
                            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground outline-none"
                          >
                            <option value="">General (not step specific)</option>
                            {steps.map((s, sIdx) => (
                              <option key={s.id} value={s.id}>
                                Step {sIdx + 1}: {s.title}
                              </option>
                            ))}
                          </select>
                        )}

                        <Input
                          type="text"
                          placeholder="Note (e.g. used for initial layout)..."
                          value={item.note || ""}
                          onChange={(e) => {
                            const noteVal = e.target.value || null;
                            setPrompts(
                              prompts.map((p) =>
                                p.prompt_id === item.prompt_id
                                  ? { ...p, note: noteVal }
                                  : p
                              )
                            );
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-3">
                    No prompts attached yet.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setOpenPromptDialog(true)}
                  >
                    <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
                    Attach first prompt
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setHasPrompts(true);
                setOpenPromptDialog(true);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-dashed border-border p-4 text-left text-sm hover:border-foreground/40 hover:bg-card transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <HugeiconsIcon icon={FileCodeIcon} className="size-4 text-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Add prompts</p>
                  <p className="text-xs text-muted-foreground">Select or create the prompts that powered this creation</p>
                </div>
              </div>
              <HugeiconsIcon icon={PlusSignIcon} className="size-4 text-muted-foreground" />
            </button>
          )}

          {/* 6. Resources Used */}
          {hasResources ? (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Resources Used</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenResourceDialog(true)}
                  >
                    <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
                    Attach resource
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setHasResources(false);
                      setResources([]);
                    }}
                    className="text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    Remove section
                  </button>
                </div>
              </div>

              {resources.length > 0 ? (
                <div className="space-y-3">
                  {resources.map((item, idx) => (
                    <div
                      key={item.resource_id}
                      className="rounded-2xl border border-border bg-background p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            {item.resource?.title || `Resource #${idx + 1}`}
                          </span>
                          {item.resource?.kind && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                              {item.resource.kind.replace("_", " ")}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setResources(
                              resources.filter(
                                (r) => r.resource_id !== item.resource_id
                              )
                            )
                          }
                          className="text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
                        </button>
                      </div>

                      {item.resource?.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.resource.description}
                        </p>
                      )}

                      <Input
                        type="text"
                        placeholder="Usage note (e.g. used as styling basis)..."
                        value={item.note || ""}
                        onChange={(e) => {
                          const noteVal = e.target.value || null;
                          setResources(
                            resources.map((r) =>
                              r.resource_id === item.resource_id
                                ? { ...r, note: noteVal }
                                : r
                            )
                          );
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-3">
                    No resources attached yet.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setOpenResourceDialog(true)}
                  >
                    <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
                    Attach first resource
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setHasResources(true);
                setOpenResourceDialog(true);
              }}
              className="flex w-full items-center justify-between rounded-2xl border border-dashed border-border p-4 text-left text-sm hover:border-foreground/40 hover:bg-card transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <HugeiconsIcon icon={Book01Icon} className="size-4 text-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Add resources & skills</p>
                  <p className="text-xs text-muted-foreground">Skills, templates, UI kits, tutorials, or MCP servers</p>
                </div>
              </div>
              <HugeiconsIcon icon={PlusSignIcon} className="size-4 text-muted-foreground" />
            </button>
          )}
        </section>
        </fieldset>
      </main>

      {/* Dialogs */}
      <PromptPickerDialog
        open={openPromptDialog}
        onOpenChange={setOpenPromptDialog}
        selectedPrompts={prompts}
        steps={steps.map((s) => ({ id: s.id, title: s.title }))}
        tools={allTools}
        onAddPrompt={(item) => setPrompts([...prompts, item])}
      />

      <ResourcePickerDialog
        open={openResourceDialog}
        onOpenChange={setOpenResourceDialog}
        selectedResources={resources}
        tools={allTools}
        onAddResource={(item) => setResources([...resources, item])}
      />
    </div>
  );
}

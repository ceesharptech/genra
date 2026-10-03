"use client";

import React, { useState, useRef, useId } from "react";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import {
  processImageForUpload,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/creations/image-processor";
import { parseVideoEmbedUrl } from "@/lib/validation/creation-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Image01Icon,
  Video01Icon,
  Delete02Icon,
  DragDropVerticalIcon,
  StarIcon,
  Upload01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface MediaItem {
  id: string;
  kind: "image" | "video" | "audio" | "file" | "embed";
  role: "gallery" | "thumbnail" | "before" | "after";
  storage_path: string | null;
  external_url: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  alt_text: string | null;
  caption: string | null;
  position: number;
  step_id: string | null;
  // Local state only
  previewUrl?: string;
  isUploading?: boolean;
  uploadProgress?: number;
}

interface MediaUploaderProps {
  creationId: string;
  userId: string;
  media: MediaItem[];
  coverMediaId: string | null;
  onChange: (media: MediaItem[], coverMediaId: string | null) => void;
  maxItems?: number;
}

export function MediaUploader({
  creationId,
  userId,
  media,
  coverMediaId,
  onChange,
  maxItems = 12,
}: MediaUploaderProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [videoError, setVideoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const supabase = createClient();

  // Helper to get public URL for storage item or return preview/external URL
  const getMediaSource = (item: MediaItem) => {
    if (item.previewUrl) return item.previewUrl;
    if (item.external_url) return item.external_url;
    if (item.storage_path) {
      const { data } = supabase.storage
        .from("creation-media")
        .getPublicUrl(item.storage_path);
      return data.publicUrl;
    }
    return "";
  };

  // Upload handler for files
  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;

    if (media.length + fileArray.length > maxItems) {
      toast.error(`You can add up to ${maxItems} media items per creation`);
      return;
    }

    const newItems: MediaItem[] = [];

    for (const file of fileArray) {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: only JPEG, PNG, WebP, or GIF are supported`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`${file.name} exceeds the 10 MB limit`);
        continue;
      }

      const mediaId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);

      const tempItem: MediaItem = {
        id: mediaId,
        kind: "image",
        role: "gallery",
        storage_path: null,
        external_url: null,
        mime_type: file.type,
        width: null,
        height: null,
        duration_ms: null,
        alt_text: null,
        caption: null,
        position: media.length + newItems.length,
        step_id: null,
        previewUrl,
        isUploading: true,
      };

      newItems.push(tempItem);
    }

    if (!newItems.length) return;

    // Immediately update UI with placeholder uploading items
    const updatedMedia = [...media, ...newItems];
    let nextCover = coverMediaId;
    if (!nextCover && newItems.length > 0) {
      nextCover = newItems[0].id;
    }
    onChange(updatedMedia, nextCover);

    // Process and upload each item in parallel
    for (const item of newItems) {
      const originalFile = fileArray.find((_, i) => newItems[i].id === item.id);
      if (!originalFile) continue;

      try {
        const processed = await processImageForUpload(originalFile);
        const storagePath = `${userId}/${creationId}/${item.id}.${processed.extension}`;

        const { error: uploadError } = await supabase.storage
          .from("creation-media")
          .upload(storagePath, processed.file, {
            contentType: processed.mimeType,
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Update item with completed upload data
        onChange(
          updatedMedia.map((m) =>
            m.id === item.id
              ? {
                  ...m,
                  storage_path: storagePath,
                  mime_type: processed.mimeType,
                  width: processed.width,
                  height: processed.height,
                  isUploading: false,
                }
              : m
          ),
          nextCover
        );
      } catch (err: unknown) {
        const error = err as Error;
        console.error("Image upload failed:", error);
        toast.error(`Failed to upload ${originalFile.name}: ${error?.message || "Storage error"}`);
        // Remove failed item
        onChange(
          updatedMedia.filter((m) => m.id !== item.id),
          nextCover === item.id ? null : nextCover
        );
      }
    }
  };

  // Add Video Embed handler
  const handleAddVideo = () => {
    setVideoError("");
    const parsed = parseVideoEmbedUrl(videoUrlInput);
    if (!parsed) {
      setVideoError("Please enter a valid YouTube, Vimeo, or Loom video link");
      return;
    }

    if (media.length >= maxItems) {
      toast.error(`Maximum of ${maxItems} media items reached`);
      return;
    }

    const videoItem: MediaItem = {
      id: crypto.randomUUID(),
      kind: "embed",
      role: "gallery",
      storage_path: null,
      external_url: parsed.embedUrl,
      mime_type: `video/${parsed.provider}`,
      width: 16,
      height: 9,
      duration_ms: null,
      alt_text: `${parsed.provider} video embed`,
      caption: null,
      position: media.length,
      step_id: null,
    };

    const nextMedia = [...media, videoItem];
    onChange(nextMedia, coverMediaId);
    setVideoUrlInput("");
    setShowVideoInput(false);
    toast.success(`${parsed.provider.toUpperCase()} video embed added`);
  };

  // DnD Reorder handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = media.findIndex((m) => m.id === active.id);
    const newIndex = media.findIndex((m) => m.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(media, oldIndex, newIndex).map(
        (item, idx) => ({
          ...item,
          position: idx,
        })
      );
      onChange(reordered, coverMediaId);
    }
  };

  // Remove media item
  const handleRemove = (id: string) => {
    const remaining = media
      .filter((m) => m.id !== id)
      .map((item, idx) => ({ ...item, position: idx }));

    let nextCover = coverMediaId;
    if (coverMediaId === id) {
      const firstImage = remaining.find((m) => m.kind === "image");
      nextCover = firstImage ? firstImage.id : null;
    }

    onChange(remaining, nextCover);
  };

  // Set Cover Image
  const handleSetCover = (id: string) => {
    const target = media.find((m) => m.id === id);
    if (!target || target.kind !== "image") {
      toast.error("Only images can be selected as cover");
      return;
    }
    onChange(media, id);
    toast.success("Cover image selected");
  };

  // Update alt text or caption
  const handleUpdateMetadata = (
    id: string,
    field: "alt_text" | "caption",
    value: string
  ) => {
    const updated = media.map((m) =>
      m.id === id ? { ...m, [field]: value || null } : m
    );
    onChange(updated, coverMediaId);
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone & Action Bar */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          if (e.dataTransfer.files) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-150",
          isDraggingOver
            ? "border-brand bg-brand/5 scale-[1.005]"
            : "border-border bg-card/50 hover:bg-card hover:border-border/80"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />

        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
          <HugeiconsIcon icon={Upload01Icon} className="size-6 text-foreground" />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Drag & drop images here, or{" "}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-brand hover:underline font-semibold cursor-pointer"
            >
              browse from your computer
            </button>
          </p>
          <p className="text-xs text-muted-foreground">
            Supports WebP, PNG, JPEG, GIF up to 10 MB (auto-optimized). First image is cover.
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <HugeiconsIcon icon={Image01Icon} className="size-4" />
            Add images
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowVideoInput(!showVideoInput)}
          >
            <HugeiconsIcon icon={Video01Icon} className="size-4" />
            Embed video
          </Button>
        </div>
      </div>

      {/* Video Embed Input Drawer */}
      {showVideoInput && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Add Video Embed (YouTube, Vimeo, Loom)
            </Label>
            <button
              type="button"
              onClick={() => setShowVideoInput(false)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="e.g. https://www.youtube.com/watch?v=... or https://loom.com/share/..."
              value={videoUrlInput}
              onChange={(e) => {
                setVideoUrlInput(e.target.value);
                setVideoError("");
              }}
              className="text-sm"
            />
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleAddVideo}
            >
              Add Video
            </Button>
          </div>
          {videoError && (
            <p className="text-xs text-destructive">{videoError}</p>
          )}
        </div>
      )}

      {/* Media Items List (Sortable Grid) */}
      {media.length > 0 && (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={media.map((m) => m.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {media.map((item) => (
                <SortableMediaCard
                  key={item.id}
                  item={item}
                  source={getMediaSource(item)}
                  isCover={coverMediaId === item.id}
                  onSetCover={() => handleSetCover(item.id)}
                  onRemove={() => handleRemove(item.id)}
                  onUpdateMetadata={(field, val) =>
                    handleUpdateMetadata(item.id, field, val)
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sortable Media Card
// -----------------------------------------------------------------------------

interface SortableMediaCardProps {
  item: MediaItem;
  source: string;
  isCover: boolean;
  onSetCover: () => void;
  onRemove: () => void;
  onUpdateMetadata: (field: "alt_text" | "caption", value: string) => void;
}

function SortableMediaCard({
  item,
  source,
  isCover,
  onSetCover,
  onRemove,
  onUpdateMetadata,
}: SortableMediaCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const [isEditingMeta, setIsEditingMeta] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex flex-col rounded-2xl border border-border bg-card overflow-hidden transition-shadow",
        isDragging && "opacity-50 ring-2 ring-brand shadow-lg z-20",
        isCover && "ring-2 ring-brand/80"
      )}
    >
      {/* Media Thumbnail / Embed Preview */}
      <div className="relative aspect-video w-full bg-muted overflow-hidden flex items-center justify-center">
        {item.kind === "embed" && item.external_url ? (
          <iframe
            src={item.external_url}
            title={item.alt_text || "Video preview"}
            className="w-full h-full border-0 pointer-events-none"
            loading="lazy"
          />
        ) : source ? (
          <Image
            src={source}
            alt={item.alt_text || "Creation media"}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
            unoptimized={item.mime_type === "image/gif"}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <HugeiconsIcon icon={Image01Icon} className="size-8" />
          </div>
        )}

        {/* Uploading Spinner Overlay */}
        {item.isUploading && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
            <HugeiconsIcon icon={Loading03Icon} className="size-6 animate-spin text-brand" />
            <span className="text-xs font-medium text-foreground">
              Processing...
            </span>
          </div>
        )}

        {/* Cover Badge */}
        {isCover && (
          <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-xs">
            <HugeiconsIcon icon={StarIcon} className="size-3 fill-current" />
            Cover
          </div>
        )}

        {/* Drag Handle & Top Controls */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-90 transition-opacity">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="flex size-7 items-center justify-center rounded-full bg-background/80 backdrop-blur-xs text-foreground hover:bg-background shadow-xs cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <HugeiconsIcon icon={DragDropVerticalIcon} className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={onRemove}
            className="flex size-7 items-center justify-center rounded-full bg-background/80 backdrop-blur-xs text-destructive hover:bg-background shadow-xs cursor-pointer"
            title="Remove media"
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Card Footer / Metadata Controls */}
      <div className="p-3 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          {item.kind === "image" && (
            <button
              type="button"
              onClick={onSetCover}
              className={cn(
                "inline-flex items-center gap-1 font-medium transition-colors cursor-pointer",
                isCover
                  ? "text-brand font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <HugeiconsIcon
                icon={StarIcon}
                className={cn("size-3.5", isCover && "fill-current text-brand")}
              />
              {isCover ? "Cover image" : "Set as cover"}
            </button>
          )}

          {item.kind === "embed" && (
            <span className="text-[11px] font-medium text-muted-foreground uppercase">
              {item.mime_type?.replace("video/", "")} embed
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsEditingMeta(!isEditingMeta)}
            className="text-muted-foreground hover:text-foreground font-medium cursor-pointer ml-auto"
          >
            {isEditingMeta ? "Done" : "Alt / Caption"}
          </button>
        </div>

        {/* Collapsible Alt & Caption Inputs */}
        {isEditingMeta && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div>
              <Label className="text-[10px] text-muted-foreground">
                Alt text (accessibility)
              </Label>
              <Input
                type="text"
                placeholder="Brief description of the image"
                value={item.alt_text || ""}
                onChange={(e) => onUpdateMetadata("alt_text", e.target.value)}
                className="h-7 text-xs mt-0.5"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">
                Caption (optional)
              </Label>
              <Input
                type="text"
                placeholder="Visible caption under media"
                value={item.caption || ""}
                onChange={(e) => onUpdateMetadata("caption", e.target.value)}
                className="h-7 text-xs mt-0.5"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

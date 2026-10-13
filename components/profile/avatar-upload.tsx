"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Upload01Icon,
  Delete02Icon,
  Camera01Icon,
} from "@hugeicons/core-free-icons";

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  userId: string;
  onAvatarUploaded: (publicUrl: string | null) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export function AvatarUpload({
  currentAvatarUrl,
  userId,
  onAvatarUploaded,
  disabled = false,
}: AvatarUploadProps) {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    currentAvatarUrl || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Helper to extract bucket storage path from a full public URL
  const extractStoragePath = (url: string | null | undefined): string | null => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      const marker = "/avatars/";
      const idx = parsed.pathname.indexOf(marker);
      if (idx !== -1) {
        return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
      }
    } catch {
      // not a valid URL
    }
    return null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers change
    e.target.value = "";
    setErrorMessage(null);

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage("File must be smaller than 2 MB.");
      return;
    }

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setErrorMessage("Please select a JPEG, PNG, or WebP image.");
      return;
    }

    setIsUploading(true);

    try {
      // Read file and draw onto canvas to center-crop 512x512 square and encode to WebP
      const blob = await cropToSquareWebP(file, 512);

      // Unique file path: {userId}/{timestamp}.webp
      const filePath = `${userId}/${Date.now()}.webp`;

      // Upload to Supabase Storage avatars bucket
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const newPublicUrl = publicUrlData.publicUrl;

      // Best-effort delete previous avatar object if it was in the avatars bucket
      const previousPath = extractStoragePath(currentAvatarUrl);
      if (previousPath && previousPath !== filePath) {
        await supabase.storage.from("avatars").remove([previousPath]);
      }

      setAvatarPreview(newPublicUrl);
      onAvatarUploaded(newPublicUrl);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to upload avatar.";
      setErrorMessage(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (disabled || isUploading) return;
    setErrorMessage(null);
    setIsUploading(true);

    try {
      const previousPath = extractStoragePath(currentAvatarUrl);
      if (previousPath) {
        await supabase.storage.from("avatars").remove([previousPath]);
      }

      setAvatarPreview(null);
      onAvatarUploaded(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to remove avatar.";
      setErrorMessage(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full min-w-0">
      <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 w-full min-w-0">
        {/* Avatar Preview */}
        <div className="relative flex size-14 sm:size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2">
          {avatarPreview ? (
            <Image
              src={avatarPreview}
              alt="Avatar preview"
              fill
              sizes="64px"
              className="object-cover"
              unoptimized
            />
          ) : (
            <HugeiconsIcon
              icon={Camera01Icon}
              className="size-6 text-muted-foreground"
            />
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-xs">
              <span className="size-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
              disabled={disabled || isUploading}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="h-8 text-xs font-medium cursor-pointer"
            >
              <HugeiconsIcon icon={Upload01Icon} className="mr-1.5 size-3.5" />
              {avatarPreview ? "Change photo" : "Upload photo"}
            </Button>

            {avatarPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveAvatar}
                disabled={disabled || isUploading}
                className="h-8 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
              >
                <HugeiconsIcon icon={Delete02Icon} className="mr-1.5 size-3.5" />
                Remove
              </Button>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground leading-normal break-words max-w-full text-pretty">
            JPEG, PNG or WebP under 2 MB. Square center-cropped to 512×512.
          </p>
        </div>
      </div>

      {errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}

/**
 * Center-crops an image file to a square and encodes to WebP using HTML5 canvas.
 */
function cropToSquareWebP(file: File, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = (e) => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Failed to load image."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not create canvas context."));
          return;
        }

        // Determine center square crop coordinates
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("WebP encoding failed."));
            }
          },
          "image/webp",
          0.85
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

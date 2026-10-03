"use client";

import React, { useState, type KeyboardEvent } from "react";
import { normalizeTag } from "@/lib/validation/creation-helpers";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Tag01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
}

export function TagInput({ tags, onChange, maxTags = 8 }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleAddTag = (raw: string) => {
    const normalized = normalizeTag(raw);
    if (!normalized || normalized.length < 2) return;

    if (tags.includes(normalized)) {
      toast.info(`Tag "${normalized}" is already added`);
      setInputValue("");
      return;
    }

    if (tags.length >= maxTags) {
      toast.error(`At most ${maxTags} tags allowed`);
      return;
    }

    onChange([...tags, normalized]);
    setInputValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-2xl border border-border bg-card focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent min-h-11">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <HugeiconsIcon icon={Tag01Icon} className="size-3 text-muted-foreground" />
            #{tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="text-muted-foreground hover:text-destructive rounded-full p-0.5 cursor-pointer transition-colors"
              title="Remove tag"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
            </button>
          </span>
        ))}

        {tags.length < maxTags && (
          <input
            type="text"
            placeholder={
              tags.length === 0
                ? "Add tags (e.g. nextjs, agentic, tailwind) - press Enter or comma..."
                : "Add another tag..."
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue.trim()) {
                handleAddTag(inputValue);
              }
            }}
            className="flex-1 min-w-36 bg-transparent px-2 py-1 text-xs outline-none placeholder:text-muted-foreground"
          />
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Tags help people discover your creation by topics or technologies ({tags.length}/{maxTags}).
      </p>
    </div>
  );
}

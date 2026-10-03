"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CreationWithDetails } from "@/lib/data/creations";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GlobeIcon,
  GithubIcon,
  Copy01Icon,
  CheckmarkCircle02Icon,
  AiSettingIcon,
  Edit02Icon,
  Share01Icon,
  Tag01Icon,
  PlayIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface CreationViewProps {
  creation: CreationWithDetails;
  isOwner?: boolean;
  descriptionNode?: React.ReactNode;
  stepBodyNodes?: Record<string, React.ReactNode>;
}

export function CreationView({
  creation,
  isOwner = false,
  descriptionNode,
  stepBodyNodes,
}: CreationViewProps) {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  const supabase = createClient();

  const getMediaUrl = (item: {
    external_url?: string | null;
    storage_path?: string | null;
  }) => {
    if (item.external_url) return item.external_url;
    if (item.storage_path) {
      const { data } = supabase.storage
        .from("creation-media")
        .getPublicUrl(item.storage_path);
      return data.publicUrl;
    }
    return "";
  };

  const handleCopyPrompt = (promptId: string, body: string) => {
    navigator.clipboard.writeText(body);
    setCopiedPromptId(promptId);
    toast.success("Prompt copied to clipboard!");
    setTimeout(() => {
      setCopiedPromptId(null);
    }, 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: creation.title,
        text: creation.summary || creation.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const currentMedia = creation.media[activeMediaIndex] || creation.media[0];

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Top Banner / Breadcrumb */}
      <div className="border-b border-border bg-card/40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span>/</span>
            {creation.category ? (
              <span className="text-foreground font-medium">
                {creation.category.name}
              </span>
            ) : (
              <span>Creations</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShare}
            >
              <HugeiconsIcon icon={Share01Icon} className="size-3.5" />
              Share
            </Button>

            {isOwner && (
              <Link href={`/c/${creation.slug}/edit`}>
                <Button variant="secondary" size="sm">
                  <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
                  Edit creation
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-10">
        {/* ============================================================= */}
        {/* HEADER: Title, Creator, Category, Links                       */}
        {/* ============================================================= */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {creation.category && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                {creation.category.name}
              </span>
            )}

            {creation.status !== "published" && (
              <span className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                {creation.status}
              </span>
            )}
          </div>

          <h1 className="font-bricolage text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {creation.title}
          </h1>

          {/* Creator Profile & Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border">
            <div className="flex items-center gap-3">
              {creation.creator && (
                <Link
                  href={`/@${creation.creator.username}`}
                  className="flex items-center gap-3 group"
                >
                  <Avatar className="size-10 border border-border">
                    <AvatarImage
                      src={creation.creator.avatar_url || ""}
                      alt={creation.creator.username}
                    />
                    <AvatarFallback className="font-bold text-xs">
                      {creation.creator.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors">
                      {creation.creator.display_name || creation.creator.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      @{creation.creator.username}
                    </p>
                  </div>
                </Link>
              )}
            </div>

            {/* Live / GitHub Links */}
            <div className="flex items-center gap-2">
              {creation.live_url && (
                <a
                  href={creation.live_url}
                  target="_blank"
                  rel="nofollow ugc noopener"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  <HugeiconsIcon icon={GlobeIcon} className="size-3.5" />
                  Live Preview
                </a>
              )}

              {creation.repo_url && (
                <a
                  href={creation.repo_url}
                  target="_blank"
                  rel="nofollow ugc noopener"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  <HugeiconsIcon icon={GithubIcon} className="size-3.5" />
                  Source Code
                </a>
              )}
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* MEDIA VIEWER: Hero Player / Image & Thumbnail Carousel        */}
        {/* ============================================================= */}
        {creation.media.length > 0 && (
          <section className="space-y-4">
            <div className="relative aspect-video w-full rounded-3xl border border-border bg-card overflow-hidden shadow-xs">
              {currentMedia?.kind === "embed" && currentMedia.external_url ? (
                <iframe
                  src={currentMedia.external_url}
                  title={currentMedia.alt_text || creation.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : currentMedia ? (
                <Image
                  src={getMediaUrl(currentMedia)}
                  alt={currentMedia.alt_text || creation.title}
                  fill
                  sizes="(max-width: 1200px) 100vw, 1024px"
                  className="object-contain bg-black/90"
                  priority
                />
              ) : null}

              {currentMedia?.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-background/80 backdrop-blur-md px-4 py-2 text-xs text-foreground/90 border-t border-border/60">
                  {currentMedia.caption}
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {creation.media.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {creation.media.map((item, idx) => {
                  const isActive = idx === activeMediaIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveMediaIndex(idx)}
                      className={cn(
                        "relative size-20 shrink-0 rounded-2xl border overflow-hidden transition-all cursor-pointer",
                        isActive
                          ? "ring-2 ring-brand border-transparent shadow-xs scale-105"
                          : "border-border opacity-70 hover:opacity-100"
                      )}
                    >
                      {item.kind === "embed" ? (
                        <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
                          <HugeiconsIcon icon={PlayIcon} className="size-6 text-foreground" />
                        </div>
                      ) : (
                        <Image
                          src={getMediaUrl(item)}
                          alt={item.alt_text || "Thumbnail"}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ============================================================= */}
        {/* TOOLS & TAGS ROW                                             */}
        {/* ============================================================= */}
        <section className="flex flex-wrap items-center gap-2">
          {creation.tools.map((t) => {
            const isPrimary = t.role === "primary";
            return (
              <span
                key={t.tool_id}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border",
                  isPrimary
                    ? "border-brand/40 bg-brand/10 text-brand"
                    : "border-border bg-card text-foreground"
                )}
              >
                <HugeiconsIcon icon={AiSettingIcon} className="size-3.5" />
                {t.tool.name}
                {t.version && (
                  <span className="text-[10px] opacity-75 font-normal">
                    {t.version}
                  </span>
                )}
              </span>
            );
          })}

          {creation.tags.map((tg) => (
            <span
              key={tg.tag_id}
              className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground"
            >
              <HugeiconsIcon icon={Tag01Icon} className="size-3" />
              #{tg.tag.name}
            </span>
          ))}
        </section>

        {/* ============================================================= */}
        {/* SUMMARY & DESCRIPTION                                         */}
        {/* ============================================================= */}
        {(creation.summary || creation.description) && (
          <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-4">
            {creation.summary && (
              <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed">
                {creation.summary}
              </p>
            )}

            {creation.description && descriptionNode && (
              <div className="pt-2 border-t border-border/60">
                {descriptionNode}
              </div>
            )}
          </section>
        )}

        {/* ============================================================= */}
        {/* PROCESS STEPS                                                 */}
        {/* ============================================================= */}
        {creation.steps.length > 0 && (
          <section className="space-y-6">
            <h2 className="font-bricolage text-2xl font-bold tracking-tight text-foreground">
              How It Was Made (Process)
            </h2>

            <div className="space-y-4">
              {creation.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className="rounded-3xl border border-border bg-card p-6 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-xs font-bold">
                      {idx + 1}
                    </span>
                    <h3 className="font-bricolage text-lg font-semibold text-foreground">
                      {step.title}
                    </h3>
                  </div>

                  {step.body && stepBodyNodes?.[step.id] && (
                    <div className="pl-10">
                      {stepBodyNodes[step.id]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================= */}
        {/* PROMPTS USED                                                  */}
        {/* ============================================================= */}
        {creation.prompts.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-bricolage text-2xl font-bold tracking-tight text-foreground">
              Prompts Used ({creation.prompts.length})
            </h2>

            <div className="space-y-4">
              {creation.prompts.map((item) => (
                <div
                  key={item.prompt_id}
                  className="rounded-3xl border border-border bg-card p-6 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-foreground">
                        {item.prompt.title}
                      </h3>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                        {item.prompt.kind}
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleCopyPrompt(item.prompt_id, item.prompt.body)
                      }
                    >
                      {copiedPromptId === item.prompt_id ? (
                        <>
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3.5 text-emerald-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <HugeiconsIcon icon={Copy01Icon} className="size-3.5" />
                          Copy prompt
                        </>
                      )}
                    </Button>
                  </div>

                  {item.note && (
                    <p className="text-xs text-muted-foreground italic">
                      Note: {item.note}
                    </p>
                  )}

                  <pre className="rounded-2xl border border-border bg-muted/50 p-4 font-mono text-xs text-foreground overflow-x-auto whitespace-pre-wrap break-words">
                    {item.prompt.body}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================= */}
        {/* RESOURCES USED                                                */}
        {/* ============================================================= */}
        {creation.resources.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-bricolage text-2xl font-bold tracking-tight text-foreground">
              Resources & Skills ({creation.resources.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {creation.resources.map((item) => (
                <div
                  key={item.resource_id}
                  className="rounded-2xl border border-border bg-card p-5 space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {item.resource.title}
                      </h3>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground shrink-0">
                        {item.resource.kind.replace("_", " ")}
                      </span>
                    </div>

                    {item.resource.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.resource.description}
                      </p>
                    )}

                    {item.note && (
                      <p className="text-xs text-brand font-medium">
                        Usage: {item.note}
                      </p>
                    )}
                  </div>

                  {item.resource.url && (
                    <div className="pt-2 border-t border-border/60">
                      <a
                        href={item.resource.url}
                        target="_blank"
                        rel="nofollow ugc noopener"
                        className="text-xs text-brand hover:underline font-semibold flex items-center gap-1 truncate"
                      >
                        <HugeiconsIcon icon={GlobeIcon} className="size-3 shrink-0" />
                        {item.resource.url}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

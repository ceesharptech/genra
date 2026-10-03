'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { CreationWithDetails } from '@/lib/data/creations'
import { getMediaUrl } from '@/lib/data/media'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Lightbox } from './lightbox'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  GlobeIcon,
  GithubIcon,
  AiSettingIcon,
  Edit02Icon,
  Share01Icon,
  Tag01Icon,
  PlayIcon,
  FavouriteIcon,
  Comment01Icon,
  EyeIcon,
  Maximize02Icon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CreationViewProps {
  creation: CreationWithDetails
  isOwner?: boolean
  descriptionNode?: React.ReactNode
  stepBodyNodes?: Record<string, React.ReactNode>
}

export function CreationView({
  creation,
  isOwner = false,
  descriptionNode,
  stepBodyNodes,
}: CreationViewProps) {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: creation.title,
          text: creation.summary || creation.title,
          url: window.location.href,
        })
        .catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard')
    }
  }

  const currentMedia = creation.media[activeMediaIndex] || creation.media[0]
  const currentMediaUrl = currentMedia
    ? getMediaUrl(currentMedia.storage_path || currentMedia.external_url)
    : null

  const creatorName =
    creation.creator?.display_name || creation.creator?.username || 'Creator'
  const creatorInitials = (creatorName.charAt(0) || 'C').toUpperCase()

  const formattedDate = creation.published_at
    ? new Date(creation.published_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="bg-background text-foreground min-h-screen pb-20">
      {/* Lightbox for full-screen media inspection */}
      {creation.media.length > 0 && (
        <Lightbox
          media={creation.media}
          currentIndex={activeMediaIndex}
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          onNavigate={(newIdx) => setActiveMediaIndex(newIdx)}
        />
      )}

      {/* Owner preview alert for non-published creations */}
      {creation.status !== 'published' && isOwner && (
        <div className="border-warning/30 bg-warning-soft text-warning border-b px-4 py-2.5 text-center text-xs">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <span>
              You are viewing a <strong>{creation.status}</strong> creation.
              Only you can see this page.
            </span>
            <Link href={`/c/${creation.slug}/edit`}>
              <Button variant="secondary" size="sm" className="h-7 text-xs">
                Edit creation
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Breadcrumb Navigation Bar */}
      <div className="border-border bg-card/40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link
              href="/discover"
              className="hover:text-foreground transition-colors"
            >
              Discover
            </Link>
            {creation.category && (
              <>
                <span>/</span>
                <Link
                  href={`/discover?category=${creation.category.slug}`}
                  className="text-foreground font-medium transition-colors hover:underline"
                >
                  {creation.category.name}
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-8 gap-1.5 rounded-full text-xs"
            >
              <HugeiconsIcon icon={Share01Icon} className="size-3.5" />
              <span>Share</span>
            </Button>

            {isOwner && (
              <Link href={`/c/${creation.slug}/edit`}>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 gap-1.5 rounded-full text-xs"
                >
                  <HugeiconsIcon icon={Edit02Icon} className="size-3.5" />
                  <span>Edit</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6">
        {/* ============================================================= */}
        {/* HEADER: Title, Creator, Category, Links                       */}
        {/* ============================================================= */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {creation.category && (
              <Link
                href={`/discover?category=${creation.category.slug}`}
                className="bg-secondary text-foreground hover:bg-surface-2 border-border rounded-full border px-3 py-1 text-xs font-medium transition-colors"
              >
                {creation.category.name}
              </Link>
            )}

            {creation.status !== 'published' && (
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold tracking-wider text-amber-600 uppercase dark:text-amber-400">
                {creation.status}
              </span>
            )}
          </div>

          <h1 className="font-bricolage text-foreground text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-5xl">
            {creation.title}
          </h1>

          {/* Creator Profile, Metrics & External Links */}
          <div className="border-border flex flex-wrap items-center justify-between gap-4 pt-4">
            <div className="flex items-center gap-3">
              {creation.creator && (
                <Link
                  href={`/u/${creation.creator.username}`}
                  className="group flex items-center gap-3"
                >
                  <Avatar className="border-border size-10 border">
                    <AvatarImage
                      src={creation.creator.avatar_url || ''}
                      alt={creatorName}
                    />
                    <AvatarFallback className="bg-surface-2 text-xs font-semibold">
                      {creatorInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-foreground group-hover:text-brand text-sm font-medium transition-colors">
                      {creatorName}
                    </p>
                    <p className="text-text-subtle text-xs">
                      @{creation.creator.username}
                    </p>
                  </div>
                </Link>
              )}
            </div>

            {/* Read-only Metrics Row & External Buttons */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-text-subtle border-border flex items-center gap-3 border-r pr-4 text-xs tabular-nums">
                <span
                  className="inline-flex items-center gap-1"
                  title={`${creation.like_count} likes`}
                >
                  <HugeiconsIcon
                    icon={FavouriteIcon}
                    className="text-muted-foreground size-3.5"
                  />
                  <span>{creation.like_count}</span>
                </span>
                <span
                  className="inline-flex items-center gap-1"
                  title={`${creation.comment_count} comments`}
                >
                  <HugeiconsIcon
                    icon={Comment01Icon}
                    className="text-muted-foreground size-3.5"
                  />
                  <span>{creation.comment_count}</span>
                </span>
                <span
                  className="inline-flex items-center gap-1"
                  title={`${creation.view_count} views`}
                >
                  <HugeiconsIcon
                    icon={EyeIcon}
                    className="text-muted-foreground size-3.5"
                  />
                  <span>{creation.view_count}</span>
                </span>
                {formattedDate && (
                  <span className="text-muted-foreground/80 pl-1 text-[11px]">
                    {formattedDate}
                  </span>
                )}
              </div>

              {/* Live / GitHub Links */}
              <div className="flex items-center gap-2">
                {creation.live_url && (
                  <a
                    href={creation.live_url}
                    target="_blank"
                    rel="nofollow ugc noopener"
                    className="border-border bg-card text-foreground hover:bg-secondary inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors"
                  >
                    <HugeiconsIcon icon={GlobeIcon} className="size-3.5" />
                    <span>Live site</span>
                  </a>
                )}

                {creation.repo_url && (
                  <a
                    href={creation.repo_url}
                    target="_blank"
                    rel="nofollow ugc noopener"
                    className="border-border bg-card text-foreground hover:bg-secondary inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors"
                  >
                    <HugeiconsIcon icon={GithubIcon} className="size-3.5" />
                    <span>Source</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* MEDIA VIEWER: Hero Player / Image & Thumbnail Carousel        */}
        {/* ============================================================= */}
        {creation.media.length > 0 && (
          <section className="space-y-3">
            <div
              onClick={() => setIsLightboxOpen(true)}
              className="group border-border bg-surface-2 hover:border-border-strong relative aspect-video w-full cursor-zoom-in overflow-hidden rounded-xl border shadow-xs transition-colors"
            >
              {currentMedia?.kind === 'embed' && currentMedia.external_url ? (
                <iframe
                  src={currentMedia.external_url}
                  title={currentMedia.alt_text || creation.title}
                  className="pointer-events-none size-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              ) : currentMediaUrl ? (
                <Image
                  src={currentMediaUrl}
                  alt={currentMedia.alt_text || creation.title}
                  fill
                  sizes="(max-width: 1200px) 100vw, 1024px"
                  className="object-contain transition-transform duration-200 ease-out group-hover:scale-[1.01]"
                  priority
                />
              ) : null}

              {/* Overlay with expand icon */}
              <div className="absolute top-3 right-3 rounded-full bg-black/50 p-2 text-white/80 opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100">
                <HugeiconsIcon icon={Maximize02Icon} className="size-4" />
              </div>

              {currentMedia?.caption && (
                <div className="border-border/40 bg-background/80 text-foreground/90 absolute inset-x-0 bottom-0 border-t px-4 py-2 text-xs backdrop-blur-md">
                  {currentMedia.caption}
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {creation.media.length > 1 && (
              <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
                {creation.media.map((item, idx) => {
                  const isActive = idx === activeMediaIndex
                  const itemUrl = getMediaUrl(
                    item.storage_path || item.external_url
                  )
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveMediaIndex(idx)}
                      className={cn(
                        'relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border transition-all',
                        isActive
                          ? 'ring-brand border-transparent shadow-xs ring-2'
                          : 'border-border opacity-70 hover:opacity-100'
                      )}
                    >
                      {item.kind === 'embed' ? (
                        <div className="bg-muted text-muted-foreground flex size-full items-center justify-center">
                          <HugeiconsIcon
                            icon={PlayIcon}
                            className="text-foreground size-5"
                          />
                        </div>
                      ) : itemUrl ? (
                        <Image
                          src={itemUrl}
                          alt={item.alt_text || 'Thumbnail'}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : null}
                    </button>
                  )
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
            const isPrimary = t.role === 'primary'
            return (
              <Link
                key={t.tool_id}
                href={`/discover?tools=${encodeURIComponent(t.tool.slug)}`}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-normal transition-colors',
                  isPrimary
                    ? 'border-brand/40 bg-brand-soft text-brand-text hover:bg-brand-soft/80'
                    : 'border-border bg-card text-foreground hover:bg-secondary'
                )}
              >
                <HugeiconsIcon
                  icon={AiSettingIcon}
                  className="text-muted-foreground size-3.5"
                />
                <span className="font-medium">{t.tool.name}</span>
                {t.version && (
                  <span className="text-text-subtle font-mono text-[10px]">
                    {t.version}
                  </span>
                )}
              </Link>
            )
          })}

          {creation.tags.map((tg) => (
            <Link
              key={tg.tag_id}
              href={`/discover?q=${encodeURIComponent(tg.tag.name)}`}
              className="bg-surface-2 text-muted-foreground hover:text-foreground border-border/40 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors"
            >
              <HugeiconsIcon icon={Tag01Icon} className="size-3" />
              <span>#{tg.tag.name}</span>
            </Link>
          ))}
        </section>

        {/* ============================================================= */}
        {/* SUMMARY & DESCRIPTION                                         */}
        {/* ============================================================= */}
        {(creation.summary || creation.description) && (
          <section className="border-border bg-card space-y-4 rounded-xl border p-6 sm:p-8">
            {creation.summary && (
              <p className="text-foreground text-base leading-relaxed font-normal sm:text-lg">
                {creation.summary}
              </p>
            )}

            {creation.description && descriptionNode && (
              <div className="border-border border-t pt-4">
                {descriptionNode}
              </div>
            )}
          </section>
        )}

        {/* ============================================================= */}
        {/* PROCESS STEPS TIMELINE                                        */}
        {/* ============================================================= */}
        {creation.steps.length > 0 && (
          <section className="space-y-6" aria-labelledby="steps-heading">
            <h2
              id="steps-heading"
              className="font-bricolage text-foreground text-2xl font-semibold tracking-tight"
            >
              Process and steps
            </h2>

            <div className="before:bg-border relative space-y-8 pl-6 before:absolute before:top-3 before:bottom-3 before:left-2.5 before:w-px sm:pl-8 sm:before:left-3.5">
              {creation.steps.map((step, idx) => (
                <div key={step.id} className="relative space-y-2">
                  {/* Node Marker */}
                  <span className="bg-foreground text-background ring-background absolute top-1 -left-6 flex size-5 items-center justify-center rounded-full text-[10px] font-semibold ring-4 sm:-left-8 sm:size-7 sm:text-xs">
                    {idx + 1}
                  </span>

                  <div className="border-border bg-card space-y-3 rounded-xl border p-5">
                    <h3 className="font-bricolage text-foreground text-base font-semibold sm:text-lg">
                      {step.title}
                    </h3>
                    {step.body && stepBodyNodes?.[step.id] && (
                      <div className="text-foreground/90 text-sm leading-relaxed">
                        {stepBodyNodes[step.id]}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================= */}
        {/* PROMPTS USED (Read-Only in Phase 03)                          */}
        {/* ============================================================= */}
        {creation.prompts.length > 0 && (
          <section className="space-y-4" aria-labelledby="prompts-heading">
            <h2
              id="prompts-heading"
              className="font-bricolage text-foreground text-2xl font-semibold tracking-tight"
            >
              Prompts used ({creation.prompts.length})
            </h2>

            <div className="space-y-4">
              {creation.prompts.map((item) => (
                <div
                  key={item.prompt_id}
                  className="border-border bg-card space-y-3 rounded-xl border p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-foreground text-sm font-medium">
                        {item.prompt.title}
                      </h3>
                      <span className="bg-secondary text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium uppercase">
                        {item.prompt.kind}
                      </span>
                    </div>
                  </div>

                  {item.note && (
                    <p className="text-text-subtle text-xs italic">
                      Note: {item.note}
                    </p>
                  )}

                  <pre className="border-border bg-surface text-foreground overflow-x-auto rounded-lg border p-4 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
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
          <section className="space-y-4" aria-labelledby="resources-heading">
            <h2
              id="resources-heading"
              className="font-bricolage text-foreground text-2xl font-semibold tracking-tight"
            >
              Resources and skills ({creation.resources.length})
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {creation.resources.map((item) => (
                <div
                  key={item.resource_id}
                  className="border-border bg-card flex flex-col justify-between space-y-3 rounded-xl border p-5"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-foreground truncate text-sm font-medium">
                        {item.resource.title}
                      </h3>
                      <span className="bg-secondary text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase">
                        {item.resource.kind.replace('_', ' ')}
                      </span>
                    </div>

                    {item.resource.description && (
                      <p className="text-muted-foreground line-clamp-2 text-xs">
                        {item.resource.description}
                      </p>
                    )}

                    {item.note && (
                      <p className="text-brand-text text-xs font-medium">
                        Usage: {item.note}
                      </p>
                    )}
                  </div>

                  {item.resource.url && (
                    <div className="border-border/60 border-t pt-2">
                      <a
                        href={item.resource.url}
                        target="_blank"
                        rel="nofollow ugc noopener"
                        className="text-brand-text flex items-center gap-1 truncate text-xs font-medium hover:underline"
                      >
                        <HugeiconsIcon
                          icon={GlobeIcon}
                          className="size-3 shrink-0"
                        />
                        <span>{item.resource.url}</span>
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
  )
}

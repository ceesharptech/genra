'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { deleteCreationAction } from '@/lib/creations/actions'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  PlusSignIcon,
  Edit02Icon,
  ViewIcon,
  Delete02Icon,
  Image01Icon,
  AiSettingIcon,
  WorkflowSquare01Icon,
  Alert02Icon,
  LockIcon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export interface DashboardCreationItem {
  id: string
  slug: string
  title: string
  summary: string | null
  status: 'draft' | 'published' | 'archived'
  moderation_locked?: boolean
  created_at: string
  updated_at: string
  published_at: string | null
  categoryName: string
  coverStoragePath: string | null
  toolCount: number
  stepCount: number
}

interface CreationsDashboardProps {
  initialCreations: DashboardCreationItem[]
  error?: string | null
}

export function CreationsDashboard({
  initialCreations,
  error,
}: CreationsDashboardProps) {
  const [creations, setCreations] =
    useState<DashboardCreationItem[]>(initialCreations)
  const [filter, setFilter] = useState<
    'all' | 'published' | 'draft' | 'archived'
  >('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const supabase = createClient()

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-bricolage text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            My Creations
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your AI projects, edit drafts, and view published work.
          </p>
        </div>

        <div className="border-border bg-card/40 space-y-4 rounded-3xl border border-dashed p-12 text-center">
          <div className="bg-destructive/10 text-destructive mx-auto flex size-12 items-center justify-center rounded-full">
            <HugeiconsIcon icon={Alert02Icon} className="size-6" />
          </div>
          <div className="space-y-1">
            <h2 className="font-bricolage text-foreground text-lg font-bold">
              Couldn&apos;t load creations
            </h2>
            <p className="text-muted-foreground mx-auto max-w-sm text-xs">
              {error}
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Try again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const getCoverUrl = (path: string | null) => {
    if (!path) return null
    const { data } = supabase.storage.from('creation-media').getPublicUrl(path)
    return data.publicUrl
  }

  const filteredCreations = creations.filter((c) => {
    if (filter === 'all') return true
    return c.status === filter
  })

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return

    setDeletingId(id)
    try {
      const res = await deleteCreationAction(id)
      if (!res.ok) {
        toast.error(res.error || 'Failed to delete creation')
        return
      }
      setCreations(creations.filter((c) => c.id !== id))
      toast.success('Creation deleted')
    } catch (err: unknown) {
      const error = err as Error
      toast.error(error?.message || 'Failed to delete creation')
    } finally {
      setDeletingId(null)
    }
  }

  const counts = {
    all: creations.length,
    published: creations.filter((c) => c.status === 'published').length,
    draft: creations.filter((c) => c.status === 'draft').length,
    archived: creations.filter((c) => c.status === 'archived').length,
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Header with Title & "New Creation" CTA */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-bricolage text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            My Creations
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your AI projects, edit drafts, and view published work.
          </p>
        </div>

        {/* <Link href="/new">
          <Button variant="brand" size="md">
            <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
            New creation
          </Button>
        </Link> */}
      </div>

      {/* Tabs */}
      <div className="border-border flex w-full max-w-full gap-2 overflow-x-auto pb-2 text-xs font-semibold no-scrollbar">
        {(['all', 'published', 'draft', 'archived'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={cn(
              'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 capitalize transition-colors',
              filter === tab
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {tab}
            <span
              className={cn(
                'py-0.2 rounded-full px-1.5 text-[10px]',
                filter === tab
                  ? 'bg-background/20 text-background'
                  : 'bg-background text-muted-foreground'
              )}
            >
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Creations Grid */}
      {filteredCreations.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 w-full min-w-0">
          {filteredCreations.map((item) => {
            const coverUrl = getCoverUrl(item.coverStoragePath)
            return (
              <div
                key={item.id}
                className="group border-border bg-card hover:border-foreground/30 relative flex w-full min-w-0 flex-col overflow-hidden rounded-3xl border transition-all hover:shadow-xs"
              >
                {/* Media Thumbnail */}
                <Link
                  href={`/c/${item.slug}`}
                  className="bg-muted relative block aspect-video w-full overflow-hidden"
                >
                  {coverUrl ? (
                    <Image
                      src={coverUrl}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-102"
                    />
                  ) : (
                    <div className="text-muted-foreground flex size-full items-center justify-center">
                      <HugeiconsIcon icon={Image01Icon} className="size-8" />
                    </div>
                  )}

                  {/* Status Pill */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    {item.moderation_locked ? (
                      <span className="rounded-full bg-red-600/95 px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase text-white shadow-xs backdrop-blur-md flex items-center gap-1">
                        <HugeiconsIcon icon={LockIcon} className="size-3" />
                        <span>Removed</span>
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase shadow-xs backdrop-blur-md',
                          item.status === 'published'
                            ? 'bg-emerald-500/90 text-white'
                            : item.status === 'archived'
                              ? 'bg-muted/90 text-muted-foreground'
                              : 'bg-brand/90 text-white'
                        )}
                      >
                        {item.status}
                      </span>
                    )}
                  </div>
                </Link>

                {/* Card Content */}
                <div className="flex flex-1 min-w-0 flex-col justify-between space-y-3 p-4">
                  <div className="space-y-1 min-w-0">
                    <div className="text-muted-foreground text-[11px] font-medium uppercase">
                      {item.categoryName}
                    </div>
                    <Link
                      href={`/c/${item.slug}`}
                      className="font-bricolage text-foreground hover:text-brand line-clamp-1 block text-base font-semibold transition-colors"
                    >
                      {item.title}
                    </Link>
                    {item.summary && (
                      <p className="text-muted-foreground line-clamp-2 text-xs">
                        {item.summary}
                      </p>
                    )}
                  </div>

                  {item.moderation_locked && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                      <HugeiconsIcon icon={LockIcon} className="size-4 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-semibold">Removed by moderators</p>
                        <p className="text-[11px] text-red-600/80 dark:text-red-400/80">
                          This creation violated policies and cannot be published.{' '}
                          <Link href="/content-policy" className="underline hover:text-foreground font-medium">
                            See Content Policy
                          </Link>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Metadata Stats */}
                  <div className="text-muted-foreground border-border/60 flex items-center gap-3 border-t pt-1 text-[11px]">
                    <span className="flex items-center gap-1">
                      <HugeiconsIcon icon={AiSettingIcon} className="size-3" />
                      {item.toolCount} {item.toolCount === 1 ? 'tool' : 'tools'}
                    </span>
                    {item.stepCount > 0 && (
                      <span className="flex items-center gap-1">
                        <HugeiconsIcon
                          icon={WorkflowSquare01Icon}
                          className="size-3"
                        />
                        {item.stepCount} steps
                      </span>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-1 gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {!item.moderation_locked && (
                        <Link href={`/c/${item.slug}/edit`}>
                          <Button variant="secondary" size="sm">
                            <HugeiconsIcon
                              icon={Edit02Icon}
                              className="size-3.5"
                            />
                            Edit
                          </Button>
                        </Link>
                      )}

                      <Link href={`/c/${item.slug}`}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="View creation"
                        >
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
            )
          })}
        </div>
      ) : (
        <div className="border-border bg-card/40 space-y-3 rounded-3xl border border-dashed p-12 text-center">
          <div className="bg-muted text-muted-foreground mx-auto flex size-12 items-center justify-center rounded-full">
            <HugeiconsIcon
              icon={PlusSignIcon}
              className="text-foreground size-6"
            />
          </div>
          <h2 className="font-bricolage text-foreground text-lg font-bold">
            No creations found in {filter}
          </h2>
          <p className="text-muted-foreground mx-auto max-w-sm text-xs">
            {filter === 'all'
              ? 'Start sharing your AI-assisted work with the community.'
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
  )
}

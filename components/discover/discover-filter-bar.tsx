'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Category, PopularToolItem, Tool } from '@/lib/data/creations'
import { searchToolsAction } from '@/lib/creations/actions'
import {
  type DiscoverFilters,
  buildDiscoverUrl,
} from '@/lib/creations/filters'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Search01Icon,
  Cancel01Icon,
  FilterHorizontalIcon,
  ArrowDown01Icon,
  Tick02Icon,
  Loading03Icon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'

interface DiscoverFilterBarProps {
  categories: Category[]
  popularToolsList: PopularToolItem[]
  filters: DiscoverFilters
}

const SORT_LABELS: Record<DiscoverFilters['sort'], string> = {
  trending: 'Trending',
  new: 'Newest',
  popular: 'Most popular',
}

export function DiscoverFilterBar({
  categories,
  popularToolsList,
  filters,
}: DiscoverFilterBarProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Local state for search query to ensure snappy typing before debounce
  const currentFilterQ = filters.q?.trim() || ''
  const [searchQuery, setSearchQuery] = useState(currentFilterQ)
  const [prevFilterQ, setPrevFilterQ] = useState(currentFilterQ)
  const lastPushedQ = useRef<string>(currentFilterQ)

  // Sync searchQuery with filters.q when props change from an external source (e.g. back/forward nav, clear filters)
  if (currentFilterQ !== prevFilterQ) {
    setPrevFilterQ(currentFilterQ)
    if (currentFilterQ !== lastPushedQ.current) {
      lastPushedQ.current = currentFilterQ
      setSearchQuery(currentFilterQ)
    }
  }

  // Tool popover state
  const [isToolPopoverOpen, setIsToolPopoverOpen] = useState(false)
  const [toolQuery, setToolQuery] = useState('')
  const [searchedTools, setSearchedTools] = useState<Array<{ name: string; slug: string }>>([])
  const [isSearchingTools, setIsSearchingTools] = useState(false)
  const toolPopoverRef = useRef<HTMLDivElement>(null)

  const defaultToolResults = popularToolsList.map((t) => ({
    name: t.name,
    slug: t.slug,
  }))
  const toolResults = toolQuery.trim() ? searchedTools : defaultToolResults

  // Debounce search query update to URL
  useEffect(() => {
    const trimmed = searchQuery.trim()
    const currentQ = filters.q?.trim() || ''
    if (trimmed === currentQ) return

    const timer = setTimeout(() => {
      startTransition(() => {
        lastPushedQ.current = trimmed
        const url = buildDiscoverUrl({
          ...filters,
          q: trimmed || null,
        })
        router.replace(url, { scroll: false })
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, filters, router])

  const handleClearSearch = () => {
    lastPushedQ.current = ''
    setSearchQuery('')
    startTransition(() => {
      const url = buildDiscoverUrl({
        ...filters,
        q: null,
      })
      router.replace(url, { scroll: false })
    })
  }

  // Handle click outside tool popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        toolPopoverRef.current &&
        !toolPopoverRef.current.contains(event.target as Node)
      ) {
        setIsToolPopoverOpen(false)
      }
    }
    if (isToolPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isToolPopoverOpen])

  // Search tools inside popover (only fires when query is non-empty)
  useEffect(() => {
    if (!isToolPopoverOpen) return
    const trimmed = toolQuery.trim()
    if (!trimmed) return

    let active = true
    const timer = setTimeout(async () => {
      setIsSearchingTools(true)
      try {
        const tools: Tool[] = await searchToolsAction(trimmed)
        if (active) {
          setSearchedTools(tools.map((t) => ({ name: t.name, slug: t.slug })))
        }
      } catch (err) {
        console.error('Failed to search tools:', err)
      } finally {
        if (active) setIsSearchingTools(false)
      }
    }, 200)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [toolQuery, isToolPopoverOpen])

  const handleCategorySelect = (categorySlug: string | null) => {
    startTransition(() => {
      const url = buildDiscoverUrl({
        ...filters,
        category: categorySlug,
      })
      router.replace(url, { scroll: false })
    })
  }

  const handleToolToggle = (toolSlug: string) => {
    startTransition(() => {
      const current = new Set(filters.tools)
      if (current.has(toolSlug)) {
        current.delete(toolSlug)
      } else {
        current.add(toolSlug)
      }
      const updatedTools = Array.from(current)
      const url = buildDiscoverUrl({
        ...filters,
        tools: updatedTools,
      })
      router.replace(url, { scroll: false })
    })
  }

  const handleSortSelect = (sort: DiscoverFilters['sort']) => {
    startTransition(() => {
      const url = buildDiscoverUrl({
        ...filters,
        sort,
      })
      router.replace(url, { scroll: false })
    })
  }

  const handleClearAll = () => {
    lastPushedQ.current = ''
    setSearchQuery('')
    startTransition(() => {
      router.replace('/discover', { scroll: false })
    })
  }

  const hasActiveFilters = Boolean(
    filters.q || filters.category || filters.tools.length > 0 || filters.sort !== 'trending'
  )

  const activeCategoryObj = categories.find((c) => c.slug === filters.category)

  return (
    <div className="sticky top-16 z-30 w-full border-b border-border bg-background/90 backdrop-blur-md transition-colors">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 space-y-3">
        {/* Top Controls Row: Search, Tool Filter, Sort */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              {isPending ? (
                <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin text-brand" />
              ) : (
                <HugeiconsIcon icon={Search01Icon} className="size-4" />
              )}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search creations..."
              className="h-9 w-full rounded-full border border-border bg-card pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground shadow-2xs transition-colors focus-visible:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear search input"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
              </button>
            )}
          </div>

          {/* Tool Popover and Sort Actions */}
          <div className="flex items-center gap-2">
            {/* Tool Filter Trigger & Popover */}
            <div className="relative" ref={toolPopoverRef}>
              <Button
                variant={filters.tools.length > 0 ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setIsToolPopoverOpen((prev) => !prev)}
                className={cn(
                  'h-9 rounded-full text-xs font-normal gap-1.5 px-3.5',
                  filters.tools.length > 0 && 'border-foreground/30 font-medium'
                )}
              >
                <HugeiconsIcon icon={FilterHorizontalIcon} className="size-3.5 text-muted-foreground" />
                <span>
                  {filters.tools.length > 0 ? `Tools (${filters.tools.length})` : 'Tools'}
                </span>
                <HugeiconsIcon icon={ArrowDown01Icon} className="size-3 text-muted-foreground" />
              </Button>

              {/* Tool Popover Content */}
              {isToolPopoverOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-xl border border-border bg-popover p-3 shadow-lg z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                  <div className="relative mb-2.5">
                    <HugeiconsIcon
                      icon={Search01Icon}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
                    />
                    <input
                      type="text"
                      value={toolQuery}
                      onChange={(e) => setToolQuery(e.target.value)}
                      placeholder="Filter tools..."
                      className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
                      autoFocus
                    />
                    {isSearchingTools && (
                      <HugeiconsIcon
                        icon={Loading03Icon}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-muted-foreground"
                      />
                    )}
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-0.5 text-xs py-1">
                    {toolResults.length === 0 ? (
                      <p className="py-4 text-center text-text-subtle text-xs">
                        No matching tools found
                      </p>
                    ) : (
                      toolResults.map((tool) => {
                        const isSelected = filters.tools.includes(tool.slug)
                        return (
                          <button
                            key={tool.slug}
                            type="button"
                            onClick={() => handleToolToggle(tool.slug)}
                            className={cn(
                              'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent',
                              isSelected && 'font-medium text-foreground bg-accent/60'
                            )}
                          >
                            <span>{tool.name}</span>
                            {isSelected && (
                              <HugeiconsIcon
                                icon={Tick02Icon}
                                className="size-3.5 text-brand"
                              />
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>

                  {filters.tools.length > 0 && (
                    <div className="mt-2.5 border-t border-border pt-2 flex justify-between items-center text-xs">
                      <span className="text-text-subtle text-[11px]">
                        {filters.tools.length} selected
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          startTransition(() => {
                            router.replace(buildDiscoverUrl({ ...filters, tools: [] }), {
                              scroll: false,
                            })
                          })
                        }
                        className="text-[11px] text-text-subtle hover:text-foreground"
                      >
                        Clear tool filters
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-full text-xs font-normal gap-1.5 px-3.5"
                  >
                    <span>Sort: {SORT_LABELS[filters.sort]}</span>
                    <HugeiconsIcon icon={ArrowDown01Icon} className="size-3 text-muted-foreground" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => handleSortSelect('trending')}
                  className={cn(filters.sort === 'trending' && 'font-medium')}
                >
                  Trending
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSortSelect('new')}
                  className={cn(filters.sort === 'new' && 'font-medium')}
                >
                  Newest
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSortSelect('popular')}
                  className={cn(filters.sort === 'popular' && 'font-medium')}
                >
                  Most popular
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Category Horizontal Scrolling Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            type="button"
            onClick={() => handleCategorySelect(null)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1 transition-colors text-xs',
              !filters.category
                ? 'bg-foreground text-background font-medium shadow-2xs'
                : 'bg-surface-2 text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            All Categories
          </button>
          {categories.map((cat) => {
            const isSelected = filters.category === cat.slug
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(isSelected ? null : cat.slug)}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 transition-colors text-xs',
                  isSelected
                    ? 'bg-foreground text-background font-medium shadow-2xs'
                    : 'bg-surface-2 text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                {cat.name}
              </button>
            )
          })}
        </div>

        {/* Active Filters Summary Row (Only visible when active filters exist) */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40 text-xs">
            <span className="text-[11px] text-text-subtle mr-1">Active filters:</span>

            {filters.q && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] text-foreground">
                <span>&ldquo;{filters.q}&rdquo;</span>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Remove search filter"
                  className="hover:text-destructive"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                </button>
              </span>
            )}

            {activeCategoryObj && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] text-foreground">
                <span>Category: {activeCategoryObj.name}</span>
                <button
                  type="button"
                  onClick={() => handleCategorySelect(null)}
                  aria-label="Remove category filter"
                  className="hover:text-destructive"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                </button>
              </span>
            )}

            {filters.tools.map((toolSlug) => {
              const matched = popularToolsList.find((t) => t.slug === toolSlug)
              const toolName = matched ? matched.name : toolSlug
              return (
                <span
                  key={toolSlug}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] text-foreground"
                >
                  <span>Tool: {toolName}</span>
                  <button
                    type="button"
                    onClick={() => handleToolToggle(toolSlug)}
                    aria-label={`Remove ${toolName} filter`}
                    className="hover:text-destructive"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                  </button>
                </span>
              )
            })}

            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-text-subtle underline hover:text-foreground transition-colors ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

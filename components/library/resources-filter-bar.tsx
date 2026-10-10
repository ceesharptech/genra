'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { PopularToolItem } from '@/lib/data/creations';
import { searchToolsAction } from '@/lib/creations/actions';
import {
  type ResourcesQuery,
  type ResourceKind,
  resourceKindEnum,
  buildResourcesUrl,
} from '@/lib/validation/library';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  Cancel01Icon,
  ArrowDown01Icon,
  Tick02Icon,
  Loading03Icon,
  Add01Icon,
  AiSettingIcon,
  DocumentCodeIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

interface ResourcesFilterBarProps {
  popularTools: PopularToolItem[];
  filters: ResourcesQuery;
}

const SORT_LABELS: Record<'popular' | 'new', string> = {
  popular: 'Most popular',
  new: 'Newest',
};

const KIND_LABELS: Record<ResourceKind, string> = {
  skill: 'Skill',
  template: 'Template',
  ui_kit: 'UI kit',
  workflow: 'Workflow',
  agent: 'Agent',
  mcp_server: 'MCP server',
  reference: 'Reference',
  tutorial: 'Tutorial',
  dataset: 'Dataset',
  asset: 'Asset',
  other: 'Other',
};

export function ResourcesFilterBar({
  popularTools,
  filters,
}: ResourcesFilterBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentFilterQ = filters.q?.trim() || '';
  const [searchQuery, setSearchQuery] = useState(currentFilterQ);
  const [prevFilterQ, setPrevFilterQ] = useState(currentFilterQ);
  const lastPushedQ = useRef<string>(currentFilterQ);

  if (currentFilterQ !== prevFilterQ) {
    setPrevFilterQ(currentFilterQ);
    if (currentFilterQ !== lastPushedQ.current) {
      lastPushedQ.current = currentFilterQ;
      setSearchQuery(currentFilterQ);
    }
  }

  // Tool popover state
  const [isToolPopoverOpen, setIsToolPopoverOpen] = useState(false);
  const [toolQuery, setToolQuery] = useState('');
  const [searchedTools, setSearchedTools] = useState<Array<{ name: string; slug: string }>>([]);
  const [isSearchingTools, setIsSearchingTools] = useState(false);
  const toolPopoverRef = useRef<HTMLDivElement>(null);

  const defaultToolResults = popularTools.map((t) => ({
    name: t.name,
    slug: t.slug,
  }));
  const toolResults = toolQuery.trim() ? searchedTools : defaultToolResults;

  // Debounce search query update
  useEffect(() => {
    const trimmed = searchQuery.trim();
    const currentQ = filters.q?.trim() || '';
    if (trimmed === currentQ) return;

    const timer = setTimeout(() => {
      startTransition(() => {
        lastPushedQ.current = trimmed;
        const url = buildResourcesUrl({
          ...filters,
          q: trimmed,
          page: 1,
        });
        router.replace(url, { scroll: false });
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, filters, router]);

  // Click outside to close tool popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        toolPopoverRef.current &&
        !toolPopoverRef.current.contains(event.target as Node)
      ) {
        setIsToolPopoverOpen(false);
      }
    }

    if (isToolPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isToolPopoverOpen]);

  // Debounced search for tools
  useEffect(() => {
    if (!toolQuery.trim()) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingTools(true);
      try {
        const results = await searchToolsAction(toolQuery);
        setSearchedTools(results.map((t) => ({ name: t.name, slug: t.slug })));
      } catch (err) {
        console.error('Failed to search tools:', err);
      } finally {
        setIsSearchingTools(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [toolQuery]);

  const handleClearSearch = () => {
    lastPushedQ.current = '';
    setSearchQuery('');
    startTransition(() => {
      const url = buildResourcesUrl({
        ...filters,
        q: '',
        page: 1,
      });
      router.replace(url, { scroll: false });
    });
  };

  const handleKindSelect = (kind?: ResourceKind) => {
    startTransition(() => {
      const url = buildResourcesUrl({
        ...filters,
        kind,
        page: 1,
      });
      router.replace(url, { scroll: false });
    });
  };

  const handleToolSelect = (toolSlug: string) => {
    setIsToolPopoverOpen(false);
    setToolQuery('');
    startTransition(() => {
      const nextTool = filters.tool === toolSlug ? '' : toolSlug;
      const url = buildResourcesUrl({
        ...filters,
        tool: nextTool,
        page: 1,
      });
      router.replace(url, { scroll: false });
    });
  };

  const handleSortChange = (sort: 'popular' | 'new') => {
    startTransition(() => {
      const url = buildResourcesUrl({
        ...filters,
        sort,
        page: 1,
      });
      router.replace(url, { scroll: false });
    });
  };

  const hasActiveFilters = Boolean(
    filters.q || filters.kind || (filters.tool && filters.tool.length > 0) || filters.sort !== 'popular'
  );

  const handleClearAll = () => {
    lastPushedQ.current = '';
    setSearchQuery('');
    startTransition(() => {
      router.replace('/resources', { scroll: false });
    });
  };

  const selectedToolName =
    filters.tool &&
    (popularTools.find((t) => t.slug === filters.tool)?.name || filters.tool);

  return (
    <div className="sticky top-16 z-30 mb-8 border-b border-border/40 bg-background/80 py-3 backdrop-blur-md">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Search input + Kind filter + Tool selector + Sort */}
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Search bar */}
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <HugeiconsIcon
              icon={Search01Icon}
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="focus-visible:ring-brand h-9 w-full rounded-lg border border-border/70 bg-card pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:ring-1 focus-visible:outline-none"
            />
            {isPending && (
              <HugeiconsIcon
                icon={Loading03Icon}
                className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground"
              />
            )}
            {!isPending && searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
              </button>
            )}
          </div>

          {/* Kind dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'h-9 gap-1.5 rounded-lg border-border/70 bg-card px-3 text-xs font-normal shadow-2xs hover:bg-muted cursor-pointer',
                filters.kind && 'border-foreground/30 bg-muted/60 font-medium text-foreground'
              )}
            >
              <HugeiconsIcon icon={DocumentCodeIcon} className="size-3.5 text-muted-foreground" />
              <span>{filters.kind ? KIND_LABELS[filters.kind] : 'All kinds'}</span>
              <HugeiconsIcon icon={ArrowDown01Icon} className="size-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-40 max-h-72 overflow-y-auto">
              <DropdownMenuItem
                onClick={() => handleKindSelect(undefined)}
                className="flex items-center justify-between text-xs"
              >
                <span>All kinds</span>
                {!filters.kind && <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />}
              </DropdownMenuItem>
              {resourceKindEnum.options.map((k) => (
                <DropdownMenuItem
                  key={k}
                  onClick={() => handleKindSelect(k)}
                  className="flex items-center justify-between text-xs"
                >
                  <span>{KIND_LABELS[k]}</span>
                  {filters.kind === k && <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tool filter */}
          <div className="relative" ref={toolPopoverRef}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsToolPopoverOpen((prev) => !prev)}
              className={cn(
                'h-9 gap-1.5 rounded-lg border-border/70 bg-card px-3 text-xs font-normal shadow-2xs hover:bg-muted',
                filters.tool && 'border-foreground/30 bg-muted/60 font-medium text-foreground'
              )}
            >
              <HugeiconsIcon icon={AiSettingIcon} className="size-3.5 text-muted-foreground" />
              <span>{selectedToolName ? selectedToolName : 'Tool'}</span>
              <HugeiconsIcon icon={ArrowDown01Icon} className="size-3 text-muted-foreground" />
            </Button>

            {isToolPopoverOpen && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-border/80 bg-popover p-2 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
                <input
                  type="text"
                  placeholder="Filter by tool..."
                  value={toolQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setToolQuery(val);
                    if (!val.trim()) {
                      setSearchedTools([]);
                    }
                  }}
                  className="focus-visible:ring-brand mb-2 h-8 w-full rounded-md border border-border/60 bg-muted/40 px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:outline-none"
                  autoFocus
                />
                <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                  {filters.tool && (
                    <button
                      type="button"
                      onClick={() => handleToolSelect(filters.tool)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <span>Clear tool filter</span>
                      <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                    </button>
                  )}
                  {toolResults.map((t) => {
                    const isSelected = filters.tool === t.slug;
                    return (
                      <button
                        key={t.slug}
                        type="button"
                        onClick={() => handleToolSelect(t.slug)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted',
                          isSelected && 'bg-muted/80 font-medium text-foreground'
                        )}
                      >
                        <span className="truncate">{t.name}</span>
                        {isSelected && (
                          <HugeiconsIcon icon={Tick02Icon} className="size-3 text-foreground" />
                        )}
                      </button>
                    );
                  })}
                  {toolResults.length === 0 && !isSearchingTools && (
                    <div className="py-3 text-center text-xs text-muted-foreground">
                      No tools found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'h-9 gap-1.5 rounded-lg border-border/70 bg-card px-3 text-xs font-normal shadow-2xs hover:bg-muted cursor-pointer'
              )}
            >
              <span className="text-muted-foreground">Sort:</span>
              <span className="font-medium text-foreground">{SORT_LABELS[filters.sort]}</span>
              <HugeiconsIcon icon={ArrowDown01Icon} className="size-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-36">
              {(['popular', 'new'] as const).map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => handleSortChange(s)}
                  className="flex items-center justify-between text-xs"
                >
                  <span>{SORT_LABELS[s]}</span>
                  {filters.sort === s && (
                    <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear all */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-9 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Right action: Add resource */}
        <div className="flex shrink-0 items-center">
          <Link
            href="/resources/new"
            className={cn(
              buttonVariants({ variant: 'default', size: 'sm' }),
              'h-9 gap-1.5 rounded-lg px-3.5 text-xs font-medium shadow-2xs'
            )}
          >
            <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
            <span>Share resource</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

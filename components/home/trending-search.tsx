'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Search01Icon,
  Cancel01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons'

const POPULAR_SUGGESTIONS = [
  { label: 'Websites', href: '/discover?category=websites' },
  { label: 'Apps', href: '/discover?category=apps' },
  { label: 'Claude', href: '/discover?tools=claude' },
  { label: 'ChatGPT', href: '/discover?tools=chatgpt' },
  { label: 'Cursor', href: '/discover?tools=cursor' },
  { label: 'Midjourney', href: '/discover?tools=midjourney' },
  { label: 'Agents', href: '/discover?category=agents' },
  { label: 'Design', href: '/discover?category=design' },
  { label: 'Workflows', href: '/discover?category=automations' },
]

export function TrendingSearch() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      router.push(`/discover?q=${encodeURIComponent(trimmed)}`)
    } else {
      router.push('/discover')
    }
  }

  return (
    <div className="w-full space-y-3.5 sm:space-y-4">
      {/* Search Input Bar (smooth border transition, zero outline or ring) */}
      <form onSubmit={handleSubmit} className="relative w-full" role="search">
        <div className="relative flex w-full items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What type of creation are you looking for?"
            className="border-border bg-card/90 text-foreground placeholder:text-muted-foreground focus:border-border-strong h-14 w-full rounded-full border pl-6 pr-16 text-sm shadow-2xs outline-none ring-0 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 sm:h-15 sm:text-base"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground absolute right-14 p-1 transition-colors sm:right-15"
              aria-label="Clear search"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
            </button>
          )}

          <div className="absolute right-2 sm:right-2.5">
            <button
              type="submit"
              aria-label="Search"
              className="bg-brand text-brand-foreground hover:bg-brand-hover flex size-10 items-center justify-center rounded-full shadow-xs transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:size-10.5"
            >
              <HugeiconsIcon
                icon={Search01Icon}
                className="size-4.5 stroke-[2] transition-transform duration-200 sm:size-5"
              />
            </button>
          </div>
        </div>
      </form>

      {/* Suggestion Pills Row */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <span className="text-foreground mr-1 shrink-0 text-xs font-semibold sm:text-sm">
          Popular:
        </span>

        {POPULAR_SUGGESTIONS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="border-border/80 bg-background text-foreground/80 hover:bg-secondary hover:border-border hover:text-foreground rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 active:scale-[0.98] sm:text-sm"
          >
            {item.label}
          </Link>
        ))}

        <Link
          href="/discover?sort=trending"
          className="group text-muted-foreground hover:bg-secondary hover:border-border hover:text-foreground border-border/80 bg-background ml-auto hidden items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 active:scale-[0.98] lg:inline-flex sm:text-sm"
        >
          <span>Trending</span>
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </div>
  )
}

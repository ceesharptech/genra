'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import { Search01Icon, Cancel01Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'

export function HeroSearch() {
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
    <form
      onSubmit={handleSubmit}
      className="relative flex w-full max-w-2xl items-center"
      role="search"
    >
      <div className="relative flex w-full items-center">
        <div className="pointer-events-none absolute left-4 flex items-center text-muted-foreground">
          <HugeiconsIcon icon={Search01Icon} className="size-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search creations, prompts, tools, categories..."
          className="h-13 w-full rounded-full border border-border bg-card pl-11 pr-24 text-base text-foreground shadow-xs placeholder:text-muted-foreground transition-all duration-150 focus-visible:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-24 text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Clear search"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
          </button>
        )}
        <div className="absolute right-1.5">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="h-10 rounded-full px-5 text-xs font-semibold sm:text-sm"
          >
            Search
          </Button>
        </div>
      </div>
    </form>
  )
}

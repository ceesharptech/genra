'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import { Search01Icon, Cancel01Icon } from '@hugeicons/core-free-icons'

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
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search creations, prompts, tools, categories..."
          className="border-border bg-card text-foreground placeholder:text-muted-foreground focus-visible:border-border-strong focus-visible:ring-brand h-13 w-full rounded-full border pr-14 pl-5 text-sm shadow-xs transition-all duration-150 focus-visible:ring-2 focus-visible:outline-none sm:pl-6 sm:text-base"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-muted-foreground hover:text-foreground absolute right-13 p-1 transition-colors"
            aria-label="Clear search"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
          </button>
        )}
        <div className="absolute right-1.5">
          {/* <button
            type="submit"
            aria-label="Search"
            className="group bg-brand-500 hover:bg-brand-600 focus-visible:ring-brand dark:bg-brand-500 dark:hover:bg-brand-400 relative flex size-10 items-center justify-center rounded-full text-white transition-all duration-150 ease-out hover:cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          ></button> */}
          <button
            type="submit"
            aria-label="Search"
            className="group from-brand-500 to-brand-400 border-brand-300 focus-visible:ring-brand dark:bg-brand-500 dark:hover:bg-brand-400 relative flex size-10 items-center justify-center rounded-full border bg-gradient-to-b text-white shadow-[inset_0_1px_0_rgba(119,76,255,0.4),0_4px_12px_rgba(157,123,255,0.35),0_1px_2px_rgba(0,0,0,0.15)] transition-all duration-150 ease-out hover:cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <HugeiconsIcon
              icon={Search01Icon}
              className="size-4.5 stroke-[2.2] transition-transform duration-150 group-hover:scale-110"
            />
          </button>
        </div>
      </div>
    </form>
  )
}

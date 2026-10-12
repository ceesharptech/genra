'use client'

import React from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/auth-provider'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight01Icon, PlusSignIcon } from '@hugeicons/core-free-icons'

export function HeroCtaButtons() {
  const { user } = useAuth()

  const createHref = user
    ? '/new'
    : '/login?next=%2Fnew&intent=create%3Acreation%3Anew'

  return (
    <div className="flex flex-wrap items-center justify-center gap-3.5">
      {/* Primary Action Button: Embossed Brand Purple Gradient */}
      <Link
        href={createHref}
        className="group focus-visible:ring-ring relative inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#774CFF]/80 bg-gradient-to-b from-[#8B64FF] via-[#774CFF] to-[#6335E8] px-7 text-sm font-medium text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),inset_0_-1px_0_0_rgba(0,0,0,0.22),0_1px_2px_0_rgba(0,0,0,0.1),0_4px_14px_0_rgba(119,76,255,0.32)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:from-[#9470FF] hover:via-[#7E55FF] hover:to-[#6A3CF0] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-0 active:scale-[0.98] active:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.3)]"
      >
        {user && (
          <HugeiconsIcon icon={PlusSignIcon} className="size-4 text-white/90" />
        )}
        <span>{user ? 'New Creation' : 'Start Creating'}</span>
      </Link>

      {/* Secondary Action Button: Embossed Neutral Pearl/Obsidian Gradient */}
      <Link
        href="/discover"
        className="group border-border/85 text-foreground hover:border-border focus-visible:ring-ring relative inline-flex h-11 items-center justify-center gap-2 rounded-full border bg-gradient-to-b from-white via-[#FCFCFD] to-[#F1F1F4] px-7 text-sm font-medium shadow-[inset_0_1px_0_0_rgba(255,255,255,0.95),inset_0_-1px_0_0_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:from-[#FAF9FD] hover:to-[#ECECF0] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0_4px_12px_0_rgba(0,0,0,0.06)] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-0 active:scale-[0.98] active:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.1)] dark:border-white/10 dark:from-[#26262B] dark:via-[#1E1E22] dark:to-[#17171A] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),inset_0_-1px_0_0_rgba(0,0,0,0.4),0_1px_3px_0_rgba(0,0,0,0.4)] dark:hover:from-[#2D2D33] dark:hover:to-[#1C1C20] dark:hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_4px_12px_0_rgba(0,0,0,0.5)]"
      >
        <span>Explore Now</span>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          className="text-muted-foreground group-hover:text-foreground size-4 transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  )
}

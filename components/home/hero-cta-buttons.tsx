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
        className="group relative inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#774CFF]/80 bg-gradient-to-b from-[#8B64FF] via-[#774CFF] to-[#6335E8] px-7 text-sm font-medium text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),inset_0_-1px_0_0_rgba(0,0,0,0.22),0_1px_2px_0_rgba(0,0,0,0.1),0_4px_14px_0_rgba(119,76,255,0.32)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:from-[#9470FF] hover:via-[#7E55FF] hover:to-[#6A3CF0] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),inset_0_-1px_0_0_rgba(0,0,0,0.25),0_6px_20px_0_rgba(119,76,255,0.45)] active:translate-y-0 active:scale-[0.98] active:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {user && (
          <HugeiconsIcon icon={PlusSignIcon} className="size-4 text-white/90" />
        )}
        <span>{user ? 'New Creation' : 'Start Creating'}</span>
      </Link>

      {/* Secondary Action Button: Embossed Neutral Pearl Pill (matches light container in all modes) */}
      <Link
        href="/discover"
        className="group relative inline-flex h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-gradient-to-b from-white via-[#FCFCFD] to-[#F1F1F4] px-7 text-sm font-medium text-[#111113] shadow-[inset_0_1px_0_0_rgba(255,255,255,1),inset_0_-1px_0_0_rgba(0,0,0,0.06),0_1px_2px_0_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-black/15 hover:from-[#FAF9FD] hover:to-[#ECECF0] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0_4px_12px_0_rgba(0,0,0,0.06)] active:translate-y-0 active:scale-[0.98] active:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span>Explore Now</span>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          className="size-4 text-[#5F5F68] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#111113]"
        />
      </Link>
    </div>
  )
}

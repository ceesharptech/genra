'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'motion/react'

import type { Variants } from 'motion/react'

interface CategoryCardData {
  slug: string
  name: string
  description?: string
  count?: number
}

interface CategoryShowcaseProps {
  categories: CategoryCardData[]
}

const CATEGORIES = [
  { slug: 'apps', name: 'Apps' },
  { slug: 'websites', name: 'Websites' },
  { slug: 'agents', name: 'Agents' },
  { slug: 'automations', name: 'Automations' },
  { slug: 'images', name: 'Images' },
  { slug: 'design', name: 'Design' },
]

export function CategoryShowcase({ categories }: CategoryShowcaseProps) {
  const countMap = new Map(categories.map((c) => [c.slug, c.count || 0]))
  const shouldReduceMotion = useReducedMotion()

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
      },
    },
  }

  const cardVariants: Variants = {
    hidden: {
      opacity: 0,
      scale: shouldReduceMotion ? 1 : 0.94,
      y: shouldReduceMotion ? 0 : 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.55,
        ease: [0.23, 1, 0.32, 1],
      },
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3"
    >
      {CATEGORIES.map((item) => {
        const count = countMap.get(item.slug) ?? 0

        return (
          <motion.div key={item.slug} variants={cardVariants}>
            <Link
              href={`/discover?category=${encodeURIComponent(item.slug)}`}
              className="group flex flex-col gap-3.5 focus-visible:outline-none"
            >
              {/* The Card: 100% occupied by the image, rounded-3xl, overflow-hidden */}
              <div className="border-border/70 bg-surface-2/60 group-hover:border-border-strong group-hover:bg-surface-2 group-focus-visible:ring-ring dark:bg-surface-2/30 dark:hover:bg-surface-2/60 relative aspect-[4/3] w-full overflow-hidden rounded-3xl border shadow-2xs transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:shadow-xs group-focus-visible:ring-2 group-focus-visible:ring-offset-2 sm:aspect-[16/11]">
                <Image
                  src={`/images/categories/${item.slug}.webp`}
                  alt={item.name}
                  fill
                  className="object-cover object-center transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>

              {/* Category Title & Count placed below the card */}
              <div className="flex flex-col items-center px-1 text-center">
                <h3 className="text-foreground text-base font-semibold tracking-tight transition-colors sm:text-lg">
                  {item.name}
                </h3>
                {count > 0 && (
                  <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                    {count} {count === 1 ? 'creation' : 'creations'}
                  </p>
                )}
              </div>
            </Link>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

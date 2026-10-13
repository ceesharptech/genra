'use client'

import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { HeroSwappingIcon } from '@/components/home/hero-swapping-icon'
import { HeroCtaButtons } from '@/components/home/hero-cta-buttons'

export function HeroSection() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: shouldReduceMotion ? 0 : 28,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative overflow-hidden rounded-[24px] border border-[#E8E8EE] bg-gradient-to-br from-[#F6F3FF] via-[#FAF9FD] to-[#EFF6FF] p-6 py-28 shadow-2xs transition-colors sm:rounded-[32px] sm:p-12 sm:py-20 lg:p-16 lg:py-32"
    >
      {/* Soft corner ambient blooms (soft sky blue top-right, soft brand lavender bottom-left) */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-[#DBEAFE]/80 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 size-80 rounded-full bg-[#EAE3FF]/90 blur-3xl"
        aria-hidden="true"
      />

      {/* Hero Section Content (Light color maintained in both themes) */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center">
        <motion.h1
          initial={{
            opacity: 0,
            y: shouldReduceMotion ? 0 : 20,
            filter: shouldReduceMotion ? 'none' : 'blur(10px)',
          }}
          animate={{
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
          }}
          transition={{
            duration: 0.65,
            delay: 0.18,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="font-bricolage text-[#111113] max-w-4xl text-4xl font-medium tracking-tighter text-balance sm:text-5xl lg:text-6xl"
        >
          Discover what creators are building with AI <HeroSwappingIcon />
        </motion.h1>

        <motion.p
          initial={{
            opacity: 0,
            y: shouldReduceMotion ? 0 : 16,
            filter: shouldReduceMotion ? 'none' : 'blur(8px)',
          }}
          animate={{
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
          }}
          transition={{
            duration: 0.6,
            delay: 0.34,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="text-[#5F5F68] mt-4 max-w-xl text-base font-normal text-pretty sm:mt-5 sm:text-lg"
        >
          The open discovery platform for AI-made work. Browse creations,
          prompts, and the process.
        </motion.p>

        <motion.div
          initial={{
            opacity: 0,
            y: shouldReduceMotion ? 0 : 14,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
            delay: 0.5,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="mt-8 sm:mt-10"
        >
          <HeroCtaButtons />
        </motion.div>
      </section>
    </motion.div>
  )
}

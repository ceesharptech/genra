'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'

const AI_TOOLS = [
  { name: 'Claude', src: '/images/ai-icons/claude-ai-logo.png' },
  { name: 'ChatGPT', src: '/images/ai-icons/chatgpt-ai-logo.png' },
  { name: 'Gemini', src: '/images/ai-icons/gemini-ai-logo.png' },
  { name: 'Grok', src: '/images/ai-icons/grok-ai-logo.png' },
  { name: 'Codex', src: '/images/ai-icons/codex-ai-logo.png' },
  { name: 'Cursor', src: '/images/ai-icons/cursor-ai-logo.png' },
  { name: 'Kimi', src: '/images/ai-icons/kimi-ai-logo.png' },
]

export function HeroSwappingIcon() {
  const [index, setIndex] = useState(0)
  const [stage, setStage] = useState<'visible' | 'exit' | 'enter'>('visible')

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    if (stage === 'visible') {
      timeoutId = setTimeout(() => {
        setStage('exit')
      }, 2400)
    } else if (stage === 'exit') {
      timeoutId = setTimeout(() => {
        setIndex((prev) => (prev + 1) % AI_TOOLS.length)
        setStage('enter')
      }, 320)
    } else if (stage === 'enter') {
      const frameId = requestAnimationFrame(() => {
        setStage('visible')
      })
      return () => cancelAnimationFrame(frameId)
    }

    return () => clearTimeout(timeoutId)
  }, [stage])

  const currentTool = AI_TOOLS[index]

  const stageClasses = {
    visible: 'opacity-100 translate-y-0 scale-100 filter-none duration-350',
    exit: 'opacity-0 -translate-y-3.5 scale-90 blur-[2px] duration-300',
    enter: 'opacity-0 translate-y-3.5 scale-90 blur-[2px] duration-0',
  }[stage]

  return (
    <span
      className="group/icon border-border/80 bg-card relative mx-1.5 inline-flex size-10 -translate-y-0.5 items-center justify-center overflow-hidden rounded-lg border align-middle shadow-2xs ring-1 ring-black/5 transition-transform duration-200 select-none hover:scale-105 sm:mx-2 sm:size-12 sm:-translate-y-1 sm:rounded-2xl lg:size-14 dark:shadow-none dark:ring-white/10"
      role="img"
      aria-label={`AI tool: ${currentTool.name}`}
      title={currentTool.name}
    >
      <span
        key={currentTool.name}
        className={`relative flex size-full items-center justify-center p-2 transition-all ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transform-none motion-reduce:filter-none motion-reduce:transition-opacity sm:p-2.5 ${stageClasses}`}
      >
        <Image
          src={currentTool.src}
          alt={currentTool.name}
          width={36}
          height={36}
          className="size-6 object-contain sm:size-7 lg:size-8"
          priority
        />
      </span>
    </span>
  )
}

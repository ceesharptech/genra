'use client'

import React, { useState, useEffect } from 'react'

const PHRASES = [
  'building with AI',
  'designing with AI',
  'curating with AI',
  'automating with AI',
  'crafting with AI',
]

export function HeroDynamicText() {
  const [index, setIndex] = useState(0)
  const [stage, setStage] = useState<'visible' | 'exit' | 'enter'>('visible')

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    if (stage === 'visible') {
      timeoutId = setTimeout(() => {
        setStage('exit')
      }, 2600)
    } else if (stage === 'exit') {
      timeoutId = setTimeout(() => {
        setIndex((prev) => (prev + 1) % PHRASES.length)
        setStage('enter')
      }, 450)
    } else if (stage === 'enter') {
      // Immediate next frame transition to visible
      const frameId = requestAnimationFrame(() => {
        setStage('visible')
      })
      return () => cancelAnimationFrame(frameId)
    }

    return () => clearTimeout(timeoutId)
  }, [stage])

  const stageClasses = {
    visible: 'opacity-100 translate-y-0 filter-none scale-100 duration-500',
    exit: 'opacity-0 -translate-y-3 blur-md scale-[0.96] duration-450',
    enter: 'opacity-0 translate-y-3 blur-md scale-[0.96] duration-0',
  }[stage]

  return (
    <span
      className={`from-brand-600 via-brand-500 to-brand-400 dark:from-brand-400 dark:via-brand-300 dark:to-brand-400 inline-block bg-gradient-to-r bg-clip-text text-transparent transition-all ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transform-none motion-reduce:filter-none motion-reduce:transition-none ${stageClasses}`}
    >
      {PHRASES[index]}
    </span>
  )
}

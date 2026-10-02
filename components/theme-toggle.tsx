'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { HugeiconsIcon } from '@hugeicons/react'
import { Sun01Icon, Moon02Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'

const emptySubscribe = () => () => {}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        className={className}
        disabled
      >
        <span className="block size-4" />
      </Button>
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={className}
    >
      {isDark ? (
        <HugeiconsIcon
          icon={Sun01Icon}
          className="size-4 transition-transform duration-200"
        />
      ) : (
        <HugeiconsIcon
          icon={Moon02Icon}
          className="size-4 transition-transform duration-200"
        />
      )}
    </Button>
  )
}

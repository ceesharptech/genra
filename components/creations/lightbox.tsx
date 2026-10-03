'use client'

import React, { useEffect, useCallback } from 'react'
import Image from 'next/image'
import type { CreationMedia } from '@/lib/data/creations'
import { getMediaUrl } from '@/lib/data/media'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Cancel01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  PlayIcon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'

interface LightboxProps {
  media: CreationMedia[]
  currentIndex: number
  isOpen: boolean
  onClose: () => void
  onNavigate: (newIndex: number) => void
}

export function Lightbox({
  media,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
}: LightboxProps) {
  const currentMedia = media[currentIndex] || media[0]
  const total = media.length

  const handlePrev = useCallback(() => {
    onNavigate((currentIndex - 1 + total) % total)
  }, [currentIndex, onNavigate, total])

  const handleNext = useCallback(() => {
    onNavigate((currentIndex + 1) % total)
  }, [currentIndex, onNavigate, total])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handlePrev, handleNext, onClose])

  if (!isOpen || !currentMedia) return null

  const mediaUrl = getMediaUrl(currentMedia.storage_path || currentMedia.external_url)

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        {/* Backdrop */}
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm animate-in fade-in-0 duration-150" />

        {/* Fullscreen Popup */}
        <DialogPrimitive.Popup className="fixed inset-0 z-50 flex flex-col justify-between p-4 outline-none select-none">
          {/* Top Bar: Counter & Close Button */}
          <div className="flex items-center justify-between text-white/80 z-10 px-2 py-1">
            <span className="text-xs font-mono tabular-nums">
              {currentIndex + 1} / {total}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="Close lightbox"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-5" />
            </button>
          </div>

          {/* Main Media Area with Navigation Buttons */}
          <div className="relative flex-1 flex items-center justify-center min-h-0 my-2">
            {/* Prev Button */}
            {total > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2 sm:left-4 z-20 rounded-full bg-black/60 p-3 text-white/80 hover:bg-black/80 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Previous image"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-6" />
              </button>
            )}

            {/* Media Container */}
            <div className="relative h-full w-full max-w-6xl max-h-[80vh] flex items-center justify-center">
              {currentMedia.kind === 'embed' && currentMedia.external_url ? (
                <div className="aspect-video w-full max-w-4xl h-full max-h-[75vh]">
                  <iframe
                    src={currentMedia.external_url}
                    title={currentMedia.alt_text || 'Media embed'}
                    className="w-full h-full rounded-lg border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : mediaUrl ? (
                <div className="relative h-full w-full">
                  <Image
                    src={mediaUrl}
                    alt={currentMedia.alt_text || 'Creation media'}
                    fill
                    sizes="100vw"
                    className="object-contain"
                    priority
                  />
                </div>
              ) : null}
            </div>

            {/* Next Button */}
            {total > 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2 sm:right-4 z-20 rounded-full bg-black/60 p-3 text-white/80 hover:bg-black/80 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Next image"
              >
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-6" />
              </button>
            )}
          </div>

          {/* Bottom Bar: Caption and Thumbnails */}
          <div className="flex flex-col items-center gap-2 z-10">
            {currentMedia.caption && (
              <p className="max-w-2xl text-center text-xs text-white/70">
                {currentMedia.caption}
              </p>
            )}

            {total > 1 && (
              <div className="flex gap-2 overflow-x-auto p-1 max-w-full no-scrollbar">
                {media.map((item, idx) => {
                  const itemUrl = getMediaUrl(item.storage_path || item.external_url)
                  const isActive = idx === currentIndex
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigate(idx)}
                      className={cn(
                        'relative size-12 sm:size-14 shrink-0 rounded-md overflow-hidden border transition-all cursor-pointer',
                        isActive
                          ? 'border-brand ring-2 ring-brand scale-105'
                          : 'border-white/20 opacity-60 hover:opacity-100'
                      )}
                    >
                      {item.kind === 'embed' ? (
                        <div className="flex size-full items-center justify-center bg-zinc-900 text-white">
                          <HugeiconsIcon icon={PlayIcon} className="size-4" />
                        </div>
                      ) : itemUrl ? (
                        <Image
                          src={itemUrl}
                          alt={item.alt_text || 'Thumbnail'}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { mapAuthCallbackError, getAuthErrorMessage } from '@/lib/auth/errors'
import { useRequireAuth } from './auth-modal-provider'

/**
 * Handles error parameters delivered in the URL fragment (#error=...&error_code=...)
 * which the server cannot see. Cleans the fragment and notifies the user.
 */
export function AuthHashHandler() {
  const pathname = usePathname()
  const router = useRouter()
  const { openLoginModal } = useRequireAuth()

  useEffect(() => {
    if (typeof window === 'undefined' || !window.location.hash) return

    const hash = window.location.hash.substring(1)
    if (!hash) return

    const params = new URLSearchParams(hash)
    const error = params.get('error')
    const errorCode = params.get('error_code')
    const errorDescription = params.get('error_description')

    if (error || errorCode || errorDescription) {
      const mappedCode = mapAuthCallbackError({ error, errorCode, errorDescription })
      const friendlyMessage = getAuthErrorMessage(mappedCode)

      // Remove the hash fragment from the URL without triggering a page reload
      const cleanUrl = window.location.pathname + window.location.search
      window.history.replaceState(null, '', cleanUrl)

      if (pathname === '/login') {
        const currentParams = new URLSearchParams(window.location.search)
        currentParams.set('error', mappedCode)
        router.replace(`/login?${currentParams.toString()}`)
      } else {
        toast.error(friendlyMessage || 'Sign-in could not be completed.', {
          action: {
            label: 'Sign in',
            onClick: () => openLoginModal(),
          },
          duration: 8000,
        })
      }
    }
  }, [pathname, router, openLoginModal])

  return null
}

'use client'

import React, { createContext, useContext, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './auth-provider'
import { formatIntent } from '@/lib/auth/intents'

interface OpenModalOptions {
  message?: string
  intent?: string
  next?: string
}

interface AuthModalContextType {
  openLoginModal: (options?: OpenModalOptions) => void
  closeLoginModal: () => void
  isModalOpen: boolean
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(
  undefined
)

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const openLoginModal = useCallback(
    (options?: OpenModalOptions) => {
      const targetNext = options?.next || pathname || '/'
      const params = new URLSearchParams()
      if (targetNext && targetNext !== '/') {
        params.set('next', targetNext)
      }
      if (options?.intent) {
        params.set('intent', options.intent)
      }
      if (options?.message) {
        params.set('message', options.message)
      }
      const search = params.toString()
      router.push(`/login${search ? `?${search}` : ''}`)
    },
    [pathname, router]
  )

  const closeLoginModal = useCallback(() => {
    // Dedicated page navigation replaces modal popup
  }, [])

  return (
    <AuthModalContext.Provider
      value={{
        openLoginModal,
        closeLoginModal,
        isModalOpen: false,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  )
}

export function useRequireAuth() {
  const { user } = useAuth()
  const context = useContext(AuthModalContext)

  if (!context) {
    throw new Error('useRequireAuth must be used within an AuthModalProvider')
  }

  const { openLoginModal } = context

  const requireAuth = useCallback(
    (
      action: () => void | Promise<void>,
      options?: { message?: string; intent?: string; next?: string }
    ) => {
      if (user) {
        action()
      } else {
        openLoginModal(options)
      }
    },
    [user, openLoginModal]
  )

  return { requireAuth, openLoginModal }
}

export function AuthGate({
  action,
  targetType,
  targetId,
  message,
  onPerform,
  children,
}: {
  action: string
  targetType: string
  targetId: string
  message?: string
  onPerform?: () => void
  children:
    | React.ReactNode
    | ((props: { onClick: (e: React.MouseEvent) => void }) => React.ReactNode)
}) {
  const { requireAuth } = useRequireAuth()
  const pathname = usePathname()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const intentStr = formatIntent(action, targetType, targetId)
    requireAuth(
      () => {
        onPerform?.()
      },
      {
        message: message || 'Log in to perform this action',
        intent: intentStr,
        next: pathname,
      }
    )
  }

  if (typeof children === 'function') {
    return <>{children({ onClick: handleClick })}</>
  }

  return (
    <span onClick={handleClick} className="inline-flex cursor-pointer">
      {children}
    </span>
  )
}

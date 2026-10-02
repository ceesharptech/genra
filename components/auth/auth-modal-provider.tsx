'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from './auth-provider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { LoginForm } from './login-form'
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
  const [isOpen, setIsOpen] = useState(false)
  const [modalOptions, setModalOptions] = useState<OpenModalOptions>({})
  const pathname = usePathname()

  const openLoginModal = useCallback(
    (options?: OpenModalOptions) => {
      setModalOptions({
        message: options?.message,
        intent: options?.intent,
        next: options?.next || pathname || '/',
      })
      setIsOpen(true)
    },
    [pathname]
  )

  const closeLoginModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <AuthModalContext.Provider
      value={{
        openLoginModal,
        closeLoginModal,
        isModalOpen: isOpen,
      }}
    >
      {children}

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) closeLoginModal()
        }}
      >
        <DialogContent className="p-6 sm:max-w-md">
          <DialogHeader className="mb-2 text-left">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Sign in to Genra
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Discover and share what people create with AI.
            </DialogDescription>
          </DialogHeader>

          <LoginForm
            message={modalOptions.message}
            next={modalOptions.next}
            intent={modalOptions.intent}
            onSuccess={closeLoginModal}
          />
        </DialogContent>
      </Dialog>
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

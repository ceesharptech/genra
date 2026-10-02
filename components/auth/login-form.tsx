'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { safeRedirectPath } from '@/lib/auth/redirect'
import { emailSchema, otpCodeSchema } from '@/lib/validation/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LoginFormProps {
  message?: string
  next?: string
  intent?: string
  onSuccess?: () => void
  errorParam?: string
  className?: string
}

export function LoginForm({
  message,
  next = '/',
  intent,
  onSuccess,
  errorParam,
  className,
}: LoginFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (!errorParam) return null
    if (errorParam === 'invalid_code' || errorParam === 'missing_code') {
      return 'The sign-in code was invalid or expired. Please request a new one.'
    } else if (errorParam === 'oauth_error') {
      return 'Google sign-in was cancelled or failed. Please try again.'
    }
    return 'Unable to sign in. Please try again.'
  })
  const [cooldown, setCooldown] = useState(0)

  const otpInputRef = useRef<HTMLInputElement>(null)

  // Compute the final target redirect path including any intent query parameter
  const baseSafeNext = safeRedirectPath(next, '/')
  const targetNext = intent
    ? baseSafeNext.includes('?')
      ? `${baseSafeNext}&intent=${encodeURIComponent(intent)}`
      : `${baseSafeNext}?intent=${encodeURIComponent(intent)}`
    : baseSafeNext

  // Handle resend countdown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Focus OTP input when step changes to OTP
  useEffect(() => {
    if (step === 'otp') {
      otpInputRef.current?.focus()
    }
  }, [step])

  // Google OAuth sign-in
  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    const siteUrl = window.location.origin
    const callbackUrl = `${siteUrl}/auth/callback?next=${encodeURIComponent(targetNext)}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
      },
    })

    if (error) {
      setIsLoading(false)
      setErrorMessage('Could not connect to Google. Please try email sign-in.')
    }
  }

  // Submit email to receive 6-digit OTP code
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const parseResult = emailSchema.safeParse(email)
    if (!parseResult.success) {
      setErrorMessage(parseResult.error.issues[0]?.message ?? 'Invalid email')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      })

      if (error) {
        if (error.status === 429) {
          setErrorMessage(
            'Too many requests. Please wait a minute before trying again.'
          )
        } else {
          setErrorMessage(
            error.message ||
              'Failed to send verification code. Please try again.'
          )
        }
        return
      }

      setStep('otp')
      setCooldown(60)
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Resend OTP code
  const handleResendOtp = async () => {
    if (cooldown > 0 || isLoading) return
    setErrorMessage(null)
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      })

      if (error) {
        setErrorMessage(error.message || 'Failed to resend code.')
        return
      }

      setCooldown(60)
    } catch {
      setErrorMessage('Failed to resend code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Verify 6-digit OTP code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const cleanCode = otpCode.trim()
    const parseResult = otpCodeSchema.safeParse(cleanCode)
    if (!parseResult.success) {
      setErrorMessage('Please enter all 6 digits of your code.')
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: cleanCode,
        type: 'email',
      })

      if (error || !data.user) {
        if (error?.message?.toLowerCase().includes('expired')) {
          setErrorMessage('This code has expired. Please request a new one.')
        } else {
          setErrorMessage('Incorrect code. Please check and try again.')
        }
        return
      }

      // Check onboarding state in database
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarded_at')
        .eq('id', data.user.id)
        .single()

      onSuccess?.()

      if (!profile || !profile.onboarded_at) {
        router.replace(`/onboarding?next=${encodeURIComponent(targetNext)}`)
      } else {
        router.replace(targetNext)
      }

      router.refresh()
    } catch {
      setErrorMessage('Verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Paste handling for OTP
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6)
    if (pasted) {
      setOtpCode(pasted)
    }
  }

  return (
    <div className={className}>
      {message && (
        <div className="border-border bg-surface-2 text-muted-foreground mb-4 rounded-md border p-3 text-xs">
          {message}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive mb-4 rounded-md border p-3 text-xs"
        >
          {errorMessage}
        </div>
      )}

      {step === 'email' ? (
        <div className="flex flex-col gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="h-10 w-full justify-center gap-2 font-medium"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative my-1 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="border-border w-full border-t" />
            </div>
            <span className="text-muted-foreground relative bg-[#141417] px-2 text-xs tracking-wider uppercase">
              or continue with email
            </span>
          </div>

          <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                autoComplete="email"
                className="h-10"
              />
            </div>

            <Button
              type="submit"
              variant="brand"
              disabled={isLoading || !email.trim()}
              className="mt-1 h-10 w-full font-medium"
            >
              {isLoading ? 'Sending code...' : 'Send code'}
            </Button>
          </form>

          <p className="text-muted-foreground text-center text-xs">
            We will email you a 6-digit one-time code. No password required.
          </p>
        </div>
      ) : (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold">Enter your 6-digit code</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Sent to{' '}
              <span className="text-foreground font-medium">{email}</span>
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="otp-code" className="text-xs font-medium">
              6-digit code
            </Label>
            <Input
              id="otp-code"
              ref={otpInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="123456"
              value={otpCode}
              onChange={(e) => {
                const clean = e.target.value.replace(/\D/g, '').slice(0, 6)
                setOtpCode(clean)
              }}
              onPaste={handleOtpPaste}
              disabled={isLoading}
              required
              className="h-11 text-center font-mono text-lg tracking-widest"
            />
          </div>

          <Button
            type="submit"
            variant="brand"
            disabled={isLoading || otpCode.length !== 6}
            className="h-10 w-full font-medium"
          >
            {isLoading ? 'Verifying...' : 'Verify and continue'}
          </Button>

          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setOtpCode('')
                setErrorMessage(null)
              }}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              Use a different email
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={cooldown > 0 || isLoading}
              className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

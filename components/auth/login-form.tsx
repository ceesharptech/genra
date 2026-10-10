'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { safeRedirectPath } from '@/lib/auth/redirect'
import { getEmailAuthMode } from '@/lib/auth/config'
import { buildAuthCallbackUrl, getAuthErrorMessage } from '@/lib/auth/errors'
import { emailSchema, otpCodeSchema } from '@/lib/validation/auth'
import { getIntentContextMessage } from '@/lib/auth/intents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HugeiconsIcon } from '@hugeicons/react'
import { Mail01Icon } from '@hugeicons/core-free-icons'
import { TurnstileWidget } from '@/components/auth/turnstile-widget'

interface LoginFormProps {
  mode?: 'login' | 'signup'
  message?: string
  next?: string
  intent?: string
  onSuccess?: () => void
  errorParam?: string
  className?: string
}

export function LoginForm({
  mode = 'login',
  message,
  next = '/',
  intent,
  onSuccess,
  errorParam,
  className,
}: LoginFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const authMode = getEmailAuthMode()

  const [step, setStep] = useState<'email' | 'otp' | 'magic_link_sent'>('email')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [dismissedErrorParam, setDismissedErrorParam] = useState<string | null>(
    null
  )
  const [cooldown, setCooldown] = useState(0)

  const errorMessage =
    submissionError ??
    (errorParam && errorParam !== dismissedErrorParam
      ? getAuthErrorMessage(errorParam)
      : null)

  const setErrorMessage = (msg: string | null) => {
    setSubmissionError(msg)
    if (errorParam) {
      setDismissedErrorParam(errorParam)
    }
  }

  const otpInputRef = useRef<HTMLInputElement>(null)

  // Compute the final target redirect path including any intent query parameter
  const baseSafeNext = safeRedirectPath(next, '/')
  const targetNext = intent
    ? baseSafeNext.includes('?')
      ? `${baseSafeNext}&intent=${encodeURIComponent(intent)}`
      : `${baseSafeNext}?intent=${encodeURIComponent(intent)}`
    : baseSafeNext

  const queryParams = new URLSearchParams()
  if (next && next !== '/') queryParams.set('next', next)
  if (intent) queryParams.set('intent', intent)
  const baseQuery = queryParams.toString() ? `?${queryParams.toString()}` : ''

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

  // Step B: Finish sign-in in the original tab when user returns from email
  useEffect(() => {
    if (step !== 'magic_link_sent') return

    let isMounted = true

    const checkSession = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!isMounted || !user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarded_at')
          .eq('id', user.id)
          .single()

        if (!isMounted) return

        onSuccess?.()

        if (!profile || !profile.onboarded_at) {
          router.replace(`/onboarding?next=${encodeURIComponent(targetNext)}`)
        } else {
          router.replace(targetNext)
        }
        router.refresh()
      } catch {
        // Silently ignore background check errors
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkSession()
      }
    }

    window.addEventListener('focus', checkSession)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      isMounted = false
      window.removeEventListener('focus', checkSession)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [step, supabase, targetNext, router, onSuccess])

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

  // Submit email for magic link or 6-digit OTP code
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const parseResult = emailSchema.safeParse(email)
    if (!parseResult.success) {
      setErrorMessage(parseResult.error.issues[0]?.message ?? 'Invalid email')
      return
    }

    setIsLoading(true)

    try {
      if (authMode === 'magic_link') {
        const callbackUrl = buildAuthCallbackUrl({
          origin: window.location.origin,
          next,
          intent,
        })

        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: true,
            emailRedirectTo: callbackUrl,
            captchaToken: turnstileToken || undefined,
          },
        })

        if (error) {
          if (error.status === 429) {
            setErrorMessage(
              'Too many emails requested. Please wait a few minutes or continue with Google.'
            )
          } else {
            setErrorMessage(
              error.message || 'Failed to send magic link. Please try again.'
            )
          }
          return
        }

        setStep('magic_link_sent')
        setCooldown(60)
      } else {
        // OTP mode
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: true,
            captchaToken: turnstileToken || undefined,
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
      }
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Resend magic link
  const handleResendMagicLink = async () => {
    if (cooldown > 0 || isLoading) return
    setErrorMessage(null)
    setIsLoading(true)

    try {
      const callbackUrl = buildAuthCallbackUrl({
        origin: window.location.origin,
        next,
        intent,
      })

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: callbackUrl,
          captchaToken: turnstileToken || undefined,
        },
      })

      if (error) {
        if (error.status === 429) {
          setErrorMessage(
            'Too many emails requested. Please wait a few minutes or continue with Google.'
          )
        } else {
          setErrorMessage(error.message || 'Failed to resend link.')
        }
        return
      }

      setCooldown(60)
    } catch {
      setErrorMessage('Failed to resend link. Please try again.')
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
          captchaToken: turnstileToken || undefined,
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

  // Verify 6-digit OTP code (OTP mode only)
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
        <div className="border-border bg-surface-2 text-muted-foreground mb-4 rounded-xl border p-3 text-xs">
          {message}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive mb-4 rounded-xl border p-3 text-xs leading-relaxed"
        >
          {errorMessage}
        </div>
      )}

      {step === 'email' && (
        <div className="flex flex-col gap-5">
          {/* Header Brand Badge & Title */}
          <div className="flex flex-col items-center text-center">
            {/* <div className="mb-4 flex size-12 items-center justify-center">
              <Image
                src="/images/genra-logo.png"
                alt="Genra Logo"
                width={48}
                height={48}
                className="size-12 rounded-full shadow-xs"
                priority
              />
            </div> */}
            <h1 className="font-bricolage text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
              {mode === 'signup' ? 'Welcome to Genra' : 'Welcome back'}
            </h1>
            {message || getIntentContextMessage(intent) ? (
              <div className="mt-2.5 inline-flex max-w-sm items-center justify-center rounded-full border border-brand/20 bg-brand/10 px-3.5 py-1 text-xs font-medium text-brand dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
                <span>{message || getIntentContextMessage(intent)}</span>
              </div>
            ) : (
              <p className="text-muted-foreground mt-2 max-w-xs text-xs sm:text-sm">
                {mode === 'signup'
                  ? 'Create your account and discover world-class AI creations, prompts, and tools.'
                  : 'Enter your details to sign in to your Genra account.'}
              </p>
            )}
          </div>

          {/* Google Button (Pill shaped) */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="border-border bg-card hover:bg-surface-2 text-foreground h-11 w-full justify-center gap-2.5 rounded-full text-xs font-medium shadow-2xs sm:text-sm"
          >
            <svg
              className="size-4 shrink-0"
              viewBox="0 0 24 24"
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
            <span>Continue with Google</span>
          </Button>

          {/* Divider */}
          <div className="relative my-0.5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="border-border w-full border-t" />
            </div>
            <span className="text-muted-foreground bg-background relative px-3 text-xs font-normal">
              or
            </span>
          </div>

          {/* Email form */}
          <form onSubmit={handleSendEmail} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="sr-only">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                autoComplete="email"
                className="border-border bg-card placeholder:text-muted-foreground/60 h-11 rounded-full px-5 text-xs sm:text-sm"
              />
            </div>

            <TurnstileWidget
              onToken={setTurnstileToken}
              onError={() => setTurnstileToken(null)}
              onExpire={() => setTurnstileToken(null)}
            />

            <Button
              type="submit"
              loading={isLoading}
              disabled={!email.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 w-full rounded-full text-xs font-medium transition-opacity sm:text-sm"
            >
              Continue
            </Button>
          </form>

          {/* Legal statement */}
          <p className="text-muted-foreground text-center text-[11px] leading-normal">
            By continuing, you agree to our{' '}
            <Link
              href="/"
              className="hover:text-foreground underline underline-offset-2"
            >
              Terms
            </Link>{' '}
            and{' '}
            <Link
              href="/"
              className="hover:text-foreground underline underline-offset-2"
            >
              Privacy Policy
            </Link>
            .
          </p>

          {/* Login/Signup Switcher */}
          <div className="text-muted-foreground pt-1 text-center text-xs">
            {mode === 'signup' ? (
              <>
                Already have an account?{' '}
                <Link
                  href={`/login${baseQuery}`}
                  className="text-foreground hover:text-brand font-medium underline underline-offset-3 transition-colors"
                >
                  Sign in
                </Link>
              </>
            ) : (
              <>
                Don&apos;t have an account?{' '}
                <Link
                  href={`/signup${baseQuery}`}
                  className="text-foreground hover:text-brand font-medium underline underline-offset-3 transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {step === 'magic_link_sent' && (
        <div className="flex flex-col gap-4 text-center">
          <div className="bg-brand/10 text-brand mx-auto flex size-12 items-center justify-center rounded-full">
            <HugeiconsIcon
              icon={Mail01Icon}
              strokeWidth={1.5}
              className="size-6"
            />
          </div>

          <div>
            <h3 className="font-bricolage text-foreground text-xl font-bold tracking-tight">
              Check your email
            </h3>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed sm:text-sm">
              We sent a sign-in link to{' '}
              <span className="text-foreground font-semibold">{email}</span>
            </p>
          </div>

          <div className="border-border/70 bg-surface-2 rounded-2xl border p-4 text-left">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Click the link in your email to sign in. Please open it in{' '}
              <strong className="text-foreground font-semibold">
                this same browser
              </strong>
              .
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="default"
              loading={isLoading}
              onClick={handleResendMagicLink}
              disabled={cooldown > 0}
              className="w-full rounded-full text-xs font-medium"
            >
              {cooldown > 0 ? `Resend link (${cooldown}s)` : 'Resend link'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="default"
              onClick={() => {
                setStep('email')
                setErrorMessage(null)
              }}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground w-full rounded-full text-xs"
            >
              Use a different email
            </Button>
          </div>

          <div className="relative my-0.5 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="border-border w-full border-t" />
            </div>
            <span className="text-muted-foreground bg-background relative px-2 text-[10px] tracking-wider uppercase">
              or
            </span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="default"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full justify-center gap-2 rounded-full text-xs"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" aria-hidden="true">
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
            Continue with Google instead
          </Button>
        </div>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
          <div>
            <h3 className="font-bricolage text-base font-semibold">
              Enter your 6-digit code
            </h3>
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
              className="h-11 rounded-full text-center font-mono text-lg tracking-widest"
            />
          </div>

          <Button
            type="submit"
            variant="default"
            loading={isLoading}
            disabled={otpCode.length !== 6}
            className="h-11 w-full rounded-full font-medium"
          >
            Verify and continue
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

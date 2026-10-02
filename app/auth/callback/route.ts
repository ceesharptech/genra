import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeRedirectPath } from '@/lib/auth/redirect'
import { mapAuthCallbackError } from '@/lib/auth/errors'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const rawNext = requestUrl.searchParams.get('next')
  const error = requestUrl.searchParams.get('error')
  const errorCode = requestUrl.searchParams.get('error_code')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Determine site origin, supporting x-forwarded-host behind Vercel / proxy
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : requestUrl.origin

  const safeNext = safeRedirectPath(rawNext, '/')

  const buildLoginRedirect = (errorParam: string) => {
    const params = new URLSearchParams()
    params.set('error', errorParam)
    if (safeNext && safeNext !== '/') {
      params.set('next', safeNext)
    }
    return `${origin}/login?${params.toString()}`
  }

  // 1. If provider returned an error parameter
  if (error || errorCode || errorDescription) {
    const mappedCode = mapAuthCallbackError({ error, errorCode, errorDescription })
    return NextResponse.redirect(buildLoginRedirect(mappedCode))
  }

  // 2. Code is required for session exchange
  if (!code) {
    const mappedCode = mapAuthCallbackError({ errorCode: 'missing_code' })
    return NextResponse.redirect(buildLoginRedirect(mappedCode))
  }

  // 3. Exchange PKCE code for session
  const supabase = await createClient()
  const { data, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError || !data.user) {
    const mappedCode = mapAuthCallbackError({
      exchangeErrorMessage: exchangeError?.message || 'Exchange failed',
    })
    return NextResponse.redirect(buildLoginRedirect(mappedCode))
  }

  // 4. Check onboarding status
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded_at')
    .eq('id', data.user.id)
    .single()

  if (!profile || !profile.onboarded_at) {
    const encodedNext = encodeURIComponent(safeNext)
    return NextResponse.redirect(`${origin}/onboarding?next=${encodedNext}`)
  }

  return NextResponse.redirect(`${origin}${safeNext}`)
}

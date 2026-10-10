import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Bricolage_Grotesque } from 'next/font/google'
import { Albert_Sans } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth/server'
import { AuthProvider } from '@/components/auth/auth-provider'
import { AuthModalProvider } from '@/components/auth/auth-modal-provider'
import { IntentReplay } from '@/components/auth/intent-replay'
import { AuthHashHandler } from '@/components/auth/auth-hash-handler'
import { PostHogProvider } from '@/components/providers/posthog-provider'
import { getSiteUrl } from '@/lib/site'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  display: 'swap',
})

const albertSans = Albert_Sans({
  variable: '--font-albert',
  subsets: ['latin'],
  display: 'swap',
})

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  icons: {
    icon: '/favicon.ico',
    apple: '/images/genra-logo.png',
  },
  title: {
    template: '%s · Genra',
    default: 'Genra — Discover and share AI creations',
  },
  description:
    'The open discovery platform for things people build with AI. Browse creations, learn from prompts and processes, and share your work.',
  keywords: [
    'AI creations',
    'AI prompts',
    'AI tools',
    'Claude Code',
    'Next.js',
    'Midjourney',
    'Cursor',
  ],
  authors: [{ name: 'Genra' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Genra',
    title: 'Genra — Discover and share AI creations',
    description:
      'The open discovery platform for things people build with AI. Browse creations, learn from prompts and processes, and share your work.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Genra — Discover and share AI creations',
    description:
      'The open discovery platform for things people build with AI. Browse creations, learn from prompts and processes, and share your work.',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  const profile = await getCurrentProfile()

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        'h-full',
        'antialiased',
        geistSans.variable,
        geistMono.variable,
        bricolage.variable,
        albertSans.variable,
        'font-sans'
      )}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col transition-colors">
        <ThemeProvider>
          <PostHogProvider>
            <AuthProvider initialUser={user} initialProfile={profile}>
              <AuthModalProvider>
                <TooltipProvider>
                  <IntentReplay />
                  <AuthHashHandler />
                  <Header />
                  <main className="flex flex-1 flex-col">{children}</main>
                  <Footer />
                  <Toaster position="bottom-right" />
                </TooltipProvider>
              </AuthModalProvider>
            </AuthProvider>
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

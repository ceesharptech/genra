import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: '%s | Genra',
    default: 'Genra — Discover & Learn What People Create with AI',
  },
  description:
    'Discovery and learning platform for things people create with AI: websites, apps, images, video, prompts, and workflows.',
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
    title: 'Genra — Discover & Learn What People Create with AI',
    description:
      'Discovery and learning platform for things people create with AI: websites, apps, images, video, prompts, and workflows.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        'h-full',
        'antialiased',
        geistSans.variable,
        geistMono.variable,
        'font-sans'
      )}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col transition-colors">
        <ThemeProvider>
          <TooltipProvider>
            <Header />
            <main className="flex flex-1 flex-col">{children}</main>
            <Footer />
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

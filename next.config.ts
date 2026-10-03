import type { NextConfig } from 'next'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseHostname: string | undefined

if (supabaseUrl) {
  try {
    supabaseHostname = new URL(supabaseUrl).hostname
  } catch {
    // fallback
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      ...(supabaseHostname
        ? [
            {
              protocol: 'https' as const,
              hostname: supabaseHostname,
            },
          ]
        : [
            {
              protocol: 'https' as const,
              hostname: '*.supabase.co',
            },
          ]),
    ],
  },
  experimental: {
    optimizePackageImports: [
      '@hugeicons/react',
      '@hugeicons/core-free-icons',
    ],
  },
}

export default nextConfig

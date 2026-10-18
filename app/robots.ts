import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV === 'production';
  const siteUrl = getSiteUrl();

  if (!isProduction) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: ['/'],
        },
      ],
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/discover',
          '/prompts',
          '/resources',
          '/tools/',
          '/collections/',
          '/c/',
          '/u/',
        ],
        disallow: [
          '/saved',
          '/creations',
          '/settings',
          '/onboarding',
          '/login',
          '/signup',
          '/new',
          '/c/*/edit',
          '/prompts/new',
          '/prompts/*/edit',
          '/resources/new',
          '/resources/*/edit',
          '/design',
          '/auth/',
          '/api/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

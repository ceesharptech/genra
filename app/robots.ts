import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/discover', '/c/', '/u/'],
        disallow: [
          '/saved',
          '/creations',
          '/settings',
          '/onboarding',
          '/login',
          '/signup',
          '/new',
          '/c/*/edit',
          '/design',
          '/auth/',
          '/api/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

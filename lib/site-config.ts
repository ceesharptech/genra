export const siteConfig = {
  name: 'Genra',
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME || 'Genra Inc.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://genra.dev',
  description: 'The discovery and learning platform for things people create with AI.',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@genra.dev',
  legalEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@genra.dev',
  dmcaEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@genra.dev',
  governingLaw: process.env.NEXT_PUBLIC_GOVERNING_LAW || 'State of Delaware, United States',
  minimumAge: Number(process.env.NEXT_PUBLIC_MIN_AGE) || 13,
  lastUpdated: 'October 18, 2026',
} as const;

export type SiteConfig = typeof siteConfig;

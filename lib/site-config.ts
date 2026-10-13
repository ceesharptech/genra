export const siteConfig = {
  name: 'Genra',
  legalName: 'Genra Inc.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://genra.co',
  description: 'The discovery and learning platform for things people create with AI.',
  supportEmail: 'support@genra.co',
  legalEmail: 'legal@genra.co',
  dmcaEmail: 'copyright@genra.co',
  governingLaw: 'State of Delaware, United States',
  minimumAge: 13,
  lastUpdated: 'October 13, 2026',
} as const;

export type SiteConfig = typeof siteConfig;

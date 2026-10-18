import { siteConfig } from '@/lib/site-config'

export const revalidate = 86400

export async function GET() {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  const canonicalUrl = `${siteConfig.url}/.well-known/security.txt`
  const policyUrl = `${siteConfig.url}/terms`

  const body = [
    `Contact: mailto:${siteConfig.supportEmail}`,
    `Expires: ${expires}`,
    `Canonical: ${canonicalUrl}`,
    'Preferred-Languages: en',
    `Policy: ${policyUrl}`,
  ].join('\n')

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}


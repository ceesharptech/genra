import { describe, it, expect } from 'vitest'
import { GET } from '@/app/.well-known/security.txt/route'
import { siteConfig } from '@/lib/site-config'

describe('security.txt endpoint', () => {
  it('returns RFC 9116 compliant security.txt content', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/plain')
    expect(response.headers.get('cache-control')).toContain('max-age=86400')

    const text = await response.text()
    expect(text).toContain(`Contact: mailto:${siteConfig.supportEmail}`)
    expect(text).toContain(`Canonical: ${siteConfig.url}/.well-known/security.txt`)
    expect(text).toContain('Preferred-Languages: en')
    expect(text).toContain(`Policy: ${siteConfig.url}/terms`)
    expect(text).toContain('Expires: ')

    // Ensure Expires is a valid future ISO date string
    const expiresLine = text.split('\n').find((line) => line.startsWith('Expires: '))
    expect(expiresLine).toBeDefined()
    const expiresDateStr = expiresLine!.replace('Expires: ', '').trim()
    const expiresDate = new Date(expiresDateStr)
    expect(expiresDate.getTime()).toBeGreaterThan(Date.now())
  })
})

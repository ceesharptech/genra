import { describe, it, expect, afterEach } from 'vitest'
import { getEnrichmentProvider, NoopEnrichment } from '@/lib/ai/enrichment'

describe('AI Enrichment Provider', () => {
  const originalEnv = process.env.AI_ENRICHMENT_ENABLED

  afterEach(() => {
    process.env.AI_ENRICHMENT_ENABLED = originalEnv
  })

  it('NoopEnrichment enqueue resolves without errors', async () => {
    const provider = new NoopEnrichment()
    await expect(
      provider.enqueue('11111111-1111-1111-1111-111111111111', [
        'metadata_extraction',
      ])
    ).resolves.toBeUndefined()
  })

  it('returns NoopEnrichment by default when flag is not set or false', () => {
    delete process.env.AI_ENRICHMENT_ENABLED
    const provider1 = getEnrichmentProvider()
    expect(provider1).toBeInstanceOf(NoopEnrichment)

    process.env.AI_ENRICHMENT_ENABLED = 'false'
    const provider2 = getEnrichmentProvider()
    expect(provider2).toBeInstanceOf(NoopEnrichment)
  })

  it('throws an error if AI_ENRICHMENT_ENABLED is true', () => {
    process.env.AI_ENRICHMENT_ENABLED = 'true'
    expect(() => getEnrichmentProvider()).toThrowError(/not implemented in V1/i)
  })
})

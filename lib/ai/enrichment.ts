import type { Database } from '@/types/database'

export type AIJobKind = Database['public']['Enums']['ai_job_kind']

export interface EnrichmentProvider {
  enqueue(creationId: string, kinds?: AIJobKind[]): Promise<void>
}

export class NoopEnrichment implements EnrichmentProvider {
  async enqueue(creationId: string, kinds?: AIJobKind[]): Promise<void> {
    void creationId
    void kinds
    // No-op in V1: AI features are post-MVP
    return Promise.resolve()
  }
}

export function getEnrichmentProvider(): EnrichmentProvider {
  const isEnabled = process.env.AI_ENRICHMENT_ENABLED === 'true'

  if (isEnabled) {
    throw new Error(
      'AI enrichment is not implemented in V1. Keep AI_ENRICHMENT_ENABLED=false.'
    )
  }

  return new NoopEnrichment()
}

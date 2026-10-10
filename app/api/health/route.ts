import { NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase/public';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const startTime = Date.now();
  try {
    const supabase = createPublicClient();
    const { error } = await supabase.from('tools').select('id').limit(1);

    if (error) {
      return NextResponse.json(
        {
          status: 'degraded',
          database: 'error',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        {
          status: 503,
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          },
        }
      );
    }

    const durationMs = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'ok',
        database: 'connected',
        latency_ms: durationMs,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unknown health check error';
    return NextResponse.json(
      {
        status: 'error',
        message,
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}

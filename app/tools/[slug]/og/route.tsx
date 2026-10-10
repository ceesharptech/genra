import { ImageResponse } from 'next/og';
import { getToolPage } from '@/lib/data/library';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  if (!slug) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const res = await getToolPage(slug);
  const tool = res.data;

  // Unverified tool with 0 creations returns 404
  if (!tool || (!tool.is_verified && tool.published_creations_count === 0)) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: '#09090b',
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
          padding: '48px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
          }}
        >
          {/* Top Bar: Brand + Kind Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#774CFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '18px',
                }}
              >
                G
              </div>
              <span
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: '#e4e4e7',
                }}
              >
                Genra
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {tool.is_verified && (
                <div
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    backgroundColor: '#1e1b4b',
                    border: '1px solid #4338ca',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#c7d2fe',
                  }}
                >
                  Verified Tool
                </div>
              )}
              <div
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#a1a1aa',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {tool.kind.replace('_', ' ')}
              </div>
            </div>
          </div>

          {/* Center: Tool Name & Vendor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h1
              style={{
                fontSize: '56px',
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                color: '#ffffff',
                margin: 0,
              }}
            >
              {tool.name}
            </h1>
            {tool.vendor && (
              <span style={{ fontSize: '24px', color: '#a1a1aa', fontWeight: 500 }}>
                by {tool.vendor}
              </span>
            )}
          </div>

          {/* Bottom Bar: Ecosystem Counts */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid #27272a',
              paddingTop: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', color: '#e4e4e7', fontSize: '16px', fontWeight: 600 }}>
              <span>{tool.published_creations_count} creations</span>
              <span style={{ color: '#52525b' }}>·</span>
              <span>{tool.public_prompts_count} prompts</span>
              <span style={{ color: '#52525b' }}>·</span>
              <span>{tool.public_resources_count} resources</span>
            </div>

            <span style={{ color: '#71717a', fontSize: '14px' }}>
              genra.co/tools/{tool.slug}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );

  imageResponse.headers.set(
    'Cache-Control',
    'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400'
  );

  return imageResponse;
}

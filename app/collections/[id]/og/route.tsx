import { ImageResponse } from 'next/og';
import { getCollectionPage } from '@/lib/data/collections';
import { truncateTitle } from '@/lib/seo/metadata';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const res = await getCollectionPage(id);
  const collection = res.data;

  // Private collections return 404
  if (!collection || !collection.is_public) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const ownerName = collection.owner.display_name || collection.owner.username;
  const ownerInitials = (ownerName.charAt(0) || 'U').toUpperCase();
  const displayTitle = truncateTitle(collection.title, 80);
  const displayDesc = truncateTitle(
    collection.description || 'Curated collection of AI creations, prompts, and resources.',
    140
  );

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
              Collection · {collection.item_count} items
            </div>
          </div>

          {/* Center: Title & Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h1
              style={{
                fontSize: '48px',
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                color: '#ffffff',
                margin: 0,
              }}
            >
              {displayTitle}
            </h1>
            <p
              style={{
                fontSize: '22px',
                lineHeight: 1.45,
                color: '#a1a1aa',
                margin: 0,
              }}
            >
              {displayDesc}
            </p>
          </div>

          {/* Bottom Bar: Owner info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid #27272a',
              paddingTop: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '9999px',
                  backgroundColor: '#27272a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: 700,
                }}
              >
                {ownerInitials}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#f4f4f5' }}>
                  {ownerName}
                </span>
                <span style={{ fontSize: '13px', color: '#71717a' }}>
                  @{collection.owner.username}
                </span>
              </div>
            </div>

            <span style={{ color: '#71717a', fontSize: '14px' }}>
              genra.co/collections/{collection.id}
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

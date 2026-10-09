import { ImageResponse } from 'next/og';
import { getCreationOgData } from '@/lib/data/creations';
import { getMediaUrl } from '@/lib/data/media';
import { truncateTitle } from '@/lib/seo/metadata';

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

  const creation = await getCreationOgData(slug);

  // Return plain 404 for non-published or non-existent creations
  if (!creation) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // Attempt to load cover image as base64 with a 2.5s timeout; fall back safely if unreachable
  let coverDataUrl: string | null = null;
  const rawCoverUrl = getMediaUrl(creation.cover_storage_path || creation.cover_external_url);

  if (rawCoverUrl) {
    try {
      const imgRes = await fetch(rawCoverUrl, {
        signal: AbortSignal.timeout(2500),
      });
      if (imgRes.ok) {
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        coverDataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
      }
    } catch {
      // Graceful fallback to text-only card if image cannot be fetched or decoded
      coverDataUrl = null;
    }
  }

  const creatorName =
    creation.creator_display_name || creation.creator_username || 'Creator';
  const creatorInitials = (creatorName.charAt(0) || 'C').toUpperCase();
  const displayTitle = truncateTitle(creation.title, 85);
  const toolChips = creation.tools.slice(0, 3);

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
            width: '100%',
            height: '100%',
            gap: '40px',
            alignItems: 'center',
          }}
        >
          {/* Left Column: Metadata & Details */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              flex: coverDataUrl ? '1 1 58%' : '1 1 100%',
            }}
          >
            {/* Top Bar: Wordmark + Genra Label */}
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
              <span
                style={{
                  fontSize: '12px',
                  color: '#71717a',
                  marginLeft: '4px',
                  paddingLeft: '10px',
                  borderLeft: '1px solid #27272a',
                }}
              >
                AI Creation
              </span>
            </div>

            {/* Middle Section: Title & Tools */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                maxWidth: '680px',
              }}
            >
              <h1
                style={{
                  fontSize: coverDataUrl ? '44px' : '56px',
                  fontWeight: 800,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.15,
                  color: '#f4f4f5',
                  margin: 0,
                }}
              >
                {displayTitle}
              </h1>

              {toolChips.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {toolChips.map((tool) => (
                    <div
                      key={tool}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '9999px',
                        backgroundColor: '#18181b',
                        border: '1px solid #27272a',
                        color: '#a1a1aa',
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                    >
                      {tool}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Row: Creator Info + Domain */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '20px',
                borderTop: '1px solid #27272a',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '9999px',
                    backgroundColor: '#27272a',
                    border: '1px solid #3f3f46',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '16px',
                  }}
                >
                  {creatorInitials}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#ffffff',
                    }}
                  >
                    {creatorName}
                  </span>
                  <span style={{ fontSize: '12px', color: '#71717a' }}>
                    @{creation.creator_username}
                  </span>
                </div>
              </div>

              <span style={{ fontSize: '14px', color: '#52525b', fontWeight: 500 }}>
                genra.co
              </span>
            </div>
          </div>

          {/* Right Column: Cover Media (when available) */}
          {coverDataUrl && (
            <div
              style={{
                display: 'flex',
                flex: '1 1 42%',
                height: '100%',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid #27272a',
                backgroundColor: '#18181b',
                position: 'relative',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverDataUrl}
                alt={creation.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control':
          'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  );

  return imageResponse;
}

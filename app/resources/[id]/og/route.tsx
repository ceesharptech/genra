import { ImageResponse } from 'next/og';
import { getResource } from '@/lib/data/library';
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

  const res = await getResource(id);
  const resource = res.data;

  // Private or deleted resources return 404
  if (!resource || !resource.is_public || resource.deleted_at !== null) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const authorName = resource.author.display_name || resource.author.username;
  const authorInitials = (authorName.charAt(0) || 'U').toUpperCase();
  const displayTitle = truncateTitle(resource.title, 80);
  const displayDesc = truncateTitle(
    resource.description || 'AI guide, workflow, or starter resource on Genra.',
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                {resource.kind.replace('_', ' ')}
              </div>
              {resource.tool && (
                <div
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#e4e4e7',
                  }}
                >
                  {resource.tool.name}
                </div>
              )}
            </div>
          </div>

          {/* Center: Title & Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h1
              style={{
                fontSize: '46px',
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

          {/* Bottom Bar: Author info & Metrics */}
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
                {authorInitials}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#f4f4f5' }}>
                  {authorName}
                </span>
                <span style={{ fontSize: '13px', color: '#71717a' }}>
                  @{resource.author.username}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', color: '#a1a1aa', fontSize: '14px' }}>
              <span>{resource.like_count} likes</span>
              <span>·</span>
              <span>{resource.save_count} saves</span>
            </div>
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

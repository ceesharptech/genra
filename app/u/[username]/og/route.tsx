import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';
import { truncateTitle } from '@/lib/seo/metadata';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{
    username: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { username } = await context.params;

  if (!username) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, headline, bio, avatar_url, updated_at')
    .eq('username', username)
    .maybeSingle();

  if (!profile) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // Count published creations
  const { count: creationsCount } = await supabase
    .from('creations')
    .select('id', { count: 'exact', head: true })
    .eq('creator_id', profile.id)
    .eq('status', 'published')
    .is('deleted_at', null);

  // Attempt to load avatar as base64 with a 2.5s timeout; fallback safely to initials
  let avatarDataUrl: string | null = null;
  if (profile.avatar_url) {
    try {
      const imgRes = await fetch(profile.avatar_url, {
        signal: AbortSignal.timeout(2500),
      });
      if (imgRes.ok) {
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        avatarDataUrl = `data:${contentType};base64,${buffer.toString('base64')}`;
      }
    } catch {
      avatarDataUrl = null;
    }
  }

  const displayName = profile.display_name || profile.username;
  const initials = (displayName.charAt(0) || 'C').toUpperCase();
  const bioText = profile.headline || profile.bio || 'AI creator on Genra';
  const displayBio = truncateTitle(bioText, 120);

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0B0C0E',
          color: '#F4F4F6',
          padding: '64px',
          justifyContent: 'space-between',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Top Bar: Wordmark + Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#774CFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 900,
                fontSize: '20px',
              }}
            >
              G
            </div>
            <span
              style={{
                fontSize: '26px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#F4F4F6',
              }}
            >
              Genra
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(119, 76, 255, 0.12)',
              border: '1px solid rgba(119, 76, 255, 0.3)',
              borderRadius: '9999px',
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#9B7BF7',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            Creator Profile
          </div>
        </div>

        {/* Center: Profile Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '36px',
            backgroundColor: '#131418',
            border: '1px solid #23252C',
            borderRadius: '24px',
            padding: '44px',
          }}
        >
          {/* Avatar / Initials */}
          {avatarDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarDataUrl}
              alt=""
              style={{
                width: '128px',
                height: '128px',
                borderRadius: '9999px',
                objectFit: 'cover',
                border: '3px solid #2A2D37',
              }}
            />
          ) : (
            <div
              style={{
                width: '128px',
                height: '128px',
                borderRadius: '9999px',
                backgroundColor: '#23252C',
                border: '3px solid #2A2D37',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F4F4F6',
                fontSize: '48px',
                fontWeight: 700,
              }}
            >
              {initials}
            </div>
          )}

          {/* Details */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              gap: '8px',
            }}
          >
            <div
              style={{
                fontSize: '40px',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
              }}
            >
              {displayName}
            </div>

            <div
              style={{
                fontSize: '22px',
                color: '#8B8D98',
                fontFamily: 'monospace',
              }}
            >
              @{profile.username}
            </div>

            {displayBio && (
              <div
                style={{
                  fontSize: '20px',
                  color: '#B0B3BE',
                  marginTop: '6px',
                  lineHeight: 1.4,
                }}
              >
                {displayBio}
              </div>
            )}
          </div>
        </div>

        {/* Footer / Stats */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '15px',
            color: '#8B8D98',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#1B1C22',
                border: '1px solid #2A2D37',
                padding: '6px 14px',
                borderRadius: '9999px',
                color: '#F4F4F6',
                fontWeight: 600,
              }}
            >
              {creationsCount ?? 0} published creations
            </span>
          </div>

          <div style={{ color: '#6A6D7C', fontSize: '14px' }}>
            Discover and learn from AI creations · genra.dev
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
    'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
  );

  return imageResponse;
}

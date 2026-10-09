import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Genra — Discover & Learn What People Create with AI';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#09090b',
          padding: '64px 72px',
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top bar: Brand Wordmark */}
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
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '22px',
            }}
          >
            G
          </div>
          <span
            style={{
              fontSize: '26px',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#f4f4f5',
            }}
          >
            Genra
          </span>
        </div>

        {/* Center: Main Hook */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '980px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '9999px',
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              width: 'fit-content',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '9999px',
                backgroundColor: '#774CFF',
              }}
            />
            <span
              style={{
                fontSize: '14px',
                color: '#a1a1aa',
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              The open platform for AI creations
            </span>
          </div>

          <h1
            style={{
              fontSize: '56px',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              color: '#ffffff',
              margin: 0,
            }}
          >
            Discover, learn, and share what creators build with AI.
          </h1>

          <p
            style={{
              fontSize: '22px',
              color: '#a1a1aa',
              lineHeight: 1.4,
              margin: 0,
              maxWidth: '820px',
            }}
          >
            Explore real workflows, tools, and prompts behind modern websites, apps, and media.
          </p>
        </div>

        {/* Bottom bar: Footer meta */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #27272a',
            paddingTop: '28px',
            color: '#71717a',
            fontSize: '16px',
            fontWeight: 500,
          }}
        >
          <span>genra.co</span>
          <span>Dribbble + GitHub + Product Hunt for AI</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

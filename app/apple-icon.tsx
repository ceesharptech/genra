import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 104,
          background: '#111113',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FAF9FD',
          borderRadius: 36,
          fontWeight: 700,
          fontFamily: 'sans-serif',
        }}
      >
        G
      </div>
    ),
    {
      ...size,
    }
  )
}

/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og'
import fs from 'node:fs'
import path from 'node:path'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  const iconPath = path.join(process.cwd(), 'public/images/genra-icon.png')
  const iconBuffer = fs.readFileSync(iconPath)
  const base64 = iconBuffer.toString('base64')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <img
          src={`data:image/png;base64,${base64}`}
          alt="Genra"
          width="32"
          height="32"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}

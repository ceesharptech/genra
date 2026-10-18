import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Genra',
    short_name: 'Genra',
    description: 'Discover and share AI creations',
    start_url: '/',
    display: 'browser',
    background_color: '#FAF9FD',
    theme_color: '#111113',
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}

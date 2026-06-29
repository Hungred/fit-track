export default function handler(req, res) {
  const gymId = req.query.gym

  const manifest = {
    name: 'Fit Track 教練後台',
    short_name: 'Fit Track',
    description: 'Fit Track 健身房管理平台',
    id: gymId ? `/?gym=${gymId}` : '/',
    start_url: gymId ? `/?gym=${gymId}` : '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#16a34a',
    orientation: 'portrait-primary',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  }

  res.setHeader('Content-Type', 'application/manifest+json')
  res.setHeader('Cache-Control', 'no-store')
  res.json(manifest)
}

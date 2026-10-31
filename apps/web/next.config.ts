import type { NextConfig } from 'next'

// En-têtes de sécurité pour toutes les pages (pas de CSP stricte : les styles en ligne de l'UI l'interdiraient)
const SECURITE = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  ...(process.env.NODE_ENV === 'production' ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
]

const nextConfig: NextConfig = {
  output: 'standalone', // requis par le Dockerfile (image légère : node server.js)
  poweredByHeader: false,
  compress: true,
  // Le proxy /api coupait à 30 s : génération d'actes et synchronisation peuvent durer plus longtemps
  experimental: { proxyTimeout: 300_000 }, // 5 min : réponses longues de l'assistant (relecture juridique comprise) en local
  async headers() {
    return [{ source: '/:path*', headers: SECURITE }]
  },
  async rewrites() { 
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig

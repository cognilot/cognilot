import type { NextConfig } from 'next';

/**
 * Cognilot Web — Next.js Configuration
 */
const nextConfig: NextConfig = {
  // Enables React Server Components by default (App Router default)
  reactStrictMode: true,

  // Allow images from Supabase storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // API rewrites: forward /api/* to the backend during local development
  async rewrites() {
    return process.env.NODE_ENV === 'development'
      ? [
          {
            source: '/api/:path*',
            destination: `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8000'}/api/:path*`,
          },
        ]
      : [];
  },
};

export default nextConfig;

import type { NextConfig } from 'next'

// Disable link prefetching globally — pages load on demand only
// This prevents the 20+ background requests on every navigation
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/**' },
    ],
  },
  serverExternalPackages: ['postgres'],
  // Compress responses
  compress: true,
  // Power optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
}

export default nextConfig

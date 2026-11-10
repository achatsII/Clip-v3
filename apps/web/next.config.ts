import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@clip/bridge'],
  images: { unoptimized: true },
  poweredByHeader: false,
}

export default nextConfig

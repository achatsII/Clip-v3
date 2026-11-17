import { execSync } from 'node:child_process'
import type { NextConfig } from 'next'

/** Le commit de la build : celui que Vercel annonce, sinon celui du dépôt local. */
function buildSha(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@clip/bridge'],
  images: { unoptimized: true },
  poweredByHeader: false,
  // La version affichée (src/lib/version.ts) : le commit et le moment de la mise en ligne.
  env: {
    NEXT_PUBLIC_BUILD_SHA: buildSha(),
    NEXT_PUBLIC_BUILD_DATE: new Date().toISOString(),
  },
}

export default nextConfig

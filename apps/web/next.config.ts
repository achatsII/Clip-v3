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
  // Le favicon de la marque de la build (`NEXT_PUBLIC_BRAND`, src/lib/brand/product.ts) : les navigateurs
  // le demandent à la racine, même quand la page en déclare un autre.
  async rewrites() {
    // `kiplo`, ou `gesto`, son nom d'avant le 2026-11-17 (`brandIdOf`).
    const brand = ['kiplo', 'gesto'].includes(process.env.NEXT_PUBLIC_BRAND?.trim().toLowerCase() ?? '') ? 'kiplo' : 'clip'
    return { beforeFiles: [{ source: '/favicon.ico', destination: `/brands/${brand}/favicon.ico` }], afterFiles: [], fallback: [] }
  },
}

export default nextConfig

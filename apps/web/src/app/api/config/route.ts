/**
 * Configuration publique (aucun secret) lue par l'app web et par la coquille native au démarrage
 * et au retour au premier plan. Les valeurs viennent des variables d'environnement du serveur :
 *
 * - `CLIP_TOGGLES` : JSON `{ "nom": true|false }`, fusionné sur les valeurs par défaut ;
 * - `CLIP_FORCE_UPDATE_IOS` / `CLIP_FORCE_UPDATE_ANDROID` : contrainte semver des versions de la
 *   coquille à bloquer (ex. `<1.2.0`) ; `CLIP_STORE_URL_IOS` / `CLIP_STORE_URL_ANDROID` ;
 * - `ABLY_KEY` présente : le temps réel (écran TV entre appareils) est disponible.
 */
import { NextResponse } from 'next/server'
import type { PublicConfig } from '@clip/bridge'
import { DEFAULT_TOGGLES } from '@/lib/toggleDefaults'

export const dynamic = 'force-dynamic'

function parseToggles(raw: string | undefined): Record<string, boolean> {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw) as Record<string, unknown>
    return Object.fromEntries(Object.entries(v).filter(([, b]) => typeof b === 'boolean')) as Record<string, boolean>
  } catch {
    return {}
  }
}

export async function GET() {
  const forceUpdate: PublicConfig['forceUpdate'] = {}
  if (process.env.CLIP_FORCE_UPDATE_IOS) forceUpdate.ios = { versions: process.env.CLIP_FORCE_UPDATE_IOS, storeUrl: process.env.CLIP_STORE_URL_IOS ?? 'https://apps.apple.com' }
  if (process.env.CLIP_FORCE_UPDATE_ANDROID) forceUpdate.android = { versions: process.env.CLIP_FORCE_UPDATE_ANDROID, storeUrl: process.env.CLIP_STORE_URL_ANDROID ?? 'https://play.google.com/store' }
  const body: PublicConfig = {
    configVersion: 1,
    forceUpdate,
    toggles: { ...DEFAULT_TOGGLES, ...parseToggles(process.env.CLIP_TOGGLES) },
    realtime: !!process.env.ABLY_KEY,
  }
  return NextResponse.json(body, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } })
}

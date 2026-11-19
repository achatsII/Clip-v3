/**
 * Les feature toggles lus côté serveur : les valeurs par défaut, et `CLIP_TOGGLES` (JSON `{ "nom": true|false }`)
 * par-dessus. `GET /api/config` les sert à l'app et à la coquille ; une page du serveur (`/app`) les lit ici.
 */
import { DEFAULT_TOGGLES, type ToggleName } from './toggleDefaults'

export function parseToggles(raw: string | undefined): Record<string, boolean> {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw) as Record<string, unknown>
    return Object.fromEntries(Object.entries(v).filter(([, b]) => typeof b === 'boolean')) as Record<string, boolean>
  } catch {
    return {}
  }
}

export function serverToggles(raw: string | undefined = process.env.CLIP_TOGGLES): Record<ToggleName, boolean> {
  return { ...DEFAULT_TOGGLES, ...parseToggles(raw) } as Record<ToggleName, boolean>
}

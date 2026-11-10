import semver from 'semver'

import type { NativePlatform, PublicConfig } from '../bridge/protocol'

export type ForceUpdateDecision =
  | { blocked: false }
  | { blocked: true; storeUrl: string | null }

/**
 * Le serveur dit quelles versions de la coquille sont trop vieilles (contrainte semver,
 * ex. "<1.2.0"). La coquille ne le décide jamais seule, et ne bloque jamais sans réponse
 * du serveur ni sur une contrainte illisible.
 */
export function evaluateForceUpdate(
  config: PublicConfig | null,
  platform: NativePlatform,
  appVersion: string,
): ForceUpdateDecision {
  const rule = config?.forceUpdate?.[platform]
  if (!rule) return { blocked: false }

  const version = semver.valid(appVersion) ?? semver.valid(semver.coerce(appVersion))
  if (!version || !semver.validRange(rule.versions)) return { blocked: false }
  if (!semver.satisfies(version, rule.versions, { includePrerelease: true })) return { blocked: false }

  return { blocked: true, storeUrl: isStoreUrl(rule.storeUrl) ? rule.storeUrl : null }
}

function isStoreUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'itms-apps:' || u.protocol === 'market:'
  } catch {
    return false
  }
}

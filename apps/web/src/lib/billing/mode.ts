'use client'

/**
 * Le mode de la facturation dans cet appareil :
 * - `live` : le drapeau `NEXT_PUBLIC_BILLING_V2` est allumé, la plateforme fait foi ;
 * - `preview` : drapeau éteint, l'aperçu (toggle `billingPreview`) montre plans et modules sur le web ;
 * - `off` : l'app d'avant, sans rien de la facturation (dans la coquille, ou l'aperçu coupé) ;
 * - `pending` : la configuration n'est pas encore lue.
 */
import { nativeEnv } from '../bridge/native'
import { BILLING_V2 } from '../config'
import { FALLBACK_TOGGLES } from '../toggleDefaults'
import { usePublicConfig } from '../toggles'

export type BillingMode = 'live' | 'preview' | 'off' | 'pending'

export function useBillingMode(): BillingMode {
  const config = usePublicConfig()
  if (BILLING_V2) return 'live'
  // Dans l'app mobile, on vend dans le magasin : pas d'aperçu des prix du web.
  if (nativeEnv()) return 'off'
  if (config.isLoading) return 'pending'
  return (config.data?.toggles.billingPreview ?? FALLBACK_TOGGLES.billingPreview) ? 'preview' : 'off'
}

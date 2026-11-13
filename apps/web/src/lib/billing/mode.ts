'use client'

/**
 * Le mode de la facturation dans cet appareil :
 * - `live` : le drapeau `NEXT_PUBLIC_BILLING_V2` est allumé, la plateforme fait foi ;
 * - `preview` : drapeau éteint, l'aperçu montre plans et modules : sur le web (toggle `billingPreview`),
 *   et dans l'app mobile si `billingPreviewApp` l'est aussi, sans aucun prix ni achat d'ailleurs ;
 * - `off` : l'app d'avant, sans rien de la facturation (l'aperçu coupé) ;
 * - `pending` : la configuration n'est pas encore lue.
 */
import { nativeEnv } from '../bridge/native'
import { BILLING_V2 } from '../config'
import { FALLBACK_TOGGLES, type ToggleName } from '../toggleDefaults'
import { usePublicConfig } from '../toggles'

export type BillingMode = 'live' | 'preview' | 'off' | 'pending'

/** La décision, sans React : testée. */
export function billingModeOf(o: { live: boolean; inApp: boolean; loading: boolean; toggles: Partial<Record<ToggleName, boolean>> | undefined }): BillingMode {
  if (o.live) return 'live'
  if (o.loading) return 'pending'
  const on = (k: ToggleName) => o.toggles?.[k] ?? FALLBACK_TOGGLES[k]
  // Dans l'app mobile, l'aperçu a son propre toggle : il se coupe avant une soumission aux magasins
  // sans toucher au web.
  return on('billingPreview') && (!o.inApp || on('billingPreviewApp')) ? 'preview' : 'off'
}

export function useBillingMode(): BillingMode {
  const config = usePublicConfig()
  return billingModeOf({ live: BILLING_V2, inApp: !!nativeEnv(), loading: config.isLoading, toggles: config.data?.toggles })
}

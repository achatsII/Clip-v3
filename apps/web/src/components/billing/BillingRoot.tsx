'use client'

import { useEffect, type ReactNode } from 'react'
import { useSession } from '@/components/providers/Session'
import { useToast } from '@/components/ui/Toast'
import { callNative, hasCapability, nativeEnv } from '@/lib/bridge/native'
import { createBillingClient, type BillingClient } from '@/lib/billing/client'
import { useBillingMode } from '@/lib/billing/mode'
import { createPreviewClient, PREVIEW_PARAM, previewName } from '@/lib/billing/preview'
import { BillingProvider } from '@/lib/billing/state'
import { BILLING_V2 } from '@/lib/config'
import { useMessages } from '@/lib/i18n'
import { Paywall } from './Billing'

/** Le canal de l'appareil : le magasin dans l'app mobile, Stripe sur le web. */
const deviceChannel = () => {
  const env = nativeEnv()
  return env ? (env.platform === 'android' ? 'android' : 'ios') : 'web'
}

const live = createBillingClient({ channel: deviceChannel })
const previewClient = createPreviewClient()
// Le mode est connu au rendu de BillingRoot, avant toute lecture : chaque écran passe par ce client.
let inPreview = false
const pick = (): BillingClient => (inPreview ? previewClient : live)

/** Le client de facturation de l'app : la plateforme, ou l'aperçu tant que le catalogue n'est pas publié. */
export const billingClient: BillingClient = {
  context: () => pick().context(),
  check: (...a) => pick().check(...a),
  plans: () => pick().plans(),
  mobileSync: () => pick().mobileSync(),
  checkout: (...a) => pick().checkout(...a),
  portal: (...a) => pick().portal(...a),
}

export function BillingRoot({ children }: { children: ReactNode }) {
  const { profile } = useSession()
  const mode = useBillingMode()
  inPreview = mode === 'preview'
  // Le magasin connaît l'acheteur par son organisation : connecté dès que la personne l'est.
  useEffect(() => {
    if (!BILLING_V2 || !hasCapability('store.connect') || !profile.orgId) return
    void callNative('store.connect', { orgId: profile.orgId.toLowerCase() }).catch(() => undefined)
  }, [profile.orgId])
  return (
    <BillingProvider client={billingClient} session={profile.userId || null} enabled={mode === 'live' || mode === 'preview'} preview={mode === 'preview'}>
      {children}
      <Paywall client={billingClient} />
      {mode === 'preview' && <PreviewReturn />}
    </BillingProvider>
  )
}

/** Au retour d'un « achat » dans l'aperçu : dire ce qui a changé, puis nettoyer l'adresse. */
function PreviewReturn() {
  const t = useMessages().billing.preview
  const toast = useToast()
  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get(PREVIEW_PARAM)
    if (!code) return
    url.searchParams.delete(PREVIEW_PARAM)
    url.searchParams.delete('merci')
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    toast.success(t.taken(previewName(code) ?? code), t.takenHint)
  }, [t, toast])
  return null
}

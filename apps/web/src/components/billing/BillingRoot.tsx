'use client'

import { useEffect, type ReactNode } from 'react'
import { useSession } from '@/components/providers/Session'
import { callNative, hasCapability, nativeEnv } from '@/lib/bridge/native'
import { createBillingClient } from '@/lib/billing/client'
import { BillingProvider } from '@/lib/billing/state'
import { BILLING_V2 } from '@/lib/config'
import { Paywall } from './Billing'

/** Le canal de l'appareil : le magasin dans l'app mobile, Stripe sur le web. */
const deviceChannel = () => {
  const env = nativeEnv()
  return env ? (env.platform === 'android' ? 'android' : 'ios') : 'web'
}

export const billingClient = createBillingClient({ channel: deviceChannel })

export function BillingRoot({ children }: { children: ReactNode }) {
  const { profile } = useSession()
  // Le magasin connaît l'acheteur par son organisation : connecté dès que la personne l'est.
  useEffect(() => {
    if (!BILLING_V2 || !hasCapability('store.connect') || !profile.orgId) return
    void callNative('store.connect', { orgId: profile.orgId.toLowerCase() }).catch(() => undefined)
  }, [profile.orgId])
  return (
    <BillingProvider client={billingClient} session={profile.userId || null}>
      {children}
      <Paywall client={billingClient} />
    </BillingProvider>
  )
}

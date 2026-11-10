'use client'

import type { ReactNode } from 'react'
import { useSession } from '@/components/providers/Session'
import { createBillingClient } from '@/lib/billing/client'
import { BillingProvider } from '@/lib/billing/state'
import { Paywall } from './Billing'

export const billingClient = createBillingClient({ channel: 'web' })

export function BillingRoot({ children }: { children: ReactNode }) {
  const { profile } = useSession()
  return (
    <BillingProvider client={billingClient} session={profile.userId || null}>
      {children}
      <Paywall client={billingClient} />
    </BillingProvider>
  )
}

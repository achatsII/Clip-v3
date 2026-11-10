'use client'

import type { ReactNode } from 'react'
import { BillingRoot } from '@/components/billing/BillingRoot'
import { LogoMark } from '@/components/Logo'
import { SessionProvider } from '@/components/providers/Session'
import { AppShell } from '@/components/shell/AppShell'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      fallback={
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
          <LogoMark className="animate-float h-16 w-16" />
          <p className="label-caps text-slate-400">Ouverture de CLIP…</p>
        </div>
      }
    >
      <BillingRoot>
        <AppShell>{children}</AppShell>
      </BillingRoot>
    </SessionProvider>
  )
}

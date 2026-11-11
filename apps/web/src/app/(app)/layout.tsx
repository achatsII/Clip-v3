'use client'

import type { ReactNode } from 'react'
import { BillingRoot } from '@/components/billing/BillingRoot'
import { LogoMark } from '@/components/Logo'
import { SessionProvider } from '@/components/providers/Session'
import { AppShell } from '@/components/shell/AppShell'
import { useMessages } from '@/lib/i18n'

export default function AppLayout({ children }: { children: ReactNode }) {
  const t = useMessages()
  return (
    <SessionProvider
      fallback={
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
          <LogoMark className="animate-float h-16 w-16" />
          <p className="label-caps text-slate-400">{t.shell.opening}</p>
        </div>
      }
    >
      <BillingRoot>
        <AppShell>{children}</AppShell>
      </BillingRoot>
    </SessionProvider>
  )
}

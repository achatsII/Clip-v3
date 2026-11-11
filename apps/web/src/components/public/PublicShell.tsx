'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { LogoMark } from '@/components/Logo'
import { useMessages } from '@/lib/i18n'
import { DictationProvider } from '@/lib/media/dictation'

export function PublicFrame({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: true } } }))
  // Sans compte, pas de transcription par la Gateway : la dictée passe par le navigateur, s'il sait faire.
  return (
    <QueryClientProvider client={client}>
      <DictationProvider speech>{children}</DictationProvider>
    </QueryClientProvider>
  )
}

export function PublicMessage({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="glass-panel max-w-md rounded-[40px] p-8 text-center">
        <LogoMark className="mx-auto mb-5 h-14 w-14" />
        <h1 className="text-2xl font-black tracking-tight">{title}</h1>
        <p className="mt-2 font-medium text-slate-500">{description}</p>
        {action && <div className="mt-6">{action}</div>}
      </div>
    </main>
  )
}

export function PublicLoading() {
  const t = useMessages().publicLinks
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <LogoMark className="animate-float h-16 w-16" />
      <p className="label-caps text-slate-400">{t.loading}</p>
    </main>
  )
}

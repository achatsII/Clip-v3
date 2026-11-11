'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { callNative, hasCapability, nativeEnv } from '@/lib/bridge/native'
import { ApiError } from '@/lib/gateway/client'
import { useLang } from '@/lib/i18n'
import { applyTheme, readTheme } from '@/lib/theme'
import { installKeyboardInset } from '@/lib/ui/keyboard'
import { ConfirmProvider } from '../ui/Confirm'
import { ToastProvider } from '../ui/Toast'

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 10 * 60_000,
            refetchOnWindowFocus: true,
            retry: (count, error) => {
              if (error instanceof ApiError && [400, 401, 403, 404].includes(error.status)) return false
              return count < 1
            },
          },
        },
      }),
  )

  useEffect(() => {
    // Installe tout de suite le récepteur du pont natif : un événement de la coquille arrivé tôt n'est pas perdu.
    nativeEnv()
    installKeyboardInset()
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (readTheme().mode === 'system') applyTheme(readTheme())
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </ToastProvider>
      <ShellLanguage />
    </QueryClientProvider>
  )
}

/** Dans la coquille : ses écrans natifs (caméra, note vocale, scan) parlent la langue de l'outil. */
function ShellLanguage() {
  const lang = useLang()
  useEffect(() => {
    if (hasCapability('ui.language')) void callNative('ui.language', { lang }).catch(() => undefined)
  }, [lang])
  return null
}

'use client'

import { Coins } from 'lucide-react'
import { useEffect, useState } from 'react'
import { onAiCost } from '@/lib/billing/bus'
import type { BillingMode } from '@/lib/billing/mode'
import { AI_CREDITS_PER_CAD } from '@/lib/config'
import { creditsForCost } from '@/lib/gateway/ai'
import { useMessages } from '@/lib/i18n'

/** Le temps pendant lequel le coût reste à l'écran ; des réponses qui se suivent s'additionnent. */
const SHOWN_MS = 5000

/**
 * Après une réponse de l'IA, ce qu'elle a coûté, en crédits : jamais avant (le coût est réel, il ne
 * se prédit pas). Discret, quelques secondes, au-dessus de la barre du bas au téléphone. En vrai :
 * les crédits débités. Dans l'aperçu : ce que la réponse aurait coûté, et rien n'est débité.
 */
export function CostChip({ mode }: { mode: BillingMode }) {
  const t = useMessages().billing.spent
  const [shown, setShown] = useState<{ credits: number; preview: boolean } | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const off = onAiCost((c) => {
      const credits = mode === 'live' ? c.charged : mode === 'preview' && c.costCad !== null ? creditsForCost(c.costCad, AI_CREDITS_PER_CAD) : null
      if (credits === null || credits <= 0) return
      setShown((prev) => ({ credits: (prev?.credits ?? 0) + credits, preview: mode === 'preview' }))
      clearTimeout(timer)
      timer = setTimeout(() => setShown(null), SHOWN_MS)
    })
    return () => {
      off()
      clearTimeout(timer)
    }
  }, [mode])

  if (!shown) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] left-1/2 z-[80] flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-slate-900/10 bg-white/95 px-4 py-2.5 text-slate-900 shadow-lg backdrop-blur-md sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0 dark:border-white/10 dark:bg-slate-900/95 dark:text-white"
    >
      <Coins className="h-5 w-5 shrink-0 text-[var(--primary)]" />
      <span className="min-w-0">
        <span className="block text-sm font-black tabular-nums">{t.amount(shown.credits)}</span>
        {shown.preview && <span className="block text-xs font-bold text-slate-500 dark:text-slate-400">{t.preview}</span>}
      </span>
    </div>
  )
}

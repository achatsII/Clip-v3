'use client'

import { BILLING_V2 } from '@/lib/config'
import { AI_COSTS } from '@/lib/billing/catalog'
import type { AiOperation } from '@/lib/gateway/ai'
import { useMessages } from '@/lib/i18n'

/** Le coût d'une action d'IA, affiché sur son bouton (« · 150 crédits »). Rien si la facturation est éteinte. */
export function AiCost({ operation, className }: { operation: AiOperation; className?: string }) {
  const t = useMessages()
  if (!BILLING_V2) return null
  const n = AI_COSTS[operation]
  return <span className={className ?? 'font-bold opacity-80 tabular-nums'}>· {t.billing.credits(n)}</span>
}

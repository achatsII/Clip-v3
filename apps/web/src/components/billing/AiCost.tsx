'use client'

import { AI_COSTS } from '@/lib/billing/catalog'
import { useBilling } from '@/lib/billing/state'
import type { AiOperation } from '@/lib/gateway/ai'
import { useMessages } from '@/lib/i18n'

/** Le coût d'une action d'IA, affiché sur son bouton (« · 150 crédits »). Rien si la facturation ne se montre pas. */
export function AiCost({ operation, className }: { operation: AiOperation; className?: string }) {
  const t = useMessages()
  const { enabled } = useBilling()
  if (!enabled) return null
  const n = AI_COSTS[operation]
  return <span className={className ?? 'font-bold opacity-80 tabular-nums'}>· {t.billing.credits(n)}</span>
}

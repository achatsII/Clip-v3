'use client'

import { useMessages } from '@/lib/i18n'
import type { RealtimeState } from '@/lib/realtime/client'
import { cn } from '@/lib/util/cn'

/**
 * Le direct, en un coup d'œil : vert quand ce qui change sur un autre appareil s'affiche ici
 * aussitôt ; ambre quand le direct ne passe pas et que l'écran se relit seul toutes les 8 s.
 */
export function LiveBadge({ state }: { state: RealtimeState }) {
  const t = useMessages().editor.page.liveBadge
  const look = state === 'live' ? { dot: 'bg-emerald-500 animate-pulse', text: t.on, hint: t.onHint } : state === 'connecting' ? { dot: 'bg-slate-400', text: t.connecting, hint: t.connectingHint } : { dot: 'bg-amber-500', text: t.polling, hint: t.pollingHint }
  return (
    <span role="status" aria-label={look.text} title={look.hint} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-slate-900/[0.05] px-2.5 text-[11px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-300">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', look.dot)} aria-hidden />
      <span className="max-sm:hidden">{look.text}</span>
    </span>
  )
}

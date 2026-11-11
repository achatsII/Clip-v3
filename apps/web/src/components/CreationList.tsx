'use client'

import { Loader2, PauseCircle } from 'lucide-react'
import Link from 'next/link'
import { launchedFrom } from '@/components/capture/GenerationProgress'
import { SectionTitle } from '@/components/ui/Surface'
import { useCreations } from '@/hooks/useCreations'
import { creationOf, STAGE_LABELS } from '@/lib/ai/creation'
import { cn, timeAgo } from '@/lib/util/cn'

/**
 * Les instructions en création, sur cet appareil ou un autre : on voit qu'elles avancent, et
 * elles s'ouvrent d'un toucher (la page suit la création jusqu'au bout).
 */
export function CreationList() {
  const creations = useCreations()
  const now = Date.now()
  const items = (creations.data ?? []).map((d) => ({ d, c: creationOf(d.json_data, now) })).filter((x) => x.c.kind !== 'none')
  if (!items.length) return null
  return (
    <section>
      <SectionTitle title="En création" hint="Elles s’ouvrent dès qu’elles sont prêtes." />
      <div className="space-y-2">
        {items.map(({ d, c }) =>
          c.kind === 'none' ? null : (
            <Link key={d._id} href={`/instructions/${d._id}`} className="btn-press glass-card flex items-center gap-4 rounded-[24px] p-3 pr-4">
              <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white', c.kind === 'running' ? 'bg-gradient-primary shadow-primary' : 'bg-gradient-to-br from-amber-400 to-orange-500')}>
                {c.kind === 'running' ? <Loader2 className="h-6 w-6 animate-spin" /> : <PauseCircle className="h-6 w-6" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-black text-slate-900 dark:text-white">{d.json_data.title}</span>
                <span className="block truncate text-xs font-bold text-slate-500">
                  {c.kind === 'running' ? `${STAGE_LABELS[c.info.stage] ?? 'En cours'} · ${launchedFrom(c.info.device, c.info.byName, true)} ${timeAgo(c.info.startedAt)}` : 'Interrompue : l’appareil qui la créait ne répond plus'}
                </span>
              </span>
              <span className={cn('shrink-0 rounded-xl px-2.5 py-1 text-[10px] font-black tracking-widest text-white uppercase', c.kind === 'running' ? 'bg-violet-500' : 'bg-amber-500')}>{c.kind === 'running' ? 'En création' : 'Interrompue'}</span>
            </Link>
          ),
        )}
      </div>
    </section>
  )
}

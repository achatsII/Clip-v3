'use client'

import { Check, Crosshair, Eye, Loader2, Sparkles, Wand2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { detailLabel, type StageKey } from '@/lib/ai/creation'
import type { JobState } from '@/lib/ai/jobs'
import { inNativeShell } from '@/lib/bridge/native'
import { messages, useMessages } from '@/lib/i18n'
import { cn, formatClock } from '@/lib/util/cn'

/** Les étapes et leur icône ; le libellé se lit au rendu, dans la langue de l'outil. */
const STAGES: Array<{ key: StageKey; icon: ReactNode }> = [
  { key: 'prepare', icon: <Loader2 className="h-5 w-5" /> },
  { key: 'analyze', icon: <Eye className="h-5 w-5" /> },
  { key: 'finish', icon: <Wand2 className="h-5 w-5" /> },
  // Seulement quand la génération annote ses images (deuxième temps) : la ligne paraît à ce moment.
  { key: 'annotate', icon: <Crosshair className="h-5 w-5" /> },
]

/** D'où vient une création suivie à distance : « Lancée depuis l'app mobile par Mélanie ». `inline` : en minuscule, au fil d'une phrase. */
export function launchedFrom(device: 'app' | 'web', byName?: string | null, inline = false): string {
  return messages().capture.progress.launchedFrom(device, byName, inline)
}

/**
 * La génération en cours. `remote` : elle tourne sur un autre appareil ; cet écran la suit (étape
 * et durée relues toutes les 10 s) et s'efface tout seul quand l'instruction est prête.
 */
export function GenerationProgress({ job, onRetry, onCancel, remote }: { job: JobState | undefined; onRetry: () => void; onCancel?: () => void; remote?: { device: 'app' | 'web'; byName?: string | null } }) {
  const t = useMessages()
  const tp = t.capture.progress
  const [now, setNow] = useState(() => Date.now())
  const [tip, setTip] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    // Le conseil suivant ; la liste (et sa longueur) se lit au rendu, dans la langue de l'outil.
    const t = setInterval(() => setTip((i) => i + 1), 6000)
    return () => {
      clearInterval(id)
      clearInterval(t)
    }
  }, [])

  if (job?.status === 'error') {
    return (
      <div className="glass-panel animate-pop-in mx-auto max-w-xl rounded-[40px] p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-100 text-rose-600 dark:bg-rose-500/15">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">{tp.failedTitle}</h2>
        <p className="mt-2 font-medium text-slate-500">{job.message}</p>
        <p className="mt-1 text-sm font-medium text-slate-400">{tp.kept}</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {onCancel && <Button onClick={onCancel}>{tp.reviewMedia}</Button>}
          <Button variant="primary" onClick={onRetry} icon={<Sparkles className="h-5 w-5" />}>
            {t.common.retry}
          </Button>
        </div>
      </div>
    )
  }

  const stage = job?.status === 'running' ? job.stage : 'prepare'
  const stages = stage === 'annotate' ? STAGES : STAGES.filter((s) => s.key !== 'annotate')
  const idx = Math.max(0, stages.findIndex((s) => s.key === stage))
  const elapsed = job?.status === 'running' ? (now - job.startedAt) / 1000 : 0

  return (
    <div className="glass-panel animate-pop-in relative mx-auto max-w-xl overflow-hidden rounded-[40px] p-8 sm:p-10" role="status" aria-live="polite">
      <div className="bg-gradient-primary absolute -top-20 -right-20 h-56 w-56 rounded-full opacity-20 blur-3xl" />
      <div className="relative flex items-center gap-4">
        <span className="bg-gradient-primary shadow-primary animate-float flex h-16 w-16 items-center justify-center rounded-3xl text-white">
          <Sparkles className="h-8 w-8" />
        </span>
        <div>
          <h2 className="text-2xl font-black tracking-tighter">{tp.writing}</h2>
          <p className="text-sm font-bold text-slate-500 tabular-nums">{tp.elapsed(formatClock(elapsed))}</p>
        </div>
      </div>
      <ol className="relative mt-8 space-y-3">
        {stages.map((s, i) => (
          <li key={s.key} className={cn('flex items-center gap-3 rounded-2xl px-4 py-3 transition', i === idx ? 'bg-primary-soft' : 'opacity-70')}>
            <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', i < idx ? 'bg-emerald-500 text-white' : i === idx ? 'bg-gradient-primary text-white' : 'bg-slate-900/5 text-slate-400 dark:bg-white/10')}>
              {i < idx ? <Check className="h-5 w-5" /> : i === idx ? <Loader2 className="h-5 w-5 animate-spin" /> : s.icon}
            </span>
            <span className="flex-1 font-black text-slate-800 dark:text-slate-100">{tp.stages[s.key]}</span>
            {i === idx && job?.status === 'running' && job.detail && <span className="text-xs font-bold text-slate-500">{detailLabel(job.detail)}</span>}
          </li>
        ))}
      </ol>
      <p className="relative mt-8 min-h-12 text-center text-sm font-medium text-slate-500 transition-opacity">💡 {tp.tips[tip % tp.tips.length]}</p>
      <p className="relative mt-2 text-center text-xs font-medium text-slate-400">
        {remote ? tp.remote(launchedFrom(remote.device, remote.byName)) : inNativeShell() ? tp.keepAppOpen : tp.canLeave}
      </p>
    </div>
  )
}

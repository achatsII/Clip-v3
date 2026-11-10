'use client'

import { Check, Eye, Loader2, Sparkles, Wand2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { JobState } from '@/lib/ai/jobs'
import { cn, formatClock } from '@/lib/util/cn'

const STAGES = [
  { key: 'prepare', label: 'Préparation des médias', icon: <Loader2 className="h-5 w-5" /> },
  { key: 'analyze', label: 'L’IA regarde et écoute vos notes', icon: <Eye className="h-5 w-5" /> },
  { key: 'finish', label: 'Mise en forme des étapes', icon: <Wand2 className="h-5 w-5" /> },
]

const TIPS = [
  'Vous pourrez corriger chaque étape d’un mot : « simplifie », « ajoute les gants »…',
  'Chaque étape garde le bon extrait de votre vidéo, à la seconde près.',
  'Une fois publiée, l’instruction s’ouvre au poste par un code QR, sans compte.',
  'Les opérateurs peuvent signaler une étape pas claire : vous la corrigez en un geste.',
  'Votre standard de rédaction (réglages) guide chaque génération.',
]

export function GenerationProgress({ job, onRetry, onCancel }: { job: JobState | undefined; onRetry: () => void; onCancel?: () => void }) {
  const [now, setNow] = useState(() => Date.now())
  const [tip, setTip] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    const t = setInterval(() => setTip((i) => (i + 1) % TIPS.length), 6000)
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
        <h2 className="text-2xl font-black tracking-tight">La génération n’a pas abouti</h2>
        <p className="mt-2 font-medium text-slate-500">{job.message}</p>
        <p className="mt-1 text-sm font-medium text-slate-400">Vos médias sont gardés : rien n’est perdu.</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {onCancel && <Button onClick={onCancel}>Revoir les médias</Button>}
          <Button variant="primary" onClick={onRetry} icon={<Sparkles className="h-5 w-5" />}>
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  const stage = job?.status === 'running' ? job.stage : 'prepare'
  const idx = Math.max(0, STAGES.findIndex((s) => s.key === stage))
  const elapsed = job?.status === 'running' ? (now - job.startedAt) / 1000 : 0

  return (
    <div className="glass-panel animate-pop-in relative mx-auto max-w-xl overflow-hidden rounded-[40px] p-8 sm:p-10" role="status" aria-live="polite">
      <div className="bg-gradient-primary absolute -top-20 -right-20 h-56 w-56 rounded-full opacity-20 blur-3xl" />
      <div className="relative flex items-center gap-4">
        <span className="bg-gradient-primary shadow-primary animate-float flex h-16 w-16 items-center justify-center rounded-3xl text-white">
          <Sparkles className="h-8 w-8" />
        </span>
        <div>
          <h2 className="text-2xl font-black tracking-tighter">L’IA rédige votre instruction</h2>
          <p className="text-sm font-bold text-slate-500 tabular-nums">{formatClock(elapsed)} · d’habitude moins de 2 minutes</p>
        </div>
      </div>
      <ol className="relative mt-8 space-y-3">
        {STAGES.map((s, i) => (
          <li key={s.key} className={cn('flex items-center gap-3 rounded-2xl px-4 py-3 transition', i === idx ? 'bg-primary-soft' : 'opacity-70')}>
            <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', i < idx ? 'bg-emerald-500 text-white' : i === idx ? 'bg-gradient-primary text-white' : 'bg-slate-900/5 text-slate-400 dark:bg-white/10')}>
              {i < idx ? <Check className="h-5 w-5" /> : i === idx ? <Loader2 className="h-5 w-5 animate-spin" /> : s.icon}
            </span>
            <span className="flex-1 font-black text-slate-800 dark:text-slate-100">{s.label}</span>
            {i === idx && job?.status === 'running' && job.detail && <span className="text-xs font-bold text-slate-500">{job.detail}</span>}
          </li>
        ))}
      </ol>
      <p className="relative mt-8 min-h-12 text-center text-sm font-medium text-slate-500 transition-opacity">💡 {TIPS[tip]}</p>
      <p className="relative mt-2 text-center text-xs font-medium text-slate-400">Vous pouvez quitter cet écran : l’instruction s’enregistre toute seule tant que l’onglet reste ouvert.</p>
    </div>
  )
}

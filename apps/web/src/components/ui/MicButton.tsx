'use client'

import { Loader2, Mic, Square } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useDictation, useDictationAvailable } from '@/lib/media/dictation'
import { cn } from '@/lib/util/cn'
import { useMessages } from '@/lib/i18n'

/**
 * Le micro de dictée : un toucher pour parler, un autre pour arrêter ; le texte reconnu va à
 * `onText`. Rien n'est affiché là où la dictée n'est pas possible.
 */
export function MicButton({ onText, className, label: givenLabel, tone = 'field', size = 'md' }: { onText: (text: string) => void; className?: string; label?: string; tone?: 'field' | 'solid'; size?: 'md' | 'lg' }) {
  const t = useMessages()
  const label = givenLabel ?? t.common.dictate
  const toast = useToast()
  const available = useDictationAvailable()
  const { state, toggle } = useDictation(onText, (title, detail) => toast.error(title, detail))
  if (!available) return null
  const recording = state === 'recording'
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={toggle}
      disabled={state === 'busy'}
      aria-label={recording ? t.common.stopDictation : label}
      aria-pressed={recording}
      title={recording ? t.common.stopDictation : label}
      className={cn(
        'btn-press inline-flex shrink-0 items-center justify-center rounded-xl transition-colors',
        size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-11 w-11',
        recording
          ? 'recording-pulse bg-rose-500 text-white'
          : tone === 'solid'
            ? 'bg-slate-900/5 text-slate-600 hover:bg-slate-900/10 dark:bg-white/10 dark:text-slate-200'
            : 'text-slate-400 hover:bg-slate-900/5 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200',
        className,
      )}
    >
      {state === 'busy' ? <Loader2 className="h-5 w-5 animate-spin" /> : recording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
    </button>
  )
}

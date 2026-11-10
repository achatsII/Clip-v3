'use client'

import { Loader2, Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { useToast } from '@/components/ui/Toast'
import { openMic, startRecording, stopStream, type Recording } from '@/lib/media/recorder'
import { cn } from '@/lib/util/cn'

/** Bouton micro : on parle, la transcription s'ajoute au texte (sans le remplacer). */
export function DictateButton({ onText, className, label = 'Dicter', size = 'md' }: { onText: (text: string) => void; className?: string; label?: string; size?: 'md' | 'lg' }) {
  const { files } = useSession()
  const toast = useToast()
  const [state, setState] = useState<'idle' | 'recording' | 'busy'>('idle')
  const rec = useRef<Recording | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      rec.current?.cancel()
      stopStream(stream.current)
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  async function start() {
    try {
      stream.current = await openMic()
      rec.current = startRecording(stream.current, 'audio')
      setState('recording')
      timer.current = setTimeout(() => void stop(), 120_000)
    } catch {
      toast.error('Le micro n’est pas accessible', 'Autorisez le micro dans votre navigateur.')
    }
  }

  async function stop() {
    if (!rec.current) return
    if (timer.current) clearTimeout(timer.current)
    setState('busy')
    const r = rec.current
    rec.current = null
    try {
      const blob = await r.stop()
      stopStream(stream.current)
      const ext = r.mime.includes('mp4') ? 'm4a' : 'webm'
      const text = await files.transcribe(blob, `dictee.${ext}`)
      if (text) onText(text)
      else toast.info('Rien entendu', 'Parlez un peu plus près du micro.')
    } catch {
      toast.error('La dictée n’a pas fonctionné', 'Réessayez ou tapez le texte.')
    } finally {
      setState('idle')
    }
  }

  const dims = size === 'lg' ? 'h-14 w-14' : 'h-11 w-11'
  return (
    <button
      type="button"
      onClick={() => (state === 'recording' ? stop() : state === 'idle' ? start() : undefined)}
      aria-label={state === 'recording' ? 'Arrêter la dictée' : label}
      title={state === 'recording' ? 'Arrêter la dictée' : label}
      className={cn(
        'btn-press inline-flex shrink-0 items-center justify-center rounded-2xl',
        dims,
        state === 'recording' ? 'recording-pulse bg-rose-500 text-white' : 'bg-slate-900/5 text-slate-600 hover:bg-slate-900/10 dark:bg-white/10 dark:text-slate-200',
        className,
      )}
    >
      {state === 'busy' ? <Loader2 className="h-5 w-5 animate-spin" /> : state === 'recording' ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
    </button>
  )
}

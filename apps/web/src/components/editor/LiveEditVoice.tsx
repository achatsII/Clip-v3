'use client'

import { Mic, MicOff, Square } from 'lucide-react'
import { useRef } from 'react'
import { useSession } from '@/components/providers/Session'
import { LIVE_EDIT_TOOLS, answerLiveEditTool, liveEditGreeting, liveEditSystem, type VoiceTurnResult } from '@/lib/ai/agent'
import { useLiveVoice } from '@/lib/ai/useLiveVoice'
import { useMessages } from '@/lib/i18n'
import type { InstructionContent } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'

/**
 * L'assistant d'édition, à la voix : on lui parle, il répond, et chaque changement passe par le
 * même moteur que le clavardage (on le voit s'appliquer, il s'ajoute à la conversation). Ses
 * consignes et ses fonctions sont dans lib/ai/agent.ts ; il parle la langue de l'outil.
 */
export function LiveEditVoice({
  content,
  onModify,
  onGoTo,
  onUndo,
  onStop,
}: {
  content: InstructionContent
  onModify: (request: string) => Promise<VoiceTurnResult>
  onGoTo: (stepId: string) => void
  /** Annule le dernier changement ; faux s'il n'y en a pas. */
  onUndo: () => boolean
  onStop: () => void
}) {
  const { ai } = useSession()
  const t = useMessages()
  const latest = useRef(content)
  latest.current = content

  const onTool = (name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> =>
    answerLiveEditTool(name, args, { content: () => latest.current, modify: onModify, goTo: onGoTo, undo: onUndo })

  const { state, lines, muted, setMuted, level } = useLiveVoice({
    ai,
    systemPrompt: () => liveEditSystem(latest.current),
    tools: LIVE_EDIT_TOOLS,
    greeting: liveEditGreeting(),
    onTool,
  })

  return (
    <div className="shrink-0 border-t border-slate-900/5 bg-violet-50/70 px-4 py-3 dark:border-white/5 dark:bg-violet-500/10">
      <div className="flex items-center gap-3">
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          <span className="bg-gradient-accent absolute inset-0 rounded-full opacity-30 transition-transform duration-100" style={{ transform: `scale(${1 + level * 0.5})` }} />
          <span className={cn('bg-gradient-accent relative flex h-10 w-10 items-center justify-center rounded-full text-white', state === 'connecting' && 'animate-pulse')}>
            <Mic className="h-5 w-5" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black">{state === 'connecting' ? t.editorTools.voice.connecting : state === 'error' ? t.editorTools.voice.unavailable : muted ? t.editorTools.voice.muted : t.editorTools.voice.listening}</p>
          <p className="truncate text-xs font-bold text-slate-500">{state === 'error' ? t.editorTools.voice.checkMic : t.editorTools.voice.example}</p>
        </div>
        <button type="button" onClick={() => setMuted((m) => !m)} disabled={state !== 'listening'} aria-label={muted ? t.editorTools.voice.unmute : t.editorTools.voice.mute} className="btn-press flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 disabled:opacity-40 dark:bg-white/10">
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        <button type="button" onClick={onStop} aria-label={t.editorTools.voice.stop} className="btn-press flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-rose-600 dark:bg-white/10">
          <Square className="h-4 w-4 fill-current" />
        </button>
      </div>
      {lines.length > 0 && (
        <div className="mt-2 max-h-24 space-y-1 overflow-y-auto">
          {lines.slice(-3).map((l, i) => (
            <p key={i} className={cn('text-xs font-bold', l.who === 'user' ? 'text-slate-500' : 'text-violet-800 dark:text-violet-200')}>
              {l.who === 'user' ? t.editorTools.voice.you(l.text) : t.editorTools.voice.assistant(l.text)}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

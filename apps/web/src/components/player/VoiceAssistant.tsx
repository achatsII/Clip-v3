'use client'

import { Mic, MicOff, X } from 'lucide-react'
import { useRef } from 'react'
import { runVoiceTool, VOICE_TOOLS, voiceGreeting, voiceSystemPrompt } from '@/lib/ai/voice'
import { useLiveVoice } from '@/lib/ai/useLiveVoice'
import type { AiApi } from '@/lib/gateway/ai'
import type { InstructionContent } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'
import { strings } from './i18n'

/**
 * Assistant vocal en direct (Gemini Live, `/api/v1/ai/live/session`) : l'opérateur parle, les
 * mains libres. Le modèle navigue dans les étapes par des fonctions de l'app et répond aux
 * questions à partir de l'instruction. Signaler un problème ouvre le formulaire : rien
 * d'irréversible ne part à la voix. Sa consigne et ses fonctions sont dans src/lib/ai/voice.ts.
 */
export function VoiceAssistant({ ai, content, lang, index, onClose, onGo, onReport }: { ai: AiApi; content: InstructionContent; lang: string; index: number; onClose: () => void; onGo: (i: number) => void; onReport: () => void }) {
  const t = strings(lang).assistant
  const indexRef = useRef(index)
  indexRef.current = index
  const handlers = useRef({ onGo, onReport })
  handlers.current = { onGo, onReport }

  const runTool = (name: string, args: Record<string, unknown>): Record<string, unknown> =>
    runVoiceTool(name, args, { content, index: indexRef.current, onGo: (i) => handlers.current.onGo(i), onReport: () => handlers.current.onReport() })

  const { state, lines, muted, setMuted, level } = useLiveVoice({
    ai,
    systemPrompt: () => voiceSystemPrompt(content, lang),
    tools: VOICE_TOOLS,
    greeting: voiceGreeting(lang),
    onTool: runTool,
  })

  return (
    <div className="pb-safe animate-slide-up fixed inset-x-0 bottom-0 z-[65] px-3 pb-3 sm:right-6 sm:bottom-6 sm:left-auto sm:w-[420px] sm:px-0 sm:pb-0">
      <div className="glass-panel rounded-[32px] bg-white/90 p-5 dark:bg-slate-850/95">
        <div className="flex items-center gap-4">
          <span className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <span className="bg-gradient-accent absolute inset-0 rounded-full opacity-30 transition-transform duration-100" style={{ transform: `scale(${1 + level * 0.5})` }} />
            <span className={cn('bg-gradient-accent relative flex h-12 w-12 items-center justify-center rounded-full text-white', state === 'connecting' && 'animate-pulse')}>
              <Mic className="h-6 w-6" />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-black">{state === 'connecting' ? t.connecting : state === 'error' ? t.unavailable : muted ? t.micOff : t.listening}</p>
            <p className="text-sm font-medium text-slate-500">{state === 'error' ? t.checkMic : t.examples}</p>
          </div>
          <button type="button" onClick={() => setMuted((m) => !m)} disabled={state !== 'listening'} className="btn-press flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/5 disabled:opacity-40 dark:bg-white/10" aria-label={muted ? t.unmute : t.mute}>
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
          <button type="button" onClick={onClose} className="btn-press flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/5 dark:bg-white/10" aria-label={t.close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        {lines.length > 0 && (
          <div className="mt-4 max-h-40 space-y-2 overflow-y-auto">
            {lines.slice(-6).map((l, i) => (
              <p key={i} className={cn('rounded-2xl px-3 py-2 text-sm font-bold', l.who === 'user' ? 'ml-8 bg-slate-900/5 dark:bg-white/10' : 'mr-8 bg-primary-soft')}>
                {l.text}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

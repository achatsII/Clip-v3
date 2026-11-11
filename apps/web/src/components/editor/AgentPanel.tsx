'use client'

import { ArrowUp, Check, ChevronDown, ChevronUp, Loader2, Mic, RotateCcw, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AiCost } from '@/components/billing/AiCost'
import { LockBadge } from '@/components/billing/Billing'
import { useSession } from '@/components/providers/Session'
import { Input } from '@/components/ui/Field'
import { errorText } from '@/components/ui/States'
import { agentBusy, askAgent, runAgentOps, type AgentLogEntry, type VoiceTurnResult } from '@/lib/ai/agent'
import { suggestEdits } from '@/lib/ai/suggest'
import { useEntitlement, useGate } from '@/lib/billing/state'
import { useMessages } from '@/lib/i18n'
import type { InstructionContent } from '@/lib/model/types'
import { useToggle } from '@/lib/toggles'
import { cn } from '@/lib/util/cn'
import { LiveEditVoice } from './LiveEditVoice'

interface Message {
  id: number
  role: 'user' | 'agent'
  text: string
  working?: boolean
  error?: boolean
  actions?: AgentLogEntry[]
  /** L'instruction avant ce tour : « Annuler ces changements » y revient. */
  before?: InstructionContent
  undone?: boolean
}

/**
 * L'assistant d'édition, comme un clavardage : on lui écrit (ou on dicte au micro du champ), il
 * répond et modifie l'instruction sous nos yeux, une action à la fois — l'écran va à l'étape qui
 * change. Chaque tour s'annule d'un geste. Au téléphone, la feuille se réduit pendant qu'il
 * travaille pour laisser voir l'étape ; au bureau, c'est une colonne à droite.
 */
export function AgentPanel({
  content,
  setContent,
  focusStepId,
  onFocus,
  onWorking,
  onOpenChange,
}: {
  content: InstructionContent
  setContent: (c: InstructionContent) => void
  /** L'étape que la personne regarde : « cette étape », et les premières suggestions. */
  focusStepId: string | null
  /** Amène l'éditeur à une étape. */
  onFocus: (stepId: string | null) => void
  /** L'étape que l'assistant modifie en ce moment (null quand il a fini). */
  onWorking: (stepId: string | null) => void
  onOpenChange?: (open: boolean) => void
}) {
  const { ai, org } = useSession()
  const t = useMessages()
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [agentSuggestions, setAgentSuggestions] = useState<string[] | null>(null)
  const [liveOn, setLiveOn] = useState(false)
  const busyRef = useRef(false)
  const messagesRef = useRef<Message[]>([])
  messagesRef.current = messages
  // La voix en direct : coupée par le feature toggle, réservée au plan qui donne l'assistant vocal.
  const voiceToggle = useToggle('voiceAssistant')
  const voiceRight = useEntitlement('voice_assistant')
  const gate = useGate()
  const liveContent = useRef(content)
  liveContent.current = busy ? liveContent.current : content
  const scroller = useRef<HTMLDivElement>(null)
  const nextId = useRef(1)
  const history = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([])

  const suggestions = useMemo(() => agentSuggestions ?? suggestEdits(content, org.json_data.standard, focusStepId), [agentSuggestions, content, org.json_data.standard, focusStepId])
  const working = messages.find((m) => m.working)
  const current = working?.actions?.findLast((a) => a.state === 'working')

  useEffect(() => onOpenChange?.(open), [open, onOpenChange])
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const patch = (id: number, p: Partial<Message> | ((m: Message) => Partial<Message>)) => setMessages((list) => list.map((m) => (m.id === id ? { ...m, ...(typeof p === 'function' ? p(m) : p) } : m)))

  async function runTurn(request: string, via: 'text' | 'voice'): Promise<VoiceTurnResult> {
    const ask = request.trim()
    if (!ask) return { reply: '', done: [], failed: [] }
    // Seule la voix peut demander pendant un tour : la réponse est pour le modèle.
    if (busyRef.current) return agentBusy()
    busyRef.current = true
    setBusy(true)
    const userId = nextId.current++
    const agentId = nextId.current++
    const done: string[] = []
    const failed: string[] = []
    setMessages((list) => [...list, { id: userId, role: 'user', text: via === 'voice' ? `🎙 ${ask}` : ask }, { id: agentId, role: 'agent', text: '', working: true }])
    try {
      const turn = await askAgent(ai, org.json_data, liveContent.current, focusStepId, ask, history.current)
      history.current.push({ role: 'user', content: ask }, { role: 'assistant', content: turn.reply })
      setAgentSuggestions(turn.suggestions.length ? turn.suggestions : null)
      patch(agentId, { text: turn.reply })
      if (turn.operations.length) {
        const before = liveContent.current
        patch(agentId, { before, actions: [] })
        // Au téléphone, on laisse voir l'étape qui change (la conversation vocale reste ouverte).
        if (via === 'text' && window.matchMedia('(max-width: 1023px)').matches) setMinimized(true)
        await runAgentOps(turn.operations, {
          ai,
          get: () => liveContent.current,
          set: (c) => {
            liveContent.current = c
            setContent(c)
          },
          focus: (id) => {
            onFocus(id)
            onWorking(id)
          },
          log: (entry) => {
            if (entry.state === 'done') done.push(entry.label)
            if (entry.state === 'error') failed.push(entry.label)
            patch(agentId, (m) => ({ actions: [...(m.actions ?? []).filter((a) => a.key !== entry.key), entry].sort((a, b) => a.key - b.key) }))
          },
        })
      }
      patch(agentId, { working: false })
      return { reply: turn.reply, done, failed }
    } catch (e) {
      const why = t.editorTools.agent.turnFailed(errorText(e))
      patch(agentId, { working: false, error: true, text: why })
      return { reply: why, done, failed: [...failed, why] }
    } finally {
      onWorking(null)
      busyRef.current = false
      setBusy(false)
      setMinimized(false)
    }
  }

  async function send(request = text) {
    if (!request.trim() || busy) return
    setText('')
    await runTurn(request, 'text')
  }

  /** Pour la voix : annule le dernier tour qui a changé quelque chose ; faux s'il n'y en a pas. */
  function undoLast(): boolean {
    const last = [...messagesRef.current].reverse().find((m) => m.before && !m.undone && !m.working)
    if (!last) return false
    undo(last)
    return true
  }

  function undo(m: Message) {
    if (!m.before) return
    setContent(m.before)
    liveContent.current = m.before
    patch(m.id, { undone: true })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-float btn-press kb-hide fixed right-4 bottom-24 z-40 flex h-12 items-center gap-2 rounded-full px-4 text-sm font-black text-[var(--primary-strong)] lg:right-6 lg:bottom-28 dark:text-sky-300"
      >
        <Sparkles className="h-5 w-5" /> {t.editorTools.agent.title}
      </button>
    )
  }

  if (minimized) {
    return (
      <div className="kb-bottom pb-safe fixed inset-x-0 bottom-0 z-50 px-3 pb-3 lg:hidden">
        <button type="button" onClick={() => setMinimized(false)} className="glass-float flex h-14 w-full items-center gap-3 rounded-full px-4 text-left">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[var(--primary)]" />
          <span className="min-w-0 flex-1 truncate text-sm font-black">{current?.label ?? t.editorTools.agent.busy}</span>
          <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" />
        </button>
      </div>
    )
  }

  return (
    <section
      aria-label={t.editorTools.agent.label}
      className="kb-bottom fixed inset-x-0 bottom-0 z-50 flex max-h-[64dvh] flex-col rounded-t-[32px] border border-white/60 bg-white shadow-[0_-12px_40px_rgba(15,23,42,0.18)] lg:inset-x-auto lg:top-24 lg:right-6 lg:bottom-6 lg:max-h-none lg:w-[400px] lg:rounded-[32px] dark:border-white/10 dark:bg-slate-900"
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-slate-900/5 px-4 py-3 dark:border-white/5">
        <span className="bg-gradient-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-black">{t.editorTools.agent.title}</p>
          <p className="truncate text-xs font-bold text-slate-500">{t.editorTools.agent.subtitle}</p>
        </div>
        {voiceToggle && !liveOn && <LiveButton locked={voiceRight === 'locked'} onClick={() => gate(voiceRight, 'voice_assistant', () => setLiveOn(true))} />}
        <button type="button" onClick={() => setMinimized(true)} aria-label={t.editorTools.agent.minimize} className="btn-press flex h-11 w-11 items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-900/5 lg:hidden">
          <ChevronDown className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => { setLiveOn(false); setOpen(false) }} disabled={busy} aria-label={t.editorTools.agent.close} className="btn-press flex h-11 w-11 items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-900/5 disabled:opacity-40">
          <X className="h-5 w-5" />
        </button>
      </header>

      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {!messages.length && (
          <div className="rounded-2xl bg-primary-soft p-4 text-sm font-bold text-slate-700 dark:text-slate-200">
            {t.editorTools.agent.intro}
          </div>
        )}
        {messages.map((m) =>
          m.role === 'user' ? (
            <p key={m.id} className="ml-10 rounded-2xl rounded-br-md bg-slate-900 px-3.5 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-slate-900">
              {m.text}
            </p>
          ) : (
            <div key={m.id} className={cn('mr-6 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm', m.error ? 'bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-200' : 'bg-slate-900/[0.04] dark:bg-white/5')}>
              {m.text ? <p className="font-bold">{m.text}</p> : <p className="flex items-center gap-2 font-bold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> {t.editorTools.agent.reading}</p>}
              {!!m.actions?.length && (
                <ul className="mt-2 space-y-1">
                  {m.actions.map((a) => (
                    <li key={a.key}>
                      <button type="button" onClick={() => onFocus(a.stepId)} className="flex w-full items-start gap-2 rounded-xl px-1.5 py-1 text-left text-[13px] font-bold hover:bg-slate-900/5 dark:hover:bg-white/10">
                        {a.state === 'working' ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-[var(--primary)]" /> : a.state === 'done' ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />}
                        <span className={cn('min-w-0 flex-1', m.undone && 'line-through opacity-60')}>{a.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {m.before && !m.working && !m.undone && (
                <button type="button" onClick={() => undo(m)} className="btn-press mt-2 flex h-10 items-center gap-1.5 rounded-xl px-2 text-xs font-black text-slate-600 hover:bg-slate-900/5 dark:text-slate-300">
                  <RotateCcw className="h-4 w-4" /> {t.editorTools.agent.undoTurn}
                </button>
              )}
              {m.undone && <p className="mt-2 text-xs font-black text-slate-500">{t.editorTools.agent.undone}</p>}
            </div>
          ),
        )}
      </div>

      {!busy && suggestions.length > 0 && (
        <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-4 pb-2">
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => void send(s)} className="glass-card btn-press shrink-0 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              {s}
            </button>
          ))}
        </div>
      )}

      {liveOn && <LiveEditVoice content={content} onModify={(r) => runTurn(r, 'voice')} onGoTo={onFocus} onUndo={undoLast} onStop={() => setLiveOn(false)} />}

      <form
        className="pb-safe flex shrink-0 items-center gap-2 border-t border-slate-900/5 px-3 pt-3 pb-3 dark:border-white/5"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t.editorTools.agent.placeholder} aria-label={t.editorTools.agent.inputLabel} className="h-12" wrapperClassName="flex-1" disabled={busy} />
        <button type="submit" disabled={busy || !text.trim()} aria-label={t.editorTools.agent.send} className="btn-press bg-gradient-primary shadow-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white disabled:opacity-40">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
        </button>
      </form>
      <p className="-mt-2 px-4 pb-2 text-right text-[11px] font-bold text-slate-400 empty:hidden">
        <AiCost operation="edit_agent" className="" />
      </p>
    </section>
  )
}

/** Le bouton qui ouvre l'assistant vocal en direct, dans l'en-tête du panneau. */
export function LiveButton({ onClick, locked }: { onClick: () => void; locked?: boolean }) {
  const t = useMessages()
  return (
    <button type="button" onClick={onClick} aria-label={t.editorTools.agent.live.label} title={locked ? t.editorTools.agent.live.locked : t.editorTools.agent.live.hint} className="btn-press bg-gradient-accent flex h-11 items-center gap-1.5 rounded-2xl px-3 text-xs font-black text-white">
      <Mic className="h-4 w-4" /> {t.editorTools.agent.live.button} {locked && <LockBadge className="ml-0.5" />}
    </button>
  )
}

'use client'

import { ArrowUp, Check, ChevronDown, ChevronUp, FileText, Film, Image as ImageIcon, Loader2, Mic, Paperclip, RotateCcw, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LockBadge } from '@/components/billing/Billing'
import { useSession } from '@/components/providers/Session'
import { Input } from '@/components/ui/Field'
import { errorText } from '@/components/ui/States'
import { agentBusy, agentTurn, runAgentOps, type AgentLogEntry, type VoiceTurnResult } from '@/lib/ai/agent'
import { suggestEdits } from '@/lib/ai/suggest'
import { useBilling, useEntitlement, useGate } from '@/lib/billing/state'
import { useMessages } from '@/lib/i18n'
import { ACCEPTED_FILES, ingestAny, kindOfFile } from '@/lib/media/ingest'
import { uid } from '@/lib/model/repo'
import { sourceTag } from '@/lib/model/sources'
import type { InstructionContent, Source, SourceKind } from '@/lib/model/types'
import { useToast } from '@/components/ui/Toast'
import { suspendsInBackground } from '@/lib/ai/durableAsk'
import { useToggle } from '@/lib/toggles'
import { cn, formatDuration } from '@/lib/util/cn'
import { LiveEditVoice } from './LiveEditVoice'

/** Un média joint à la demande : envoyé tout de suite, il rejoint les médias d'origine. */
interface Attachment {
  key: string
  name: string
  kind: SourceKind | null
  previewUrl?: string
  /** Ses sources : une le plus souvent ; une présentation donne sa note et ses images. */
  sourceIds?: string[]
  /** S7 (ou S7–S12) : le nom que l'assistant lui donne. */
  tag?: string
  uploading: boolean
}

interface Message {
  id: number
  role: 'user' | 'agent'
  text: string
  /** Les médias joints à cette demande. */
  attachments?: Attachment[]
  working?: boolean
  /** La réponse se prépare au serveur : on peut quitter l'app, elle attendra. */
  durable?: boolean
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
/** Une demande envoyée par l'éditeur (les réponses aux questions de l'IA) : le panneau s'ouvre et la traite. */
export interface AgentRequest {
  id: number
  text: string
  /** Appelé à la fin : `ok` si l'assistant a répondu sans erreur. */
  onDone?: (ok: boolean) => void
}

export function AgentPanel({
  content,
  setContent,
  focusStepId,
  onFocus,
  onWorking,
  onOpenChange,
  request,
  sources,
  onSourcesChange,
  onTurnStart,
  onTurnEnd,
  variant = 'panel',
  open: openProp,
  instructionId,
}: {
  /** L'instruction modifiée : au téléphone, la réponse se prépare au serveur sous son nom. */
  instructionId?: string
  content: InstructionContent
  setContent: (c: InstructionContent) => void
  /** L'étape que la personne regarde : « cette étape », et les premières suggestions. */
  focusStepId: string | null
  /** Amène l'éditeur à une étape. */
  onFocus: (stepId: string | null) => void
  /** L'étape que l'assistant modifie en ce moment (null quand il a fini). */
  onWorking: (stepId: string | null) => void
  onOpenChange?: (open: boolean) => void
  /** Une demande à traiter tout de suite, envoyée par l'éditeur. */
  request?: AgentRequest | null
  /** Les sources d'origine (S1, S2…) : l'assistant les lit, et les revoit seulement si la demande l'exige. */
  sources?: Source[]
  /** Les sources après une revue (URI Gemini rafraîchies), à garder dans l'instruction. */
  onSourcesChange?: (sources: Source[]) => void
  /** L'assistant va modifier (la demande en main) : l'éditeur en fait un seul pas d'annulation. */
  onTurnStart?: (request: string) => void
  onTurnEnd?: () => void
  /**
   * `bubble` : par-dessus l'aperçu plein écran, une petite bulle ronde en bas à droite, au-dessus des
   * boutons du lecteur ; ouverte, la même conversation (écrire, dicter, parler en direct).
   */
  variant?: 'panel' | 'bubble'
  /** Ouvert ou fermé par la page (la bulle de l'aperçu vit dans la barre du lecteur). */
  open?: boolean
}) {
  const { ai, org, files, data } = useSession()
  const toast = useToast()
  // Joindre des médias (toggle `agentAttach`) : seulement là où l'instruction garde ses sources.
  const attachOn = useToggle('agentAttach') && !!onSourcesChange
  const slides = useToggle('slidesImport')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const attachInput = useRef<HTMLInputElement>(null)
  // La liste à jour, même entre deux rendus (plusieurs envois qui finissent ensemble).
  const sourcesRef = useRef<Source[]>(sources ?? [])
  sourcesRef.current = sources ?? sourcesRef.current
  // Au téléphone, la réponse se prépare au serveur : iOS suspend l'app hors de l'écran (`durableAsk`).
  const backgroundAi = useToggle('backgroundAi')
  const serverJobs = useToggle('serverGeneration')
  const durable = backgroundAi && serverJobs && !!instructionId && suspendsInBackground() ? { data, instructionId } : undefined
  const t = useMessages()
  const [openInner, setOpenInner] = useState(false)
  const open = openProp ?? openInner
  const setOpen = (v: boolean) => {
    if (openProp === undefined) setOpenInner(v)
    onOpenChange?.(v)
  }
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
  // Traduire : le même droit que le menu « Traduire » (toggle, et la feature du plan).
  const translateToggle = useToggle('translations')
  const translateRight = useEntitlement('translations')
  const canTranslate = translateToggle && translateRight !== 'locked'
  const { openPaywall } = useBilling()
  const liveContent = useRef(content)
  liveContent.current = busy ? liveContent.current : content
  const scroller = useRef<HTMLDivElement>(null)
  const nextId = useRef(1)
  const history = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([])

  const suggestions = useMemo(() => agentSuggestions ?? suggestEdits(content, org.json_data.standard, focusStepId), [agentSuggestions, content, org.json_data.standard, focusStepId])
  const working = messages.find((m) => m.working)
  const current = working?.actions?.findLast((a) => a.state === 'working')

  // Une demande de l'éditeur : le panneau s'ouvre et la traite sous les yeux de la personne.
  const handled = useRef(0)
  useEffect(() => {
    if (!request || handled.current === request.id) return
    handled.current = request.id
    setOpen(true)
    setMinimized(false)
    void runTurn(request.text, 'text').then((r) => request.onDone?.(r.failed.length === 0 && !!r.reply))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request])
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const patch = (id: number, p: Partial<Message> | ((m: Message) => Partial<Message>)) => setMessages((list) => list.map((m) => (m.id === id ? { ...m, ...(typeof p === 'function' ? p(m) : p) } : m)))

  async function runTurn(request: string, via: 'text' | 'voice', attached: Attachment[] = []): Promise<VoiceTurnResult> {
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
    setMessages((list) => [...list, { id: userId, role: 'user', text: via === 'voice' ? `🎙 ${ask}` : ask, attachments: attached.length ? attached : undefined }, { id: agentId, role: 'agent', text: '', working: true, durable: !!durable }])
    try {
      const ta = t.editorTools.agent
      let looked: string | null = null
      const turn = await agentTurn({
        ai,
        files,
        org: org.json_data,
        content: liveContent.current,
        focusStepId,
        request: ask,
        history: history.current,
        sources: sourcesRef.current,
        // Les médias joints à la demande : l'assistant les reçoit tout de suite.
        attached: attached.flatMap((a) => a.sourceIds ?? []),
        // Revoir les sources : une action visible dans la conversation, avec ce qu'on revoit.
        onLook: (info) => {
          looked = info.sourceIds.join(', ')
          patch(agentId, (m) => ({
            actions: [...(m.actions ?? []), { key: -1, label: ta.looking(looked!, info.videoSec > 0 ? formatDuration(info.videoSec) : null), stepId: null, state: 'working' as const }],
          }))
        },
        onSources: onSourcesChange,
        canTranslate,
        durable,
      })
      if (looked) patch(agentId, (m) => ({ actions: (m.actions ?? []).map((a) => (a.key === -1 ? { ...a, label: ta.looked(looked!), state: 'done' as const } : a)) }))
      history.current.push({ role: 'user', content: ask }, { role: 'assistant', content: turn.reply })
      setAgentSuggestions(turn.suggestions.length ? turn.suggestions : null)
      patch(agentId, { text: turn.reply })
      if (turn.operations.length) {
        const before = liveContent.current
        // La revue des sources, s'il y en a eu une, reste en tête des actions.
        patch(agentId, (m) => ({ before, actions: (m.actions ?? []).filter((a) => a.key === -1) }))
        // Au téléphone, on laisse voir l'étape qui change (la conversation vocale reste ouverte).
        if (via === 'text' && window.matchMedia('(max-width: 1023px)').matches) setMinimized(true)
        onTurnStart?.(ask)
        try {
          await runAgentOps(turn.operations, {
            ai,
            sources: sourcesRef.current,
            files,
            canTranslate,
            onLocked: (feature) => openPaywall({ feature }),
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
        } finally {
          onTurnEnd?.()
        }
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

  const uploading = attachments.some((a) => a.uploading)
  const ready = attachments.filter((a) => a.sourceIds?.length)
  async function send(request = text) {
    if (busy || uploading || (!request.trim() && !ready.length)) return
    setText('')
    setAttachments([])
    await runTurn(request.trim() || t.editorTools.agent.attachOnly, 'text', ready)
  }

  /** Les fichiers joints partent tout de suite et rejoignent les médias d'origine, dans l'ordre. */
  const dropped = useRef(new Set<string>())
  async function attach(list: File[]) {
    for (const file of list) {
      const key = uid('att_')
      const kind = kindOfFile(file)
      const blobUrl = kind === 'photo' ? URL.createObjectURL(file) : undefined
      setAttachments((a) => [...a, { key, name: file.name, kind, previewUrl: blobUrl, uploading: true }])
      try {
        const added = await ingestAny(file, files, { slides })
        if (dropped.current.has(key)) {
          const paths = added.flatMap((s) => (s.path ? [s.path] : []))
          if (paths.length) void files.remove(paths).catch(() => undefined)
          continue
        }
        const first = sourcesRef.current.length
        const next = [...sourcesRef.current, ...added]
        sourcesRef.current = next
        onSourcesChange?.(next)
        const src = added.find((s) => s.kind !== 'note') ?? added[0]
        const thumb = src.thumbnailUrl ?? (src.kind === 'photo' ? src.url : undefined)
        if (thumb && blobUrl) URL.revokeObjectURL(blobUrl)
        const tag = added.length > 1 ? `${sourceTag(first)}–${sourceTag(next.length - 1)}` : sourceTag(first)
        setAttachments((a) => a.map((x) => (x.key === key ? { ...x, kind: added.length > 1 ? 'document' : src.kind, sourceIds: added.map((s) => s.id), tag, previewUrl: thumb ?? x.previewUrl, uploading: false } : x)))
      } catch (e) {
        setAttachments((a) => a.filter((x) => x.key !== key))
        toast.error(t.editorTools.agent.attachFailed, errorText(e))
      }
    }
  }
  /** Retiré avant l'envoi : le média quitte aussi les médias d'origine (c'était une erreur de fichier). */
  function detach(a: Attachment) {
    setAttachments((list) => list.filter((x) => x.key !== a.key))
    if (a.uploading) return void dropped.current.add(a.key)
    const ids = new Set(a.sourceIds ?? [])
    const victims = sourcesRef.current.filter((x) => ids.has(x.id))
    if (!victims.length) return
    const next = sourcesRef.current.filter((x) => !ids.has(x.id))
    sourcesRef.current = next
    onSourcesChange?.(next)
    const paths = victims.flatMap((v) => (v.path ? [v.path] : []))
    if (paths.length) void files.remove(paths).catch(() => undefined)
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

  const bubble = variant === 'bubble'
  if (!open) {
    // La bulle de l'aperçu est posée par la page, dans la barre du lecteur (`AgentBubble`) ; ouvert par
    // la page (l'éditeur : le bouton « Assistant » de l'en-tête), le panneau n'a pas son propre bouton.
    return bubble || openProp !== undefined ? null : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-float btn-press kb-hide fixed right-4 bottom-24 z-40 flex h-12 items-center gap-2 rounded-full px-4 text-sm font-black text-[var(--primary-strong)] lg:right-6 lg:bottom-28 dark:text-[var(--primary-light)]"
      >
        <Sparkles className="h-5 w-5" /> {t.editorTools.agent.title}
      </button>
    )
  }

  if (minimized) {
    // Réduit : une pastille en bas (au bureau, dans le coin) ; l'éditeur reste tout entier visible.
    return (
      <div className={cn('kb-bottom pb-safe fixed inset-x-0 bottom-0 px-3 pb-3 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:px-0 lg:pb-0', bubble ? 'z-[60]' : 'z-50')}>
        <button type="button" onClick={() => setMinimized(false)} aria-label={t.editorTools.agent.title} className="glass-float flex h-14 w-full items-center gap-3 rounded-full px-4 text-left lg:w-[320px]">
          {busy ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[var(--primary)]" /> : <Sparkles className="h-5 w-5 shrink-0 text-[var(--primary)]" />}
          <span className="min-w-0 flex-1 truncate text-sm font-black">{busy ? (current?.label ?? t.editorTools.agent.busy) : t.editorTools.agent.title}</span>
          <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" />
        </button>
      </div>
    )
  }

  return (
    <section
      aria-label={t.editorTools.agent.label}
      // Ses champs gardent leur propre annulation : Ctrl+Z n'y annule pas l'instruction.
      data-own-undo=""
      // Au bureau, une fenêtre qui flotte par-dessus l'éditeur, dans le coin : rien n'est tassé, on voit ce qui change.
      className={cn('kb-bottom fixed inset-x-0 bottom-0 flex max-h-[64dvh] flex-col rounded-t-[32px] border border-white/60 bg-white shadow-[0_-12px_40px_rgba(15,23,42,0.18)] lg:inset-x-auto lg:right-6 lg:bottom-6 lg:h-[min(640px,calc(100dvh-7rem))] lg:max-h-none lg:w-[380px] lg:rounded-[32px] lg:shadow-[0_24px_60px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-slate-900', bubble ? 'z-[60]' : 'z-50')}
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
        <button type="button" onClick={() => setMinimized(true)} aria-label={t.editorTools.agent.minimize} title={t.editorTools.agent.minimize} className="btn-press flex h-11 w-11 items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-900/5">
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
            <div key={m.id} className="ml-10 space-y-1.5">
              {!!m.attachments?.length && (
                <div className="flex flex-wrap justify-end gap-1.5">
                  {m.attachments.map((a) => (
                    <AttachmentThumb key={a.key} a={a} />
                  ))}
                </div>
              )}
              <p className="rounded-2xl rounded-br-md bg-slate-900 px-3.5 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-slate-900">{m.text}</p>
            </div>
          ) : (
            <div key={m.id} className={cn('mr-6 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm', m.error ? 'bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-200' : 'bg-slate-900/[0.04] dark:bg-white/5')}>
              {m.text ? <p className="font-bold">{m.text}</p> : <p className="flex items-center gap-2 font-bold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> {t.editorTools.agent.reading}</p>}
              {!m.text && m.working && m.durable && <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{t.editorTools.agent.keepsGoing}</p>}
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

      {attachments.length > 0 && (
        <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto border-t border-slate-900/5 px-3 pt-3 dark:border-white/5">
          {attachments.map((a) => (
            <span key={a.key} title={a.uploading ? t.editorTools.agent.attaching(a.name) : t.editorTools.agent.attached} className="flex h-14 shrink-0 items-center gap-1.5 rounded-2xl bg-slate-900/[0.05] p-1 dark:bg-white/10">
              <AttachmentThumb a={a} />
              <span className="max-w-28 truncate text-xs font-bold">{a.name}</span>
              <button type="button" onClick={() => detach(a)} aria-label={t.editorTools.agent.removeAttachment(a.name)} className="btn-press flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-900/5 dark:hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </span>
          ))}
        </div>
      )}
      <form
        className={cn('pb-safe flex shrink-0 items-center gap-2 px-3 pt-3 pb-3', !attachments.length && 'border-t border-slate-900/5 dark:border-white/5')}
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        {attachOn && (
          <>
            <button type="button" onClick={() => attachInput.current?.click()} disabled={busy} aria-label={t.editorTools.agent.attach} title={t.editorTools.agent.attach} className="btn-press flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-slate-600 hover:bg-slate-900/5 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10">
              <Paperclip className="h-5 w-5" />
            </button>
            <input
              ref={attachInput}
              type="file"
              multiple
              accept={ACCEPTED_FILES}
              className="hidden"
              onChange={(e) => {
                const list = [...(e.target.files ?? [])]
                e.target.value = ''
                if (list.length) void attach(list)
              }}
            />
          </>
        )}
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t.editorTools.agent.placeholder} aria-label={t.editorTools.agent.inputLabel} className="h-12" wrapperClassName="flex-1" disabled={busy} />
        <button type="submit" disabled={busy || uploading || (!text.trim() && !ready.length)} aria-label={t.editorTools.agent.send} className="btn-press bg-gradient-primary shadow-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white disabled:opacity-40">
          {busy || uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
        </button>
      </form>
    </section>
  )
}

/** La vignette d'un média joint : son image, ou l'icône de son genre ; son numéro (S7) une fois envoyé. */
function AttachmentThumb({ a }: { a: Attachment }) {
  const Icon = a.kind === 'video' ? Film : a.kind === 'audio' ? Mic : a.kind === 'photo' ? ImageIcon : FileText
  return (
    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
      {a.previewUrl ? <img src={a.previewUrl} alt="" className="h-full w-full object-cover" /> : <Icon className="h-5 w-5" />}
      {a.uploading && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/45">
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        </span>
      )}
      {a.tag && <span className="absolute top-0.5 left-0.5 rounded bg-black/70 px-1 text-[10px] font-black text-white tabular-nums">{a.tag}</span>}
    </span>
  )
}

/** La bulle qui ouvre l'assistant dans l'aperçu : ronde, discrète, à droite de « Suivant ». */
export function AgentBubble({ onClick }: { onClick: () => void }) {
  const t = useMessages()
  return (
    <button type="button" onClick={onClick} aria-label={t.editorTools.agent.title} title={t.editorTools.agent.subtitle} className="glass-float btn-press flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[var(--primary-strong)] dark:text-[var(--primary-light)]">
      <Sparkles className="h-6 w-6" />
    </button>
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

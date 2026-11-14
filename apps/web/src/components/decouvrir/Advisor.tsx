'use client'

/**
 * Le conseiller de l'espace Découvrir : il répond sur ce que Clip fait aujourd'hui (la base de
 * connaissance), ne dit jamais seulement « non » — ce qui n'existe pas encore devient un besoin décrit en
 * deux ou trois questions puis enregistré (bloc ```besoin, retiré du message affiché) — et lit un document
 * joint.
 *  - Interrupteur éteint : réponses de démonstration, sans IA, tirées de la base ; rien ne part, le besoin
 *    rejoint seulement « Ce que je retiens ».
 *  - Relié à Sandboxes : la session Découvrir ; l'assistant et le téléversement passent par
 *    /api/decouvrir/gw, la conversation et les besoins vont à Sandboxes (« Ajouté à nos propositions
 *    d'ajout »), les gestes au suivi. Pas de dictée : l'accès des prospects n'a pas la transcription.
 */
import { CheckCircle2, FileText, Lightbulb, Loader2, Paperclip, Send, Sparkles, Target, X, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { fieldLook } from '@/components/ui/Field'
import { Skeleton } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { advisorAsk, AdvisorError, advisorUpload, loadThread, putConversation, saveThread, sendNeed, useAccess, useAccessSetup } from '@/lib/decouvrir/access'
import { advisorRequest, EMPTY_EXTRACT, mergeExtract, readAdvisorReply, toConversationPayload, type AdvisorMessage, type AdvisorThread, type Extract } from '@/lib/decouvrir/advisor'
import { demoAnswer, STARTER_HINTS } from '@/lib/decouvrir/advisorDemo'
import { isVideoId, LIBRARY_PATH, type VideoId } from '@/lib/decouvrir/catalog'
import { extractNeed, type Need } from '@/lib/decouvrir/contract'
import { readLocalViews } from '@/lib/decouvrir/progress'
import { newConversationId, startVisit, track } from '@/lib/decouvrir/tracker'
import type { VideoChapter } from '@/lib/decouvrir/videos'
import { messagesIn, useMessages } from '@/lib/i18n'
import { cn } from '@/lib/util/cn'
import { RichText } from './RichText'

/** Les documents que le conseiller lit : texte dans le navigateur, PDF et images par téléversement. */
const TEXT_TYPES = /\.(csv|txt|md|tsv)$/i
const FILE_TYPES = /\.(pdf|png|jpe?g|webp|csv|txt|md|tsv)$/i
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.csv,.txt,.tsv,.md'
const MAX_FILE_BYTES = 4 * 1024 * 1024

const newThread = (): AdvisorThread => ({ id: newConversationId(), startedAt: Date.now(), updatedAt: Date.now(), messages: [], extract: EMPTY_EXTRACT })

/** Les vidéos vues dans ce navigateur, avec leur titre du catalogue (en français, pour Sandboxes). */
function videosSeen() {
  const titles = messagesIn('fr').decouvrir.videos
  return readLocalViews()
    .filter((v) => isVideoId(v.id))
    .map((v) => ({ id: v.id, titre: titles[v.id as VideoId].title, pct: Math.round(v.maxPct) }))
}

export function AdvisorView({ chapters, published }: { chapters: Record<string, VideoChapter[]>; published: VideoId[] }) {
  const words = useMessages().decouvrir
  const t = words.advisor
  const toast = useToast()
  const linked = useAccessSetup().mode === 'sandboxes'
  const { info } = useAccess()
  const [thread, setThread] = useState<AdvisorThread | null>(null)
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const opened = useRef(false)
  /** Les vidéos publiées et leurs chapitres : le conseiller y renvoie (la vidéo, le chapitre, l'heure). */
  const guide = published.map((id) => ({ id, chapters: chapters[id] ?? [] }))

  // Le fil de la visite en cours (cet onglet), lu après le premier rendu.
  useEffect(() => {
    setThread(loadThread() ?? newThread())
  }, [])

  useEffect(() => {
    if (!linked || opened.current) return
    opened.current = true
    // Les effets d'un enfant passent avant ceux de la coque : la visite commence ici si elle n'a pas commencé.
    startVisit()
    track({ type: 'conseiller', libelle: 'ouvre' })
  }, [linked])

  const count = thread?.messages.length ?? 0
  useEffect(() => {
    if (count || busy) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [count, busy])

  const keep = (next: AdvisorThread) => {
    setThread(next)
    saveThread(next)
  }

  /** Le besoin d'une réponse : envoyé à Sandboxes (relié), ou seulement retenu (espace ouvert). */
  const markNeed = (at: number, need: AdvisorMessage['need']) =>
    setThread((cur) => {
      if (!cur) return cur
      const next = { ...cur, messages: cur.messages.map((m) => (m.at === at && m.role === 'assistant' ? { ...m, need } : m)) }
      saveThread(next)
      return next
    })

  const pickFile = (f: File | null) => {
    if (!f) return
    if (!FILE_TYPES.test(f.name)) return toast.error(t.fileUnsupported)
    if (f.size > MAX_FILE_BYTES) return toast.error(t.fileTooBig)
    setFile(f)
  }

  const errorOf = (e: unknown) => {
    if (!(e instanceof AdvisorError)) return t.errors.other
    if (e.code === 'network') return t.errors.network
    if (e.code === 'timeout') return t.errors.timeout
    if (e.code === 'upload') return t.errors.upload
    if (e.status === 402) return t.errors.credits
    if (e.status === 403) return t.errors.forbidden
    return t.errors.other
  }

  /** `hint` : les mots de la base qu'un exemple vise (la démonstration seulement). */
  const send = async (raw?: string, hint?: string) => {
    const q = (raw ?? text).trim()
    if ((!q && !file) || busy || !thread) return
    setBusy(true)
    setText('')
    const attached = linked ? file : null
    setFile(null)
    const now = Date.now()
    const userMsg: AdvisorMessage = { role: 'user', text: q || t.documentOnly(attached?.name ?? ''), at: now, ...(attached ? { files: [attached.name] } : {}) }
    const base = thread
    const withUser: AdvisorThread = { ...base, messages: [...base.messages, userMsg], updatedAt: now }
    keep(withUser)
    if (linked) {
      if (q) track({ type: 'conseiller', libelle: 'question', donnees: { texte: q.slice(0, 500) } })
      if (attached) track({ type: 'conseiller', libelle: 'fichier', donnees: { nom: attached.name.slice(0, 200), type: attached.type || 'inconnu', taille: attached.size } })
    }
    try {
      let reponse: string
      let extract: Extract
      if (!linked) {
        const r = demoAnswer(q || userMsg.text, base.extract, base.messages, guide, hint)
        reponse = r.reponse
        extract = r.extraction
      } else {
        const doc = attached && TEXT_TYPES.test(attached.name) ? { name: attached.name, text: await attached.text() } : undefined
        const files = attached && !doc ? [await advisorUpload(attached)] : undefined
        const results = await advisorAsk(
          advisorRequest({
            question: q,
            doc,
            files,
            history: base.messages,
            personne: info?.personne.nom,
            seen: videosSeen(),
            retenu: base.extract,
            published: guide,
          }),
        )
        const out = readAdvisorReply(results)
        reponse = out.reponse
        extract = mergeExtract(base.extract, out.extraction)
      }
      // Le bloc ```besoin ne s'affiche jamais : il devient une proposition (relié) ou un besoin retenu.
      const { text: reply, need } = extractNeed(reponse)
      const at = Math.max(Date.now(), now + 1)
      const merged = need && !extract.besoins.includes(need.titre) ? { ...extract, besoins: [...extract.besoins, need.titre] } : extract
      const next: AdvisorThread = {
        ...withUser,
        messages: [...withUser.messages, { role: 'assistant', text: reply || t.errors.other, at, ...(need ? { need: linked ? 'envoi' : 'noted' } : {}) }],
        extract: merged,
        updatedAt: at,
      }
      keep(next)
      if (linked) {
        if (need) void forwardNeed(next.id, need, at)
        putConversation(next.id, toConversationPayload(next, videosSeen())).catch(() => toast.error(t.saveFailed, t.saveFailedText))
      }
    } catch (e) {
      toast.error(t.failed, errorOf(e))
    } finally {
      setBusy(false)
    }
  }

  const forwardNeed = async (conversationId: string, need: Need, at: number) => {
    try {
      await sendNeed(conversationId, need)
      markNeed(at, 'ok')
    } catch {
      markNeed(at, undefined)
      toast.error(t.needFailed, t.needFailedText)
    }
  }

  const messages = thread?.messages ?? []
  const extract = thread?.extract ?? EMPTY_EXTRACT

  return (
    <div className="grid grid-cols-1 gap-5 pt-2 sm:pt-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="glass-panel flex min-h-[560px] flex-col overflow-hidden rounded-[32px] p-0 sm:p-0" aria-label={t.title}>
        <div className="flex items-center gap-3 border-b border-slate-900/5 px-5 py-4 dark:border-white/5">
          <span className="bg-gradient-accent shadow-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-[17px] font-black tracking-tight text-slate-900 dark:text-white">{t.title}</h1>
            <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{linked ? t.subtitle : t.subtitleDemo}</p>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5" aria-live="polite">
          {!thread ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-2/3" />
            </div>
          ) : (
            !messages.length && (
              <div className="space-y-3">
                <p className="text-[15px] font-bold text-slate-700 dark:text-slate-200">{t.hello}</p>
                <div className="flex flex-wrap gap-2">
                  {t.starters.map((s, i) => (
                    <button key={s} type="button" onClick={() => void send(s, STARTER_HINTS[i])} className="btn-press glass-card min-h-11 rounded-2xl px-3.5 py-2 text-left text-[14px] font-bold text-slate-800 hover:bg-white/70 dark:text-slate-100 dark:hover:bg-slate-700/60">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
          {messages.map((m) => (
            <div key={`${m.role}-${m.at}`} className={cn('flex flex-col gap-1.5', m.role === 'user' ? 'items-end' : 'items-start')}>
              <div className={cn('max-w-[88%] rounded-[22px] px-4 py-3', m.role === 'user' ? 'bg-gradient-primary text-white' : 'glass-card text-slate-900 dark:text-slate-100')}>
                {m.files?.map((f) => (
                  <p key={f} className={cn('mb-1.5 flex items-center gap-1.5 text-[12.5px] font-bold', m.role === 'user' ? 'text-white/85' : 'text-slate-500')}>
                    <FileText className="h-3.5 w-3.5" aria-hidden /> {f}
                  </p>
                ))}
                {m.role === 'user' ? <p className="text-[14.5px] font-semibold whitespace-pre-wrap">{m.text}</p> : <RichText text={m.text} />}
              </div>
              {m.role === 'assistant' && m.need && <NeedBadge state={m.need} />}
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="glass-card flex items-center gap-2 rounded-[22px] px-4 py-3 text-[14px] font-bold text-slate-500 dark:text-slate-400">
                <Sparkles className="h-4 w-4 animate-pulse text-[var(--primary)]" aria-hidden /> {t.thinking}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-slate-900/5 p-3 sm:p-4 dark:border-white/5">
          {file && (
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-xl bg-primary-soft px-2.5 py-1.5 text-[13px] font-bold text-[var(--primary-strong)] dark:text-sky-200">
                <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden /> <span className="truncate">{file.name}</span>
              </span>
              <button type="button" onClick={() => setFile(null)} className="btn-press flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-900/5" aria-label={t.removeFile}>
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void send()
            }}
          >
            {linked && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    pickFile(e.target.files?.[0] ?? null)
                    e.target.value = ''
                  }}
                />
                <button type="button" onClick={() => fileRef.current?.click()} className="btn-press glass-card flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-slate-600 dark:text-slate-300" aria-label={t.attach} title={t.attachHint}>
                  <Paperclip className="h-5 w-5" aria-hidden />
                </button>
              </>
            )}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  void send()
                }
              }}
              rows={1}
              placeholder={t.placeholder}
              aria-label={t.inputLabel}
              className={cn(fieldLook, 'max-h-40 min-h-12 flex-1 resize-none [field-sizing:content]')}
            />
            <Button type="submit" variant="primary" icon={<Send className="h-5 w-5" />} loading={busy} disabled={!thread || (!text.trim() && !file)} aria-label={t.send} className="h-12 shrink-0 max-sm:w-12 max-sm:px-0">
              <span className="max-sm:hidden">{t.send}</span>
            </Button>
          </form>
        </div>
      </section>

      <aside className="glass-card h-fit rounded-[28px] p-5 lg:sticky lg:top-6">
        <p className="label-caps mb-3 text-slate-500 dark:text-slate-400">{t.retained}</p>
        <Retained icon={Target} title={t.needs} items={extract.besoins} empty={t.needsEmpty} />
        <Retained icon={Lightbulb} title={t.ideas} items={extract.idees} empty={t.ideasEmpty} />
        <Retained icon={Sparkles} title={t.modules} items={extract.modules} />
        {extract.resume && <p className="mt-3 rounded-2xl bg-primary-soft px-3 py-2.5 text-[13px] font-bold text-slate-800 dark:text-slate-100">{extract.resume}</p>}
        <p className="mt-4 text-[12.5px] font-semibold text-slate-500 dark:text-slate-400">
          {linked ? t.recorded : t.local}{' '}
          <Link href={LIBRARY_PATH} className="font-black text-[var(--primary)] underline-offset-2 hover:underline">
            {words.shell.videos}
          </Link>
        </p>
      </aside>
    </div>
  )
}

function NeedBadge({ state }: { state: NonNullable<AdvisorMessage['need']> }) {
  const t = useMessages().decouvrir.advisor
  const look: Record<typeof state, { icon: LucideIcon; text: string; className: string; spin?: boolean }> = {
    envoi: { icon: Loader2, text: t.needSending, className: 'bg-slate-900/[0.06] text-slate-600 dark:bg-white/10 dark:text-slate-300', spin: true },
    ok: { icon: CheckCircle2, text: t.needSaved, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
    noted: { icon: Lightbulb, text: t.needNoted, className: 'bg-primary-soft text-[var(--primary-strong)] dark:text-sky-200' },
  }
  const l = look[state]
  return (
    <p role="status" className={cn('inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[12.5px] font-black', l.className)}>
      <l.icon className={cn('h-3.5 w-3.5', l.spin && 'animate-spin')} aria-hidden /> {l.text}
    </p>
  )
}

function Retained({ icon: Icon, title, items, empty }: { icon: LucideIcon; title: string; items: string[]; empty?: string }) {
  return (
    <div className="mb-3">
      <p className="mb-1.5 flex items-center gap-1.5 text-[13.5px] font-black text-slate-900 dark:text-white">
        <Icon className="h-4 w-4 text-[var(--primary)]" aria-hidden /> {title}
      </p>
      {items.length ? (
        <ul className="space-y-1">
          {items.map((x) => (
            <li key={x} className="text-[13px] leading-snug font-semibold text-slate-600 dark:text-slate-300">
              · {x}
            </li>
          ))}
        </ul>
      ) : (
        empty && <p className="text-[12.5px] font-medium text-slate-500 dark:text-slate-400">{empty}</p>
      )}
    </div>
  )
}

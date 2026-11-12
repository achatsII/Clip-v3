'use client'

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  Languages,
  Layers,
  Lock,
  MessageCircleQuestion,
  Mic,
  RotateCcw,
  Send,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
  Volume2,
  Wrench,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { EnergyIcon, PpeIcon } from '@/components/icons'
import { MediaLabelsProvider } from '@/components/media/MediaView'
import { Confetti } from '@/components/ui/Celebrate'
import { Modal } from '@/components/ui/Modal'
import { callNative, hasCapability, haptic } from '@/lib/bridge/native'
import { answerQuestion } from '@/lib/ai/assist'
import { answerLanguage } from '@/lib/ai/voice'
import type { AiApi } from '@/lib/gateway/ai'
import type { DataApi } from '@/lib/gateway/data'
import type { FilesApi } from '@/lib/gateway/files'
import { ENERGY, LANGUAGES, PPE, textDir, WARNINGS } from '@/lib/model/catalog'
import { logUsage } from '@/lib/model/repo'
import type { Branding, InstructionContent, Step } from '@/lib/model/types'
import { LiveSpeaker, stepSpeech } from '@/lib/liveSpeech'
import { cn, formatDuration } from '@/lib/util/cn'
import { FeedbackSheet } from './FeedbackSheet'
import { strings, type PlayerStrings } from './i18n'
import { StepMediaArea } from './StepMediaArea'
import { layoutOf } from '@/lib/model/media'
import { VoiceAssistant } from './VoiceAssistant'
import { Input } from '@/components/ui/Field'
import { DictationLanguage } from '@/lib/media/dictation'

export interface PlayerDeps {
  data: DataApi
  ai: AiApi | null
  files: FilesApi | null
}

export interface PlayerProps {
  content: InstructionContent
  instructionId: string
  publishedId?: string
  version?: number | null
  branding?: Branding | null
  stationId?: string | null
  source: 'kiosk' | 'link' | 'app'
  deps: PlayerDeps
  /** Aperçu d'un brouillon : ni événement, ni retour. */
  preview?: boolean
  onExit?: () => void
  /** Un texte dans la langue de l'outil, ou les mots du lecteur à lire dans la langue du poste (pages publiques). */
  exitLabel?: string | ((t: PlayerStrings) => string)
  allowVoice?: boolean
  /** Questions écrites à l'IA (exige le droit `assistant:ask`). */
  allowQuestions?: boolean
  showBranding?: boolean
  /** Aller à cette étape (l'aperçu qu'on modifie : l'étape que l'assistant change). `key` change à chaque demande. */
  focus?: { stepId: string; key: number } | null
  /** L'étape affichée (null avant de commencer et à la fin). */
  onStepChange?: (stepId: string | null) => void
  /** Des classes de plus pour le cadre plein écran (laisser la place au panneau de l'assistant). */
  frameClassName?: string
  /**
   * Un bouton de plus, en bas à droite (la bulle de l'assistant dans l'aperçu) : dans la barre des
   * étapes, à droite de « Suivant », pour ne rien cacher de l'étape ; ailleurs, il flotte.
   */
  accessory?: ReactNode
}

function deviceId(): string {
  try {
    let id = localStorage.getItem('clip_install_id')
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem('clip_install_id', id)
    }
    return id
  } catch {
    return 'anonyme'
  }
}

/** Le contenu dans la langue choisie (les médias ne changent pas). */
function localized(content: InstructionContent, lang: string): InstructionContent {
  const t = lang !== content.language ? content.translations?.[lang] : undefined
  if (!t) return content
  const byId = new Map(t.steps.map((s) => [s.id, s]))
  return {
    ...content,
    title: t.title || content.title,
    summary: t.summary || content.summary,
    safety: t.safety?.length ? t.safety : content.safety,
    steps: content.steps.map((s) => {
      const x = byId.get(s.id)
      if (!x) return s
      return { ...s, title: x.title, text: x.text, keyPoints: x.keyPoints ?? s.keyPoints, warning: s.warning ? { ...s.warning, text: x.warning || s.warning.text } : null }
    }),
  }
}

export function Player(props: PlayerProps) {
  const { instructionId, publishedId, version, branding, stationId, source, deps, preview, onExit, exitLabel, allowVoice, allowQuestions, showBranding = true, focus, onStepChange, frameClassName, accessory } = props
  const languages = useMemo(() => [props.content.language, ...Object.keys(props.content.translations ?? {})], [props.content])
  const [lang, setLang] = useState(() => {
    try {
      const pref = localStorage.getItem('clip_pref_lang')
      return pref && languages.includes(pref) ? pref : props.content.language
    } catch {
      return props.content.language
    }
  })
  const content = useMemo(() => localized(props.content, lang), [props.content, lang])
  const t = strings(lang)
  const exitText = typeof exitLabel === 'function' ? exitLabel(t) : exitLabel
  const total = content.steps.length
  // -1 = avant de commencer ; total = terminé
  const [index, setIndex] = useState(-1)
  const [view, setView] = useState<'steps' | 'document'>('steps')
  const [reading, setReading] = useState(false)
  const [autoRead, setAutoRead] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [askOpen, setAskOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<{ text: string; busy: boolean } | null>(null)
  const [langOpen, setLangOpen] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [rated, setRated] = useState<'up' | 'down' | null>(null)
  const startedAt = useRef<number>(Date.now())
  // La voix en direct : elle s'ouvre au premier « Écouter » et lit chaque étape tout de suite.
  const speaker = useMemo(() => (deps.ai ? new LiveSpeaker(deps.ai) : null), [deps.ai])
  const touch = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (speaker) speaker.onState = setReading
  }, [speaker])

  // Garder l'écran allumé pendant la lecture d'une instruction.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    if (hasCapability('keepAwake')) void callNative('keepAwake', { on: true }).catch(() => undefined)
    else {
      const nav = navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }
      nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => undefined)
    }
    return () => {
      if (hasCapability('keepAwake')) void callNative('keepAwake', { on: false }).catch(() => undefined)
      void lock?.release().catch(() => undefined)
      speaker?.dispose()
    }
  }, [speaker])

  useEffect(() => {
    if (preview) return
    logUsage(deps.data, { type: 'view', instructionId, stationId: stationId ?? null, version: version ?? null, source, deviceId: deviceId() })
  }, [preview, deps.data, instructionId, stationId, version, source])

  const step: Step | undefined = index >= 0 && index < total ? content.steps[index] : undefined

  // L'aperçu qu'on modifie : on va à l'étape demandée, et on dit laquelle est affichée.
  useEffect(() => {
    if (!focus) return
    const i = content.steps.findIndex((s) => s.id === focus.stepId)
    if (i < 0) return
    setIndex(i)
    setView('steps')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.key])
  const stepId = step?.id ?? null
  useEffect(() => onStepChange?.(stepId), [stepId, onStepChange])

  const speakStep = useCallback(
    (s: Step | undefined) => {
      if (!speaker || !s) return
      void speaker.speak(`${s.id}:${lang}`, stepSpeech(s.title, s.text, s.warning?.text), lang)
    },
    [speaker, lang],
  )

  // Préparer la lecture de l'étape suivante pour qu'elle parte sans délai.
  useEffect(() => {
    if (!speaker || !autoRead) return
    const next = content.steps[index + 1]
    if (next) void speaker.prefetch(`${next.id}:${lang}`, stepSpeech(next.title, next.text, next.warning?.text), lang)
  }, [speaker, autoRead, index, content.steps, lang])

  const go = useCallback(
    (i: number) => {
      const clamped = Math.max(-1, Math.min(total, i))
      setIndex(clamped)
      haptic('light')
      speaker?.stop()
      if (clamped === total && !preview) {
        logUsage(deps.data, { type: 'complete', instructionId, stationId: stationId ?? null, version: version ?? null, source, deviceId: deviceId(), durationSec: Math.round((Date.now() - startedAt.current) / 1000) })
        haptic('success')
      }
      if (autoRead && clamped >= 0 && clamped < total) speakStep(content.steps[clamped])
    },
    [total, speaker, autoRead, speakStep, content.steps, preview, deps.data, instructionId, stationId, version, source],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea')) return
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        go(index + 1)
      } else if (e.key === 'ArrowLeft') go(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, index])

  function toggleRead() {
    if (!speaker) return
    if (reading || autoRead) {
      setAutoRead(false)
      speaker.stop()
    } else {
      speaker.unlock()
      setAutoRead(true)
      const s = step ?? content.steps[0]
      if (s)
        void speaker.speak(`${s.id}:${lang}`, stepSpeech(s.title, s.text, s.warning?.text), lang).then((ok) => {
          if (!ok) setAutoRead(false)
        })
    }
  }

  async function ask() {
    if (!deps.ai || !question.trim()) return
    setAnswer({ text: '', busy: true })
    try {
      const r = await answerQuestion(deps.ai, content, Math.max(0, index), question.trim(), answerLanguage(lang))
      setAnswer({ text: r.answer, busy: false })
      if (speaker) void speaker.speak(`answer:${Date.now()}`, r.answer, lang)
    } catch {
      setAnswer({ text: t.noAnswer, busy: false })
    }
  }

  const progress = total ? ((index + 1) / total) * 100 : 0
  const footer = view === 'steps' && index >= 0 && index < total
  const energyById = new Map((content.lockout?.energyPoints ?? []).map((e) => [e.id, e]))

  const player = (
    <div className={cn('fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-950', frameClassName)} role="application" aria-label={content.title}>
      <Confetti show={index === total} />
      {/* En-tête */}
      <header className="pt-safe glass-nav z-10 border-b">
        <div className="flex h-16 items-center gap-2 px-3 sm:px-5">
          {onExit && (
            <button type="button" onClick={onExit} className="btn-press flex h-12 items-center gap-2 rounded-2xl px-3 font-black text-slate-700 hover:bg-slate-900/5 dark:text-slate-200" aria-label={exitText ?? t.close}>
              <X className="h-6 w-6" />
              <span className="hidden sm:inline">{exitText}</span>
            </button>
          )}
          {showBranding && branding?.logoUrl && <img src={branding.logoUrl} alt={branding.orgName} className="hidden h-9 max-w-28 object-contain sm:block" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black tracking-tight sm:text-lg">{content.title}</p>
            {index >= 0 && index < total && (
              <p className="label-caps text-slate-500 tabular-nums">
                {t.stepOf(index + 1, total)}
              </p>
            )}
          </div>
          {languages.length > 1 && (
            <button type="button" onClick={() => setLangOpen(true)} className="btn-press flex h-12 items-center gap-1.5 rounded-2xl px-3 text-sm font-black hover:bg-slate-900/5" aria-label={t.language}>
              <Languages className="h-5 w-5" /> {lang.toUpperCase()}
            </button>
          )}
          <button type="button" onClick={() => setView(view === 'steps' ? 'document' : 'steps')} className="btn-press hidden h-12 items-center gap-1.5 rounded-2xl px-3 text-sm font-black hover:bg-slate-900/5 sm:flex">
            {view === 'steps' ? <BookOpen className="h-5 w-5" /> : <Layers className="h-5 w-5" />} {view === 'steps' ? t.docView : t.stepView}
          </button>
          {speaker && (
            // Un haut-parleur barré se prenait pour un micro : le bouton dit ce qu'il fait.
            <button type="button" onClick={toggleRead} aria-pressed={autoRead} className={cn('btn-press flex h-12 shrink-0 items-center gap-1.5 rounded-2xl px-3 text-sm font-black', autoRead ? 'bg-gradient-primary text-white shadow-primary' : 'glass-card')} aria-label={autoRead ? t.stopReading : t.readAloud} title={autoRead ? t.stopReading : t.readAloud}>
              <Volume2 className={cn('h-5 w-5', autoRead && reading && 'animate-pulse')} /> {t.listen}
            </button>
          )}
        </div>
        {view === 'steps' && index >= 0 && (
          <div className="h-1.5 bg-slate-900/5 dark:bg-white/5">
            <div className="bg-gradient-primary h-full transition-[width] duration-500" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>
        )}
      </header>

      {/* Corps */}
      <main
        className="relative min-h-0 flex-1 overflow-y-auto"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          if (!touch.current || view !== 'steps') return
          const dx = e.changedTouches[0].clientX - touch.current.x
          const dy = e.changedTouches[0].clientY - touch.current.y
          touch.current = null
          if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5 && !(e.target as HTMLElement).closest('video')) go(index + (dx < 0 ? 1 : -1))
        }}
      >
        {view === 'document' ? (
          <div dir={textDir(lang)}>
            <DocumentView content={content} t={t} energyById={energyById} />
          </div>
        ) : index === -1 ? (
          <Intro content={content} t={t} onStart={() => go(0)} />
        ) : index >= total ? (
          <Done
            t={t}
            rated={rated}
            onRate={(v) => setRated(v)}
            onRestart={() => {
              startedAt.current = Date.now()
              go(-1)
            }}
            onReport={() => setFeedbackOpen(true)}
            onExit={onExit}
            exitLabel={exitText}
            preview={preview}
          />
        ) : step ? (
          <div key={step.id} className={cn('animate-fade-in flex h-full min-h-full flex-col', step.media[0] && 'lg:flex-row')}>
            {/* Sans photo ni vidéo, pas de panneau : le texte prend la place, en haut de l'écran. */}
            {step.media[0] && (
              <div className="relative h-[46dvh] shrink-0 bg-slate-900 sm:h-[52dvh] lg:h-auto lg:flex-[1.5]">
                <StepMediaArea step={step} labels={{ zoom: t.zoom, doIt: t.doIt, avoid: t.avoid }} />
              </div>
            )}
            <div dir={textDir(lang)} className={cn('flex min-w-0 flex-1 flex-col gap-4 p-5 sm:p-8', step.media[0] ? 'lg:max-w-[560px] lg:overflow-y-auto' : 'mx-auto w-full max-w-3xl pt-8 sm:pt-12')}>
              <div className="flex items-start gap-4">
                <span className="bg-gradient-primary shadow-primary flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl text-3xl font-black text-white tabular-nums">{index + 1}</span>
                <h2 className="pt-1 text-3xl leading-[1.05] font-black tracking-tighter text-slate-900 sm:text-4xl dark:text-white">{step.title}</h2>
              </div>
              {step.energyPointId && energyById.get(step.energyPointId) && <EnergyChip point={energyById.get(step.energyPointId)!} />}
              {step.warning && (
                <div className={cn('flex items-start gap-3 rounded-3xl p-4 shadow-lg', WARNINGS[step.warning.level].className)}>
                  <TriangleAlert className="mt-0.5 h-7 w-7 shrink-0" />
                  <div>
                    <p className="label-caps opacity-90">{t.warningLevels[step.warning.level]}</p>
                    <p className="text-lg leading-snug font-black">{step.warning.text}</p>
                  </div>
                </div>
              )}
              {step.text && <p className="text-xl leading-relaxed font-bold text-slate-700 sm:text-2xl dark:text-slate-200">{step.text}</p>}
              {!!step.keyPoints?.length && (
                <div className="rounded-3xl bg-primary-soft p-4">
                  <p className="label-caps mb-2 text-[var(--primary-strong)] dark:text-sky-300">{t.keyPoints}</p>
                  <ul className="space-y-2">
                    {step.keyPoints.map((k) => (
                      <li key={k} className="flex items-start gap-2 text-lg font-bold text-slate-800 dark:text-slate-100">
                        <Check className="mt-1 h-5 w-5 shrink-0 text-[var(--primary)]" /> {k}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                {!preview && (
                  <button type="button" onClick={() => setFeedbackOpen(true)} className="btn-press glass-card flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-black text-amber-700 dark:text-amber-300">
                    <MessageCircleQuestion className="h-5 w-5" /> {t.unclear}
                  </button>
                )}
                {allowQuestions && deps.ai && (
                  <button type="button" onClick={() => setAskOpen(true)} className="btn-press glass-card flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-black">
                    <Send className="h-5 w-5" /> {t.ask}
                  </button>
                )}
                {allowVoice && deps.ai && (
                  <button type="button" onClick={() => setVoiceOpen(true)} className="btn-press bg-gradient-accent shadow-accent flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-black text-white">
                    <Mic className="h-5 w-5" /> {t.voice}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Navigation */}
      {accessory && !footer && <div className="kb-hide fixed right-4 bottom-[calc(7.5rem+env(safe-area-inset-bottom))] z-[60] lg:right-6">{accessory}</div>}
      {footer && (
        <footer className="pb-safe glass-nav z-10 border-t">
          <div className="mx-auto flex max-w-5xl gap-3 px-3 py-3 sm:px-5">
            <button type="button" onClick={() => go(index - 1)} className="btn-press glass-card flex h-20 flex-1 items-center justify-center gap-2 rounded-[28px] text-lg font-black text-slate-700 sm:flex-none sm:px-10 dark:text-slate-200" aria-label={t.previous}>
              <ArrowLeft className="h-7 w-7" /> <span className="hidden sm:inline">{t.previous}</span>
            </button>
            <button type="button" onClick={() => go(index + 1)} className="btn-press bg-gradient-primary shadow-primary flex h-20 flex-[2] items-center justify-center gap-3 rounded-[28px] text-xl font-black tracking-wide text-white sm:flex-1">
              {index === total - 1 ? t.finish : t.next} {index === total - 1 ? <Check className="h-7 w-7" /> : <ArrowRight className="h-7 w-7" />}
            </button>
            {accessory && <div className="flex shrink-0 items-center">{accessory}</div>}
          </div>
        </footer>
      )}

      {!preview && (
        <FeedbackSheet
          open={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          t={t}
          data={deps.data}
          files={deps.files}
          base={{
            instructionId,
            publishedId,
            version: version ?? null,
            stepId: step?.id ?? null,
            stepIndex: step ? index : null,
            instructionTitle: props.content.title,
            source,
            stationId: stationId ?? null,
          }}
        />
      )}

      <Modal open={askOpen} onClose={() => { setAskOpen(false); setAnswer(null); setQuestion('') }} title={t.ask} size="md">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void ask()
          }}
        >
          <Input autoFocus value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t.askPlaceholder} aria-label={t.ask} className="h-14 text-lg" wrapperClassName="flex-1" />
          <button type="submit" disabled={!question.trim() || answer?.busy} className="btn-press bg-gradient-primary shadow-primary flex h-14 w-14 items-center justify-center rounded-2xl text-white disabled:opacity-50" aria-label={t.send}>
            <Send className="h-6 w-6" />
          </button>
        </form>
        {answer && (
          <div className="animate-slide-up mt-4 rounded-3xl bg-primary-soft p-5 text-lg font-bold text-slate-800 dark:text-slate-100">{answer.busy ? <span className="skeleton block h-6 w-3/4 rounded-xl" /> : answer.text}</div>
        )}
      </Modal>

      <Modal open={langOpen} onClose={() => setLangOpen(false)} title={t.language} size="sm">
        <div className="grid gap-2">
          {languages.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => {
                setLang(l)
                setLangOpen(false)
                speaker?.stop()
                try {
                  localStorage.setItem('clip_pref_lang', l)
                } catch {
                  /* préférence facultative */
                }
              }}
              className={cn('btn-press flex h-16 items-center justify-between rounded-2xl px-5 text-lg font-black', l === lang ? 'bg-gradient-primary text-white' : 'glass-card')}
            >
              {LANGUAGES[l]?.native ?? l} {l === lang && <Check className="h-5 w-5" />}
            </button>
          ))}
        </div>
      </Modal>

      {allowVoice && deps.ai && voiceOpen && (
        <VoiceAssistant
          ai={deps.ai}
          content={content}
          lang={lang}
          index={index}
          onClose={() => setVoiceOpen(false)}
          onGo={(i) => go(i)}
          onReport={() => setFeedbackOpen(true)}
        />
      )}
    </div>
  )
  // Les commandes des médias (vidéo, page, zoom) suivent la langue du poste, pas celle de l'outil.
  // Au poste, la dictée (retour, question) suit la langue choisie par l'opérateur.
  return (
    <DictationLanguage lang={lang}>
      <MediaLabelsProvider value={t.media}>{player}</MediaLabelsProvider>
    </DictationLanguage>
  )
}

function EnergyChip({ point }: { point: { tag: string; type: keyof typeof ENERGY; isolationDevice: string; location: string } }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-3xl p-3', ENERGY[point.type].color)}>
      <span className="flex h-12 min-w-12 items-center justify-center rounded-2xl bg-black/15 px-2 text-lg font-black">
        <EnergyIcon type={point.type} className="mr-1 h-5 w-5" /> {point.tag}
      </span>
      <span className="text-base leading-tight font-black">
        {point.isolationDevice}
        <span className="block text-sm font-bold opacity-80">{point.location}</span>
      </span>
    </div>
  )
}

function Intro({ content, t, onStart }: { content: InstructionContent; t: ReturnType<typeof strings>; onStart: () => void }) {
  return (
    <div className="mx-auto flex min-h-full max-w-4xl flex-col gap-6 p-5 sm:p-10">
      <div>
        <p className="label-caps text-slate-500">{t.before}</p>
        <h1 className="mt-2 text-4xl leading-[0.95] font-black tracking-tighter sm:text-6xl">{content.title}</h1>
        {content.summary && <p className="mt-3 text-xl font-bold text-slate-600 dark:text-slate-300">{content.summary}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="glass-card inline-flex h-11 items-center gap-2 rounded-2xl px-4 font-black">
            <Layers className="h-5 w-5 text-[var(--primary)]" /> {t.stepCount(content.steps.length)}
          </span>
          {!!content.durationMin && (
            <span className="glass-card inline-flex h-11 items-center gap-2 rounded-2xl px-4 font-black">
              <Clock className="h-5 w-5 text-[var(--primary)]" /> {formatDuration(content.durationMin * 60)}
            </span>
          )}
          {content.kind === 'lockout' && (
            <span className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-[#FF2B5E] to-[#FF6B00] px-4 font-black text-white">
              <Lock className="h-5 w-5" /> {t.lockCount(content.lockout?.locksRequired ?? content.lockout?.energyPoints.length ?? 0)}
            </span>
          )}
        </div>
      </div>

      {!!content.ppe.length && (
        <section>
          <p className="label-caps mb-3 text-slate-500">{t.ppe}</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {content.ppe.map((p) => (
              <div key={p} className="flex flex-col items-center gap-2 rounded-[28px] bg-gradient-to-br from-[#2563eb] to-[#0ea5e9] p-4 text-center text-white shadow-[0_12px_30px_rgba(37,99,235,0.3)]">
                <PpeIcon ppe={p} className="h-10 w-10" />
                <span className="text-sm leading-tight font-black">{t.ppeNames[p] ?? PPE[p] ?? p}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {!!content.safety.length && (
        <section className="rounded-[28px] bg-gradient-to-br from-[#FF2B5E] to-[#FF6B00] p-5 text-white shadow-[0_15px_35px_rgba(255,43,94,0.3)]">
          <p className="label-caps mb-2 flex items-center gap-2 opacity-90">
            <ShieldAlert className="h-4 w-4" /> {t.safety}
          </p>
          <ul className="space-y-1.5">
            {content.safety.map((s) => (
              <li key={s} className="text-lg leading-snug font-black">
                • {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {content.kind === 'lockout' && !!content.lockout?.energyPoints.length && (
        <section>
          <p className="label-caps mb-3 text-slate-500">{t.energy}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {content.lockout.energyPoints.map((e) => (
              <div key={e.id} className="glass-card flex items-start gap-3 rounded-[24px] p-4">
                <span className={cn('flex h-14 min-w-14 items-center justify-center rounded-2xl px-2 text-lg font-black', ENERGY[e.type].color)}>{e.tag}</span>
                <div className="min-w-0 text-sm font-bold text-slate-700 dark:text-slate-200">
                  <p className="text-base font-black text-slate-900 dark:text-white">
                    {t.energyNames[e.type]} {e.magnitude ? `· ${e.magnitude}` : ''}
                  </p>
                  <p>{e.description}</p>
                  <p className="mt-1">
                    <span className="opacity-60">{t.deviceLabel}</span> {e.isolationDevice} — {e.location}
                  </p>
                  <p>
                    <span className="opacity-60">{t.verifyLabel}</span> {e.verification}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!!content.tools.length && (
        <section>
          <p className="label-caps mb-3 text-slate-500">{t.tools}</p>
          <div className="flex flex-wrap gap-2">
            {content.tools.filter(Boolean).map((x) => (
              <span key={x} className="glass-card inline-flex h-12 items-center gap-2 rounded-2xl px-4 font-black">
                <Wrench className="h-4 w-4 text-slate-400" /> {x}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="pb-safe sticky bottom-0 mt-auto pt-4 pb-4">
        <button type="button" onClick={onStart} className="btn-press bg-gradient-primary shadow-primary flex h-20 w-full items-center justify-center gap-3 rounded-full text-2xl font-black tracking-wide text-white">
          {t.start} <ArrowRight className="h-8 w-8" />
        </button>
      </div>
    </div>
  )
}

function Done({ t, rated, onRate, onRestart, onReport, onExit, exitLabel, preview }: { t: ReturnType<typeof strings>; rated: 'up' | 'down' | null; onRate: (v: 'up' | 'down') => void; onRestart: () => void; onReport: () => void; onExit?: () => void; exitLabel?: string; preview?: boolean }) {
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center gap-6 p-8 text-center">
      <span className="animate-pop-in flex h-28 w-28 items-center justify-center rounded-[36px] bg-gradient-to-br from-[#2EE59D] to-[#18c480] text-white shadow-[0_20px_40px_rgba(24,196,128,0.35)]">
        <Check className="h-16 w-16" strokeWidth={3} />
      </span>
      <div>
        <h2 className="text-5xl font-black tracking-tighter">{t.done}</h2>
        <p className="mt-2 text-xl font-bold text-slate-600 dark:text-slate-300">{t.doneText}</p>
      </div>
      {!preview && (
        <div className="w-full">
          <p className="label-caps mb-3 text-slate-500">{t.howWasIt}</p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => onRate('up')} className={cn('btn-press flex h-20 items-center justify-center gap-2 rounded-[28px] text-lg font-black', rated === 'up' ? 'bg-emerald-500 text-white' : 'glass-card')}>
              <ThumbsUp className="h-7 w-7" /> {t.good}
            </button>
            <button
              type="button"
              onClick={() => {
                onRate('down')
                onReport()
              }}
              className={cn('btn-press flex h-20 items-center justify-center gap-2 rounded-[28px] text-lg font-black', rated === 'down' ? 'bg-amber-500 text-white' : 'glass-card')}
            >
              <ThumbsDown className="h-7 w-7" /> {t.bad}
            </button>
          </div>
        </div>
      )}
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <button type="button" onClick={onRestart} className="btn-press glass-card flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black sm:flex-1">
          <RotateCcw className="h-5 w-5" /> {t.restartInstruction}
        </button>
        {onExit && (
          <button type="button" onClick={onExit} className="btn-press bg-gradient-primary shadow-primary flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black text-white sm:flex-1">
            {exitLabel ?? t.backToList}
          </button>
        )}
      </div>
    </div>
  )
}

function DocumentView({ content, t, energyById }: { content: InstructionContent; t: ReturnType<typeof strings>; energyById: Map<string, { tag: string; type: keyof typeof ENERGY; isolationDevice: string; location: string }> }) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 sm:p-8">
      <Intro content={content} t={t} onStart={() => document.getElementById('doc-step-0')?.scrollIntoView({ behavior: 'smooth' })} />
      {content.steps.map((s, i) => (
        <article id={`doc-step-${i}`} key={s.id} className="glass-panel overflow-hidden rounded-[32px] p-0">
          {s.media[0] && (
            <div className={cn('bg-slate-900', layoutOf(s) === 'focus' ? 'aspect-video' : 'aspect-[16/7]')}>
              <StepMediaArea step={s} labels={{ zoom: t.zoom, doIt: t.doIt, avoid: t.avoid }} />
            </div>
          )}
          <div className="p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <span className="bg-gradient-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white">{i + 1}</span>
              <h3 className="pt-1 text-2xl font-black tracking-tight">{s.title}</h3>
            </div>
            {s.energyPointId && energyById.get(s.energyPointId) && <div className="mt-3"><EnergyChip point={energyById.get(s.energyPointId)!} /></div>}
            {s.warning && <p className={cn('mt-3 rounded-2xl p-3 font-black', WARNINGS[s.warning.level].className)}>{t.warningLine(t.warningLevels[s.warning.level], s.warning.text)}</p>}
            {s.text && <p className="mt-3 text-lg font-bold text-slate-700 dark:text-slate-200">{s.text}</p>}
            {!!s.keyPoints?.length && (
              <ul className="mt-3 space-y-1 text-base font-bold">
                {s.keyPoints.map((k) => (
                  <li key={k} className="flex gap-2">
                    <Check className="mt-1 h-4 w-4 text-[var(--primary)]" /> {k}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>
      ))}
      {content.kind === 'lockout' && !!content.lockout?.restartSteps?.length && (
        <section className="glass-panel rounded-[32px] p-6">
          <p className="label-caps mb-3 text-slate-500">{t.restart}</p>
          <ol className="list-decimal space-y-1 pl-6 text-lg font-bold">
            {content.lockout.restartSteps.filter(Boolean).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}

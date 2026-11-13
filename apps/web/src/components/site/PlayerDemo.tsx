'use client'

import { ArrowLeft, ArrowRight, Check, GraduationCap, Info, Languages, MessageCircleQuestion, RotateCcw, Send, TriangleAlert, Volume2, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { DemoInstruction, DemoLang, FeedbackKind, WarningLevel } from '@/lib/site/content/demo'
import { fmt } from '@/lib/site/lang'
import { PHOTOS } from '@/lib/site/media'
import { cx } from './ui'

export interface PlayerDemoText {
  operatorLanguage: string
  close: string
  voiceNote: string
  noVoice: string
  stepPhoto: string
  sent: string
}

type Phase = 'steps' | 'done' | 'quiz' | 'result'

const WARN: Record<WarningLevel, string> = {
  danger: 'bg-gradient-to-br from-[#FF2B5E] to-[#FF6B00] text-white shadow-[0_10px_20px_rgba(255,43,94,0.25)]',
  caution: 'bg-gradient-to-br from-[#FFC800] to-[#FF9F00] text-slate-900 shadow-[0_10px_20px_rgba(255,160,0,0.25)]',
  info: 'bg-gradient-primary text-white shadow-primary',
}
const KINDS: Array<{ kind: FeedbackKind; tone: string }> = [
  { kind: 'unclear', tone: 'from-[#FFC800] to-[#FF9F00] text-slate-900' },
  { kind: 'error', tone: 'from-[#9b2cfa] to-[#2c62fa] text-white' },
  { kind: 'danger', tone: 'from-[#FF2B5E] to-[#FF6B00] text-white' },
  { kind: 'idea', tone: 'from-[#00C6FF] to-[#0078FF] text-white' },
]

/**
 * Le lecteur du poste, en démo (le pas-à-pas de `src/components/player/Player.tsx`) : Précédent,
 * Suivant, Écouter (la voix du navigateur), « Pas clair ? », la langue de l'opérateur (l'arabe de
 * droite à gauche) et, sur demande, la validation de la formation à la fin. Rien n'est envoyé.
 */
export function PlayerDemo({
  instructions,
  langs,
  ui,
  siteLang,
  training,
  id,
}: {
  instructions: Record<DemoLang, DemoInstruction>
  langs: DemoLang[]
  ui: PlayerDemoText
  siteLang: 'fr' | 'en'
  training?: boolean
  id?: string
}) {
  const [lang, setLang] = useState<DemoLang>(langs[0] ?? 'fr')
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('steps')
  const [speaking, setSpeaking] = useState(false)
  const [noVoice, setNoVoice] = useState(false)
  const [sheet, setSheet] = useState<'closed' | 'open' | 'sent'>('closed')
  const [kind, setKind] = useState<FeedbackKind | null>(null)
  const [quiz, setQuiz] = useState<{ i: number; picked: number | null; good: number }>({ i: 0, picked: null, good: 0 })
  const sheetTimer = useRef<number | null>(null)

  const instr = instructions[lang]
  const w = instr.words
  const steps = instr.steps
  const step = steps[Math.min(index, steps.length - 1)]
  const last = index >= steps.length - 1

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  useEffect(() => {
    // Les voix du navigateur se chargent parfois après la page.
    if ('speechSynthesis' in window) window.speechSynthesis.getVoices()
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      if (sheetTimer.current) window.clearTimeout(sheetTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!noVoice) return
    const id = window.setTimeout(() => setNoVoice(false), 3500)
    return () => window.clearTimeout(id)
  }, [noVoice])

  function go(to: number) {
    stopSpeech()
    setSheet('closed')
    setIndex(Math.max(0, Math.min(steps.length - 1, to)))
  }

  function next() {
    if (last) {
      stopSpeech()
      setSheet('closed')
      setPhase('done')
    } else go(index + 1)
  }

  function chooseLang(l: DemoLang) {
    stopSpeech()
    setLang(l)
  }

  function listen() {
    if (speaking) return stopSpeech()
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return setNoVoice(true)
    const synth = window.speechSynthesis
    const voices = synth.getVoices()
    const wanted = instr.speech.toLowerCase()
    const base = wanted.split('-')[0]
    const voice = voices.find((v) => v.lang.toLowerCase().replace('_', '-') === wanted) ?? voices.find((v) => v.lang.toLowerCase().startsWith(base))
    if (voices.length > 0 && !voice) return setNoVoice(true)
    const u = new SpeechSynthesisUtterance([step.title, step.warning?.text, step.text].filter(Boolean).join('. '))
    u.lang = instr.speech
    if (voice) u.voice = voice
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    synth.cancel()
    synth.speak(u)
    setSpeaking(true)
  }

  function send() {
    if (!kind) return
    setSheet('sent')
    sheetTimer.current = window.setTimeout(() => {
      setSheet('closed')
      setKind(null)
    }, 3200)
  }

  function restart() {
    stopSpeech()
    setPhase('steps')
    setIndex(0)
    setQuiz({ i: 0, picked: null, good: 0 })
  }

  function pick(choice: number) {
    if (quiz.picked !== null) return
    const q = instr.quiz[quiz.i]
    setQuiz({ ...quiz, picked: choice, good: quiz.good + (q && choice === q.answer ? 1 : 0) })
  }

  function nextQuestion() {
    if (quiz.i + 1 < instr.quiz.length) setQuiz({ i: quiz.i + 1, picked: null, good: quiz.good })
    else setPhase('result')
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (phase !== 'steps' || sheet !== 'closed') return
    if (e.key === 'ArrowRight') next()
    if (e.key === 'ArrowLeft') go(index - 1)
  }

  const passed = quiz.good / Math.max(1, instr.quiz.length) >= 0.8
  const question = instr.quiz[quiz.i]

  return (
    <div id={id} className="scroll-mt-24" onKeyDown={onKeyDown}>
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        <span className="label-caps text-slate-500 dark:text-slate-400">{ui.operatorLanguage}</span>
        <div role="group" aria-label={ui.operatorLanguage} className="glass-card flex flex-wrap gap-1 rounded-2xl p-1">
          {langs.map((l) => (
            <button
              key={l}
              type="button"
              lang={l}
              dir={instructions[l].dir}
              aria-pressed={lang === l}
              onClick={() => chooseLang(l)}
              className={cx(
                'btn-press h-11 min-w-11 rounded-xl px-3.5 text-sm font-black',
                lang === l ? 'bg-gradient-primary shadow-primary text-white' : 'text-slate-700 hover:bg-white/70 dark:text-slate-200 dark:hover:bg-white/10',
              )}
            >
              {instructions[l].words.name}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[34px] bg-slate-900 p-2 shadow-[0_50px_100px_-30px_rgba(15,23,42,0.55)] ring-1 ring-slate-700 sm:p-3">
        <div className="relative overflow-hidden rounded-[24px] bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white" dir={instr.dir} lang={lang}>
          {/* L'en-tête du lecteur : titre, étape, langue, écouter. */}
          <div className="flex h-16 items-center gap-2 border-b border-slate-900/5 bg-white/85 px-3 sm:px-4 dark:border-white/5 dark:bg-slate-900/85">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-black tracking-tight sm:text-lg">{instr.title}</p>
              <p className="label-caps text-[10px] text-slate-500 tabular-nums dark:text-slate-400">{phase === 'steps' ? fmt(w.stepOf, { n: index + 1, total: steps.length }) : w.done}</p>
            </div>
            <span className="hidden h-11 items-center gap-1.5 rounded-2xl px-2 text-xs font-black text-slate-600 sm:flex dark:text-slate-300" dir="ltr">
              <Languages className="h-4 w-4" aria-hidden />
              {lang.toUpperCase()}
            </span>
            {phase === 'steps' && (
              <button
                type="button"
                onClick={listen}
                aria-pressed={speaking}
                className={cx(
                  'btn-press inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl px-3 text-sm font-black',
                  speaking ? 'bg-[#0078ff] text-white shadow-primary' : 'glass-card text-slate-900 dark:text-white',
                )}
              >
                {speaking ? (
                  <span className="site-wave flex h-[18px] items-end gap-[3px]" aria-hidden>
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                ) : (
                  <Volume2 className="h-5 w-5" aria-hidden />
                )}
                <span className="max-sm:sr-only">{speaking ? w.stop : w.listen}</span>
              </button>
            )}
          </div>
          <div className="h-1.5 bg-slate-900/5 dark:bg-white/10">
            <div className="bg-gradient-primary h-full transition-[width] duration-500" style={{ width: phase === 'steps' ? `${((index + 1) / steps.length) * 100}%` : '100%' }} />
          </div>

          {phase === 'steps' && step && (
            <>
              <div className="grid md:min-h-[430px] md:grid-cols-[1.35fr_1fr]">
                <div className="relative aspect-video bg-slate-900 md:aspect-auto" dir="ltr">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={`${lang}-${index}`}
                    src={PHOTOS[step.photo].src}
                    alt={fmt(ui.stepPhoto, { n: index + 1 })}
                    width={PHOTOS[step.photo].width}
                    height={PHOTOS[step.photo].height}
                    className="animate-fade-in absolute inset-0 h-full w-full object-cover"
                  />
                </div>
                <div key={`${lang}-${index}-text`} className="animate-slide-up flex flex-col gap-4 p-4 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="bg-gradient-primary shadow-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] text-xl font-black text-white tabular-nums sm:h-14 sm:w-14 sm:text-2xl">
                      {index + 1}
                    </span>
                    <h3 className="pt-1 text-2xl leading-[1.05] font-black tracking-tighter sm:text-[1.9rem]">{step.title}</h3>
                  </div>
                  {step.warning && (
                    <div className={cx('flex items-start gap-3 rounded-[22px] px-4 py-3', WARN[step.warning.level])}>
                      {step.warning.level === 'info' ? <Info className="mt-0.5 h-6 w-6 shrink-0" aria-hidden /> : <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />}
                      <div>
                        <p className="label-caps text-[10px] opacity-90">{w.warningLevels[step.warning.level]}</p>
                        <p className="text-base leading-snug font-black">{step.warning.text}</p>
                      </div>
                    </div>
                  )}
                  <p className="text-lg leading-relaxed font-bold text-slate-700 dark:text-slate-200">{step.text}</p>
                  {step.keyPoints.length > 0 && (
                    <div className="rounded-[22px] bg-[var(--primary-soft)] px-4 py-3">
                      <p className="label-caps text-[10px] text-[var(--primary-strong)] dark:text-sky-300">{w.keyPoints}</p>
                      <ul className="mt-1.5 space-y-1">
                        {step.keyPoints.map((k) => (
                          <li key={k} className="flex items-center gap-2 text-[15px] font-bold text-slate-800 dark:text-slate-100">
                            <Check className="h-4 w-4 shrink-0 text-[var(--primary)]" strokeWidth={3} aria-hidden />
                            {k}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-auto pt-1">
                    <button
                      type="button"
                      onClick={() => setSheet('open')}
                      className="btn-press glass-card inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black text-amber-700 dark:text-amber-300"
                    >
                      <MessageCircleQuestion className="h-4 w-4" aria-hidden />
                      {w.unclear}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 border-t border-slate-900/5 bg-white/85 p-2.5 sm:gap-3 sm:p-3 dark:border-white/5 dark:bg-slate-900/85">
                <button
                  type="button"
                  onClick={() => go(index - 1)}
                  disabled={index === 0}
                  className="btn-press glass-card flex h-14 flex-1 items-center justify-center gap-2 rounded-[22px] text-base font-black text-slate-700 disabled:opacity-40 sm:h-16 dark:text-slate-200"
                >
                  <ArrowLeft className="h-5 w-5 rtl:-scale-x-100" aria-hidden />
                  {w.previous}
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="btn-press bg-gradient-primary shadow-primary flex h-14 flex-[2] items-center justify-center gap-2.5 rounded-[22px] text-lg font-black tracking-wide text-white sm:h-16"
                >
                  {last ? w.finish : w.next}
                  <ArrowRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden />
                </button>
              </div>
            </>
          )}

          {phase === 'done' && (
            <div className="animate-pop-in flex min-h-[420px] flex-col items-center justify-center gap-4 p-6 text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#2EE59D] to-[#18c480] text-white shadow-[0_20px_40px_rgba(24,196,128,0.35)]">
                <Check className="h-10 w-10" strokeWidth={3} aria-hidden />
              </span>
              <p className="text-3xl font-black tracking-tighter">{w.done}</p>
              <p className="max-w-sm font-bold text-slate-600 dark:text-slate-300">{w.doneText}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {training && instr.quiz.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPhase('quiz')}
                    className="btn-press bg-gradient-primary shadow-primary inline-flex h-14 items-center gap-2 rounded-full px-6 text-base font-black text-white"
                  >
                    <GraduationCap className="h-5 w-5" aria-hidden />
                    {w.training.start}
                    <span className="text-sm font-bold opacity-80">· {fmt(w.training.startHint, { n: instr.quiz.length })}</span>
                  </button>
                )}
                <button type="button" onClick={restart} className="btn-press glass-card inline-flex h-14 items-center gap-2 rounded-full px-5 text-base font-black">
                  <RotateCcw className="h-5 w-5" aria-hidden />
                  {w.restart}
                </button>
              </div>
            </div>
          )}

          {phase === 'quiz' && question && (
            <div key={`q-${quiz.i}`} className="animate-slide-up mx-auto flex min-h-[420px] max-w-xl flex-col justify-center gap-4 p-5 sm:p-8">
              <p className="label-caps text-[var(--primary-strong)] tabular-nums dark:text-sky-300">{fmt(w.training.questionOf, { i: quiz.i + 1, n: instr.quiz.length })}</p>
              <p className="text-2xl leading-tight font-black tracking-tighter sm:text-3xl">{question.q}</p>
              <div className="grid gap-2">
                {question.choices.map((c, k) => {
                  const chosen = quiz.picked === k
                  const right = quiz.picked !== null && k === question.answer
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => pick(k)}
                      disabled={quiz.picked !== null}
                      className={cx(
                        'btn-press flex min-h-14 items-center gap-3 rounded-[20px] px-4 py-3 text-start text-base font-black transition-colors',
                        right ? 'bg-emerald-500 text-white' : chosen ? 'bg-rose-500 text-white' : 'glass-card text-slate-800 dark:text-slate-100',
                      )}
                    >
                      {right ? (
                        <Check className="h-5 w-5 shrink-0" strokeWidth={3} aria-hidden />
                      ) : chosen ? (
                        <X className="h-5 w-5 shrink-0" aria-hidden />
                      ) : (
                        <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300 dark:border-slate-600" aria-hidden />
                      )}
                      {c}
                    </button>
                  )
                })}
              </div>
              {quiz.picked !== null && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className={cx('font-black', quiz.picked === question.answer ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')} aria-live="polite">
                    {quiz.picked === question.answer ? w.training.right : w.training.wrong}
                  </p>
                  <button type="button" onClick={nextQuestion} className="btn-press bg-gradient-primary shadow-primary inline-flex h-12 items-center gap-2 rounded-full px-5 font-black text-white">
                    {quiz.i + 1 < instr.quiz.length ? w.training.next : w.training.finish}
                    <ArrowRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === 'result' && (
            <div className="animate-pop-in flex min-h-[420px] flex-col items-center justify-center gap-3 p-6 text-center">
              <span
                className={cx(
                  'flex h-20 w-20 items-center justify-center rounded-[28px] text-white',
                  passed ? 'bg-gradient-to-br from-[#2EE59D] to-[#18c480]' : 'bg-gradient-to-br from-[#FFC800] to-[#FF9F00]',
                )}
              >
                {passed ? <GraduationCap className="h-10 w-10" aria-hidden /> : <RotateCcw className="h-10 w-10" aria-hidden />}
              </span>
              <p className="text-3xl font-black tracking-tighter">{passed ? w.training.passed : w.training.failed}</p>
              <p className="text-lg font-black text-slate-500 tabular-nums">{fmt(w.training.score, { good: quiz.good, total: instr.quiz.length })}</p>
              <p className="max-w-sm font-bold text-slate-600 dark:text-slate-300">{passed ? w.training.passedText : w.training.failedText}</p>
              <button type="button" onClick={restart} className="btn-press glass-card mt-2 inline-flex h-12 items-center gap-2 rounded-full px-5 font-black">
                <RotateCcw className="h-4 w-4" aria-hidden />
                {passed ? w.restart : w.training.retry}
              </button>
            </div>
          )}

          {/* « Pas clair ? » : le retour, en deux touchers (rien n'est envoyé : c'est une démo). */}
          {sheet !== 'closed' && (
            <div className="absolute inset-0 z-10 flex items-end bg-slate-900/30 backdrop-blur-[2px]" onClick={(e) => e.target === e.currentTarget && setSheet('closed')}>
              <div className="glass-float animate-slide-up w-full rounded-t-[28px] p-4 sm:p-6" role="dialog" aria-modal="false" aria-label={w.feedbackTitle}>
                {sheet === 'open' ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xl font-black tracking-tight">{w.feedbackTitle}</p>
                      <button
                        type="button"
                        onClick={() => setSheet('closed')}
                        aria-label={ui.close}
                        className="btn-press flex h-11 w-11 items-center justify-center rounded-2xl hover:bg-slate-900/5 dark:hover:bg-white/10"
                      >
                        <X className="h-5 w-5" aria-hidden />
                      </button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {KINDS.map((k) => (
                        <button
                          key={k.kind}
                          type="button"
                          aria-pressed={kind === k.kind}
                          onClick={() => setKind(k.kind)}
                          className={cx('btn-press h-12 rounded-2xl bg-gradient-to-br px-4 text-sm font-black', k.tone, kind === k.kind ? 'ring-4 ring-slate-900/80 dark:ring-white' : 'opacity-85')}
                        >
                          {w.kinds[k.kind]}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400" lang={siteLang} dir="ltr">
                        {ui.sent}
                      </p>
                      <button
                        type="button"
                        onClick={send}
                        disabled={!kind}
                        className="btn-press bg-gradient-primary shadow-primary inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-black text-white disabled:opacity-50"
                      >
                        <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
                        {w.feedbackSend}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="flex items-center gap-3 py-2 text-base font-black text-emerald-700 dark:text-emerald-300" aria-live="polite">
                    <Check className="h-5 w-5 shrink-0" strokeWidth={3} aria-hidden />
                    {w.feedbackThanks}
                  </p>
                )}
              </div>
            </div>
          )}

          {noVoice && (
            <p
              className="glass-float animate-pop-in absolute top-20 left-1/2 z-20 w-[min(92%,26rem)] -translate-x-1/2 rounded-2xl px-4 py-3 text-center text-sm font-bold"
              role="status"
              dir="ltr"
              lang={siteLang}
            >
              {ui.noVoice}
            </p>
          )}
        </div>
      </div>
      <p className="mt-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400">{ui.voiceNote}</p>
    </div>
  )
}

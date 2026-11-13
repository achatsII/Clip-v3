'use client'

import { ArrowRight, BookOpen, Check, CloudOff, GraduationCap, RotateCcw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Confetti } from '@/components/ui/Celebrate'
import { haptic } from '@/lib/bridge/native'
import { grade } from '@/lib/model/training'
import type { QuizQuestion } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'
import type { PlayerStrings } from './i18n'

type Saved = 'saved' | 'queued' | null

/**
 * Valider sa formation au poste (toggle `training`) : une question à la fois, de gros choix, la
 * bonne réponse et son pourquoi tout de suite, puis le résultat. Réussie (80 %), elle s'enregistre
 * au nom de la personne (`onPassed`) ; ratée, on relit l'instruction ou on réessaie. Rien ne
 * s'enregistre d'un essai raté, ni de l'aperçu.
 */
export function QuizRunner({ quiz, t, name, onPassed, onReread, onClose }: { quiz: QuizQuestion[]; t: PlayerStrings['training']; name?: string | null; onPassed: (choices: Record<string, number>) => Promise<Saved>; onReread: () => void; onClose: () => void }) {
  const [i, setI] = useState(0)
  const [choices, setChoices] = useState<Record<string, number>>({})
  const [result, setResult] = useState<{ good: number; passed: boolean; saved: Saved; saving: boolean } | null>(null)
  const q = quiz[i]
  const picked = q ? choices[q.id] : undefined
  const answered = picked !== undefined
  // Au téléphone, la réponse et « Question suivante » peuvent tomber sous l'écran : on les ramène.
  const nextRef = useRef<HTMLButtonElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (answered) nextRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [answered, i])
  // Une nouvelle question (ou le résultat) commence en haut de l'écran.
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start' })
  }, [i, !!result])

  function pick(k: number) {
    if (answered || !q) return
    setChoices((c) => ({ ...c, [q.id]: k }))
    haptic(k === q.answer ? 'success' : 'error')
  }

  async function finish() {
    const g = grade(quiz, choices)
    const good = g.answers.filter((a) => a.correct).length
    setResult({ good, passed: g.passed, saved: null, saving: g.passed })
    if (!g.passed) return
    const saved = await onPassed(choices).catch(() => null)
    setResult({ good, passed: true, saved, saving: false })
  }

  function retry() {
    setChoices({})
    setResult(null)
    setI(0)
  }

  if (result) {
    const first = (name ?? '').trim().split(/\s+/)[0] ?? ''
    return (
      <div ref={topRef} className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center gap-6 p-8 text-center">
        <Confetti show={result.passed && !result.saving} />
        <span className={cn('animate-pop-in flex h-28 w-28 items-center justify-center rounded-[36px] text-white', result.passed ? 'bg-gradient-to-br from-[#2EE59D] to-[#18c480] shadow-[0_20px_40px_rgba(24,196,128,0.35)]' : 'bg-gradient-to-br from-[#FFC800] to-[#FF5100] shadow-[0_20px_40px_rgba(255,81,0,0.3)]')}>
          {result.passed ? <GraduationCap className="h-16 w-16" /> : <RotateCcw className="h-14 w-14" strokeWidth={2.5} />}
        </span>
        <div>
          <h2 className="text-5xl font-black tracking-tighter">{result.passed ? t.passed : t.failed}</h2>
          <p className="mt-2 text-xl font-bold text-slate-600 dark:text-slate-300">{result.passed ? t.passedText(first) : t.failedText}</p>
        </div>
        <p className="rounded-2xl bg-slate-900/5 px-5 py-2 text-2xl font-black tabular-nums dark:bg-white/10">{t.score(result.good, quiz.length)}</p>
        {result.passed && (result.saving ? <p className="text-base font-black text-slate-500">{t.saving}</p> : result.saved === 'queued' ? (
          <p className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2 text-base font-black text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
            <CloudOff className="h-5 w-5 shrink-0" /> {t.queued}
          </p>
        ) : result.saved === null ? (
          <p className="text-base font-black text-slate-500">{t.preview}</p>
        ) : null)}
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          {result.passed ? (
            <button type="button" onClick={onClose} disabled={result.saving} className="btn-press bg-gradient-primary shadow-primary flex h-16 w-full items-center justify-center gap-2 rounded-full text-lg font-black text-white disabled:opacity-60">
              {t.close}
            </button>
          ) : (
            <>
              <button type="button" onClick={onReread} className="btn-press glass-card flex h-16 w-full items-center justify-center gap-2 rounded-full text-lg font-black sm:flex-1">
                <BookOpen className="h-5 w-5" /> {t.reread}
              </button>
              <button type="button" onClick={retry} className="btn-press bg-gradient-primary shadow-primary flex h-16 w-full items-center justify-center gap-2 rounded-full text-lg font-black text-white sm:flex-1">
                <RotateCcw className="h-5 w-5" /> {t.retry}
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!q) return null
  const right = answered && picked === q.answer
  return (
    <div ref={topRef} className="mx-auto flex min-h-full max-w-2xl flex-col gap-5 p-5 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="label-caps text-slate-500">{t.questionOf(i + 1, quiz.length)}</p>
        <div className="flex gap-1.5" aria-hidden>
          {quiz.map((x, k) => (
            <span key={x.id} className={cn('h-2.5 rounded-full transition-all', k === i ? 'w-8 bg-[var(--primary)]' : k < i ? 'w-2.5 bg-[var(--primary)]/50' : 'w-2.5 bg-slate-900/10 dark:bg-white/15')} />
          ))}
        </div>
      </div>
      <h2 className="text-3xl leading-tight font-black tracking-tight sm:text-4xl">{q.question}</h2>
      <div className="grid gap-3" role="radiogroup" aria-label={q.question}>
        {q.choices.map((c, k) => {
          const isRight = answered && k === q.answer
          const isWrong = answered && k === picked && k !== q.answer
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={picked === k}
              disabled={answered}
              onClick={() => pick(k)}
              className={cn(
                'btn-press flex min-h-20 items-center gap-4 rounded-[28px] px-5 py-3 text-left text-xl font-black transition',
                isRight ? 'bg-emerald-500 text-white shadow-[0_10px_20px_rgba(24,196,128,0.3)]' : isWrong ? 'bg-rose-500 text-white' : answered ? 'glass-card opacity-55' : 'glass-card',
              )}
            >
              <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg', isRight || isWrong ? 'bg-white/25' : 'bg-slate-900/5 dark:bg-white/10')}>
                {isRight ? <Check className="h-6 w-6" strokeWidth={3} /> : isWrong ? <X className="h-6 w-6" strokeWidth={3} /> : String.fromCharCode(65 + k)}
              </span>
              <span className="min-w-0 flex-1 leading-snug">{c}</span>
            </button>
          )
        })}
      </div>
      {answered && (
        <div className={cn('animate-slide-up rounded-3xl p-4', right ? 'bg-emerald-50 dark:bg-emerald-500/15' : 'bg-amber-50 dark:bg-amber-500/15')} role="status">
          <p className={cn('text-lg font-black', right ? 'text-emerald-800 dark:text-emerald-200' : 'text-amber-900 dark:text-amber-100')}>{right ? t.right : t.wrong}</p>
          {q.why && <p className="mt-1 text-lg font-bold text-slate-700 dark:text-slate-200">{q.why}</p>}
        </div>
      )}
      {answered && (
        <button ref={nextRef} type="button" onClick={() => (i + 1 < quiz.length ? setI(i + 1) : void finish())} className="btn-press bg-gradient-primary shadow-primary mt-auto flex h-20 w-full items-center justify-center gap-3 rounded-[28px] text-xl font-black text-white">
          {i + 1 < quiz.length ? t.next : t.finish} <ArrowRight className="h-7 w-7" />
        </button>
      )}
    </div>
  )
}

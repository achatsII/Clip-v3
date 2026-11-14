'use client'

import {
  Check,
  Clock,
  Crosshair,
  Eye,
  FileText,
  Glasses,
  Hand,
  Image as ImageIcon,
  Layers,
  Lightbulb,
  LoaderCircle,
  Lock,
  Mic,
  RotateCcw,
  Sparkles,
  Video,
  WandSparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { DemoStep } from '@/lib/site/content/demo'
import { fmt } from '@/lib/site/lang'
import { PHOTOS } from '@/lib/site/media'
import { cx } from './ui'

export interface GenerateDemoText {
  badge: string
  accelerated: string
  restart: string
  board: string
  whatLabel: string
  what: string
  notesTitle: string
  notes: Array<{ kind: string; name: string; detail: string }>
  ready: string
  emptyHint: string
  button: string
  running: string
  elapsed: string
  stages: string[]
  thumbs: string
  tip: string
  category: string
  steps: string
  duration: string
  locks: string
  ppe: string[]
  draft: string
  seeStation: string
  announceStage: string
  announceDone: string
}

type Phase = 'idle' | 'running' | 'done'

/** La durée de chaque étape de la génération, en millisecondes (démo accélérée). */
const STAGE_MS = [1100, 2300, 1300, 1000]
const STAGE_ICONS: LucideIcon[] = [LoaderCircle, Eye, WandSparkles, Crosshair]
const NOTE_ICONS: Record<string, { icon: LucideIcon; tile: string }> = {
  video: { icon: Video, tile: 'from-[#00C6FF] to-[#0078FF]' },
  photo: { icon: ImageIcon, tile: 'from-[#3ee0a1] to-[#10a96d]' },
  audio: { icon: Mic, tile: 'from-[#9b2cfa] to-[#2c62fa]' },
  file: { icon: FileText, tile: 'from-[#64748b] to-[#334155]' },
}
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * La démo « Générer l'instruction » : cinq notes prises au téléphone, un bouton, et l'instruction qui
 * s'écrit (les étapes de la vraie génération : `GenerationProgress` de l'app). Aucun appel réseau.
 */
export function GenerateDemo({ t, title, steps, stationHref }: { t: GenerateDemoText; title: string; steps: DemoStep[]; stationHref?: string }) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [stage, setStage] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [shown, setShown] = useState(0)
  const [announce, setAnnounce] = useState('')
  const timers = useRef<number[]>([])

  const clear = () => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }
  useEffect(() => clear, [])

  useEffect(() => {
    if (phase !== 'running') return
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [phase])

  function finish() {
    setPhase('done')
    setStage(STAGE_MS.length)
    setAnnounce(fmt(t.announceDone, { title, count: steps.length }))
  }

  function generate() {
    clear()
    setElapsed(0)
    setShown(0)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(steps.length)
      finish()
      return
    }
    setPhase('running')
    setStage(0)
    setAnnounce(fmt(t.announceStage, { stage: t.stages[0] ?? '' }))
    let at = 0
    STAGE_MS.forEach((ms, i) => {
      at += ms
      timers.current.push(
        window.setTimeout(() => {
          if (i + 1 < STAGE_MS.length) {
            setStage(i + 1)
            setAnnounce(fmt(t.announceStage, { stage: t.stages[i + 1] ?? '' }))
          } else finish()
        }, at),
      )
    })
    steps.forEach((_, i) => timers.current.push(window.setTimeout(() => setShown(i + 1), at + 250 + i * 180)))
  }

  function reset() {
    clear()
    setPhase('idle')
    setStage(0)
    setElapsed(0)
    setShown(0)
    setAnnounce('')
  }

  return (
    <div className="glass-panel rounded-[32px] p-2 sm:p-3">
      <div className="flex items-center gap-2 px-3 pt-1.5 pb-3">
        <span aria-hidden className="flex gap-1.5">
          <i className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <i className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <i className="h-3 w-3 rounded-full bg-[#28c840]" />
        </span>
        <span className="label-caps ml-2 rounded-xl bg-violet-500/10 px-2.5 py-1 text-[10px] text-[#7a14d6] dark:text-violet-300">{t.badge}</span>
        {phase !== 'idle' && <span className="label-caps ml-auto rounded-xl bg-slate-900/5 px-2.5 py-1 text-[10px] text-slate-500 dark:bg-white/10 dark:text-slate-400">{t.accelerated}</span>}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* À gauche : la capture, puis la génération. */}
        <div className="rounded-[26px] bg-white/75 p-4 sm:p-6 dark:bg-slate-900/60">
          {phase === 'idle' ? (
            <div className="flex h-full flex-col">
              <h3 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">{t.board}</h3>
              <p className="label-caps mt-5 text-slate-500 dark:text-slate-400">{t.whatLabel}</p>
              <p className="glass-input mt-2 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-100">{t.what}</p>
              <p className="label-caps mt-5 text-slate-500 dark:text-slate-400">{t.notesTitle}</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {t.notes.map((n) => {
                  const k = NOTE_ICONS[n.kind] ?? NOTE_ICONS.file
                  const Icon = k.icon
                  return (
                    <li key={n.name} className="glass-card flex min-w-0 items-center gap-3 rounded-2xl p-2.5">
                      <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white', k.tile)}>
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-black text-slate-900 dark:text-white">{n.name}</span>
                        <span className="block truncate text-xs font-bold text-slate-500 dark:text-slate-400">{n.detail}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
              <div className="glass-float mt-5 flex flex-col items-stretch gap-3 rounded-[22px] p-2.5 sm:flex-row sm:items-center sm:pl-4">
                <p className="flex-1 text-sm font-bold text-slate-600 dark:text-slate-300">{t.ready}</p>
                <button
                  type="button"
                  onClick={generate}
                  className="btn-press bg-gradient-accent shadow-accent inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-black whitespace-nowrap text-white hover:brightness-105"
                >
                  <Sparkles className="h-4 w-4" aria-hidden />
                  {t.button}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-4">
                <span className={cx('bg-gradient-primary shadow-primary flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] text-white', phase === 'running' && 'animate-float')}>
                  <Sparkles className="h-7 w-7" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="text-xl font-black tracking-tighter text-slate-900 sm:text-2xl dark:text-white">{t.running}</h3>
                  <p className="text-sm font-bold text-slate-500 tabular-nums dark:text-slate-400">{fmt(t.elapsed, { clock: clock(elapsed) })}</p>
                </div>
              </div>
              <ol className="mt-6 space-y-2">
                {t.stages.map((label, i) => {
                  const Icon = STAGE_ICONS[i] ?? Sparkles
                  const done = phase === 'done' || i < stage
                  const active = phase === 'running' && i === stage
                  return (
                    <li key={label}>
                      <div className={cx('flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors duration-300', active && 'bg-[var(--primary-soft)]')}>
                        <span
                          className={cx(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-300',
                            done ? 'bg-emerald-500 text-white' : active ? 'bg-gradient-primary text-white' : 'bg-slate-900/5 text-slate-400 dark:bg-white/10',
                          )}
                        >
                          {done ? (
                            <Check className="h-5 w-5" strokeWidth={3} aria-hidden />
                          ) : active ? (
                            <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />
                          ) : (
                            <Icon className="h-5 w-5" aria-hidden />
                          )}
                        </span>
                        <span className={cx('text-[15px] font-black', done || active ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500')}>{label}</span>
                      </div>
                      {i === 1 && (done || active) && (
                        <div className="flex gap-2 py-1.5 pl-[60px]" aria-label={t.thumbs} role="img">
                          {steps.slice(0, 4).map((s, k) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={k}
                              src={PHOTOS[s.photo].src}
                              alt=""
                              width={72}
                              height={44}
                              className="site-pop-in h-11 w-[72px] rounded-lg object-cover shadow-md"
                              style={{ ['--delay' as string]: `${0.15 + k * 0.35}s` }}
                            />
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ol>
              <p className="mt-5 flex items-start gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                {t.tip}
              </p>
              {phase === 'done' && (
                <div className="animate-slide-up mt-5 space-y-3">
                  <p className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-black text-emerald-700 dark:text-emerald-300">
                    <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
                    {t.draft}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={reset} className="btn-press glass-card inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-black text-slate-800 dark:text-white">
                      <RotateCcw className="h-4 w-4" aria-hidden />
                      {t.restart}
                    </button>
                    {stationHref && (
                      <a href={stationHref} className="btn-press inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-black text-white dark:bg-white dark:text-slate-900">
                        {t.seeStation}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* À droite : l'instruction rédigée. */}
        <div className={cx('relative min-h-[320px] rounded-[26px] bg-white/40 p-4 sm:p-5 dark:bg-slate-900/30', phase === 'idle' && 'max-lg:hidden')}>
          {phase === 'done' ? (
            <div className="glass-float animate-pop-in rounded-[24px] p-4 sm:p-5">
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--primary-soft)] px-3 text-xs font-black text-[var(--primary-strong)] dark:text-sky-300">
                <Wrench className="h-3.5 w-3.5" aria-hidden />
                {t.category}
              </span>
              <h3 className="mt-3 text-2xl leading-[1.05] font-black tracking-tighter text-slate-900 dark:text-white">{title}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="glass-card inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-black text-slate-800 dark:text-slate-100">
                  <Layers className="h-4 w-4 text-[var(--primary)]" aria-hidden />
                  {fmt(t.steps, { count: steps.length })}
                </span>
                <span className="glass-card inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-black text-slate-800 dark:text-slate-100">
                  <Clock className="h-4 w-4 text-[var(--primary)]" aria-hidden />
                  {t.duration}
                </span>
                <span className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#FF2B5E] to-[#FF6B00] px-3 text-sm font-black text-white">
                  <Lock className="h-4 w-4" aria-hidden />
                  {t.locks}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {t.ppe.map((p, i) => {
                  const Icon = i === 0 ? Glasses : Hand
                  return (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#0ea5e9] px-3 py-2 text-xs font-black text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)]"
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {p}
                    </span>
                  )
                })}
              </div>
              <ol className="mt-4 space-y-2">
                {steps.map((s, i) => (
                  <li
                    key={s.title}
                    className={cx('glass-card flex items-center gap-3 rounded-2xl p-2 transition-all duration-500', i < shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0')}
                  >
                    <span className="bg-gradient-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white tabular-nums">{i + 1}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={PHOTOS[s.photo].src} alt="" width={64} height={40} loading="lazy" className="h-10 w-16 shrink-0 rounded-lg object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-slate-900 dark:text-white">{s.title}</span>
                      <span className="block truncate text-xs font-bold text-slate-500 dark:text-slate-400">{s.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="relative space-y-3">
              {phase === 'idle' && (
                <p className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-8 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                  <span className="bg-gradient-accent shadow-accent flex h-12 w-12 items-center justify-center rounded-2xl text-white">
                    <Sparkles className="h-6 w-6" aria-hidden />
                  </span>
                  {t.emptyHint}
                </p>
              )}
              <div aria-hidden className={cx('h-8 w-32 rounded-full', phase === 'running' ? 'skeleton' : 'bg-slate-900/5 dark:bg-white/5')} />
              <div aria-hidden className={cx('h-8 w-4/5 rounded-2xl', phase === 'running' ? 'skeleton' : 'bg-slate-900/5 dark:bg-white/5')} />
              <div aria-hidden className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={cx('h-9 w-24 rounded-xl', phase === 'running' ? 'skeleton' : 'bg-slate-900/5 dark:bg-white/5')} />
                ))}
              </div>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} aria-hidden className={cx('h-14 rounded-2xl', phase === 'running' ? 'skeleton' : 'border border-dashed border-slate-900/10 dark:border-white/10')} />
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  )
}

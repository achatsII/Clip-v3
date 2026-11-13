'use client'

import { LoaderCircle, RotateCcw, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PHOTOS } from '@/lib/site/media'
import { cx } from './ui'

export interface AnnotateDemoText {
  badge: string
  restart: string
  title: string
  ai: string
  working: string
  toast: string
  toastHint: string
  labels: { start: string; estop: string; stop: string }
  photoAlt: string
}

/** Les marques, dans le repère de la photo (1028 × 578), comme dans le deck. */
const W = 1028
const H = 578
const pct = (v: number, of: number) => `${(v / of) * 100}%`

/**
 * La démo « Annoter par IA » : un toucher, et les cercles et la flèche se posent sur ce qu'il faut
 * voir (l'opération `annotate` de l'app). Aucun appel réseau ; la réduction des mouvements montre
 * les marques d'un coup.
 */
export function AnnotateDemo({ t }: { t: AnnotateDemoText }) {
  const [phase, setPhase] = useState<'idle' | 'working' | 'done'>('idle')
  const timer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  function annotate() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setPhase('done')
    setPhase('working')
    timer.current = window.setTimeout(() => setPhase('done'), 1500)
  }

  const photo = PHOTOS.panel
  const done = phase === 'done'

  return (
    <div className="overflow-hidden rounded-[30px] bg-slate-950 text-white shadow-[0_50px_100px_-30px_rgba(15,23,42,0.55)] ring-1 ring-white/10">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-5">
        <p className="mr-auto text-base font-black tracking-tight">{t.title}</p>
        <span className="label-caps rounded-xl bg-white/10 px-2.5 py-1 text-[10px] text-violet-200">{t.badge}</span>
        {done ? (
          <button type="button" onClick={() => setPhase('idle')} className="btn-press inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-black hover:bg-white/20">
            <RotateCcw className="h-4 w-4" aria-hidden />
            {t.restart}
          </button>
        ) : (
          <button
            type="button"
            onClick={annotate}
            disabled={phase === 'working'}
            className="btn-press bg-gradient-accent shadow-accent inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-black text-white disabled:opacity-80"
          >
            {phase === 'working' ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {t.ai}
          </button>
        )}
      </div>
      <div className="relative mx-2 mb-2 overflow-hidden rounded-[22px] sm:mx-3 sm:mb-3" style={{ aspectRatio: `${W} / ${H}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.src} alt={t.photoAlt} width={photo.width} height={photo.height} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        {phase === 'working' && <div className="shimmer-bar absolute inset-0 opacity-60" aria-hidden />}
        {done && (
          <>
            <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
              <circle cx="193" cy="292" r="60" fill="none" stroke="#ef4444" strokeWidth="9" className="site-draw" style={{ ['--len' as string]: '380' }} transform="rotate(-90 193 292)" />
              <circle
                cx="822"
                cy="289"
                r="104"
                fill="none"
                stroke="#facc15"
                strokeWidth="9"
                className="site-draw"
                style={{ ['--len' as string]: '660', ['--delay' as string]: '0.25s' }}
                transform="rotate(-90 822 289)"
              />
              <path
                d="M480 110 L 352 250"
                fill="none"
                stroke="#ef4444"
                strokeWidth="10"
                strokeLinecap="round"
                className="site-draw"
                style={{ ['--len' as string]: '200', ['--delay' as string]: '0.6s' }}
              />
              <path
                d="M360 211 L 352 250 L 390 239"
                fill="none"
                stroke="#ef4444"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="site-pop-in"
                style={{ ['--delay' as string]: '1.1s' }}
              />
            </svg>
            <span
              className="site-pop-in absolute rounded-xl bg-[#ef4444] px-2 py-1 text-[11px] font-black whitespace-nowrap shadow-lg sm:px-3 sm:py-1.5 sm:text-sm"
              style={{ left: pct(110, W), top: pct(372, H), ['--delay' as string]: '0.3s' }}
            >
              {t.labels.start}
            </span>
            <span
              className="site-pop-in absolute rounded-xl bg-[#eab308] px-2 py-1 text-[11px] font-black whitespace-nowrap text-slate-900 shadow-lg sm:px-3 sm:py-1.5 sm:text-sm"
              style={{ left: pct(730, W), top: pct(140, H), ['--delay' as string]: '0.55s' }}
            >
              {t.labels.estop}
            </span>
            <span
              className="site-pop-in absolute rounded-xl bg-[#ef4444] px-2 py-1 text-[11px] font-black whitespace-nowrap shadow-lg sm:px-3 sm:py-1.5 sm:text-sm"
              style={{ left: pct(430, W), top: pct(52, H), ['--delay' as string]: '1.2s' }}
            >
              {t.labels.stop}
            </span>
          </>
        )}
      </div>
      <p className={cx('flex min-h-14 items-center gap-3 px-4 pb-4 text-sm font-bold sm:px-5', done ? 'text-white' : 'text-slate-400')} aria-live="polite">
        <Sparkles className={cx('h-4 w-4 shrink-0', done ? 'text-violet-300' : 'text-slate-500')} aria-hidden />
        {done ? (
          <span>
            <span className="font-black">{t.toast}</span> · {t.toastHint}
          </span>
        ) : phase === 'working' ? (
          <span>{t.working}</span>
        ) : null}
      </p>
    </div>
  )
}

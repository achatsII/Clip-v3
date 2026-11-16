'use client'

import { Brush, Check, Clock, Droplet, FileUp, ImagePlus, Lock, Mic, PenLine, Play, Power, Sparkles, TriangleAlert, UserRoundCheck, Video, Wrench, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, type RefObject } from 'react'
import { cx } from './ui'

export type HowArtKind = 'capture' | 'generate' | 'deploy'

/** Les mots des trois illustrations de « Comment ça marche » (le dictionnaire du site). */
export interface HowArtText {
  capture: { film: string; generate: string; sources: string[] }
  generate: { title: string; steps: string[]; time: string }
  deploy: { published: string; station: string; isNew: string; list: string[]; scan: string; noLogin: string }
}

/**
 * Les trois temps en illustrations d'interface, propres au site : pas des extraits du film (il est déjà
 * dans la page), mais les écrans de Clip réduits à l'idée de chaque temps. Tout se mesure en largeur du
 * cadre (`cqw`) : l'image garde ses proportions du téléphone au grand écran, et ses mots sont traduits.
 * Elle se monte une seule fois, quand on la voit (moins de 4 s, rien qui tourne ensuite) ; avec la
 * réduction des mouvements, ou sans script, elle est complète d'emblée.
 */
export function HowArt({ kind, t, label }: { kind: HowArtKind; t: HowArtText; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useBuild(ref)
  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className="relative aspect-video overflow-hidden rounded-[22px] bg-gradient-to-br from-white via-white to-primary-soft @container sm:rounded-[28px] dark:from-slate-900 dark:via-slate-900 dark:to-slate-800"
    >
      {kind === 'capture' && <Capture t={t.capture} />}
      {kind === 'generate' && <Generate t={t.generate} />}
      {kind === 'deploy' && <Deploy t={t.deploy} />}
    </div>
  )
}

/**
 * Chaque pièce marquée `data-at` (en secondes) paraît à son heure, puis reste. `data-fx="ring"` : un
 * toucher qui s'élargit deux fois ; `"pulse"` : un halo pendant que l'IA travaille ; `"draw"` : un trait
 * qui se dessine. Les animations attendent, en pause, que l'image soit vraiment à l'écran.
 */
function useBuild(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = ref.current
    if (!root || typeof root.animate !== 'function' || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const anims = [...root.querySelectorAll<HTMLElement | SVGElement>('[data-at]')].map((el) => {
      const delay = Number(el.dataset.at) * 1000
      switch (el.dataset.fx) {
        case 'ring':
          return el.animate([{ opacity: 0.7, transform: 'scale(0.55)' }, { opacity: 0, transform: 'scale(1.8)' }], { duration: 850, delay, iterations: 2, easing: 'ease-out' })
        case 'pulse':
          return el.animate([{ opacity: 0.55, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.55)' }], { duration: 1000, delay, iterations: 2, easing: 'ease-out' })
        case 'draw':
          return el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 520, delay, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' })
        default:
          return el.animate([{ opacity: 0, transform: 'translateY(14%) scale(0.92)' }, { opacity: 1, transform: 'none' }], { duration: 460, delay, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'backwards' })
      }
    })
    for (const a of anims) a.pause()
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        for (const a of anims) a.play()
        io.disconnect()
      },
      { threshold: 0.4 },
    )
    io.observe(root)
    return () => {
      io.disconnect()
      for (const a of anims) a.cancel()
    }
  }, [ref])
}

const at = (s: number) => ({ 'data-at': String(s) })

/** Une carte posée sur le fond : le verre des cartes du site, à l'échelle du cadre. */
const CARD = 'border border-white/80 bg-white/90 shadow-[0_1.4cqw_3.2cqw_-1.4cqw_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-slate-800/90'

// ───────── 1. Capturer : le téléphone de l'app, et ce qu'il recueille ─────────

const OTHERS: Array<{ icon: LucideIcon; color: string }> = [
  { icon: ImagePlus, color: 'from-teal-400 to-emerald-600' },
  { icon: Mic, color: 'from-violet-500 to-indigo-600' },
  { icon: PenLine, color: 'from-amber-400 to-orange-500' },
  { icon: FileUp, color: 'from-slate-500 to-slate-700' },
]
/** Les sources de l'exemple (le nettoyage des rails) : la durée ou le nombre, les mêmes dans toutes les langues. */
const SOURCES: Array<{ icon: LucideIcon; color: string; meta: string }> = [
  { icon: Video, color: 'from-sky-500 to-blue-600', meta: '4:12 · 720p' },
  { icon: ImagePlus, color: 'from-teal-400 to-emerald-600', meta: '×3' },
  { icon: Mic, color: 'from-violet-500 to-indigo-600', meta: '0:48' },
  { icon: FileUp, color: 'from-slate-500 to-slate-700', meta: 'PDF' },
]

function Capture({ t }: { t: HowArtText['capture'] }) {
  return (
    <>
      <div className="absolute top-[4cqw] bottom-[4cqw] left-[8cqw] w-[27cqw] rounded-[4.6cqw] bg-slate-900 p-[0.9cqw] shadow-[0_3cqw_6cqw_-2.5cqw_rgba(15,23,42,0.55)] dark:bg-black dark:ring-1 dark:ring-white/15">
        <div className="flex h-full flex-col gap-[1.3cqw] overflow-hidden rounded-[3.7cqw] bg-slate-50 p-[1.5cqw] dark:bg-slate-800">
          {/* « Filmer le geste », en grand, comme dans l'app */}
          <div className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-[2.6cqw] bg-gradient-to-br from-sky-500 to-blue-600 p-[1.8cqw] text-white">
            <span className="absolute -top-[3cqw] -right-[3cqw] h-[11cqw] w-[11cqw] rounded-full bg-white/25 blur-[2cqw]" />
            <span className="relative flex h-[6.4cqw] w-[6.4cqw] items-center justify-center rounded-[1.7cqw] border border-white/25 bg-white/15">
              <Video className="h-[3.4cqw] w-[3.4cqw]" />
            </span>
            <span className="relative text-[2.9cqw] leading-[1.1] font-black tracking-tight">{t.film}</span>
            <span {...at(0.15)} data-fx="ring" className="absolute top-[1.8cqw] left-[1.8cqw] h-[6.4cqw] w-[6.4cqw] rounded-full border-[0.45cqw] border-white opacity-0" />
          </div>
          {/* Les quatre autres façons, sur une ligne */}
          <div className="grid grid-cols-4 gap-[0.9cqw]">
            {OTHERS.map(({ icon: Icon, color }, i) => (
              <span key={i} className="flex aspect-square items-center justify-center rounded-[1.5cqw] bg-white shadow-[0_0.4cqw_1cqw_rgba(15,23,42,0.08)] dark:bg-slate-700">
                <span className={cx('flex h-[3.5cqw] w-[3.5cqw] items-center justify-center rounded-[0.9cqw] bg-gradient-to-br text-white', color)}>
                  <Icon className="h-[2.1cqw] w-[2.1cqw]" />
                </span>
              </span>
            ))}
          </div>
          {/* « Générer » ne paraît qu'une fois quelque chose capturé */}
          <span {...at(2.5)} className="bg-gradient-accent shadow-accent flex h-[5.6cqw] items-center justify-center gap-[0.8cqw] rounded-full text-[2.5cqw] font-black text-white">
            <Sparkles className="h-[2.5cqw] w-[2.5cqw]" />
            {t.generate}
          </span>
        </div>
      </div>
      <ul className="absolute top-1/2 right-[5cqw] left-[41cqw] -translate-y-1/2 space-y-[1.7cqw]">
        {SOURCES.map(({ icon: Icon, color, meta }, i) => (
          <li key={i} {...at(0.7 + i * 0.42)} className={cx('flex items-center gap-[1.6cqw] rounded-[2.3cqw] p-[1.1cqw] pr-[2cqw]', CARD)}>
            <span className={cx('flex h-[6.4cqw] w-[6.4cqw] shrink-0 items-center justify-center rounded-[1.6cqw] bg-gradient-to-br text-white', color)}>
              <Icon className="h-[3.2cqw] w-[3.2cqw]" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[3.3cqw] font-black tracking-tight text-slate-900 dark:text-white">{t.sources[i]}</span>
            <span className="shrink-0 text-[2.7cqw] font-bold text-slate-500 tabular-nums dark:text-slate-400">{meta}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

// ───────── 2. Générer : les notes passent à l'IA, l'instruction s'écrit ─────────

const INPUTS: Array<{ icon: LucideIcon; color: string }> = [SOURCES[0]!, SOURCES[2]!, SOURCES[3]!]
const STEP_ART: Array<{ icon: LucideIcon; color: string; warn?: boolean; clip?: boolean }> = [
  { icon: Lock, color: 'from-[#FF2B5E] to-[#FF6B00]', warn: true },
  { icon: Brush, color: 'from-slate-500 to-slate-700', clip: true },
  { icon: Droplet, color: 'from-sky-500 to-blue-600', clip: true },
]

function Generate({ t }: { t: HowArtText['generate'] }) {
  return (
    <>
      {/* Les traits : des notes vers l'IA, puis de l'IA vers l'instruction (viewBox = le cadre, 100 × 56,25) */}
      <svg viewBox="0 0 100 56.25" className="absolute inset-0 h-full w-full" fill="none" aria-hidden>
        {[16.4, 28.1, 39.8].map((y, i) => (
          <path key={y} {...at(0.25 + i * 0.12)} data-fx="draw" pathLength={1} strokeDasharray="1" d={`M15.5 ${y} C21 ${y} 20 28.1 25.5 28.1`} className="stroke-slate-300 dark:stroke-slate-600" strokeWidth={0.45} strokeLinecap="round" />
        ))}
        <path {...at(1)} data-fx="draw" pathLength={1} strokeDasharray="1" d="M38.5 28.1 L46 28.1" stroke="url(#how-flow)" strokeWidth={0.6} strokeLinecap="round" />
        <defs>
          <linearGradient id="how-flow" x1="38.5" y1="0" x2="46" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#9b2cfa" />
            <stop offset="1" stopColor="var(--primary)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute top-1/2 left-[6.5cqw] flex -translate-y-1/2 flex-col gap-[3.3cqw]">
        {INPUTS.map(({ icon: Icon, color }, i) => (
          <span key={i} className={cx('flex h-[8.4cqw] w-[8.4cqw] items-center justify-center rounded-[2.2cqw] bg-gradient-to-br text-white shadow-[0_1cqw_2.4cqw_-1cqw_rgba(15,23,42,0.4)]', color)}>
            <Icon className="h-[3.8cqw] w-[3.8cqw]" />
          </span>
        ))}
      </div>
      {/* L'IA */}
      <div className="absolute top-1/2 left-[25.5cqw] h-[13cqw] w-[13cqw] -translate-y-1/2">
        <span {...at(0.55)} data-fx="pulse" className="bg-gradient-accent absolute inset-0 rounded-[3.8cqw] opacity-0" />
        <span className="bg-gradient-accent shadow-accent relative flex h-full w-full items-center justify-center rounded-[3.8cqw] text-white">
          <Sparkles className="h-[6cqw] w-[6cqw]" />
        </span>
      </div>
      {/* L'instruction rédigée */}
      <div {...at(1.1)} className={cx('absolute top-[6.5cqw] right-[5cqw] bottom-[6.5cqw] left-[46cqw] flex flex-col rounded-[3cqw] p-[2.3cqw]', CARD)}>
        <p className="truncate text-[3.5cqw] leading-tight font-black tracking-tighter text-slate-900 dark:text-white">{t.title}</p>
        <ol className="mt-[1.8cqw] flex flex-1 flex-col justify-between">
          {STEP_ART.map(({ icon: Icon, color, warn, clip }, i) => (
            <li key={i} {...at(1.5 + i * 0.38)} className="flex items-center gap-[1.6cqw]">
              <span className={cx('relative flex h-[7.6cqw] w-[7.6cqw] shrink-0 items-center justify-center rounded-[1.8cqw] bg-gradient-to-br text-white', color)}>
                <Icon className="h-[3.4cqw] w-[3.4cqw]" />
                {warn && (
                  <span className="absolute -top-[1.1cqw] -left-[1.1cqw] flex h-[3.4cqw] w-[3.4cqw] items-center justify-center rounded-full bg-[#FFC800] text-slate-900 ring-[0.45cqw] ring-white dark:ring-slate-800">
                    <TriangleAlert className="h-[2cqw] w-[2cqw]" strokeWidth={2.6} />
                  </span>
                )}
                {clip && (
                  <span className="absolute -right-[0.9cqw] -bottom-[0.9cqw] flex h-[3.2cqw] w-[3.2cqw] items-center justify-center rounded-full bg-slate-900 text-white ring-[0.45cqw] ring-white dark:ring-slate-800">
                    <Play className="ml-[0.2cqw] h-[1.6cqw] w-[1.6cqw] fill-current" />
                  </span>
                )}
              </span>
              <span className="bg-gradient-primary flex h-[3.6cqw] w-[3.6cqw] shrink-0 items-center justify-center rounded-full text-[2.1cqw] font-black text-white tabular-nums">{i + 1}</span>
              <span className="min-w-0 truncate text-[3cqw] font-black tracking-tight text-slate-800 dark:text-slate-100">{t.steps[i]}</span>
            </li>
          ))}
        </ol>
      </div>
      {/* D'habitude en moins de 2 minutes */}
      <span {...at(2.85)} className="absolute top-[3.6cqw] right-[3.4cqw] flex items-center gap-[0.8cqw] rounded-full bg-slate-900 px-[1.8cqw] py-[0.9cqw] text-[2.6cqw] font-black text-white shadow-[0_1cqw_2.4cqw_-1cqw_rgba(15,23,42,0.5)] dark:bg-white dark:text-slate-900">
        <Clock className="h-[2.6cqw] w-[2.6cqw]" />
        {t.time}
      </span>
    </>
  )
}

// ───────── 3. Déployer au poste : publiée, elle est sur la tablette et derrière le code QR ─────────

/** Un code QR pour l'œil (21 × 21, ses trois repères) : il ne mène nulle part, et ne se lit pas. */
const QR_PATH = (() => {
  const n = 21
  const finder = (x: number, y: number) => {
    for (const [fx, fy] of [
      [0, 0],
      [n - 7, 0],
      [0, n - 7],
    ] as const) {
      const dx = x - fx
      const dy = y - fy
      if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) {
        if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return 0 // la marge blanche du repère
        return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) ? 1 : 0
      }
    }
    return -1
  }
  let seed = 1234
  let d = ''
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      seed = (seed * 1103515245 + 12345) % 2147483648
      const f = finder(x, y)
      if (f === 1 || (f === -1 && seed % 7 < 3)) d += `M${x} ${y}h1v1h-1z`
    }
  return d
})()

const STATION_LIST: Array<{ icon: LucideIcon; color: string }> = [
  { icon: Brush, color: 'bg-gradient-primary' },
  { icon: Wrench, color: 'bg-gradient-to-br from-slate-500 to-slate-700' },
  { icon: Power, color: 'bg-gradient-to-br from-[#2EE59D] to-[#18c480]' },
]

function Deploy({ t }: { t: HowArtText['deploy'] }) {
  return (
    <>
      {/* « Publiée » */}
      <span {...at(0.15)} className="absolute top-[4.2cqw] left-[6cqw] flex items-center gap-[1cqw] rounded-full bg-slate-900 py-[0.9cqw] pr-[2cqw] pl-[1cqw] text-[2.7cqw] font-black text-white shadow-[0_1cqw_2.4cqw_-1cqw_rgba(15,23,42,0.5)] dark:bg-white dark:text-slate-900">
        <span className="flex h-[3.4cqw] w-[3.4cqw] items-center justify-center rounded-full bg-gradient-to-br from-[#2EE59D] to-[#18c480] text-white">
          <Check className="h-[2.2cqw] w-[2.2cqw]" strokeWidth={3.2} />
        </span>
        {t.published}
      </span>
      {/* Le code QR du poste */}
      <div {...at(0.6)} className={cx('absolute top-[13cqw] left-[5.5cqw] w-[27cqw] rounded-[3cqw] p-[2cqw]', CARD)}>
        <svg viewBox="-1 -1 23 23" className="aspect-square w-full rounded-[1.2cqw] bg-white" shapeRendering="crispEdges" aria-hidden>
          <path d={QR_PATH} fill="#0f172a" />
        </svg>
        <p className="mt-[1.4cqw] truncate text-center text-[2.4cqw] leading-tight font-black text-slate-700 dark:text-slate-200">{t.scan}</p>
      </div>
      {/* La tablette du poste */}
      <div className="absolute top-[6.5cqw] right-[5cqw] bottom-[6.5cqw] left-[37cqw] rounded-[3.6cqw] bg-slate-900 p-[1.1cqw] shadow-[0_3cqw_6cqw_-2.5cqw_rgba(15,23,42,0.55)] dark:bg-black dark:ring-1 dark:ring-white/15">
        <div className="flex h-full flex-col gap-[1.4cqw] overflow-hidden rounded-[2.6cqw] bg-slate-50 p-[2cqw] dark:bg-slate-800">
          <p className="truncate text-[3.2cqw] leading-tight font-black tracking-tighter text-slate-900 dark:text-white">{t.station}</p>
          <ul className="flex flex-1 flex-col justify-between">
            {STATION_LIST.map(({ icon: Icon, color }, i) => (
              <li
                key={i}
                className={cx(
                  'relative flex h-[8.4cqw] items-center gap-[1.5cqw] rounded-[1.9cqw] bg-white px-[1.3cqw] shadow-[0_0.4cqw_1cqw_rgba(15,23,42,0.08)] dark:bg-slate-700',
                  i === 0 && 'ring-[0.45cqw] ring-[var(--primary)]',
                )}
              >
                <span className={cx('flex h-[5.6cqw] w-[5.6cqw] shrink-0 items-center justify-center rounded-[1.4cqw] text-white', color)}>
                  <Icon className="h-[2.9cqw] w-[2.9cqw]" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[2.9cqw] font-black tracking-tight text-slate-800 dark:text-slate-100">{t.list[i]}</span>
                {i === 0 && (
                  <>
                    <span {...at(1.2)} className="bg-gradient-primary shrink-0 rounded-full px-[1.3cqw] py-[0.5cqw] text-[2.1cqw] font-black text-white">
                      {t.isNew}
                    </span>
                    {/* Un toucher : l'opérateur ouvre la sienne */}
                    <span {...at(1.9)} data-fx="ring" className="absolute top-1/2 left-[45%] -mt-[3cqw] h-[6cqw] w-[6cqw] rounded-full border-[0.5cqw] border-[var(--primary)] bg-[rgba(var(--primary-rgb),0.15)] opacity-0" />
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* Sans compte ni mot de passe */}
      <span {...at(2.7)} className={cx('absolute right-[8cqw] bottom-[3cqw] flex items-center gap-[0.9cqw] rounded-full py-[0.9cqw] pr-[1.9cqw] pl-[1cqw] text-[2.6cqw] font-black text-slate-800 dark:text-slate-100', CARD)}>
        <UserRoundCheck className="h-[3cqw] w-[3cqw] text-emerald-500" />
        {t.noLogin}
      </span>
    </>
  )
}

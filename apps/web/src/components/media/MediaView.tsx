'use client'

import { Check, FileText, Hand, Maximize2, Pause, Play, Repeat, Repeat1, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { createContext, useContext, useEffect, useId, useMemo, useReducer, useRef, useState } from 'react'
import { annotationsMarkup } from '@/lib/annotations/markup'
import { useMessages, type Messages } from '@/lib/i18n'
import { isFresh } from '@/lib/annotations/fresh'
import { VIDEO_MODES, setVideoMode, type VideoMode } from '@/lib/media/videoMode'
import type { Annotation, StepMedia } from '@/lib/model/types'
import { cn, formatClock } from '@/lib/util/cn'

/**
 * Les mots des commandes des médias. Dans l'outil, ceux de sa langue ; le lecteur des opérateurs
 * fournit les siens (`MediaLabelsProvider`), dans la langue choisie au poste.
 */
export type MediaLabels = Messages['publicLinks']['media']
const MediaLabelsContext = createContext<MediaLabels | null>(null)
export const MediaLabelsProvider = MediaLabelsContext.Provider

export function useMediaLabels(): MediaLabels {
  const tool = useMessages().publicLinks.media
  return useContext(MediaLabelsContext) ?? tool
}

/**
 * Les annotations par-dessus une image (coordonnées relatives, de 0 à 1). Le dessin est celui du
 * PDF (src/lib/annotations/markup.ts) ; les tailles suivent la largeur de l'image (`cqw`).
 */
export function AnnotationLayer({ annotations, className, ratio }: { annotations: Annotation[]; className?: string; ratio?: number | null }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  // Les marques déjà là au premier affichage ne bougent pas ; une marque qui arrive ensuite (une
  // flèche ajoutée par l'assistant, ou sur un autre appareil) clignote un instant pour se faire voir.
  const known = useRef<Set<string> | null>(null)
  if (known.current === null) known.current = new Set(annotations.filter((a) => !isFresh(a.id)).map((a) => a.id))
  const [, settle] = useReducer((n: number) => n + 1, 0)
  const fresh = annotations.filter((a) => !known.current!.has(a.id))
  const steady = fresh.length ? annotations.filter((a) => known.current!.has(a.id)) : annotations
  const freshKey = fresh.map((a) => a.id).join(',')
  useEffect(() => {
    if (!freshKey) return
    const t = setTimeout(() => {
      freshKey.split(',').forEach((x) => known.current!.add(x))
      settle()
    }, 2200)
    return () => clearTimeout(t)
  }, [freshKey])
  const html = useMemo(() => annotationsMarkup(steady, { ratio: ratio ?? 1, idPrefix: `an${id}` }), [steady, ratio, id])
  const freshHtml = useMemo(() => (fresh.length ? annotationsMarkup(fresh, { ratio: ratio ?? 1, idPrefix: `af${id}` }) : ''), [freshKey, ratio, id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!annotations.length) return null
  return (
    <>
      {steady.length > 0 && <div className={cn('pointer-events-none absolute inset-0 [container-type:inline-size]', className)} dangerouslySetInnerHTML={{ __html: html }} />}
      {freshHtml && <div key={freshKey} className={cn('mark-in pointer-events-none absolute inset-0 [container-type:inline-size]', className)} dangerouslySetInnerHTML={{ __html: freshHtml }} />}
    </>
  )
}

/** Image aux proportions réelles, avec ses annotations, contenue dans la boîte parente. */
export function AnnotatedImage({ src, annotations = [], alt = '', className, fit = 'contain', children }: { src: string; annotations?: Annotation[]; alt?: string; className?: string; fit?: 'contain' | 'cover'; children?: React.ReactNode }) {
  const [ratio, setRatio] = useState<number | null>(null)
  if (fit === 'cover') {
    return (
      <div className={cn('relative h-full w-full overflow-hidden', className)}>
        <img src={src} alt={alt} className="h-full w-full object-cover" draggable={false} />
        {children}
      </div>
    )
  }
  return (
    <div className={cn('flex h-full w-full items-center justify-center', className)}>
      <div className="relative max-h-full max-w-full" style={ratio ? { aspectRatio: String(ratio), height: ratio < 1.2 ? '100%' : undefined, width: ratio >= 1.2 ? '100%' : undefined } : undefined}>
        <img
          src={src}
          alt={alt}
          draggable={false}
          onLoad={(e) => setRatio(e.currentTarget.naturalWidth / Math.max(1, e.currentTarget.naturalHeight))}
          className="block h-full max-h-full w-full max-w-full rounded-[inherit] object-contain select-none"
        />
        <AnnotationLayer annotations={annotations} ratio={ratio} />
        {children}
      </div>
    </div>
  )
}

/**
 * Un extrait de vidéo, entre `start` et `end`, muet par défaut. Trois façons de le jouer
 * (src/lib/media/videoMode.ts) : en boucle dès l'affichage, une seule fois, ou au toucher.
 * Sur iPhone, rien ne se charge avant `play()` (l'attribut `preload` y est ignoré) : la lecture
 * automatique appelle donc `play()` tout de suite, sans attendre les métadonnées.
 */
export function VideoSegment({
  url,
  start,
  end,
  poster,
  autoPlay = true,
  mode,
  modeControl,
  bare,
  className,
  big,
}: {
  url: string
  start: number
  end: number
  poster?: string
  autoPlay?: boolean
  /** Prend le pas sur `autoPlay`. */
  mode?: VideoMode
  /** Montre le choix du mode dans la barre de la vidéo (lecteur). */
  modeControl?: boolean
  /** Sans barre de commandes : une tuile de grille ou de comparaison (toucher = lecture ou pause). */
  bare?: boolean
  className?: string
  big?: boolean
}) {
  const labels = useMediaLabels()
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  const [muted, setMuted] = useState(true)
  const [t, setT] = useState(start)
  const [menu, setMenu] = useState(false)
  const effective: VideoMode = mode ?? (autoPlay ? 'loop' : 'tap')
  const auto = effective !== 'tap'
  const modeRef = useRef(effective)
  modeRef.current = effective
  // La vidéo s'ouvre au bon instant, même avant que le script la positionne.
  const src = url.includes('#') ? url : `${url}#t=${Math.max(0, start)}`

  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.muted = true
    setEnded(false)
    // « En lecture » suit les événements de la vidéo, pas la promesse de play() : une fin d'extrait
    // arrivée avant la promesse ne doit pas relancer l'affichage « en lecture ».
    const play = () => {
      v.play()?.catch(() => setPlaying(false))
    }
    const onMeta = () => {
      if (v.currentTime < start - 0.3 || v.currentTime > end) v.currentTime = start
      if (auto && v.paused) play()
    }
    const onTime = () => {
      if (v.currentTime < start - 0.5) v.currentTime = start
      if (v.currentTime >= end - 0.05) {
        if (modeRef.current === 'loop') v.currentTime = start
        else {
          v.pause()
          setPlaying(false)
          setEnded(true)
        }
      }
      setT(v.currentTime)
    }
    const onPause = () => setPlaying(false)
    const onPlay = () => setPlaying(true)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('pause', onPause)
    v.addEventListener('play', onPlay)
    if (v.readyState >= 1) onMeta()
    else if (auto) play()
    return () => {
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('play', onPlay)
    }
  }, [url, start, end, auto])

  const toggle = () => {
    const v = ref.current
    if (!v) return
    if (v.paused) {
      if (ended || v.currentTime >= end - 0.1) v.currentTime = start
      setEnded(false)
      v.play()?.catch(() => undefined)
    } else {
      v.pause()
      setPlaying(false)
    }
  }

  function choose(next: VideoMode) {
    setVideoMode(next)
    setMenu(false)
    const v = ref.current
    if (v && next !== 'tap' && v.paused) {
      if (ended) v.currentTime = start
      setEnded(false)
      void v.play()?.catch(() => undefined)
    }
  }

  const len = Math.max(0.1, end - start)
  const pct = Math.min(100, Math.max(0, ((t - start) / len) * 100))
  const btn = big ? 'h-14 w-14' : 'h-11 w-11'

  return (
    <div className={cn('group relative h-full w-full overflow-hidden bg-black', className)}>
      <video ref={ref} src={src} poster={poster} muted={muted} playsInline preload={auto ? 'auto' : 'metadata'} className="h-full w-full object-contain" onClick={toggle} />
      {!playing && (
        <button type="button" onClick={toggle} aria-label={ended ? labels.replayClip : labels.playClip} className="absolute inset-0 m-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur-md">
          {ended ? <RotateCcw className="h-9 w-9" /> : <Play className="ml-1 h-10 w-10 fill-current" />}
        </button>
      )}
      {menu && (
        <>
          <button type="button" aria-label={labels.close} className="absolute inset-0 cursor-default" onClick={() => setMenu(false)} />
          <div className="absolute right-3 bottom-20 z-10 w-64 rounded-2xl bg-slate-900/95 p-1.5 text-white shadow-xl ring-1 ring-white/10" role="menu" aria-label={labels.videoPlayback}>
            <p className="px-3 pt-1.5 pb-1 text-[10px] font-black tracking-widest text-white/55 uppercase">{labels.videoPlayback}</p>
            {VIDEO_MODES.map((m) => (
              <button key={m.value} type="button" role="menuitemradio" aria-checked={effective === m.value} onClick={() => choose(m.value)} className={cn('flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left', effective === m.value ? 'bg-white/15' : 'hover:bg-white/10')}>
                <ModeIcon mode={m.value} className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black">{labels.videoModes[m.value].label}</span>
                  <span className="block text-xs font-medium text-white/65">{labels.videoModes[m.value].hint}</span>
                </span>
                {effective === m.value && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}
            <p className="px-3 pt-1 pb-1.5 text-[11px] font-medium text-white/50">{labels.savedOnDevice}</p>
          </div>
        </>
      )}
      <div className={cn('absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-3', bare && 'hidden')}>
        <button type="button" onClick={toggle} aria-label={playing ? labels.pause : labels.play} className={cn('btn-press flex items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md', btn)}>
          {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
        </button>
        <button
          type="button"
          onClick={() => {
            const v = ref.current
            if (!v) return
            v.currentTime = start
            if (v.paused && (ended || auto)) toggle()
          }}
          aria-label={labels.restartClip}
          className={cn('btn-press flex items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md', btn)}
        >
          <RotateCcw className="h-5 w-5" />
        </button>
        <div className="mx-1 h-1.5 flex-1 overflow-hidden rounded-full bg-white/30">
          <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
        </div>
        <span className={cn('text-xs font-black text-white tabular-nums', modeControl && 'max-sm:hidden')}>{formatClock(Math.max(0, t - start))} / {formatClock(len)}</span>
        {modeControl && (
          <button type="button" onClick={() => setMenu((o) => !o)} aria-label={labels.playbackMode(labels.videoModes[effective].label)} aria-expanded={menu} className={cn('btn-press flex items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md', btn)}>
            <ModeIcon mode={effective} className="h-5 w-5" />
          </button>
        )}
        <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? labels.unmute : labels.mute} className={cn('btn-press flex items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md', btn)}>
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>
    </div>
  )
}

function ModeIcon({ mode, className }: { mode: VideoMode; className?: string }) {
  if (mode === 'loop') return <Repeat className={className} />
  if (mode === 'once') return <Repeat1 className={className} />
  return <Hand className={className} />
}

export function DocumentPage({ media, className }: { media: Extract<StepMedia, { kind: 'document' }>; className?: string }) {
  const labels = useMediaLabels()
  const href = `${media.url}#page=${media.page ?? 1}`
  if (media.pageImageUrl) {
    return (
      <div className={cn('relative h-full w-full bg-white', className)}>
        <AnnotatedImage src={media.pageImageUrl} alt={labels.page(media.page ?? 1)} />
        <a href={href} target="_blank" rel="noreferrer" className="btn-press glass-card absolute top-3 right-3 flex h-11 items-center gap-2 rounded-2xl px-3 text-xs font-black text-slate-800">
          <Maximize2 className="h-4 w-4" /> {labels.page(media.page ?? 1)}
        </a>
      </div>
    )
  }
  return (
    <div className={cn('flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center dark:bg-slate-800', className)}>
      <FileText className="h-14 w-14 text-slate-400" />
      <p className="font-black text-slate-700 dark:text-slate-200">{labels.documentPage(media.name ?? labels.document, media.page ?? 1)}</p>
      <a href={href} target="_blank" rel="noreferrer" className="btn-press bg-gradient-primary shadow-primary flex h-12 items-center gap-2 rounded-full px-5 font-black text-white">
        <Maximize2 className="h-4 w-4" /> {labels.openPage}
      </a>
    </div>
  )
}

export function MediaView({ media, className, big, autoPlay, videoMode, modeControl, bare }: { media: StepMedia; className?: string; big?: boolean; autoPlay?: boolean; videoMode?: VideoMode; modeControl?: boolean; bare?: boolean }) {
  if (media.kind === 'image') return <AnnotatedImage src={media.url} annotations={media.annotations} alt={media.alt} className={className} />
  if (media.kind === 'video') return <VideoSegment url={media.url} start={media.start} end={media.end} poster={media.posterUrl} className={className} big={big} autoPlay={autoPlay} mode={videoMode} modeControl={modeControl} bare={bare} />
  if (media.kind === 'html') return <HtmlMedia html={media.html} title={media.title} className={className} />
  return <DocumentPage media={media} className={className} />
}

/**
 * Un schéma généré par l'IA (SVG, dessin, vue 3D) : sa page HTML tourne dans un cadre isolé
 * (`sandbox` sans `allow-same-origin`) ; elle n'a accès ni aux jetons, ni aux données, ni à la page.
 */
export function HtmlMedia({ html, title, className }: { html: string; title?: string; className?: string }) {
  const labels = useMediaLabels()
  return <iframe srcDoc={html} sandbox="allow-scripts" referrerPolicy="no-referrer" title={title || labels.diagram} loading="lazy" className={cn('h-full w-full border-0 bg-white', className)} />
}

export function mediaThumb(media: StepMedia | undefined): string | null {
  if (!media) return null
  if (media.kind === 'image') return media.url
  if (media.kind === 'video') return media.posterUrl ?? null
  if (media.kind === 'document') return media.pageImageUrl ?? null
  return null
}

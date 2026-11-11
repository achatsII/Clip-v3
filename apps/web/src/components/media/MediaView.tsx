'use client'

import { FileText, Maximize2, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { annotationsMarkup } from '@/lib/annotations/markup'
import type { Annotation, StepMedia } from '@/lib/model/types'
import { cn, formatClock } from '@/lib/util/cn'

/**
 * Les annotations par-dessus une image (coordonnées relatives, de 0 à 1). Le dessin est celui du
 * PDF (src/lib/annotations/markup.ts) ; les tailles suivent la largeur de l'image (`cqw`).
 */
export function AnnotationLayer({ annotations, className, ratio }: { annotations: Annotation[]; className?: string; ratio?: number | null }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const html = useMemo(() => annotationsMarkup(annotations, { ratio: ratio ?? 1, idPrefix: `an${id}` }), [annotations, ratio, id])
  if (!annotations.length) return null
  return <div className={cn('pointer-events-none absolute inset-0 [container-type:inline-size]', className)} dangerouslySetInnerHTML={{ __html: html }} />
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

/** Un extrait de vidéo joué en boucle entre `start` et `end`, muet par défaut. */
export function VideoSegment({ url, start, end, poster, autoPlay = true, className, big }: { url: string; start: number; end: number; poster?: string; autoPlay?: boolean; className?: string; big?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [t, setT] = useState(start)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    const onMeta = () => {
      v.currentTime = start
      if (autoPlay) v.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    }
    const onTime = () => {
      if (v.currentTime >= end - 0.05 || v.currentTime < start - 0.5) v.currentTime = start
      setT(v.currentTime)
    }
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('timeupdate', onTime)
    if (v.readyState >= 1) onMeta()
    return () => {
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('timeupdate', onTime)
    }
  }, [url, start, end, autoPlay])

  const toggle = () => {
    const v = ref.current
    if (!v) return
    if (v.paused) v.play().then(() => setPlaying(true)).catch(() => undefined)
    else {
      v.pause()
      setPlaying(false)
    }
  }
  const len = Math.max(0.1, end - start)
  const pct = Math.min(100, Math.max(0, ((t - start) / len) * 100))
  const btn = big ? 'h-14 w-14' : 'h-11 w-11'

  return (
    <div className={cn('group relative h-full w-full overflow-hidden bg-black', className)}>
      <video ref={ref} src={url} poster={poster} muted={muted} playsInline preload="metadata" className="h-full w-full object-contain" onClick={toggle} />
      {!playing && (
        <button type="button" onClick={toggle} aria-label="Lire l’extrait" className="absolute inset-0 m-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur-md">
          <Play className="ml-1 h-10 w-10 fill-current" />
        </button>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
        <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Lire'} className={cn('btn-press flex items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md', btn)}>
          {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
        </button>
        <button
          type="button"
          onClick={() => {
            if (ref.current) ref.current.currentTime = start
          }}
          aria-label="Reprendre l’extrait"
          className={cn('btn-press flex items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md', btn)}
        >
          <RotateCcw className="h-5 w-5" />
        </button>
        <div className="mx-1 h-1.5 flex-1 overflow-hidden rounded-full bg-white/30">
          <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-black text-white tabular-nums">{formatClock(Math.max(0, t - start))} / {formatClock(len)}</span>
        <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Activer le son' : 'Couper le son'} className={cn('btn-press flex items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md', btn)}>
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>
    </div>
  )
}

export function DocumentPage({ media, className }: { media: Extract<StepMedia, { kind: 'document' }>; className?: string }) {
  const href = `${media.url}#page=${media.page ?? 1}`
  if (media.pageImageUrl) {
    return (
      <div className={cn('relative h-full w-full bg-white', className)}>
        <AnnotatedImage src={media.pageImageUrl} alt={`Page ${media.page ?? 1}`} />
        <a href={href} target="_blank" rel="noreferrer" className="btn-press glass-card absolute top-3 right-3 flex h-11 items-center gap-2 rounded-2xl px-3 text-xs font-black text-slate-800">
          <Maximize2 className="h-4 w-4" /> Page {media.page ?? 1}
        </a>
      </div>
    )
  }
  return (
    <div className={cn('flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center dark:bg-slate-800', className)}>
      <FileText className="h-14 w-14 text-slate-400" />
      <p className="font-black text-slate-700 dark:text-slate-200">{media.name ?? 'Document'} · page {media.page ?? 1}</p>
      <a href={href} target="_blank" rel="noreferrer" className="btn-press bg-gradient-primary shadow-primary flex h-12 items-center gap-2 rounded-full px-5 font-black text-white">
        <Maximize2 className="h-4 w-4" /> Ouvrir la page
      </a>
    </div>
  )
}

export function MediaView({ media, className, big, autoPlay }: { media: StepMedia; className?: string; big?: boolean; autoPlay?: boolean }) {
  if (media.kind === 'image') return <AnnotatedImage src={media.url} annotations={media.annotations} alt={media.alt} className={className} />
  if (media.kind === 'video') return <VideoSegment url={media.url} start={media.start} end={media.end} poster={media.posterUrl} className={className} big={big} autoPlay={autoPlay} />
  return <DocumentPage media={media} className={className} />
}

export function mediaThumb(media: StepMedia | undefined): string | null {
  if (!media) return null
  if (media.kind === 'image') return media.url
  if (media.kind === 'video') return media.posterUrl ?? null
  return media.pageImageUrl ?? null
}

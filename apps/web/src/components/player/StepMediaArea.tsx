'use client'

import { ChevronLeft, ChevronRight, FileText, Film, Maximize2, Shapes } from 'lucide-react'
import { useState } from 'react'
import { MediaView, mediaThumb } from '@/components/media/MediaView'
import { ZoomViewer } from '@/components/media/ZoomViewer'
import { useVideoMode } from '@/lib/media/videoMode'
import { layoutOf } from '@/lib/model/media'
import type { MediaVerdict, Step, StepMedia } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'

export interface MediaAreaLabels {
  zoom: string
  doIt: string
  avoid: string
  /** Plusieurs médias à l'étape : les flèches, et où l'on en est (« 2 / 3 »). */
  previousMedia: string
  nextMedia: string
  mediaOf: (i: number, n: number) => string
}

/**
 * Les médias d'une étape, au poste et dans la vue « comme au poste » de l'éditeur :
 * - un à la fois : un grand média ; s'il y en a d'autres, leurs vraies vignettes en haut, « 2 / 3 »
 *   et de grandes flèches sur les côtés (`MediaNav`), la flèche « suivant » qui attire l'œil tant
 *   qu'on ne les a pas regardés ;
 * - à faire / à éviter : deux médias côte à côte, bordés de vert et de rouge ;
 * - grille : tous les médias, deux par rangée.
 * Chaque média s'agrandit en plein écran (pincer, double-toucher).
 * `lazy` : l'étape est une parmi d'autres sur la page (« Tout voir ») ; ses vidéos ne se chargent et
 * ne jouent qu'à l'écran (lecture fluide, `VideoSegment`).
 * `nav` (toggle `mediaNav`) : les vignettes et les flèches ; sans lui, de petites pastilles numérotées.
 */
export function StepMediaArea({ step, labels, lazy, nav }: { step: Step; labels: MediaAreaLabels; lazy?: boolean; nav?: boolean }) {
  const [current, setCurrent] = useState(0)
  const [zoomed, setZoomed] = useState<number | null>(null)
  const videoMode = useVideoMode()
  const layout = layoutOf(step)
  const zoomMedia = zoomed !== null ? step.media[zoomed] : null

  return (
    <>
      {layout === 'focus' ? (
        <FocusMedia step={step} current={Math.min(current, step.media.length - 1)} onPick={setCurrent} onZoom={setZoomed} labels={labels} videoMode={videoMode} lazy={lazy} nav={nav} />
      ) : (
        <div className={cn('grid h-full grid-cols-2 gap-1 bg-slate-950', layout === 'grid' && step.media.length > 2 ? 'auto-rows-[calc(50%-2px)] overflow-y-auto' : 'grid-rows-1')}>
          {(layout === 'compare' ? step.media.slice(0, 2) : step.media).map((m, i) => (
            <MediaTile key={i} media={m} labels={labels} onZoom={() => setZoomed(i)} videoMode={videoMode} lazy={lazy} />
          ))}
        </div>
      )}
      <ZoomViewer open={!!zoomMedia} onClose={() => setZoomed(null)} label={labels.zoom}>
        {zoomMedia && <MediaView media={zoomMedia} big videoMode={videoMode} />}
      </ZoomViewer>
    </>
  )
}

function FocusMedia({ step, current, onPick, onZoom, labels, videoMode, lazy, nav }: { step: Step; current: number; onPick: (i: number) => void; onZoom: (i: number) => void; labels: MediaAreaLabels; videoMode: ReturnType<typeof useVideoMode>; lazy?: boolean; nav?: boolean }) {
  const media = step.media[current] ?? step.media[0]
  return (
    <div className={cn('relative h-full w-full', media.verdict && VERDICT_RING[media.verdict])}>
      <MediaView key={current} media={media} big videoMode={videoMode} modeControl lazy={lazy} />
      {step.media.length > 1 &&
        (nav ? (
          <MediaNav media={step.media} current={current} onPick={onPick} labels={labels} />
        ) : (
          <div className="absolute top-3 left-3 flex gap-1.5">
            {step.media.map((m, j) => (
              <button key={j} type="button" onClick={() => onPick(j)} className={cn('btn-press h-11 rounded-2xl px-4 text-xs font-black backdrop-blur-md', current === j ? 'bg-white text-slate-900' : 'bg-black/40 text-white')}>
                {m.verdict ? (m.verdict === 'do' ? '✓' : '✕') : m.kind === 'video' ? '▶' : m.kind === 'document' ? '📄' : m.kind === 'html' ? '◇' : '📷'} {j + 1}
              </button>
            ))}
          </div>
        ))}
      <MediaBadges media={media} labels={labels} raised={media.kind === 'video'} shifted={step.media.length > 1} />
      <button type="button" onClick={() => onZoom(current)} aria-label={labels.zoom} title={labels.zoom} className="btn-press absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-black/50 text-white ring-1 ring-white/20">
        <Maximize2 className="h-5 w-5" />
      </button>
    </div>
  )
}

/**
 * Plusieurs médias à une étape, impossibles à manquer : leurs vraies vignettes en haut (celle qu'on
 * regarde, bordée de blanc), « 2 / 3 », et de grandes flèches sur les côtés. Tant qu'on n'a pas
 * regardé un autre média, la flèche « suivant » pulse. Pas de balayage sur le média : au poste, il
 * change d'étape.
 */
export function MediaNav({ media, current, onPick, labels }: { media: StepMedia[]; current: number; onPick: (i: number) => void; labels: Pick<MediaAreaLabels, 'previousMedia' | 'nextMedia' | 'mediaOf'> }) {
  const [explored, setExplored] = useState(false)
  const n = media.length
  const pick = (i: number) => {
    setExplored(true)
    onPick((i + n) % n)
  }
  const arrow = 'btn-press absolute top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-lg ring-1 ring-white/30 backdrop-blur-md'
  return (
    <>
      <div className="no-scrollbar absolute top-3 left-3 z-10 flex max-w-[calc(100%-5rem)] items-center gap-1.5 overflow-x-auto rounded-2xl bg-black/45 p-1.5 backdrop-blur-md">
        <span className="shrink-0 px-1.5 text-sm font-black text-white tabular-nums">{labels.mediaOf(current + 1, n)}</span>
        {media.map((m, j) => {
          const thumb = mediaThumb(m)
          return (
            <button
              key={j}
              type="button"
              onClick={() => pick(j)}
              aria-label={labels.mediaOf(j + 1, n)}
              aria-pressed={current === j}
              className={cn('btn-press relative h-11 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-700 text-white', current === j ? 'ring-2 ring-white' : 'opacity-70 hover:opacity-100', m.verdict === 'do' && 'outline outline-2 outline-emerald-400', m.verdict === 'dont' && 'outline outline-2 outline-rose-400')}
            >
              {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center">{m.kind === 'video' ? <Film className="h-4 w-4" /> : m.kind === 'html' ? <Shapes className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span>}
              {m.kind === 'video' && thumb && <span className="absolute right-0.5 bottom-0.5 rounded bg-black/60 px-1 text-[9px] font-black">▶</span>}
            </button>
          )
        })}
      </div>
      <button type="button" onClick={() => pick(current - 1)} aria-label={labels.previousMedia} className={cn(arrow, 'left-2')}>
        <ChevronLeft className="h-8 w-8" />
      </button>
      <button type="button" onClick={() => pick(current + 1)} aria-label={labels.nextMedia} className={cn(arrow, 'right-2', !explored && current === 0 && 'animate-pulse ring-2 ring-white')}>
        <ChevronRight className="h-8 w-8" />
      </button>
    </>
  )
}

function MediaTile({ media, labels, onZoom, videoMode, lazy }: { media: StepMedia; labels: MediaAreaLabels; onZoom: () => void; videoMode: ReturnType<typeof useVideoMode>; lazy?: boolean }) {
  return (
    <div className={cn('relative min-h-0 overflow-hidden bg-slate-900', media.verdict && VERDICT_RING[media.verdict])}>
      <MediaView media={media} videoMode={videoMode} bare lazy={lazy} />
      <MediaBadges media={media} labels={labels} />
      <button type="button" onClick={onZoom} aria-label={labels.zoom} title={labels.zoom} className="btn-press absolute top-2 right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-black/50 text-white ring-1 ring-white/20">
        <Maximize2 className="h-4 w-4" />
      </button>
    </div>
  )
}

const VERDICT_RING: Record<MediaVerdict, string> = {
  do: 'ring-4 ring-emerald-500 ring-inset',
  dont: 'ring-4 ring-rose-500 ring-inset',
}

/** Le verdict (« À faire » / « À éviter ») en haut, la légende en bas. */
function MediaBadges({ media, labels, raised, shifted }: { media: StepMedia; labels: MediaAreaLabels; raised?: boolean; shifted?: boolean }) {
  return (
    <>
      {media.verdict && (
        <span className={cn('pointer-events-none absolute left-3 flex h-9 items-center gap-1 rounded-xl px-3 text-sm font-black text-white shadow-lg', media.verdict === 'do' ? 'bg-emerald-500' : 'bg-rose-500', shifted ? 'top-16' : 'top-3')}>
          {media.verdict === 'do' ? '✓' : '✕'} {media.verdict === 'do' ? labels.doIt : labels.avoid}
        </span>
      )}
      {media.caption && (
        <span className={cn('pointer-events-none absolute inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-6 pb-2 text-sm leading-snug font-black text-white', raised ? 'bottom-20' : 'bottom-0')}>{media.caption}</span>
      )}
    </>
  )
}

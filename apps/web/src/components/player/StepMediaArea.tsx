'use client'

import { Maximize2 } from 'lucide-react'
import { useState } from 'react'
import { MediaView } from '@/components/media/MediaView'
import { ZoomViewer } from '@/components/media/ZoomViewer'
import { useVideoMode } from '@/lib/media/videoMode'
import { layoutOf } from '@/lib/model/media'
import type { MediaVerdict, Step, StepMedia } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'

export interface MediaAreaLabels {
  zoom: string
  doIt: string
  avoid: string
}

/**
 * Les médias d'une étape, au poste et dans la vue « comme au poste » de l'éditeur :
 * - un à la fois : un grand média, les autres au choix en haut à gauche ;
 * - à faire / à éviter : deux médias côte à côte, bordés de vert et de rouge ;
 * - grille : tous les médias, deux par rangée.
 * Chaque média s'agrandit en plein écran (pincer, double-toucher).
 */
export function StepMediaArea({ step, labels }: { step: Step; labels: MediaAreaLabels }) {
  const [current, setCurrent] = useState(0)
  const [zoomed, setZoomed] = useState<number | null>(null)
  const videoMode = useVideoMode()
  const layout = layoutOf(step)
  const zoomMedia = zoomed !== null ? step.media[zoomed] : null

  return (
    <>
      {layout === 'focus' ? (
        <FocusMedia step={step} current={Math.min(current, step.media.length - 1)} onPick={setCurrent} onZoom={setZoomed} labels={labels} videoMode={videoMode} />
      ) : (
        <div className={cn('grid h-full grid-cols-2 gap-1 bg-slate-950', layout === 'grid' && step.media.length > 2 ? 'auto-rows-[calc(50%-2px)] overflow-y-auto' : 'grid-rows-1')}>
          {(layout === 'compare' ? step.media.slice(0, 2) : step.media).map((m, i) => (
            <MediaTile key={i} media={m} labels={labels} onZoom={() => setZoomed(i)} videoMode={videoMode} />
          ))}
        </div>
      )}
      <ZoomViewer open={!!zoomMedia} onClose={() => setZoomed(null)} label={labels.zoom}>
        {zoomMedia && <MediaView media={zoomMedia} big videoMode={videoMode} />}
      </ZoomViewer>
    </>
  )
}

function FocusMedia({ step, current, onPick, onZoom, labels, videoMode }: { step: Step; current: number; onPick: (i: number) => void; onZoom: (i: number) => void; labels: MediaAreaLabels; videoMode: ReturnType<typeof useVideoMode> }) {
  const media = step.media[current] ?? step.media[0]
  return (
    <div className={cn('relative h-full w-full', media.verdict && VERDICT_RING[media.verdict])}>
      <MediaView key={current} media={media} big videoMode={videoMode} modeControl />
      {step.media.length > 1 && (
        <div className="absolute top-3 left-3 flex gap-1.5">
          {step.media.map((m, j) => (
            <button key={j} type="button" onClick={() => onPick(j)} className={cn('btn-press h-11 rounded-2xl px-4 text-xs font-black backdrop-blur-md', current === j ? 'bg-white text-slate-900' : 'bg-black/40 text-white')}>
              {m.verdict ? (m.verdict === 'do' ? '✓' : '✕') : m.kind === 'video' ? '▶' : m.kind === 'document' ? '📄' : m.kind === 'html' ? '◇' : '📷'} {j + 1}
            </button>
          ))}
        </div>
      )}
      <MediaBadges media={media} labels={labels} raised={media.kind === 'video'} shifted={step.media.length > 1} />
      <button type="button" onClick={() => onZoom(current)} aria-label={labels.zoom} title={labels.zoom} className="btn-press absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-black/50 text-white ring-1 ring-white/20">
        <Maximize2 className="h-5 w-5" />
      </button>
    </div>
  )
}

function MediaTile({ media, labels, onZoom, videoMode }: { media: StepMedia; labels: MediaAreaLabels; onZoom: () => void; videoMode: ReturnType<typeof useVideoMode> }) {
  return (
    <div className={cn('relative min-h-0 overflow-hidden bg-slate-900', media.verdict && VERDICT_RING[media.verdict])}>
      <MediaView media={media} videoMode={videoMode} bare />
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

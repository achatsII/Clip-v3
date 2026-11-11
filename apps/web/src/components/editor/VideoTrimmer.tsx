'use client'

import { Flag, Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useMessages } from '@/lib/i18n'
import { formatClock } from '@/lib/util/cn'

/** Choisir le début et la fin d'un extrait : on lit la vidéo et on touche « Début ici », « Fin ici ». */
export function VideoTrimmer({ url, start, end, duration, onChange }: { url: string; start: number; end: number; duration?: number; onChange: (start: number, end: number) => void }) {
  const t = useMessages()
  const ref = useRef<HTMLVideoElement>(null)
  const [at, setAt] = useState(start)
  const [dur, setDur] = useState(duration ?? Math.max(end, 10))
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    const meta = () => {
      if (Number.isFinite(v.duration)) setDur(v.duration)
      v.currentTime = start
    }
    const time = () => setAt(v.currentTime)
    v.addEventListener('loadedmetadata', meta)
    v.addEventListener('timeupdate', time)
    return () => {
      v.removeEventListener('loadedmetadata', meta)
      v.removeEventListener('timeupdate', time)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  const seek = (s: number) => {
    if (ref.current) ref.current.currentTime = Math.max(0, Math.min(dur, s))
  }
  const toggle = () => {
    const v = ref.current
    if (!v) return
    if (v.paused) void v.play().then(() => setPlaying(true))
    else {
      v.pause()
      setPlaying(false)
    }
  }
  const pct = (s: number) => `${Math.min(100, Math.max(0, (s / Math.max(dur, 0.1)) * 100))}%`

  return (
    <div>
      <div className="overflow-hidden rounded-[24px] bg-black">
        <video ref={ref} src={url} playsInline muted className="aspect-video w-full object-contain" onClick={toggle} />
      </div>
      <div
        className="relative mt-4 h-12 cursor-pointer rounded-2xl bg-slate-900/10 dark:bg-white/10"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          seek(((e.clientX - r.left) / r.width) * dur)
        }}
      >
        <div className="bg-gradient-primary absolute inset-y-0 rounded-2xl opacity-70" style={{ left: pct(start), width: `calc(${pct(end)} - ${pct(start)})` }} />
        <div className="absolute inset-y-0 w-1 rounded bg-slate-900 dark:bg-white" style={{ left: pct(at) }} />
      </div>
      <div className="mt-2 flex justify-between text-xs font-black text-slate-500 tabular-nums">
        <span>{t.editorTools.trimmer.clip(formatClock(start), formatClock(end), Math.round(end - start))}</span>
        <span>{formatClock(at)} / {formatClock(dur)}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button onClick={() => onChange(Math.min(at, end - 1), end)} icon={<Flag className="h-4 w-4" />}>
          {t.editorTools.trimmer.start}
        </Button>
        <Button variant="primary" onClick={toggle} icon={playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}>
          {playing ? t.editorTools.trimmer.pause : t.editorTools.trimmer.play}
        </Button>
        <Button onClick={() => onChange(start, Math.max(at, start + 1))} icon={<Flag className="h-4 w-4" />}>
          {t.editorTools.trimmer.end}
        </Button>
      </div>
    </div>
  )
}

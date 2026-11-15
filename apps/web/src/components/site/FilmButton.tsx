'use client'

import { Play, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { FILM } from '@/lib/site/media'
import type { SiteLang } from '@/lib/site/lang'
import { cx } from './ui'

/**
 * « Voir le film » : le film d'une minute, avec le son et les sous-titres (français et anglais), dans
 * une fenêtre (`<dialog>` : le focus y reste, Échap la ferme). La vidéo ne se charge qu'à l'ouverture,
 * en 1080p sur un grand écran, 720p ailleurs.
 */
export function FilmButton({
  lang,
  labels,
  className,
}: {
  lang: SiteLang
  labels: { button: string; length: string; title: string; note: string; close: string; poster: string; tracks: Record<SiteLang, string> }
  className?: string
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const titleId = useId()
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    const onClose = () => video.current?.pause()
    d.addEventListener('close', onClose)
    return () => d.removeEventListener('close', onClose)
  }, [])

  useEffect(() => {
    if (src) void video.current?.play().catch(() => undefined)
  }, [src])

  function open() {
    dialog.current?.showModal()
    if (!src) setSrc(window.matchMedia('(min-width: 1024px)').matches ? FILM.mp4_1080 : FILM.mp4_720)
    else void video.current?.play().catch(() => undefined)
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={cx(
          'btn-press glass-card inline-flex h-14 shrink-0 items-center justify-center gap-2.5 rounded-full px-6 text-base font-black whitespace-nowrap text-slate-900 hover:bg-white/80 dark:text-white dark:hover:bg-slate-700/60',
          className,
        )}
      >
        <span className="bg-gradient-primary flex h-8 w-8 items-center justify-center rounded-full text-white">
          <Play className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden />
        </span>
        {labels.button}
        <span className="font-bold text-slate-500 dark:text-slate-400">{labels.length}</span>
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="m-auto w-[min(1100px,calc(100vw-24px))] max-w-none overflow-visible bg-transparent p-0 text-white backdrop:bg-slate-950/80 backdrop:backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close()
        }}
      >
        <div className="overflow-hidden rounded-[28px] bg-slate-950 shadow-[0_40px_120px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <p id={titleId} className="text-base font-black tracking-tight">
              {labels.title}
            </p>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label={labels.close}
              className="btn-press flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <video ref={video} className="block aspect-video w-full bg-black" controls playsInline preload="none" poster={FILM.poster} src={src ?? undefined} aria-label={labels.poster}>
            <track kind="subtitles" srcLang="fr" label={labels.tracks.fr} src={FILM.subtitles.fr} default={lang === 'fr'} />
            <track kind="subtitles" srcLang="en" label={labels.tracks.en} src={FILM.subtitles.en} default={lang === 'en'} />
          </video>
          <p className="px-5 py-3 text-sm font-bold text-slate-400">{labels.note}</p>
        </div>
      </dialog>
    </>
  )
}

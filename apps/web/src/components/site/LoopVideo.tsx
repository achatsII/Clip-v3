'use client'

import { Pause, Play } from 'lucide-react'
import { preload } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import type { LoopVideo as Loop } from '@/lib/site/media'
import { cx } from './ui'

/**
 * Une boucle muette du produit : elle joue seulement à l'écran (pause hors écran et onglet caché),
 * jamais d'elle-même si la personne réduit les mouvements, et un bouton la met en pause (WCAG 2.2.2).
 * Le même lecteur change de boucle quand `loop` change (la démo du poste, d'une étape à l'autre) : un
 * téléphone qui l'a laissé jouer une fois (un toucher) le laisse jouer ensuite. Si l'appareil refuse de
 * la jouer seul (iPhone en mode économie d'énergie), un grand bouton de lecture le dit : ce n'est pas une
 * image fixe.
 */
export function LoopVideo({ loop, label, labels, priority, className }: { loop: Loop; label: string; labels: { pause: string; play: string }; priority?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const held = useRef(false)
  const visible = useRef(false)
  const first = useRef(true)
  const [playing, setPlaying] = useState(false)
  // L'appareil a refusé de la jouer seul, alors qu'elle était à l'écran : on montre un grand bouton.
  const [blocked, setBlocked] = useState(false)
  // L'affiche du héros est la plus grande image du haut de la page : elle se charge tout de suite.
  if (priority) preload(loop.poster, { as: 'image', fetchPriority: 'high' })

  const attempt = (v: HTMLVideoElement) =>
    v.play().then(
      () => {
        setPlaying(true)
        setBlocked(false)
      },
      (e: unknown) => {
        // Une boucle remplacée en route interrompt la lecture d'avant (AbortError) : ce n'est pas un refus.
        if ((e as { name?: string } | null)?.name === 'AbortError') return
        setPlaying(false)
        if (visible.current && !held.current) setBlocked(true)
      },
    )

  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      held.current = true
      return
    }
    const start = () => {
      if (held.current || document.hidden) return
      void attempt(v)
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        visible.current = !!entry?.isIntersecting
        if (entry?.isIntersecting) start()
        else {
          v.pause()
          setPlaying(false)
        }
      },
      { threshold: 0.2 },
    )
    io.observe(v)
    const onVisibility = () => {
      if (document.hidden) {
        v.pause()
        setPlaying(false)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // Une autre boucle dans le même lecteur : la charger, puis la jouer si elle est à l'écran.
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const v = ref.current
    if (!v) return
    v.load()
    if (visible.current && !held.current && !document.hidden) void attempt(v)
  }, [loop.webm, loop.mp4]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle() {
    const v = ref.current
    if (!v) return
    if (v.paused) {
      held.current = false
      void attempt(v)
    } else {
      held.current = true
      v.pause()
      setPlaying(false)
    }
  }

  return (
    <div className={cx('relative overflow-hidden bg-slate-100 dark:bg-slate-800', className)}>
      <video ref={ref} className="block h-full w-full object-cover" width={1280} height={720} muted playsInline loop preload="metadata" poster={loop.poster} aria-label={label}>
        <source src={loop.webm} type="video/webm" />
        <source src={loop.mp4} type="video/mp4" />
      </video>
      {blocked && !playing && (
        <button
          type="button"
          onClick={toggle}
          aria-label={labels.play}
          className="btn-press absolute inset-0 m-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-900/55 text-white shadow-[0_20px_50px_-15px_rgba(15,23,42,0.6)] backdrop-blur-md hover:bg-slate-900/70"
        >
          <Play className="ml-1 h-8 w-8" fill="currentColor" aria-hidden />
        </button>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? labels.pause : labels.play}
        className="btn-press absolute right-3 bottom-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/55 text-white backdrop-blur-md transition-opacity hover:bg-slate-900/70"
      >
        {playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  )
}

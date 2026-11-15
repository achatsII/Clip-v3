'use client'

import { Pause, Play } from 'lucide-react'
import { preload } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import type { LoopVideo as Loop } from '@/lib/site/media'
import { cx } from './ui'

/**
 * Une boucle muette du produit : elle joue seulement à l'écran (pause hors écran et onglet caché),
 * jamais d'elle-même si la personne réduit les mouvements, et un bouton la met en pause (WCAG 2.2.2).
 */
export function LoopVideo({ loop, label, labels, priority, className }: { loop: Loop; label: string; labels: { pause: string; play: string }; priority?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const held = useRef(false)
  const [playing, setPlaying] = useState(false)
  // L'affiche du héros est la plus grande image du haut de la page : elle se charge tout de suite.
  if (priority) preload(loop.poster, { as: 'image', fetchPriority: 'high' })

  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      held.current = true
      return
    }
    const start = () => {
      if (held.current || document.hidden) return
      v.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      )
    }
    const io = new IntersectionObserver(
      ([entry]) => {
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

  function toggle() {
    const v = ref.current
    if (!v) return
    if (v.paused) {
      held.current = false
      void v.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      )
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

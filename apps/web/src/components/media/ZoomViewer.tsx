'use client'

import { Minus, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IDENTITY, clampView, isZoomed, pinchView, zoomAround, type View } from '@/lib/ui/zoom'

/**
 * Regarder un média de près, en plein écran : pincer pour zoomer, glisser pour se déplacer,
 * toucher deux fois pour zoomer sur un point (ou revenir), molette au bureau. Échap ferme.
 */
export function ZoomViewer({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <Viewer onClose={onClose} label={label}>
      {children}
    </Viewer>,
    document.body,
  )
}

type Gesture = { kind: 'pan'; id: number; x0: number; y0: number; v0: View; moved: boolean } | { kind: 'pinch'; d0: number; m0: { x: number; y: number }; v0: View } | { kind: 'wait' }

function Viewer({ onClose, label, children }: { onClose: () => void; label: string; children: ReactNode }) {
  const [view, setView] = useState<View>(IDENTITY)
  const frame = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<Gesture | null>(null)
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  useEffect(() => {
    const el = frame.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 16 : 1
      const r = el.getBoundingClientRect()
      // Au bureau, la molette zoome autour du pointeur ; le pavé tactile (deux doigts) déplace.
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaX) < 1) setView((v) => zoomAround(v, Math.exp(-e.deltaY * unit * 0.01), e.clientX - r.left, e.clientY - r.top, el.clientWidth, el.clientHeight))
      else setView((v) => clampView({ k: v.k, tx: v.tx - e.deltaX * unit, ty: v.ty - e.deltaY * unit }, el.clientWidth, el.clientHeight))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const local = (x: number, y: number) => {
    const r = frame.current!.getBoundingClientRect()
    return { x: x - r.left, y: y - r.top }
  }

  function zoomBy(f: number) {
    const el = frame.current
    if (el) setView((v) => zoomAround(v, f, el.clientWidth / 2, el.clientHeight / 2, el.clientWidth, el.clientHeight))
  }

  function down(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const m = local((a.x + b.x) / 2, (a.y + b.y) / 2)
      gesture.current = { kind: 'pinch', d0: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), m0: m, v0: view }
    } else if (pointers.current.size === 1) {
      gesture.current = { kind: 'pan', id: e.pointerId, x0: e.clientX, y0: e.clientY, v0: view, moved: false }
    }
  }

  function move(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    const el = frame.current
    if (!g || !el) return
    if (g.kind === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      setView(pinchView(g.v0, g.d0, g.m0, Math.hypot(a.x - b.x, a.y - b.y), local((a.x + b.x) / 2, (a.y + b.y) / 2), el.clientWidth, el.clientHeight))
    } else if (g.kind === 'pan' && g.id === e.pointerId) {
      if (Math.hypot(e.clientX - g.x0, e.clientY - g.y0) > 6) g.moved = true
      if (g.moved && isZoomed(g.v0)) setView(clampView({ k: g.v0.k, tx: g.v0.tx + e.clientX - g.x0, ty: g.v0.ty + e.clientY - g.y0 }, el.clientWidth, el.clientHeight))
    }
  }

  function up(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    if (!g) return
    if (g.kind !== 'pan') {
      gesture.current = pointers.current.size ? { kind: 'wait' } : null
      return
    }
    gesture.current = null
    if (g.moved || g.id !== e.pointerId) return
    // Deux touchers rapprochés : zoom sur ce point, ou retour à l'image entière.
    const now = Date.now()
    const tap = lastTap.current
    if (tap && now - tap.t < 320 && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 40) {
      lastTap.current = null
      const el = frame.current
      if (!el) return
      const p = local(e.clientX, e.clientY)
      setView((v) => (isZoomed(v) ? IDENTITY : zoomAround(v, 2.5, p.x, p.y, el.clientWidth, el.clientHeight)))
    } else lastTap.current = { t: now, x: e.clientX, y: e.clientY }
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black text-white select-none" role="dialog" aria-modal="true" aria-label={label}>
      <div ref={frame} className="relative min-h-0 flex-1 touch-none overflow-hidden" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className="absolute inset-0 origin-top-left" style={{ transform: `translate3d(${view.tx}px, ${view.ty}px, 0) scale(${view.k})` }}>
          {children}
        </div>
      </div>
      <div className="pt-safe pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
        <span className="rounded-full bg-black/60 px-3 py-2 text-xs font-bold text-white/85 tabular-nums">{isZoomed(view) ? `${Math.round(view.k * 100)} %` : 'Pincez ou touchez deux fois pour zoomer'}</span>
        <button type="button" onClick={onClose} aria-label="Fermer" className="btn-press pointer-events-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/20">
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="pb-safe pointer-events-none absolute right-3 bottom-24 flex flex-col gap-2 max-sm:hidden">
        <button type="button" onClick={() => zoomBy(1.4)} aria-label="Zoomer" className="btn-press pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/20">
          <Plus className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.4)} disabled={!isZoomed(view)} aria-label="Dézoomer" className="btn-press pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white ring-1 ring-white/20 disabled:opacity-40">
          <Minus className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

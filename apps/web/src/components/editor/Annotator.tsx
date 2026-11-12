'use client'

import { ArrowUpRight, Circle, Copy, EyeOff, Hash, Highlighter, Loader2, Minus, MousePointer2, MoveHorizontal, Pencil, Redo2, Sparkles, Square, Sticker, Trash2, Type, Undo2, X, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnnotatedImage } from '@/components/media/MediaView'
import { useSession } from '@/components/providers/Session'
import { Input } from '@/components/ui/Field'
import { errorText } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { annotateImage } from '@/lib/ai/assist'
import { ANNOTATION_ICON_KEYS, type AnnotationIconKey } from '@/lib/annotations/icons'
import { iconSvg } from '@/lib/annotations/markup'
import {
  ANNOTATION_COLORS,
  COLOR_ORDER,
  SIZES,
  bbox,
  canDash,
  canFill,
  clamp01,
  clampScale,
  handlesOf,
  hitTest,
  inkOn,
  isPointLike,
  isSegment,
  moveEnd,
  pointHalf,
  resizeBy,
  sanitizeAnnotation,
  scaleOf,
  sizeOf,
  snap45,
  translate,
  type HandleKind,
} from '@/lib/annotations/model'
import { AI_COSTS } from '@/lib/billing/catalog'
import { BILLING_V2 } from '@/lib/config'
import { useMessages } from '@/lib/i18n'
import { uid } from '@/lib/model/repo'
import { readPref, writePref } from '@/lib/prefs'
import type { Annotation, AnnotationColor, AnnotationSize, AnnotationType, Step } from '@/lib/model/types'
import { IDENTITY, clampView, isZoomed, pinchView, zoomAround, type View } from '@/lib/ui/zoom'
import { cn } from '@/lib/util/cn'

type Tool = 'select' | AnnotationType

/** Les outils de dessin et leur touche ; le nom de chacun se lit au rendu (`editorTools.annotator.tools`). */
const DRAW_TOOLS: Array<{ value: AnnotationType; key: string; icon: ReactNode }> = [
  { value: 'pen', key: 'p', icon: <Pencil className="h-5 w-5" /> },
  { value: 'highlight', key: 'h', icon: <Highlighter className="h-5 w-5" /> },
  { value: 'arrow', key: 'a', icon: <ArrowUpRight className="h-5 w-5" /> },
  { value: 'line', key: 'l', icon: <Minus className="h-5 w-5" /> },
  { value: 'measure', key: 'm', icon: <MoveHorizontal className="h-5 w-5" /> },
  { value: 'circle', key: 'o', icon: <Circle className="h-5 w-5" /> },
  { value: 'rect', key: 'r', icon: <Square className="h-5 w-5" /> },
  { value: 'text', key: 't', icon: <Type className="h-5 w-5" /> },
  { value: 'number', key: 'n', icon: <Hash className="h-5 w-5" /> },
  { value: 'icon', key: 'i', icon: <Sticker className="h-5 w-5" /> },
  { value: 'blur', key: 'b', icon: <EyeOff className="h-5 w-5" /> },
]
const TOOL_KEYS: Record<string, Tool> = { v: 'select', ...Object.fromEntries(DRAW_TOOLS.map((t) => [t.key, t.value])) }

const MAX_HISTORY = 60
const MAX_POINTS = 600
/** Portée d'une poignée sous le doigt, en pixels à l'écran. */
const HANDLE_REACH = 26
/** Le point qui représente chaque taille dans la barre. */
const DOT: Record<AnnotationSize, number> = { s: 5, m: 8, l: 11, xl: 15, xxl: 20 }

interface Point {
  /** Coordonnées relatives à l'image (bornées) et en pixels à l'écran (non bornées). */
  x: number
  y: number
  px: number
  py: number
  w: number
  h: number
  inside: boolean
}

type Gesture =
  | { kind: 'draw' | 'move'; id: string; start: Point; base: Annotation; pointerId: number }
  | { kind: 'resize'; id: string; handle: HandleKind; start: Point; base: Annotation; pointerId: number; d0: number }
  | { kind: 'pan'; pointerId: number; x0: number; y0: number; v0: View }
  | { kind: 'pinch'; d0: number; m0: { x: number; y: number }; v0: View }
  // Un pincement vient de finir : les doigts encore posés ne dessinent pas.
  | { kind: 'wait' }

/** Réduit un tracé trop dense (un point sur deux, jusqu'à passer sous la limite). */
function thin(points: Array<[number, number]>): Array<[number, number]> {
  let out = points
  while (out.length > MAX_POINTS) out = out.filter((_, i) => i % 2 === 0 || i === out.length - 1)
  return out
}

const hasLabel = (a: Annotation) => a.type !== 'pen' && a.type !== 'highlight' && a.type !== 'blur'

function IconGlyph({ name, color = '#fff', className }: { name: string; color?: string; className?: string }) {
  return <span className={cn('inline-flex', className)} dangerouslySetInnerHTML={{ __html: iconSvg(name, color, 'width:100%;height:100%') }} />
}

/**
 * Annoter une photo, en plein écran, comme dans les outils d'annotation courants :
 * - une forme tracée reste sélectionnée : poignées pour l'étirer, la glisser pour la déplacer ;
 * - les deux bouts d'une flèche se tirent ; un numéro, une icône ou un texte s'agrandit par son coin ;
 * - pincer zoome dans l'image et la déplace (molette ou Ctrl + molette au bureau) ;
 * - annuler, rétablir et la sélection restent toujours visibles ; l'IA est en tête des outils ;
 * - au clavier : Ctrl+Z, Ctrl+Maj+Z, Suppr, Ctrl+D, flèches, [ et ], Échap, une lettre par outil.
 */
type AnnotatorProps = {
  onClose: () => void
  src: string
  step: Step
  value: Annotation[]
  onSave: (a: Annotation[]) => void
  /**
   * Chaque marque posée, déplacée ou retirée part tout de suite au brouillon : l'autre appareil la
   * voit apparaître sans attendre « Enregistrer ». Quitter sans enregistrer remet les marques d'avant.
   */
  onLive?: (a: Annotation[]) => void
}

export function Annotator({ open, ...props }: AnnotatorProps & { open: boolean }) {
  if (!open || typeof document === 'undefined') return null
  return createPortal(<AnnotatorScreen {...props} />, document.body)
}

/** Le dernier outil de dessin et son style, retenus sur l'appareil. */
const LAST_STYLE = 'clip_pref_annot_style'
type LastStyle = { tool?: AnnotationType; color?: AnnotationColor; size?: AnnotationSize; icon?: string; dashed?: boolean; filled?: boolean }
function readLastStyle(): LastStyle {
  try {
    const v = JSON.parse(readPref(LAST_STYLE) ?? '{}') as LastStyle
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

function AnnotatorScreen({ onClose, src, step, value, onSave, onLive }: AnnotatorProps) {
  const { ai } = useSession()
  const toast = useToast()
  const t = useMessages()
  const initial = useMemo(() => value.map(sanitizeAnnotation).filter((a): a is Annotation => !!a), [value])
  // Les marques à l'ouverture : ce que « quitter sans enregistrer » remet.
  const original = useRef(initial)
  const [history, setHistory] = useState<{ stack: Annotation[][]; index: number }>({ stack: [initial], index: 0 })
  const items = history.stack[history.index]
  const [live, setLiveState] = useState<Annotation[] | null>(null)
  const liveRef = useRef<Annotation[] | null>(null)
  const setLive = (next: Annotation[] | null) => {
    liveRef.current = next
    setLiveState(next)
  }
  const shown = live ?? items
  // À l'ouverture : la sélection si la photo a déjà des marques (on vient les ajuster) ; sinon le
  // dernier outil de dessin, avec sa couleur et sa taille (la flèche la première fois).
  const last = useMemo(readLastStyle, [])
  const [tool, setTool] = useState<Tool>(() => (initial.length ? 'select' : last.tool && DRAW_TOOLS.some((d) => d.value === last.tool) ? last.tool : 'arrow'))
  const [color, setColor] = useState<AnnotationColor>(() => (last.color && last.color in ANNOTATION_COLORS ? last.color : 'red'))
  const [size, setSize] = useState<AnnotationSize>(() => (last.size && SIZES.includes(last.size) ? last.size : 'm'))
  const [icon, setIcon] = useState<AnnotationIconKey>(() => ((ANNOTATION_ICON_KEYS as readonly string[]).includes(last.icon ?? '') ? (last.icon as AnnotationIconKey) : 'danger'))
  const [dashed, setDashed] = useState(!!last.dashed)
  const [filled, setFilled] = useState(!!last.filled)
  const drawTool = useRef<AnnotationType | undefined>(tool === 'select' ? last.tool : tool)
  if (tool !== 'select') drawTool.current = tool
  useEffect(() => {
    writePref(LAST_STYLE, JSON.stringify({ tool: drawTool.current, color, size, icon, dashed, filled }))
  }, [tool, color, size, icon, dashed, filled])
  // Chaque changement retenu part au brouillon (pas ceux en cours de tracé, ni l'ouverture).
  const onLiveRef = useRef(onLive)
  onLiveRef.current = onLive
  const opened = useRef(false)
  useEffect(() => {
    if (!opened.current) {
      opened.current = true
      return
    }
    onLiveRef.current?.(items)
  }, [items])
  const [selected, setSelected] = useState<string | null>(null)
  const [textEdit, setTextEdit] = useState<{ id?: string; x: number; y: number; value: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmQuit, setConfirmQuit] = useState(false)
  const [view, setViewState] = useState<View>(IDENTITY)
  const viewRef = useRef(view)
  const setView = (next: View | ((v: View) => View)) => {
    setViewState((v) => {
      const out = typeof next === 'function' ? next(v) : next
      viewRef.current = out
      return out
    })
  }
  const [box, setBox] = useState({ w: 1, h: 1 })
  const [cursor, setCursor] = useState('crosshair')
  const stage = useRef<HTMLDivElement>(null)
  const surface = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<Gesture | null>(null)
  const spaceDown = useRef(false)
  const selectedItem = selected ? (shown.find((a) => a.id === selected) ?? null) : null
  const dirty = history.index > 0
  const canUndo = history.index > 0
  const canRedo = history.index < history.stack.length - 1

  const commit = useCallback((next: Annotation[]) => {
    setHistory((h) => {
      const stack = [...h.stack.slice(0, h.index + 1), next].slice(-MAX_HISTORY)
      return { stack, index: stack.length - 1 }
    })
  }, [])
  const undo = () => setHistory((h) => ({ ...h, index: Math.max(0, h.index - 1) }))
  const redo = () => setHistory((h) => ({ ...h, index: Math.min(h.stack.length - 1, h.index + 1) }))
  const update = (id: string, patch: Partial<Annotation>) => commit(items.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const remove = (id: string) => {
    commit(items.filter((a) => a.id !== id))
    setSelected(null)
  }

  /** Quitter sans enregistrer : les marques d'avant reviennent (au brouillon aussi, si elles étaient parties). */
  const leave = useCallback(() => {
    onLiveRef.current?.(original.current)
    onClose()
  }, [onClose])
  const cancel = useCallback(() => {
    if (dirty) setConfirmQuit(true)
    else leave()
  }, [dirty, leave])

  // Page figée sous l'éditeur.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // La taille de l'image affichée (avant zoom) et du cadre : poignées, pastilles, bornes du zoom.
  useEffect(() => {
    const img = surface.current
    const frame = stage.current
    if (!img || !frame) return
    const measure = () => {
      setBox({ w: img.offsetWidth || 1, h: img.offsetHeight || 1 })
      setView((v) => clampView(v, frame.clientWidth, frame.clientHeight))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(img)
    ro.observe(frame)
    return () => ro.disconnect()
  }, [])

  // Molette : Ctrl (ou le pincement du pavé tactile) zoome autour du pointeur ; sinon on se déplace.
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 16 : 1
      const r = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) setView((v) => zoomAround(v, Math.exp(-e.deltaY * unit * 0.01), e.clientX - r.left, e.clientY - r.top, el.clientWidth, el.clientHeight))
      else setView((v) => clampView({ k: v.k, tx: v.tx - e.deltaX * unit, ty: v.ty - e.deltaY * unit }, el.clientWidth, el.clientHeight))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  function zoomBy(f: number) {
    const el = stage.current
    if (el) setView((v) => zoomAround(v, f, el.clientWidth / 2, el.clientHeight / 2, el.clientWidth, el.clientHeight))
  }

  function chooseTool(next: Tool) {
    setTool(next)
    if (next !== 'select') setSelected(null)
  }

  function applyStyle(patch: { color?: AnnotationColor; size?: AnnotationSize }) {
    if (patch.color) setColor(patch.color)
    if (patch.size) setSize(patch.size)
    // Une taille choisie remplace l'agrandissement libre d'une pastille ou d'un texte.
    if (selectedItem) update(selectedItem.id, patch.size && isPointLike(selectedItem) ? { ...patch, scale: undefined } : patch)
  }

  /** Pointillé ou rempli : pour la marque choisie, et pour les suivantes. */
  function applyLook(patch: { dashed?: boolean; filled?: boolean }) {
    if (patch.dashed !== undefined) setDashed(patch.dashed)
    if (patch.filled !== undefined) setFilled(patch.filled)
    if (selectedItem) update(selectedItem.id, Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v || undefined])))
  }

  function stepSize(dir: 1 | -1) {
    const i = SIZES.indexOf(selectedItem ? sizeOf(selectedItem) : size)
    applyStyle({ size: SIZES[Math.min(SIZES.length - 1, Math.max(0, i + dir))] })
  }

  function duplicate(a: Annotation) {
    const copy = translate({ ...a, id: uid('an_') }, 0.04, 0.04)
    commit([...items, copy])
    setSelected(copy.id)
  }

  function editText(a: Annotation) {
    setSelected(a.id)
    setTextEdit({ id: a.id, x: a.x, y: a.y, value: a.text ?? '' })
  }

  function confirmText() {
    if (!textEdit) return
    const text = textEdit.value.trim()
    if (textEdit.id) {
      const a = items.find((x) => x.id === textEdit.id)
      if (a?.type === 'text' && !text) remove(a.id)
      else update(textEdit.id, { text: text || undefined })
    } else if (text) {
      const created: Annotation = { id: uid('an_'), type: 'text', x: textEdit.x, y: textEdit.y, text, color, size }
      commit([...items, created])
      setSelected(created.id)
    }
    setTextEdit(null)
  }

  async function aiAnnotate() {
    setBusy(true)
    try {
      const marks = await annotateImage(ai, src, step)
      commit([...items, ...marks.map((m) => ({ ...m, size }))])
      chooseTool('select')
      toast.success(t.editorTools.annotator.ai.added, t.editorTools.annotator.ai.addedHint)
    } catch (e) {
      toast.error(t.editorTools.annotator.ai.failed, errorText(e))
    } finally {
      setBusy(false)
    }
  }

  // ——— Gestes ———

  function at(cx: number, cy: number): Point {
    const r = surface.current!.getBoundingClientRect()
    const px = cx - r.left
    const py = cy - r.top
    return { x: clamp01(px / r.width), y: clamp01(py / r.height), px, py, w: r.width, h: r.height, inside: px >= -16 && py >= -16 && px <= r.width + 16 && py <= r.height + 16 }
  }

  function handleUnder(a: Annotation, p: Point): HandleKind | null {
    for (const h of handlesOf(a, box.w, box.h)) if (Math.hypot(h.x * p.w - p.px, h.y * p.h - p.py) <= HANDLE_REACH) return h.kind
    return null
  }

  function startPinch() {
    const g = gesture.current
    if (g && (g.kind === 'draw' || g.kind === 'move' || g.kind === 'resize')) setLive(null) // le geste à un doigt est abandonné
    const [a, b] = [...pointers.current.values()]
    const r = stage.current!.getBoundingClientRect()
    gesture.current = { kind: 'pinch', d0: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), m0: { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top }, v0: viewRef.current }
  }

  function startPan(e: React.PointerEvent) {
    gesture.current = { kind: 'pan', pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, v0: viewRef.current }
  }

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button')) return
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return
    if (textEdit || confirmQuit) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) return startPinch()
    if (pointers.current.size > 2 || gesture.current) return
    // Bouton du milieu, ou barre d'espace tenue : on déplace la vue.
    if (e.button === 1 || (spaceDown.current && e.pointerType === 'mouse')) return startPan(e)

    const p = at(e.clientX, e.clientY)
    if (selectedItem) {
      const handle = handleUnder(selectedItem, p)
      if (handle) {
        const d0 = Math.max(12, Math.hypot(p.px - selectedItem.x * p.w, p.py - selectedItem.y * p.h))
        gesture.current = { kind: 'resize', id: selectedItem.id, handle, start: p, base: selectedItem, pointerId: e.pointerId, d0 }
        return
      }
      if (hitTest([selectedItem], p.px, p.py, p.w, p.h, 22, viewRef.current.k)) {
        gesture.current = { kind: 'move', id: selectedItem.id, start: p, base: selectedItem, pointerId: e.pointerId }
        return
      }
    }
    if (tool === 'select') {
      const id = hitTest(items, p.px, p.py, p.w, p.h, 22, viewRef.current.k)
      const base = id ? items.find((a) => a.id === id) : undefined
      setSelected(base?.id ?? null)
      if (base) gesture.current = { kind: 'move', id: base.id, start: p, base, pointerId: e.pointerId }
      else if (isZoomed(viewRef.current)) startPan(e)
      return
    }
    setSelected(null)
    if (!p.inside) {
      if (isZoomed(viewRef.current)) startPan(e)
      return
    }
    if (tool === 'text') {
      setTextEdit({ x: p.x, y: p.y, value: '' })
      return
    }
    const id = uid('an_')
    let base: Annotation
    if (tool === 'number') {
      const next = items.filter((a) => a.type === 'number').reduce((m, a) => Math.max(m, Number(a.text) || 0), 0) + 1
      base = { id, type: 'number', x: p.x, y: p.y, text: String(next), color, size }
    } else if (tool === 'icon') base = { id, type: 'icon', x: p.x, y: p.y, icon, color, size }
    else if (tool === 'pen' || tool === 'highlight') base = { id, type: tool, x: p.x, y: p.y, points: [[p.x, p.y]], color, size }
    else if (tool === 'arrow' || tool === 'line' || tool === 'measure') base = { id, type: tool, x: p.x, y: p.y, x2: p.x, y2: p.y, color, size }
    else base = { id, type: tool, x: p.x, y: p.y, w: 0, h: 0, color, size }
    if (dashed && canDash(base.type)) base.dashed = true
    if (filled && canFill(base.type)) base.filled = true
    gesture.current = { kind: 'draw', id, start: p, base, pointerId: e.pointerId }
    setLive([...items, base])
  }

  function drawTo(a: Annotation, s: Point, p: Point, shift: boolean): Annotation {
    // Un numéro ou une icône suit le doigt jusqu'à ce qu'on le lâche.
    if (a.type === 'number' || a.type === 'icon') return { ...a, x: p.x, y: p.y }
    if (a.points) {
      const last = a.points[a.points.length - 1]
      if (Math.hypot((p.x - last[0]) * p.w, (p.y - last[1]) * p.h) < 2.5) return a
      return { ...a, points: [...a.points, [p.x, p.y] as [number, number]] }
    }
    if (a.type === 'arrow' || a.type === 'line' || a.type === 'measure') {
      const end = shift ? snap45(s, p, p.w, p.h) : p
      return { ...a, x2: end.x, y2: end.y }
    }
    let ex = p.x
    let ey = p.y
    if (shift) {
      // Maj : un carré, un cercle.
      const dx = (p.x - s.x) * p.w
      const dy = (p.y - s.y) * p.h
      const d = Math.max(Math.abs(dx), Math.abs(dy))
      ex = clamp01(s.x + ((Math.sign(dx) || 1) * d) / p.w)
      ey = clamp01(s.y + ((Math.sign(dy) || 1) * d) / p.h)
    }
    return { ...a, x: Math.min(s.x, ex), y: Math.min(s.y, ey), w: Math.abs(ex - s.x), h: Math.abs(ey - s.y) }
  }

  function reshape(g: Extract<Gesture, { kind: 'resize' }>, p: Point, shift: boolean): Annotation {
    const a = g.base
    if (g.handle === 'start' || g.handle === 'end') {
      const other = g.handle === 'start' ? { x: a.x2 ?? a.x, y: a.y2 ?? a.y } : { x: a.x, y: a.y }
      return moveEnd(a, g.handle, shift ? snap45(other, p, p.w, p.h) : p)
    }
    if (g.handle === 'scale') return { ...a, scale: clampScale(scaleOf(a) * (Math.hypot(p.px - a.x * p.w, p.py - a.y * p.h) / g.d0)) }
    return resizeBy(a, g.handle, p)
  }

  function hover(e: React.PointerEvent) {
    if (!surface.current) return
    const p = at(e.clientX, e.clientY)
    const k = viewRef.current.k
    let c = spaceDown.current ? 'grab' : tool === 'select' ? (isZoomed(viewRef.current) ? 'grab' : 'default') : 'crosshair'
    const handle = selectedItem && !spaceDown.current ? handleUnder(selectedItem, p) : null
    if (handle) c = handle === 'nw' || handle === 'se' || handle === 'scale' ? 'nwse-resize' : handle === 'ne' || handle === 'sw' ? 'nesw-resize' : 'move'
    else if (!spaceDown.current && ((selectedItem && hitTest([selectedItem], p.px, p.py, p.w, p.h, 22, k)) || (tool === 'select' && hitTest(items, p.px, p.py, p.w, p.h, 22, k)))) c = 'move'
    if (c !== cursor) setCursor(c)
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (!g) {
      if (e.pointerType === 'mouse') hover(e)
      return
    }
    if (g.kind === 'wait') return
    const frame = stage.current!
    if (g.kind === 'pinch') {
      if (pointers.current.size < 2) return
      const [a, b] = [...pointers.current.values()]
      const r = frame.getBoundingClientRect()
      setView(pinchView(g.v0, g.d0, g.m0, Math.hypot(a.x - b.x, a.y - b.y), { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top }, frame.clientWidth, frame.clientHeight))
      return
    }
    if (g.pointerId !== e.pointerId) return
    if (g.kind === 'pan') {
      setView(clampView({ k: g.v0.k, tx: g.v0.tx + e.clientX - g.x0, ty: g.v0.ty + e.clientY - g.y0 }, frame.clientWidth, frame.clientHeight))
      return
    }
    const p = at(e.clientX, e.clientY)
    if (g.kind === 'move') {
      const moved = translate(g.base, p.x - g.start.x, p.y - g.start.y)
      setLive(items.map((a) => (a.id === g.id ? moved : a)))
    } else if (g.kind === 'resize') {
      setLive(items.map((a) => (a.id === g.id ? reshape(g, p, e.shiftKey) : a)))
    } else {
      const list = liveRef.current ?? [...items, g.base]
      setLive(list.map((a) => (a.id === g.id ? drawTo(a, g.start, p, e.shiftKey) : a)))
    }
  }

  function onUp(e: React.PointerEvent<HTMLDivElement>, cancelled = false) {
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    if (!g) return
    if (g.kind === 'pinch' || g.kind === 'wait') {
      gesture.current = pointers.current.size ? { kind: 'wait' } : null
      return
    }
    if (g.pointerId !== e.pointerId) return
    gesture.current = null
    if (g.kind === 'pan') return
    const list = liveRef.current
    setLive(null)
    if (!list || cancelled) return
    const a = list.find((x) => x.id === g.id)
    if (!a) return
    if (g.kind === 'move' || g.kind === 'resize') {
      if (JSON.stringify(a) !== JSON.stringify(g.base)) commit(list)
      return
    }
    // Un geste trop court (un toucher) ne laisse pas une forme invisible.
    const r = surface.current?.getBoundingClientRect()
    const W = r?.width ?? 1
    const H = r?.height ?? 1
    if (isSegment(a) && Math.hypot(((a.x2 ?? a.x) - a.x) * W, ((a.y2 ?? a.y) - a.y) * H) < 12) return
    if ((a.type === 'circle' || a.type === 'rect' || a.type === 'blur') && ((a.w ?? 0) * W < 10 || (a.h ?? 0) * H < 10)) return
    commit(list.map((x) => (x.id === a.id && x.points ? { ...x, points: thin(x.points) } : x)))
    // La forme tracée reste sélectionnée : ses poignées, sa taille et sa couleur sont à portée.
    if (a.type !== 'pen' && a.type !== 'highlight') setSelected(a.id)
    // Une distance tracée : on écrit sa valeur tout de suite (« 12 mm »).
    if (a.type === 'measure') setTextEdit({ id: a.id, x: a.x, y: a.y, value: a.text ?? '' })
  }

  function onDoubleClick(e: React.MouseEvent) {
    if (!surface.current) return
    const p = at(e.clientX, e.clientY)
    const id = hitTest(items, p.px, p.py, p.w, p.h, 22, viewRef.current.k)
    const a = id ? items.find((x) => x.id === id) : undefined
    if (a && hasLabel(a)) editText(a)
  }

  // Clavier (bureau).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, textarea')) return
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (e.key === ' ') {
        spaceDown.current = true
        if (!(e.target as HTMLElement | null)?.closest('button')) e.preventDefault()
        return
      }
      if (e.key === 'Escape') {
        if (confirmQuit) setConfirmQuit(false)
        else if (selected) setSelected(null)
        else cancel()
        return
      }
      if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (mod && key === 'y') {
        e.preventDefault()
        redo()
      } else if (mod && key === 'd') {
        e.preventDefault()
        if (selectedItem) duplicate(selectedItem)
      } else if (mod && (key === '=' || key === '+')) {
        e.preventDefault()
        zoomBy(1.25)
      } else if (mod && key === '-') {
        e.preventDefault()
        zoomBy(0.8)
      } else if (mod && key === '0') {
        e.preventDefault()
        setView(IDENTITY)
      } else if (mod || e.altKey) {
        return
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault()
        remove(selected)
      } else if (selectedItem && e.key.startsWith('Arrow')) {
        e.preventDefault()
        const n = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -n : e.key === 'ArrowRight' ? n : 0
        const dy = e.key === 'ArrowUp' ? -n : e.key === 'ArrowDown' ? n : 0
        update(selectedItem.id, translate(selectedItem, dx / box.w, dy / box.h))
      } else if (key === '[' || key === ']') {
        stepSize(key === ']' ? 1 : -1)
      } else if (e.key === 'Enter' && selectedItem && hasLabel(selectedItem)) {
        e.preventDefault()
        editText(selectedItem)
      } else if (TOOL_KEYS[key]) {
        chooseTool(TOOL_KEYS[key])
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') spaceDown.current = false
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('keyup', onKeyUp)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('keyup', onKeyUp)
    }
  })

  // ——— Barres ———

  const iconButton = 'btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white/85 hover:bg-white/10 disabled:opacity-30'

  const sizes = (
    <div className="flex shrink-0 items-center gap-0.5 rounded-2xl bg-white/5 p-1" role="radiogroup" aria-label={t.editorTools.annotator.size}>
      {SIZES.map((s) => {
        const active = (selectedItem ? sizeOf(selectedItem) : size) === s
        return (
          <button key={s} type="button" role="radio" aria-checked={active} aria-label={t.editorTools.annotator.sizeOption(t.editorTools.annotator.sizes[s])} title={t.editorTools.annotator.sizeHint(t.editorTools.annotator.sizes[s])} onClick={() => applyStyle({ size: s })} className={cn('btn-press flex h-10 w-9 items-center justify-center rounded-xl', active ? 'bg-white/25' : 'hover:bg-white/10')}>
            <span className="rounded-full bg-white" style={{ width: DOT[s], height: DOT[s] }} />
          </button>
        )
      })}
    </div>
  )

  const swatches = (
    <div className="flex shrink-0 items-center gap-1.5" role="radiogroup" aria-label={t.editorTools.annotator.color}>
      {COLOR_ORDER.map((c) => {
        const active = (selectedItem?.color ?? color) === c
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={t.editorTools.annotator.colorOption(t.editorTools.annotator.colors[c])}
            onClick={() => applyStyle({ color: c })}
            className={cn('btn-press h-9 w-9 shrink-0 rounded-full border-2', active ? 'border-white ring-2 ring-white/40' : 'border-white/25')}
            style={{ background: ANNOTATION_COLORS[c].fill }}
          />
        )
      })}
    </div>
  )

  // Pointillé (traits et formes) et rempli (cercle, cadre) : un aperçu du trait et un mot.
  const looks = (type: AnnotationType, isDashed: boolean, isFilled: boolean) => {
    const dash = canDash(type)
    const fill = canFill(type)
    if (!dash && !fill) return null
    const look = (on: boolean, label: string, preview: ReactNode, onClick: () => void) => (
      <button
        type="button"
        aria-pressed={on}
        onClick={onClick}
        className={cn('btn-press flex h-11 shrink-0 items-center gap-1.5 rounded-2xl px-3 text-sm font-black', on ? 'bg-white text-slate-900' : 'bg-white/10 text-white')}
      >
        {preview}
        {label}
      </button>
    )
    return (
      <>
        {dash &&
          look(
            isDashed,
            t.editorTools.annotator.styles.dashed,
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 4" />
            </svg>,
            () => applyLook({ dashed: !isDashed }),
          )}
        {fill &&
          look(
            isFilled,
            t.editorTools.annotator.styles.filled,
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <rect x="4" y="5" width="16" height="14" rx="3" fill="currentColor" fillOpacity=".35" stroke="currentColor" strokeWidth="2.5" />
            </svg>,
            () => applyLook({ filled: !isFilled }),
          )}
        <span className="mx-0.5 h-6 w-px shrink-0 bg-white/15" />
      </>
    )
  }

  const toolTile = (value: Tool, label: string, icon: ReactNode, key: string) => (
    <button
      key={value}
      type="button"
      aria-pressed={tool === value}
      title={t.editorTools.annotator.toolHint(label, key.toUpperCase())}
      onClick={() => chooseTool(value)}
      className={cn('btn-press flex h-14 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-black', tool === value ? 'bg-gradient-primary shadow-primary text-white' : 'text-white/75 hover:bg-white/10')}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950 text-white select-none" role="dialog" aria-modal="true" aria-label={t.editorTools.annotator.title}>
      <header className="pt-safe flex shrink-0 items-center gap-1 px-2 py-2">
        <button type="button" onClick={cancel} aria-label={t.editorTools.annotator.closeWithoutSaving} title={t.editorTools.annotator.closeHint} className={iconButton}>
          <X className="h-6 w-6" />
        </button>
        <span className="mx-1 h-6 w-px shrink-0 bg-white/15" />
        <button type="button" onClick={undo} disabled={!canUndo} aria-label={t.editorTools.annotator.undo} title={t.editorTools.annotator.undoHint} className={iconButton}>
          <Undo2 className="h-5 w-5" />
        </button>
        <button type="button" onClick={redo} disabled={!canRedo} aria-label={t.editorTools.annotator.redo} title={t.editorTools.annotator.redoHint} className={iconButton}>
          <Redo2 className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1" />
        <button
          type="button"
          onClick={() => {
            onSave(items)
            onClose()
          }}
          className="btn-press bg-gradient-primary shadow-primary h-11 shrink-0 rounded-2xl px-4 text-sm font-black text-white"
        >
          {t.common.save}
        </button>
      </header>

      <div
        ref={stage}
        className="relative min-h-0 flex-1 touch-none overflow-hidden [-webkit-touch-callout:none]"
        style={{ cursor }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={(e) => onUp(e)}
        onPointerCancel={(e) => onUp(e, true)}
        onDoubleClick={onDoubleClick}
      >
        <div className="absolute inset-0 origin-top-left px-2 pb-2" style={{ transform: `translate3d(${view.tx}px, ${view.ty}px, 0) scale(${view.k})` }}>
          <AnnotatedImage src={src} annotations={shown} className="rounded-2xl" blink={false}>
            <div ref={surface} className="absolute inset-0" />
            {selectedItem && !textEdit && <SelectionFrame a={selectedItem} box={box} k={view.k} />}
          </AnnotatedImage>
        </div>
        {isZoomed(view) && (
          <button type="button" onClick={() => setView(IDENTITY)} aria-label={t.editorTools.annotator.wholeImage} title={t.editorTools.annotator.wholeImageHint} className="btn-press absolute top-3 right-3 flex h-10 items-center gap-1.5 rounded-full bg-slate-900/85 px-3 text-xs font-black text-white shadow-lg ring-1 ring-white/15 tabular-nums">
            <ZoomOut className="h-4 w-4" /> {t.editorTools.annotator.zoom(Math.round(view.k * 100))}
          </button>
        )}
      </div>

      {confirmQuit && (
        <div className="animate-slide-up absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center gap-2 border-t border-white/10 bg-slate-900 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" role="alertdialog" aria-label={t.editorTools.annotator.leaveTitle}>
          <p className="min-w-0 flex-1 text-sm font-black">{t.editorTools.annotator.leaveQuestion}</p>
          <button type="button" onClick={() => setConfirmQuit(false)} className="btn-press h-11 rounded-2xl px-3 text-sm font-black text-white/80 hover:bg-white/10">
            {t.editorTools.annotator.stay}
          </button>
          <button type="button" onClick={leave} className="btn-press h-11 rounded-2xl bg-rose-500 px-4 text-sm font-black text-white">
            {t.editorTools.annotator.leave}
          </button>
        </div>
      )}

      {textEdit && (
        <form
          className="animate-slide-up kb-bottom absolute inset-x-0 bottom-0 z-10 flex gap-2 border-t border-white/10 bg-slate-900 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-slate-900"
          onSubmit={(e) => {
            e.preventDefault()
            confirmText()
          }}
        >
          <Input
            autoFocus
            value={textEdit.value}
            onChange={(e) => setTextEdit({ ...textEdit, value: e.target.value })}
            placeholder={items.find((a) => a.id === textEdit.id)?.type === 'measure' ? t.editorTools.annotator.measurePlaceholder : t.editorTools.annotator.textPlaceholder}
            aria-label={t.editorTools.annotator.textLabel}
            className="h-12"
            wrapperClassName="flex-1"
          />
          <button type="submit" className="btn-press bg-gradient-primary h-12 shrink-0 rounded-2xl px-4 text-sm font-black text-white">
            {t.editorTools.annotator.textOk}
          </button>
          <button type="button" onClick={() => setTextEdit(null)} className="btn-press h-12 shrink-0 rounded-2xl px-3 text-sm font-black text-white/80 hover:bg-white/10">
            {t.common.cancel}
          </button>
        </form>
      )}

      <footer className="pb-safe shrink-0 space-y-2 border-t border-white/10 bg-slate-900/95 px-2 pt-2">
        {/* Les options gardent toujours la même hauteur : choisir ou lâcher une marque ne fait pas
            bouger l'image (et les marques avec elle). */}
        <div className="flex h-[6.25rem] flex-col justify-end gap-2" data-testid="annotator-options">
        {selectedItem ? (
          <>
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-1">
              <button type="button" onClick={() => remove(selectedItem.id)} title={t.editorTools.annotator.deleteHint} className="btn-press flex h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-rose-500 px-3 text-sm font-black">
                <Trash2 className="h-4 w-4" /> {t.common.delete}
              </button>
              <button type="button" onClick={() => duplicate(selectedItem)} title={t.editorTools.annotator.duplicateHint} className="btn-press flex h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-white/10 px-3 text-sm font-black">
                <Copy className="h-4 w-4" /> {t.editorTools.annotator.duplicate}
              </button>
              {hasLabel(selectedItem) && (
                <button type="button" onClick={() => editText(selectedItem)} title={t.editorTools.annotator.editTextHint} className="btn-press flex h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-white/10 px-3 text-sm font-black">
                  <Type className="h-4 w-4" /> {selectedItem.type === 'text' || selectedItem.type === 'number' ? t.editorTools.annotator.editText : t.editorTools.annotator.editCaption}
                </button>
              )}
            </div>
            {selectedItem.type !== 'blur' && (
              <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-1">
                {looks(selectedItem.type, !!selectedItem.dashed, !!selectedItem.filled)}
                {sizes}
                {swatches}
              </div>
            )}
          </>
        ) : tool === 'select' ? (
          <p className="px-2 py-2.5 text-xs font-bold text-white/65">{t.editorTools.annotator.selectHint}</p>
        ) : (
          <>
            {tool === 'icon' && (
              <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-1" role="radiogroup" aria-label={t.editorTools.annotator.iconPicker}>
                {ANNOTATION_ICON_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={icon === k}
                    aria-label={t.editorTools.annotator.icons[k]}
                    title={t.editorTools.annotator.icons[k]}
                    onClick={() => setIcon(k)}
                    className={cn('btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2', icon === k ? 'border-white' : 'border-transparent')}
                    style={{ background: ANNOTATION_COLORS[color].fill }}
                  >
                    <IconGlyph name={k} color={inkOn(color)} className="h-6 w-6" />
                  </button>
                ))}
              </div>
            )}
            {tool === 'blur' ? (
              <p className="px-2 py-2.5 text-xs font-bold text-white/65">{t.editorTools.annotator.blurHint}</p>
            ) : (
              <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-1">
                {looks(tool, dashed, filled)}
                {sizes}
                {swatches}
              </div>
            )}
          </>
        )}
        </div>
        {/* La sélection et l'IA restent visibles ; les outils de dessin défilent à côté. */}
        <div className="flex items-center gap-1 pb-1">
          {toolTile('select', t.editorTools.annotator.tools.select, <MousePointer2 className="h-5 w-5" />, 'v')}
          <button
            type="button"
            onClick={() => void aiAnnotate()}
            disabled={busy}
            title={t.editorTools.annotator.ai.hint}
            className="btn-press bg-gradient-accent shadow-accent flex h-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-3 text-[10px] font-black whitespace-nowrap text-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            <span>{BILLING_V2 ? t.editorTools.annotator.ai.cost(AI_COSTS.annotate) : t.editorTools.annotator.ai.button}</span>
          </button>
          <span className="mx-0.5 h-8 w-px shrink-0 bg-white/15" />
          <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" role="toolbar" aria-label={t.editorTools.annotator.drawingTools}>
            {DRAW_TOOLS.map((d) => toolTile(d.value, t.editorTools.annotator.tools[d.value], d.icon, d.key))}
          </div>
        </div>
      </footer>
    </div>
  )
}

/** Le cadre pointillé et les poignées de la marque sélectionnée ; les poignées gardent leur taille au zoom. */
function SelectionFrame({ a, box, k }: { a: Annotation; box: { w: number; h: number }; k: number }) {
  let frame: CSSProperties | null = null
  if (isPointLike(a)) {
    const { hw, hh } = pointHalf(a, box.w)
    frame = { left: `${a.x * 100}%`, top: `${a.y * 100}%`, width: 2 * hw + 12, height: 2 * hh + 12, transform: 'translate(-50%, -50%)' }
  } else if (!isSegment(a)) {
    const b = bbox(a)
    frame = { left: `${b.x1 * 100}%`, top: `${b.y1 * 100}%`, width: `${(b.x2 - b.x1) * 100}%`, height: `${(b.y2 - b.y1) * 100}%` }
  }
  return (
    <>
      {frame && <span className="pointer-events-none absolute rounded-lg border-dashed border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]" style={{ ...frame, borderWidth: 2 / k }} />}
      {handlesOf(a, box.w, box.h).map((h) => (
        <span
          key={h.kind}
          className="pointer-events-none absolute rounded-full border-[var(--primary)] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.5)]"
          style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%`, width: 20 / k, height: 20 / k, borderWidth: 3 / k, transform: 'translate(-50%, -50%)' }}
        />
      ))}
    </>
  )
}

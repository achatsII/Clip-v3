'use client'

import { ArrowUpRight, Circle, Copy, EyeOff, Hash, Highlighter, Loader2, Minus, Move, Pencil, Redo2, Sparkles, Square, Sticker, Trash2, Type, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AiCost } from '@/components/billing/AiCost'
import { AnnotatedImage } from '@/components/media/MediaView'
import { useSession } from '@/components/providers/Session'
import { Input } from '@/components/ui/Field'
import { errorText } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { annotateImage } from '@/lib/ai/assist'
import { ANNOTATION_ICONS, ANNOTATION_ICON_KEYS, type AnnotationIconKey } from '@/lib/annotations/icons'
import { iconSvg } from '@/lib/annotations/markup'
import { ANNOTATION_COLORS, COLOR_ORDER, SIZES, SIZE_LABEL, bbox, clamp01, hitTest, inkOn, sanitizeAnnotation, translate } from '@/lib/annotations/model'
import { uid } from '@/lib/model/repo'
import type { Annotation, AnnotationColor, AnnotationSize, AnnotationType, Step } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'

type Tool = 'select' | AnnotationType

const TOOLS: Array<{ value: Tool; label: string; icon: ReactNode }> = [
  { value: 'select', label: 'Déplacer', icon: <Move className="h-5 w-5" /> },
  { value: 'pen', label: 'Crayon', icon: <Pencil className="h-5 w-5" /> },
  { value: 'highlight', label: 'Surligneur', icon: <Highlighter className="h-5 w-5" /> },
  { value: 'arrow', label: 'Flèche', icon: <ArrowUpRight className="h-5 w-5" /> },
  { value: 'line', label: 'Ligne', icon: <Minus className="h-5 w-5" /> },
  { value: 'circle', label: 'Cercle', icon: <Circle className="h-5 w-5" /> },
  { value: 'rect', label: 'Cadre', icon: <Square className="h-5 w-5" /> },
  { value: 'text', label: 'Texte', icon: <Type className="h-5 w-5" /> },
  { value: 'number', label: 'Numéro', icon: <Hash className="h-5 w-5" /> },
  { value: 'icon', label: 'Icônes', icon: <Sticker className="h-5 w-5" /> },
  { value: 'blur', label: 'Flouter', icon: <EyeOff className="h-5 w-5" /> },
]

const MAX_HISTORY = 60
const MAX_POINTS = 600

interface Point {
  x: number
  y: number
  px: number
  py: number
  w: number
  h: number
}

/** Réduit un tracé trop dense (un point sur deux, jusqu'à passer sous la limite). */
function thin(points: Array<[number, number]>): Array<[number, number]> {
  let out = points
  while (out.length > MAX_POINTS) out = out.filter((_, i) => i % 2 === 0 || i === out.length - 1)
  return out
}

function IconGlyph({ name, color = '#fff', className }: { name: string; color?: string; className?: string }) {
  return <span className={cn('inline-flex', className)} dangerouslySetInnerHTML={{ __html: iconSvg(name, color, 'width:100%;height:100%') }} />
}

/**
 * Annoter une photo, en plein écran : crayon, surligneur, flèche, ligne, cercle, cadre, texte,
 * numéros, icônes de sécurité et zone floutée ; couleurs et épaisseurs ; déplacer, dupliquer,
 * supprimer, annuler et rétablir. Pensé pour le doigt (téléphone, tablette) autant que la souris.
 */
export function Annotator({ open, onClose, src, step, value, onSave }: { open: boolean; onClose: () => void; src: string; step: Step; value: Annotation[]; onSave: (a: Annotation[]) => void }) {
  if (!open || typeof document === 'undefined') return null
  return createPortal(<AnnotatorScreen onClose={onClose} src={src} step={step} value={value} onSave={onSave} />, document.body)
}

function AnnotatorScreen({ onClose, src, step, value, onSave }: { onClose: () => void; src: string; step: Step; value: Annotation[]; onSave: (a: Annotation[]) => void }) {
  const { ai } = useSession()
  const toast = useToast()
  const initial = useMemo(() => value.map(sanitizeAnnotation).filter((a): a is Annotation => !!a), [value])
  const [history, setHistory] = useState<{ stack: Annotation[][]; index: number }>({ stack: [initial], index: 0 })
  const items = history.stack[history.index]
  const [live, setLiveState] = useState<Annotation[] | null>(null)
  const liveRef = useRef<Annotation[] | null>(null)
  const setLive = (next: Annotation[] | null) => {
    liveRef.current = next
    setLiveState(next)
  }
  const shown = live ?? items
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState<AnnotationColor>('red')
  const [size, setSize] = useState<AnnotationSize>('m')
  const [icon, setIcon] = useState<AnnotationIconKey>('danger')
  const [selected, setSelected] = useState<string | null>(null)
  const [textEdit, setTextEdit] = useState<{ id?: string; x: number; y: number; value: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const surface = useRef<HTMLDivElement>(null)
  const gesture = useRef<{ kind: 'draw' | 'move'; start: Point; id: string; base: Annotation; pointerId: number } | null>(null)
  const selectedItem = selected ? shown.find((a) => a.id === selected) ?? null : null
  const dirty = history.index > 0

  const commit = useCallback((next: Annotation[]) => {
    setHistory((h) => {
      const stack = [...h.stack.slice(0, h.index + 1), next].slice(-MAX_HISTORY)
      return { stack, index: stack.length - 1 }
    })
  }, [])
  const undo = () => {
    setSelected(null)
    setHistory((h) => ({ ...h, index: Math.max(0, h.index - 1) }))
  }
  const redo = () => setHistory((h) => ({ ...h, index: Math.min(h.stack.length - 1, h.index + 1) }))
  const update = (id: string, patch: Partial<Annotation>) => commit(items.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const remove = (id: string) => {
    commit(items.filter((a) => a.id !== id))
    setSelected(null)
  }

  const [confirmQuit, setConfirmQuit] = useState(false)
  const cancel = useCallback(() => {
    if (dirty) setConfirmQuit(true)
    else onClose()
  }, [dirty, onClose])

  // Page figée sous l'éditeur ; Échap, Suppr, Ctrl+Z au clavier.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, textarea')) return
      if (e.key === 'Escape') cancel()
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selected) remove(selected)
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') (e.shiftKey ? redo : undo)()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  function at(e: React.PointerEvent): Point {
    const r = surface.current!.getBoundingClientRect()
    const px = e.clientX - r.left
    const py = e.clientY - r.top
    return { x: clamp01(px / r.width), y: clamp01(py / r.height), px, py, w: r.width, h: r.height }
  }

  function place(a: Omit<Annotation, 'id' | 'color' | 'size'>) {
    const created: Annotation = { id: uid('an_'), color, size, ...a }
    commit([...items, created])
    return created
  }

  function down(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (gesture.current) return // un deuxième doigt ne dessine pas
    const p = at(e)
    if (tool === 'select') {
      const id = hitTest(items, p.px, p.py, p.w, p.h)
      setSelected(id)
      const base = id ? items.find((a) => a.id === id) : undefined
      if (id && base) {
        e.currentTarget.setPointerCapture(e.pointerId)
        gesture.current = { kind: 'move', start: p, id, base, pointerId: e.pointerId }
      }
      return
    }
    setSelected(null)
    if (tool === 'number') {
      const next = items.filter((a) => a.type === 'number').reduce((m, a) => Math.max(m, Number(a.text) || 0), 0) + 1
      place({ type: 'number', x: p.x, y: p.y, text: String(next) })
      return
    }
    if (tool === 'icon') {
      place({ type: 'icon', x: p.x, y: p.y, icon })
      return
    }
    if (tool === 'text') {
      setTextEdit({ x: p.x, y: p.y, value: '' })
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    const id = uid('an_')
    const base: Annotation =
      tool === 'pen' || tool === 'highlight'
        ? { id, type: tool, x: p.x, y: p.y, points: [[p.x, p.y]], color, size }
        : tool === 'arrow' || tool === 'line'
          ? { id, type: tool, x: p.x, y: p.y, x2: p.x, y2: p.y, color, size }
          : { id, type: tool, x: p.x, y: p.y, w: 0, h: 0, color, size }
    gesture.current = { kind: 'draw', start: p, id, base, pointerId: e.pointerId }
    setLive([...items, base])
  }

  function move(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current
    if (!g || e.pointerId !== g.pointerId) return
    const p = at(e)
    if (g.kind === 'move') {
      const moved = translate(g.base, p.x - g.start.x, p.y - g.start.y)
      setLive(items.map((a) => (a.id === g.id ? moved : a)))
      return
    }
    const list = liveRef.current ?? items
    setLive(
      list.map((a) => {
        if (a.id !== g.id) return a
        if (a.points) {
          const last = a.points[a.points.length - 1]
          if (Math.hypot((p.x - last[0]) * p.w, (p.y - last[1]) * p.h) < 2.5) return a
          return { ...a, points: [...a.points, [p.x, p.y] as [number, number]] }
        }
        if (a.type === 'arrow' || a.type === 'line') return { ...a, x2: p.x, y2: p.y }
        const s = g.start
        return { ...a, x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) }
      }),
    )
  }

  function up(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current
    if (!g || e.pointerId !== g.pointerId) return
    gesture.current = null
    const list = liveRef.current
    setLive(null)
    if (!list) return
    const a = list.find((x) => x.id === g.id)
    if (!a) return
    const r = surface.current?.getBoundingClientRect()
    const W = r?.width ?? 1
    const H = r?.height ?? 1
    if (g.kind === 'move') {
      const b0 = bbox(g.base)
      const b1 = bbox(a)
      if (Math.abs(b1.x1 - b0.x1) * W > 1 || Math.abs(b1.y1 - b0.y1) * H > 1) commit(list)
      return
    }
    // Un geste trop court (un toucher) ne laisse pas une forme invisible.
    if ((a.type === 'arrow' || a.type === 'line') && Math.hypot(((a.x2 ?? a.x) - a.x) * W, ((a.y2 ?? a.y) - a.y) * H) < 12) return
    if ((a.type === 'circle' || a.type === 'rect' || a.type === 'blur') && ((a.w ?? 0) * W < 10 || (a.h ?? 0) * H < 10)) return
    commit(list.map((x) => (x.id === a.id && x.points ? { ...x, points: thin(x.points) } : x)))
  }

  function applyStyle(patch: { color?: AnnotationColor; size?: AnnotationSize }) {
    if (patch.color) setColor(patch.color)
    if (patch.size) setSize(patch.size)
    if (selectedItem) update(selectedItem.id, patch)
  }

  function duplicate(a: Annotation) {
    const copy = translate({ ...a, id: uid('an_') }, 0.04, 0.04)
    commit([...items, copy])
    setSelected(copy.id)
  }

  function confirmText() {
    if (!textEdit) return
    const text = textEdit.value.trim()
    if (textEdit.id) update(textEdit.id, { text: text || undefined })
    else if (text) place({ type: 'text', x: textEdit.x, y: textEdit.y, text })
    setTextEdit(null)
  }

  async function aiAnnotate() {
    setBusy(true)
    try {
      const marks = await annotateImage(ai, src, step)
      commit([...items, ...marks.map((m) => ({ ...m, size }))])
      toast.success('Marques ajoutées par l’IA', 'Touchez « Déplacer » pour les ajuster ou les retirer.')
    } catch (e) {
      toast.error('L’IA n’a pas pu annoter', errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const sel = selectedItem ? bbox(selectedItem) : null
  const pointLike = selectedItem && (selectedItem.type === 'number' || selectedItem.type === 'icon' || selectedItem.type === 'text' || (sel && sel.x1 === sel.x2 && sel.y1 === sel.y2))
  const labelled = selectedItem && selectedItem.type !== 'pen' && selectedItem.type !== 'highlight' && selectedItem.type !== 'blur'

  const swatches = (
    <div className="flex shrink-0 items-center gap-1.5">
      {COLOR_ORDER.map((c) => {
        const active = (selectedItem?.color ?? color) === c
        return (
          <button
            key={c}
            type="button"
            aria-label={`Couleur ${ANNOTATION_COLORS[c].label}`}
            aria-pressed={active}
            onClick={() => applyStyle({ color: c })}
            className={cn('btn-press h-9 w-9 shrink-0 rounded-full border-2', active ? 'border-white ring-2 ring-white/40' : 'border-white/25')}
            style={{ background: ANNOTATION_COLORS[c].fill }}
          />
        )
      })}
    </div>
  )
  const sizes = (
    <div className="flex shrink-0 items-center gap-1 rounded-2xl bg-white/5 p-1">
      {SIZES.map((s) => {
        const active = (selectedItem?.size ?? size) === s
        return (
          <button key={s} type="button" aria-label={`Épaisseur : ${SIZE_LABEL[s]}`} aria-pressed={active} onClick={() => applyStyle({ size: s })} className={cn('btn-press flex h-9 w-10 items-center justify-center rounded-xl', active ? 'bg-white/20' : 'hover:bg-white/10')}>
            <span className="rounded-full bg-white" style={{ width: s === 's' ? 6 : s === 'm' ? 10 : 15, height: s === 's' ? 6 : s === 'm' ? 10 : 15 }} />
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950 text-white select-none" role="dialog" aria-modal="true" aria-label="Annoter l’image">
      <header className="pt-safe flex shrink-0 items-center gap-2 px-3 py-2">
        <button type="button" onClick={cancel} className="btn-press h-11 rounded-2xl px-3 text-sm font-black text-white/80 hover:bg-white/10">
          Annuler
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-black text-white/70">{TOOLS.find((t) => t.value === tool)?.label}</p>
        <button
          type="button"
          onClick={() => {
            onSave(items)
            onClose()
          }}
          className="btn-press bg-gradient-primary shadow-primary h-11 rounded-2xl px-4 text-sm font-black text-white"
        >
          Enregistrer
        </button>
      </header>

      <div className="relative min-h-0 flex-1 px-2 pb-2">
        <AnnotatedImage src={src} annotations={shown} className="rounded-2xl">
          <div
            ref={surface}
            className={cn('absolute inset-0 touch-none', tool === 'select' ? 'cursor-grab' : 'cursor-crosshair')}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          />
          {sel && (
            <div
              className="pointer-events-none absolute rounded-xl border-2 border-dashed border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
              style={
                pointLike
                  ? { left: `${sel.x1 * 100}%`, top: `${sel.y1 * 100}%`, width: 64, height: 64, transform: 'translate(-50%, -50%)' }
                  : { left: `calc(${sel.x1 * 100}% - 8px)`, top: `calc(${sel.y1 * 100}% - 8px)`, width: `calc(${(sel.x2 - sel.x1) * 100}% + 16px)`, height: `calc(${(sel.y2 - sel.y1) * 100}% + 16px)` }
              }
            />
          )}
        </AnnotatedImage>
      </div>

      {confirmQuit && (
        <div className="animate-slide-up absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center gap-2 border-t border-white/10 bg-slate-900 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" role="alertdialog" aria-label="Quitter sans enregistrer ?">
          <p className="min-w-0 flex-1 text-sm font-black">Quitter sans enregistrer les annotations ?</p>
          <button type="button" onClick={() => setConfirmQuit(false)} className="btn-press h-11 rounded-2xl px-3 text-sm font-black text-white/80 hover:bg-white/10">
            Rester
          </button>
          <button type="button" onClick={onClose} className="btn-press h-11 rounded-2xl bg-rose-500 px-4 text-sm font-black text-white">
            Quitter
          </button>
        </div>
      )}

      {textEdit && (
        <form
          className="animate-slide-up absolute inset-x-0 bottom-0 z-10 flex gap-2 border-t border-white/10 bg-slate-900 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-slate-900"
          onSubmit={(e) => {
            e.preventDefault()
            confirmText()
          }}
        >
          <Input autoFocus value={textEdit.value} onChange={(e) => setTextEdit({ ...textEdit, value: e.target.value })} placeholder="Texte à afficher (ex. Vis A, 25 N·m)" aria-label="Texte de l’annotation" className="h-12" wrapperClassName="flex-1" />
          <button type="submit" className="btn-press bg-gradient-primary h-12 shrink-0 rounded-2xl px-4 text-sm font-black text-white">
            OK
          </button>
          <button type="button" onClick={() => setTextEdit(null)} className="btn-press h-12 shrink-0 rounded-2xl px-3 text-sm font-black text-white/80 hover:bg-white/10">
            Annuler
          </button>
        </form>
      )}

      <footer className="pb-safe shrink-0 space-y-2 border-t border-white/10 bg-slate-900/95 px-2 pt-2">
        {selectedItem ? (
          <>
            <div className="flex items-center gap-2 px-1">
              <button type="button" onClick={() => remove(selectedItem.id)} className="btn-press flex h-11 items-center gap-1.5 rounded-2xl bg-rose-500 px-3 text-sm font-black">
                <Trash2 className="h-4 w-4" /> Supprimer
              </button>
              <button type="button" onClick={() => duplicate(selectedItem)} className="btn-press flex h-11 items-center gap-1.5 rounded-2xl bg-white/10 px-3 text-sm font-black">
                <Copy className="h-4 w-4" /> Dupliquer
              </button>
              {labelled && (
                <button type="button" onClick={() => setTextEdit({ id: selectedItem.id, x: selectedItem.x, y: selectedItem.y, value: selectedItem.text ?? '' })} className="btn-press flex h-11 items-center gap-1.5 rounded-2xl bg-white/10 px-3 text-sm font-black">
                  <Type className="h-4 w-4" /> {selectedItem.type === 'text' || selectedItem.type === 'number' ? 'Texte' : 'Légende'}
                </button>
              )}
            </div>
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-1">
              {swatches}
              {selectedItem.type !== 'blur' && sizes}
            </div>
          </>
        ) : (
          <>
            {tool === 'icon' && (
              <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-1" role="radiogroup" aria-label="Icône à poser">
                {ANNOTATION_ICON_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={icon === k}
                    aria-label={ANNOTATION_ICONS[k].label}
                    title={ANNOTATION_ICONS[k].label}
                    onClick={() => setIcon(k)}
                    className={cn('btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2', icon === k ? 'border-white' : 'border-transparent')}
                    style={{ background: ANNOTATION_COLORS[color].fill }}
                  >
                    <IconGlyph name={k} color={inkOn(color)} className="h-6 w-6" />
                  </button>
                ))}
              </div>
            )}
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-1">
              {swatches}
              {tool !== 'blur' && tool !== 'select' && sizes}
              {tool === 'select' && <p className="shrink-0 px-1 text-xs font-bold text-white/60">Touchez une marque pour la déplacer ou la modifier.</p>}
            </div>
          </>
        )}
        <div className="no-scrollbar flex items-center gap-1 overflow-x-auto px-1 pb-1" role="toolbar" aria-label="Outils">
          {TOOLS.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={tool === t.value}
              onClick={() => {
                setTool(t.value)
                if (t.value !== 'select') setSelected(null)
              }}
              className={cn('btn-press flex h-14 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-black', tool === t.value ? 'bg-gradient-primary shadow-primary text-white' : 'text-white/75 hover:bg-white/10')}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          <span className="mx-1 h-8 w-px shrink-0 bg-white/15" />
          <button type="button" onClick={undo} disabled={history.index === 0} aria-label="Annuler la dernière action" className="btn-press flex h-14 w-12 shrink-0 items-center justify-center rounded-2xl text-white/80 hover:bg-white/10 disabled:opacity-30">
            <Undo2 className="h-5 w-5" />
          </button>
          <button type="button" onClick={redo} disabled={history.index >= history.stack.length - 1} aria-label="Rétablir" className="btn-press flex h-14 w-12 shrink-0 items-center justify-center rounded-2xl text-white/80 hover:bg-white/10 disabled:opacity-30">
            <Redo2 className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => void aiAnnotate()} disabled={busy} className="btn-press flex h-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-3 text-[10px] font-black text-sky-300 hover:bg-white/10 disabled:opacity-50">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            <span>
              IA <AiCost operation="annotate" />
            </span>
          </button>
        </div>
      </footer>
    </div>
  )
}

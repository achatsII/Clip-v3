'use client'

import { ArrowUpRight, Circle, Hash, Loader2, Sparkles, Square, Trash2, Type, Undo2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { AnnotatedImage } from '@/components/media/MediaView'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { errorText } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import { AiCost } from '@/components/billing/AiCost'
import { annotateImage } from '@/lib/ai/assist'
import { uid } from '@/lib/model/repo'
import type { Annotation, Step } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'

type Tool = Annotation['type']
const TOOLS: Array<{ value: Tool; label: string; icon: React.ReactNode }> = [
  { value: 'arrow', label: 'Flèche', icon: <ArrowUpRight className="h-5 w-5" /> },
  { value: 'circle', label: 'Cercle', icon: <Circle className="h-5 w-5" /> },
  { value: 'rect', label: 'Cadre', icon: <Square className="h-5 w-5" /> },
  { value: 'number', label: 'Numéro', icon: <Hash className="h-5 w-5" /> },
  { value: 'text', label: 'Texte', icon: <Type className="h-5 w-5" /> },
]
const PALETTE: Annotation['color'][] = ['red', 'yellow', 'green', 'blue', 'white']
const SWATCH: Record<Annotation['color'], string> = { red: '#FF2B5E', yellow: '#FFC800', green: '#18c480', blue: '#0078FF', white: '#ffffff' }

export function Annotator({ open, onClose, src, step, value, onSave }: { open: boolean; onClose: () => void; src: string; step: Step; value: Annotation[]; onSave: (a: Annotation[]) => void }) {
  const { ai } = useSession()
  const toast = useToast()
  const [items, setItems] = useState<Annotation[]>(value)
  const [tool, setTool] = useState<Tool>('arrow')
  const [color, setColor] = useState<Annotation['color']>('red')
  const [draft, setDraft] = useState<Annotation | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [textAt, setTextAt] = useState<{ x: number; y: number } | null>(null)
  const [textValue, setTextValue] = useState('')
  const surface = useRef<HTMLDivElement>(null)
  const start = useRef<{ x: number; y: number } | null>(null)

  const rel = (e: React.PointerEvent) => {
    const r = surface.current!.getBoundingClientRect()
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }
  }

  function down(e: React.PointerEvent) {
    const p = rel(e)
    if (tool === 'number') {
      const n = items.filter((i) => i.type === 'number').length + 1
      setItems((l) => [...l, { id: uid('an_'), type: 'number', x: p.x, y: p.y, text: String(n), color }])
      return
    }
    if (tool === 'text') {
      setTextAt(p)
      setTextValue('')
      return
    }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    start.current = p
    setDraft(tool === 'arrow' ? { id: uid('an_'), type: 'arrow', x: p.x, y: p.y, x2: p.x, y2: p.y, color } : { id: uid('an_'), type: tool, x: p.x, y: p.y, w: 0, h: 0, color })
  }

  function move(e: React.PointerEvent) {
    if (!draft || !start.current) return
    const p = rel(e)
    const s = start.current
    if (draft.type === 'arrow') setDraft({ ...draft, x2: p.x, y2: p.y })
    else setDraft({ ...draft, x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) })
  }

  function up() {
    if (draft) {
      const tiny = draft.type === 'arrow' ? Math.hypot((draft.x2 ?? 0) - draft.x, (draft.y2 ?? 0) - draft.y) < 0.02 : (draft.w ?? 0) < 0.015 || (draft.h ?? 0) < 0.015
      if (!tiny) setItems((l) => [...l, draft])
    }
    setDraft(null)
    start.current = null
  }

  async function aiAnnotate() {
    setBusy(true)
    try {
      const marks = await annotateImage(ai, src, step)
      setItems((l) => [...l, ...marks])
      toast.success('Marques ajoutées par l’IA', 'Déplacez-les ou retirez-les au besoin.')
    } catch (e) {
      toast.error('L’IA n’a pas pu annoter', errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Annoter l’image"
      footer={
        <>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            onClick={() => {
              onSave(items)
              onClose()
            }}
          >
            Enregistrer les annotations
          </Button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {TOOLS.map((t) => (
          <button key={t.value} type="button" onClick={() => setTool(t.value)} className={cn('btn-press flex h-11 items-center gap-1.5 rounded-2xl px-3 text-sm font-black', tool === t.value ? 'bg-gradient-primary text-white shadow-primary' : 'glass-card')}>
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
        <span className="mx-1 h-8 w-px bg-slate-900/10 dark:bg-white/10" />
        {PALETTE.map((c) => (
          <button key={c} type="button" aria-label={`Couleur ${c}`} onClick={() => setColor(c)} className={cn('btn-press h-9 w-9 rounded-full border-2', color === c ? 'border-slate-900 dark:border-white' : 'border-white/70')} style={{ background: SWATCH[c] }} />
        ))}
        <span className="flex-1" />
        <Button size="sm" onClick={() => setItems((l) => l.slice(0, -1))} disabled={!items.length} icon={<Undo2 className="h-4 w-4" />}>
          Annuler
        </Button>
        {selected && (
          <Button
            size="sm"
            variant="danger"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={() => {
              setItems((l) => l.filter((i) => i.id !== selected))
              setSelected(null)
            }}
          >
            Retirer
          </Button>
        )}
        <Button size="sm" variant="primary" loading={busy} icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} onClick={aiAnnotate}>
          Annoter avec l’IA <AiCost operation="annotate" />
        </Button>
      </div>
      {textAt && (
        <form
          className="animate-slide-up mb-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const text = textValue.trim()
            if (text) setItems((l) => [...l, { id: uid('an_'), type: 'arrow', x: textAt.x, y: textAt.y, x2: textAt.x, y2: textAt.y, text, color }])
            setTextAt(null)
          }}
        >
          <input autoFocus value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder="Texte à afficher (ex. Vis A)" className="glass-input h-11 flex-1 rounded-2xl px-4 text-sm font-bold" />
          <Button type="submit" size="sm" variant="primary">
            Ajouter
          </Button>
          <Button size="sm" onClick={() => setTextAt(null)}>
            Annuler
          </Button>
        </form>
      )}
      <div className="relative h-[60dvh] overflow-hidden rounded-[24px] bg-slate-900">
        <AnnotatedImage src={src} annotations={[...items, ...(draft ? [draft] : [])]}>
          <div ref={surface} className="absolute inset-0 cursor-crosshair touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        </AnnotatedImage>
      </div>
      {!!items.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((a, i) => (
            <button key={a.id} type="button" onClick={() => setSelected(selected === a.id ? null : a.id)} className={cn('btn-press flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-black', selected === a.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'glass-card')}>
              <span className="h-3 w-3 rounded-full" style={{ background: SWATCH[a.color] }} />
              {a.text || TOOLS.find((t) => t.value === a.type)?.label} {i + 1}
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}

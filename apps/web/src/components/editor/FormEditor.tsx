'use client'

import { ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, GripVertical, ImageOff, Plus, TriangleAlert, Wrench } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { CategoryIcon } from '@/components/icons'
import { mediaThumb } from '@/components/media/MediaView'
import { Button } from '@/components/ui/Button'
import type { MenuItem } from '@/components/ui/Menu'
import { useMessages } from '@/lib/i18n'
import { CATEGORIES, WARNINGS } from '@/lib/model/catalog'
import { liveChecks } from '@/lib/model/checks'
import { placeStep, sectionGroups } from '@/lib/model/sections'
import type { Step } from '@/lib/model/types'
import { useWide } from '@/lib/ui/screen'
import { cn } from '@/lib/util/cn'
import { AssistMenu, EditorHeader, iconButton, QuestionsPill, ViewMenu } from './EditorBar'
import { FormCard, ToolsGrid } from './FormParts'
import type { StageEditorProps } from './StageEditor'
import { useStepAssist } from './StepAssist'
import { StepForm } from './StepForm'
import type { StepActions } from './StepParts'

/** Une instruction sans étape : l'assistant de l'étape n'a rien à retoucher. */
const NO_STEP: Step = { id: '', title: '', text: '', keyPoints: [], warning: null, media: [] }

export interface FormEditorProps extends StageEditorProps {
  /** Les champs de l'instruction entière (titre, résumé, postes, fiche, cadenassage), en cartes. */
  info: ReactNode
  /** Les outils de l'instruction (aperçu, partager, traduire, historique, exports…), à découvert. */
  tools: MenuItem[]
  /** L'éditeur amène la fiche quelque part (l'assistant, un lien) : une étape, ou l'instruction (null). */
  focus: { stepId: string | null; key: number } | null
  /** Au téléphone : on arrive sur la liste des étapes, ou directement sur l'étape (`step`). */
  startOn: 'list' | 'step'
  /** Combien de postes affichent l'instruction (la ligne sous son titre, dans la liste). */
  stationCount: number
  /** Un bloc commun : il ne va à aucun poste. */
  block?: boolean
}

type Pane = 'step' | 'instruction'

type Inner = FormEditorProps & {
  assist: ReturnType<typeof useStepAssist>
  pane: Pane
  namingSection: boolean
  setNamingSection: (on: boolean) => void
  open: (id: string) => void
  openInstruction: () => void
}

/**
 * La vue « Fiche » : la liste des étapes, et tout ce qu'on peut faire à découvert, rangé en cartes.
 * Au bureau, la liste à gauche (l'instruction en tête, puis chaque étape) et à droite ce qu'on a
 * choisi ; au téléphone, la liste, puis l'étape touchée, avec ses voisines sous le pouce. L'en-tête
 * est celui de « Comme au poste » : on change de vue sans rien perdre.
 */
export function FormEditor(props: FormEditorProps) {
  const wide = useWide()
  const [pane, setPane] = useState<Pane>(props.step ? 'step' : 'instruction')
  // Au téléphone : la liste, ou ce qu'on a ouvert.
  const [detail, setDetail] = useState(props.startOn === 'step' && !!props.step)
  const [namingSection, setNamingSection] = useState(false)
  const assist = useStepAssist({ content: props.content, step: props.step ?? NO_STEP, onApply: props.onChange })

  // L'éditeur amène la fiche à une étape (l'assistant y travaille) ou à l'instruction.
  const focusKey = props.focus?.key
  useEffect(() => {
    if (!props.focus) return
    setPane(props.focus.stepId ? 'step' : 'instruction')
    setDetail(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seule une nouvelle demande compte
  }, [focusKey])
  // Une instruction sans étape n'a que son panneau.
  useEffect(() => {
    if (!props.step) setPane('instruction')
  }, [props.step])

  const p: Inner = {
    ...props,
    // Le titre ouvre le panneau de l'instruction, ici, plutôt qu'une fenêtre.
    top: { ...props.top, onInfo: () => openInstruction() },
    assist,
    pane,
    namingSection,
    setNamingSection,
    open,
    openInstruction,
    // Une étape ajoutée ou copiée s'ouvre aussitôt ; supprimée, on revient à la liste (téléphone).
    onInsertAfter: () => {
      props.onInsertAfter()
      setPane('step')
      setDetail(true)
    },
    onAddEnd: () => {
      props.onAddEnd()
      setPane('step')
      setDetail(true)
    },
    onDuplicate: () => {
      props.onDuplicate()
      setPane('step')
    },
    onDelete: () => {
      props.onDelete()
      if (!wide) setDetail(false)
    },
  }
  function open(id: string) {
    props.onSelect(id)
    setPane('step')
    setDetail(true)
  }
  function openInstruction() {
    setPane('instruction')
    setDetail(true)
  }
  return (
    <>
      {wide ? <FormCanvas {...p} /> : <FormPhone {...p} detail={detail} onList={() => setDetail(false)} />}
      {assist.element}
    </>
  )
}

function actionsOf(p: Inner): StepActions {
  return { steps: p.content.steps, index: p.index, sections: p.sections, onSteps: p.onSteps, onInsertAfter: p.onInsertAfter, onDuplicate: p.onDuplicate, onMove: p.onMove, onDelete: p.onDelete, onNamingSection: p.setNamingSection }
}

/** Ce qui est ouvert : l'étape choisie, ou l'instruction entière. */
function OpenPane({ p }: { p: Inner }) {
  const t = useMessages()
  if (p.pane === 'instruction' || !p.step) {
    return (
      <div className="space-y-4">
        {p.info}
        <FormCard icon={<Wrench className="h-4 w-4" />} title={t.editor.form.tools} hint={t.editor.form.toolsHint}>
          <ToolsGrid items={p.tools} />
        </FormCard>
        {!p.step && !p.readOnly && (
          <Button variant="primary" block onClick={p.onAddEnd} icon={<Plus className="h-5 w-5" />}>
            {t.editor.stage.firstStep}
          </Button>
        )}
      </div>
    )
  }
  return (
    <StepForm
      {...actionsOf(p)}
      content={p.content}
      step={p.step}
      sources={p.sources}
      readOnly={p.readOnly}
      records={p.records}
      assist={p.assist}
      agentWorking={p.agentWorking}
      remoteNote={p.remoteNote}
      feedbackNote={p.feedbackNote}
      namingSection={p.namingSection}
      onChange={p.onChange}
      onSourceAdded={p.onSourceAdded}
      onAssistant={p.onAssistant}
    />
  )
}

/** L'instruction, en tête de la liste : son titre, et ce qui la décrit en une ligne. */
function InstructionItem({ p, active }: { p: Inner; active: boolean }) {
  const t = useMessages()
  const { content } = p
  return (
    <button type="button" onClick={p.openInstruction} aria-current={active ? 'true' : undefined} className={cn('btn-press flex w-full items-center gap-3 rounded-[22px] p-2 pr-3 text-left transition', active ? 'bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-2 ring-[var(--primary)] dark:bg-slate-800' : 'glass-card')}>
      <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white', CATEGORIES[content.category].tile)}>
        <CategoryIcon category={content.category} className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="label-caps block text-[var(--primary-strong)] dark:text-sky-300">{t.editor.form.instruction}</span>
        <span className="block truncate text-sm font-black text-slate-900 dark:text-white">{content.title.trim() || t.editor.page.info.untitled}</span>
        <span className="block truncate text-xs font-bold text-slate-500">{p.block ? t.editor.form.blockLine(content.steps.length) : t.editor.form.instructionLine(content.steps.length, p.stationCount)}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
    </button>
  )
}

/** Une étape dans la liste : sa vignette, son action, et ce qui la distingue ; sa poignée pour la glisser. */
function StepItem({ p, step, index, active, drag }: { p: Inner; step: Step; index: number; active: boolean; drag: Drag }) {
  const t = useMessages()
  const thumb = mediaThumb(step.media[0])
  const change = p.changes?.[step.id]
  const fb = p.feedbackByStep?.[step.id] ?? 0
  const checks = p.records ? liveChecks(step).length : 0
  const ref = useRef<HTMLDivElement>(null)
  // L'étape ouverte reste visible dans la liste (l'assistant, un autre appareil, les flèches).
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [active])
  const dragging = drag.state?.from === index
  // Une étape d'un bloc commun ne se déplace pas seule, comme dans l'autre vue.
  const movable = !p.readOnly && !step.fromBlock && p.content.steps.length > 1
  return (
    <div
      ref={ref}
      data-step-index={index}
      style={dragging ? { transform: `translateY(${drag.state!.dy}px)` } : undefined}
      className={cn(
        'relative flex items-center rounded-[22px] transition-shadow',
        // Glissée, la carte devient pleine : l'étape dessous ne se voit pas au travers.
        active || dragging ? 'bg-white dark:bg-slate-800' : 'glass-card',
        active && !dragging && 'shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-2 ring-[var(--primary)]',
        active && p.agentWorking && 'ring-violet-400',
        dragging && 'z-10 shadow-[0_20px_40px_rgba(15,23,42,0.22)] ring-2 ring-[var(--primary)]',
      )}
    >
      <button type="button" onClick={() => p.open(step.id)} aria-current={active ? 'step' : undefined} className={cn('btn-press flex min-w-0 flex-1 items-center gap-3 rounded-[22px] p-2 text-left', !movable && 'pr-3')}>
        <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-200 dark:bg-slate-700">
          {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} /> : <span className="flex h-full w-full items-center justify-center text-slate-400" title={t.editor.form.noMedia}><ImageOff className="h-5 w-5" /></span>}
          <span className="absolute top-1 left-1 flex h-6 min-w-6 items-center justify-center rounded-lg bg-black/60 px-1 text-xs font-black text-white tabular-nums">{index + 1}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('line-clamp-2 text-sm leading-snug font-black', step.title.trim() ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400')}>{step.title.trim() || t.editor.form.untitled}</span>
          {(step.warning || change === 'added' || change === 'modified' || fb > 0 || step.fromBlock || checks > 0) && (
            <span className="mt-1 flex flex-wrap gap-1">
              {step.warning && (
                <span className={cn('inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-black uppercase', step.warning.level === 'danger' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200' : step.warning.level === 'caution' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200' : 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200')}>
                  <TriangleAlert className="h-3 w-3" /> {WARNINGS[step.warning.level].label}
                </span>
              )}
              {checks > 0 && (
                <span className="bg-primary-soft inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-black text-[var(--primary-strong)] uppercase dark:text-sky-300">
                  <ClipboardCheck className="h-3 w-3" /> {t.editor.form.checksCount(checks)}
                </span>
              )}
              {change === 'added' && <span className="rounded-lg bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-700 uppercase dark:bg-emerald-500/20 dark:text-emerald-200">{t.editor.stepList.added}</span>}
              {change === 'modified' && <span className="rounded-lg bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800 uppercase dark:bg-amber-500/20 dark:text-amber-200">{t.editor.stepList.modified}</span>}
              {step.fromBlock && <span className="rounded-lg bg-violet-600 px-1.5 py-0.5 text-[10px] font-black text-white uppercase">{t.blocks.thumb}</span>}
              {fb > 0 && <span className="rounded-lg bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white uppercase">{t.editor.stepList.feedback(fb)}</span>}
            </span>
          )}
        </span>
      </button>
      {/* La poignée : on la tient pour glisser l'étape, à la souris comme au doigt (le reste ouvre l'étape). */}
      {movable && (
        <span {...drag.handle(index)} title={t.editor.form.dragHint} aria-hidden className="flex h-14 w-9 shrink-0 cursor-grab touch-none items-center justify-center self-stretch rounded-r-[22px] text-slate-300 hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400">
          <GripVertical className="h-5 w-5" />
        </span>
      )}
    </div>
  )
}

/** Une étape qu'on glisse : d'où elle part, où elle va, et de combien elle a bougé à l'écran. */
interface DragState {
  from: number
  to: number
  endOfPrevious: boolean
  dy: number
  /** Le trait qui montre où elle tombera, depuis le haut de la liste. */
  line: number
}
interface Drag {
  state: DragState | null
  handle: (index: number) => { onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void; onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void; onPointerUp: () => void; onPointerCancel: () => void }
}

/** Ce qui défile autour de la liste : sa colonne au bureau, la page au téléphone. */
function scrollerOf(el: HTMLElement): HTMLElement | null {
  for (let n = el.parentElement; n; n = n.parentElement) {
    const o = getComputedStyle(n).overflowY
    if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight) return n
  }
  return null
}

/**
 * Glisser une étape par sa poignée, à la souris comme au doigt (événements de pointeur : le
 * glisser-déposer du navigateur ne marche ni sur un bouton ni au doigt). On mesure la liste au
 * départ ; l'étape suit le pointeur, un trait montre où elle tombera, et la liste défile près des
 * bords. Lâchée, elle prend sa place et rejoint la section où on l'a déposée (`placeStep`).
 */
function useDrag(listRef: React.RefObject<HTMLDivElement | null>, onDrop: (from: number, to: number, endOfPrevious: boolean) => void): Drag {
  const [state, setState] = useState<DragState | null>(null)
  const live = useRef<{ from: number; startY: number; startScroll: number; scroller: HTMLElement | null; items: Array<{ index: number; top: number; bottom: number }>; headers: Array<{ start: number; mid: number }>; state: DragState } | null>(null)
  const scrollTop = (s: HTMLElement | null) => (s ? s.scrollTop : window.scrollY)

  function start(index: number, e: ReactPointerEvent<HTMLElement>) {
    const list = listRef.current
    if (!list || (e.pointerType === 'mouse' && e.button !== 0)) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const base = list.getBoundingClientRect().top
    const items = [...list.querySelectorAll<HTMLElement>('[data-step-index]')].map((el) => {
      const r = el.getBoundingClientRect()
      return { index: Number(el.dataset.stepIndex), top: r.top - base, bottom: r.bottom - base }
    })
    const headers = [...list.querySelectorAll<HTMLElement>('[data-section-start]')].map((el) => {
      const r = el.getBoundingClientRect()
      return { start: Number(el.dataset.sectionStart), mid: (r.top + r.bottom) / 2 - base }
    })
    const me = items.find((it) => it.index === index)
    const scroller = scrollerOf(list)
    const first: DragState = { from: index, to: index, endOfPrevious: false, dy: 0, line: me ? me.top - 4 : 0 }
    live.current = { from: index, startY: e.clientY, startScroll: scrollTop(scroller), scroller, items, headers, state: first }
    setState(first)
  }

  function move(e: ReactPointerEvent<HTMLElement>) {
    const d = live.current
    const list = listRef.current
    if (!d || !list) return
    // Près d'un bord, la liste défile pour aller chercher une étape plus loin.
    const view = d.scroller ? d.scroller.getBoundingClientRect() : { top: 0, bottom: window.innerHeight }
    const edge = e.clientY < view.top + 56 ? -14 : e.clientY > view.bottom - 56 ? 14 : 0
    if (edge) {
      if (d.scroller) d.scroller.scrollTop += edge
      else window.scrollBy(0, edge)
    }
    const y = e.clientY - list.getBoundingClientRect().top
    const others = d.items.filter((it) => it.index !== d.from)
    let k = others.findIndex((it) => y < (it.top + it.bottom) / 2)
    if (k < 0) k = others.length
    const next = others[k]
    const header = next ? d.headers.find((h) => h.start === next.index) : undefined
    // Au-dessus du titre d'une section : à la fin de la section d'avant ; dessous : au début de la sienne.
    const endOfPrevious = !!header && k > 0 && y < header.mid
    const line = endOfPrevious || !next ? (others[k - 1]?.bottom ?? 0) + 4 : next.top - 4
    d.state = { from: d.from, to: k, endOfPrevious, dy: e.clientY - d.startY + (scrollTop(d.scroller) - d.startScroll), line }
    setState(d.state)
  }

  function end(drop: boolean) {
    const d = live.current
    live.current = null
    setState(null)
    if (drop && d && (d.state.to !== d.from || d.state.endOfPrevious)) onDrop(d.from, d.state.to, d.state.endOfPrevious)
  }

  return {
    state,
    handle: (index) => ({ onPointerDown: (e) => start(index, e), onPointerMove: move, onPointerUp: () => end(true), onPointerCancel: () => end(false) }),
  }
}

/** La liste : l'instruction en tête, puis les étapes, regroupées par section ; on les glisse pour les réordonner. */
function Outline({ p, addAtEnd = true }: { p: Inner; addAtEnd?: boolean }) {
  const t = useMessages()
  const { content } = p
  const groups = p.sections ? sectionGroups(content.steps) : [{ name: null, start: 0, end: content.steps.length }]
  const instructionActive = p.pane === 'instruction' || !p.step
  const listRef = useRef<HTMLDivElement>(null)
  const drag = useDrag(listRef, (from, to, endOfPrevious) => {
    const next = placeStep(content.steps, from, to, endOfPrevious)
    if (next !== content.steps) p.onSteps(next)
  })
  const moving = drag.state && (drag.state.to !== drag.state.from || drag.state.endOfPrevious)
  return (
    <nav aria-label={t.editor.form.outline} className="space-y-2">
      <InstructionItem p={p} active={instructionActive} />
      <div ref={listRef} className={cn('relative space-y-2', drag.state && 'select-none')}>
        {groups.map((g) => (
          <div key={g.start} className="space-y-2">
            {g.name && (
              <p data-section-start={g.start} className="label-caps px-2 pt-2 text-[var(--primary-strong)] dark:text-sky-300">
                {g.name}
              </p>
            )}
            {content.steps.slice(g.start, g.end).map((s, k) => (
              <StepItem key={s.id} p={p} step={s} index={g.start + k} active={!instructionActive && s.id === p.step?.id} drag={drag} />
            ))}
          </div>
        ))}
        {/* Où l'étape tombera si on la lâche maintenant. */}
        {moving && <span className="pointer-events-none absolute inset-x-2 z-20 h-1 -translate-y-1/2 rounded-full bg-[var(--primary)] shadow-[0_0_0_3px_rgba(var(--primary-rgb),0.2)]" style={{ top: drag.state!.line }} aria-hidden />}
      </div>
      {addAtEnd && !p.readOnly && (
        <button type="button" onClick={p.onAddEnd} className="btn-press flex h-14 w-full items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-slate-300 text-sm font-black text-slate-500 hover:border-[var(--primary)] hover:text-[var(--primary)] dark:border-slate-600">
          <Plus className="h-4 w-4" /> {t.editor.form.addStep}
        </button>
      )}
    </nav>
  )
}

/** Au bureau : la liste à gauche, ce qu'on a choisi à droite. */
function FormCanvas(p: Inner) {
  const t = useMessages()
  const panel = useRef<HTMLDivElement>(null)
  const shown = p.pane === 'instruction' || !p.step ? 'instruction' : p.step.id
  // Chaque choix s'ouvre en haut de sa fiche.
  useLayoutEffect(() => {
    panel.current?.scrollTo({ top: 0 })
  }, [shown])
  return (
    <div className={cn('fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-50 dark:bg-slate-950', p.agentOpen ? 'right-[424px]' : 'right-0')} role="region" aria-label={t.editor.stage.region}>
      <EditorHeader wide top={p.top} readOnly={p.readOnly} history={p.history} badge={p.badge} assist={p.pane === 'step' && p.step && !p.step.fromBlock ? p.assist : null} showAssist onAssistant={p.onAssistant} agentOpen={p.agentOpen} />
      <div className="flex min-h-0 flex-1">
        <aside className="w-[300px] shrink-0 overflow-y-auto overscroll-contain border-r border-slate-900/5 bg-white/40 p-3 xl:w-[340px] dark:border-white/5 dark:bg-slate-900/40">
          <Outline p={p} />
        </aside>
        <div ref={panel} className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-4 p-6 xl:p-8">
            {p.notices && <div className="space-y-2">{p.notices}</div>}
            <OpenPane p={p} />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Au téléphone : la liste des étapes, puis l'étape touchée en entier. Sous le pouce, la vue et
 * l'Assistant ; sur une étape, la précédente, la liste et la suivante.
 */
function FormPhone(p: Inner & { detail: boolean; onList: () => void }) {
  const t = useMessages()
  const { step, readOnly, top } = p
  const showing = p.detail ? (p.pane === 'instruction' || !step ? 'instruction' : step.id) : 'list'
  // Chaque écran s'ouvre en haut ; revenu à la liste, l'étape qu'on quitte reste en vue.
  useLayoutEffect(() => {
    if (showing === 'list') document.querySelector('[aria-current="step"]')?.scrollIntoView({ block: 'center' })
    else window.scrollTo({ top: 0 })
  }, [showing])
  const total = p.content.steps.length
  const onStep = p.detail && p.pane === 'step' && !!step
  const prev = p.content.steps[p.index - 1]
  const next = p.content.steps[p.index + 1]
  return (
    <div className="pb-28">
      <EditorHeader wide={false} top={p.top} readOnly={readOnly} badge={p.badge} assist={null} showAssist={false} onAssistant={p.onAssistant} />
      <div className="space-y-3 px-3 pt-3">
        {top.questions > 0 && !readOnly && <QuestionsPill top={top} className="w-full justify-center" />}
        {p.detail && p.notices}
        {p.detail ? <OpenPane p={p} /> : <Outline p={p} addAtEnd={false} />}
      </div>

      {/* Sous le pouce ; la barre se cache pendant qu'on écrit. */}
      <nav className="glass-nav pb-safe kb-hide fixed inset-x-0 bottom-0 z-30 border-t" aria-label={t.editor.stage.stepsNav}>
        <div className="mx-auto flex max-w-2xl items-center gap-1.5 px-2 py-2">
          {top.views && <ViewMenu views={top.views} />}
          {onStep ? (
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <button type="button" onClick={() => prev && p.open(prev.id)} disabled={!prev} aria-label={t.editor.stage.previous} className={iconButton}>
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={p.onList} className="btn-press flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900/5 px-3 text-sm font-black dark:bg-white/10">
                <span className="truncate">{t.editor.step.of(p.index + 1, total)}</span> <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
              <button type="button" onClick={() => next && p.open(next.id)} disabled={!next} aria-label={t.editor.stage.next} className={iconButton}>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          ) : p.detail ? (
            <button type="button" onClick={p.onList} className="btn-press flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900/5 px-3 text-sm font-black dark:bg-white/10">
              <ChevronLeft className="h-4 w-4 shrink-0" /> <span className="truncate">{t.editor.form.allSteps}</span>
            </button>
          ) : !readOnly ? (
            <button type="button" onClick={p.onAddEnd} className="btn-press bg-primary-soft flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-black text-[var(--primary-strong)] dark:text-sky-300">
              <Plus className="h-4 w-4 shrink-0" /> <span className="truncate">{t.editor.form.addStep}</span>
            </button>
          ) : (
            <span className="flex-1" />
          )}
          {!readOnly && <AssistMenu assist={onStep && step && !step.fromBlock ? p.assist : null} onAssistant={p.onAssistant} compact side="up" />}
        </div>
      </nav>
    </div>
  )
}

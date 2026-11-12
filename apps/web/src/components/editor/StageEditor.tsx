'use client'

import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, ImagePlus, Loader2, MessageCircle, MessageCircleQuestion, MoreHorizontal, PencilLine, Plus, Radio, Sparkles, Trash2, TriangleAlert, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { mediaThumb } from '@/components/media/MediaView'
import { StepMediaArea } from '@/components/player/StepMediaArea'
import { Button } from '@/components/ui/Button'
import { AutoTextarea } from '@/components/ui/Field'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { Modal } from '@/components/ui/Modal'
import type { DraftHistory } from '@/hooks/useDraftHistory'
import { useMessages, type Messages } from '@/lib/i18n'
import { WARNINGS } from '@/lib/model/catalog'
import type { StepChange } from '@/lib/model/diff'
import type { InstructionContent, Source, Step, WarningLevel } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'
import { ASSIST_ACTIONS, useStepAssist } from './StepAssist'
import { StepMediaEditor } from './StepMediaEditor'
import { UndoButtons } from './UndoControls'

/** Un texte modifiable qui garde l'allure du lecteur : on le touche, on écrit. */
const editable = 'w-full rounded-xl bg-transparent transition hover:bg-slate-900/[0.03] focus:bg-white/80 focus:ring-4 focus:ring-[rgba(var(--primary-rgb),0.18)] focus:outline-none dark:hover:bg-white/5 dark:focus:bg-slate-900/60'
const iconButton = 'btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-slate-600 hover:bg-slate-900/5 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-white/10'

const WIDE = '(min-width: 1024px)'
const subscribeWide = (cb: () => void) => {
  const m = window.matchMedia(WIDE)
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}
/** Un écran d'ordinateur (ou une tablette à l'horizontale) : la vue du poste en grand. */
function useWide() {
  return useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => false)
}

/** Une instruction sans étape : l'assistant de l'étape n'a rien à retoucher. */
const NO_STEP: Step = { id: '', title: '', text: '', keyPoints: [], warning: null, media: [] }

/** L'en-tête de l'instruction : ce qui la concerne en entier, et rien d'autre. */
export interface StageTop {
  /** Son titre ; le toucher ouvre ses infos (titre, résumé, postes, fiche). */
  title: string
  /** Où elle en est : publication et enregistrement. */
  status: ReactNode
  statusTone?: 'live' | 'error'
  /** L'action principale (publier, demander l'approbation, approuver) ; rien quand tout est publié. */
  primary: (compact: boolean) => ReactNode
  /** Le reste, rangé dans « … ». */
  menu: MenuItem[]
  onInfo: () => void
  /** Les points que l'IA demande de vérifier : une pastille qui ouvre les questions. */
  questions: number
  onQuestions: () => void
}

export interface StageEditorProps {
  content: InstructionContent
  /** Absente : l'instruction n'a pas encore d'étape. */
  step: Step | undefined
  index: number
  sources: Source[]
  readOnly?: boolean
  agentWorking?: boolean
  /** Le panneau de l'assistant est ouvert à droite : la vue lui laisse sa place. */
  agentOpen?: boolean
  top: StageTop
  /** Les bandeaux sous l'en-tête : approbation demandée, modification sur un autre appareil. */
  notices?: ReactNode
  /** Annuler et rétablir (dans l'en-tête, sur ordinateur ; la pastille du pouce au téléphone). */
  history?: DraftHistory
  /** Le témoin du direct. */
  badge?: ReactNode
  /** Un autre appareil vient de changer cette étape : on le dit, et l'étape s'encadre. */
  remoteNote?: string | null
  /** Ce qu'un opérateur a signalé sur cette étape. */
  feedbackNote?: string | null
  feedbackByStep?: Record<string, number>
  /** En approbation : les étapes nouvelles ou modifiées depuis la version publiée. */
  changes?: Record<string, StepChange>
  /** Ouvre la conversation avec l'assistant. */
  onAssistant: () => void
  onChange: (s: Step) => void
  onSelect: (id: string) => void
  onInsertAfter: () => void
  /** Ajouter une étape à la fin (bande des étapes, première étape). */
  onAddEnd: () => void
  onSourceAdded: (s: Source) => void
  onMove: (dir: -1 | 1) => void
  onDuplicate: () => void
  onDelete: () => void
}

/**
 * L'éditeur : l'étape telle que l'opérateur la verra, et chaque texte se modifie là où il est. Ce
 * qui touche l'instruction entière est en haut (titre, état, assistant, « … », publier) ; ce qui
 * touche l'étape est à côté d'elle (son « … », le média sous l'image) ; les étapes sont en bas.
 * Sur ordinateur, en plein écran, dans la mise en page exacte du poste ; sur téléphone, la vue du
 * téléphone, les étapes sous le pouce. Le média se règle dans une fenêtre.
 */
export function StageEditor(props: StageEditorProps) {
  const t = useMessages()
  const wide = useWide()
  const [mediaOpen, setMediaOpen] = useState(false)
  const assist = useStepAssist({ content: props.content, step: props.step ?? NO_STEP, onApply: props.onChange })
  const p: Inner = { ...props, assist, openMedia: () => setMediaOpen(true) }
  return (
    <>
      {wide ? <StageCanvas {...p} /> : <StagePhone {...p} />}
      {assist.element}
      {props.step && (
        <Modal open={mediaOpen} onClose={() => setMediaOpen(false)} size="lg" title={t.editor.stage.mediaTitle(props.index + 1)}>
          <StepMediaEditor content={props.content} step={props.step} sources={props.sources} readOnly={props.readOnly} onChange={props.onChange} onSourceAdded={props.onSourceAdded} />
        </Modal>
      )}
    </>
  )
}

type Inner = StageEditorProps & { assist: ReturnType<typeof useStepAssist>; openMedia: () => void }

/** Les actions sur l'étape, dans son « … » : média, ajout, copie, déplacement, suppression. */
function stepMenu(p: Inner, step: Step, t: Messages): MenuItem[] {
  const total = p.content.steps.length
  return [
    { label: step.media.length ? t.editor.stage.editMedia : t.editor.stage.addMedia, icon: <ImagePlus className="h-4 w-4" />, onClick: p.openMedia },
    { label: t.editor.step.addAfter, icon: <Plus className="h-4 w-4" />, onClick: p.onInsertAfter },
    { label: t.editor.step.duplicate, icon: <Copy className="h-4 w-4" />, onClick: p.onDuplicate },
    { label: t.editor.stage.moveBefore, icon: <ArrowLeft className="h-4 w-4" />, onClick: () => p.onMove(-1), hidden: p.index === 0 },
    { label: t.editor.stage.moveAfter, icon: <ArrowRight className="h-4 w-4" />, onClick: () => p.onMove(1), hidden: p.index >= total - 1 },
    { label: t.editor.step.delete, icon: <Trash2 className="h-4 w-4" />, onClick: p.onDelete, danger: true, divider: true },
  ]
}

function BackLink() {
  const t = useMessages()
  return (
    <Link href="/instructions" aria-label={t.editor.page.backToList} title={t.editor.page.backToList} className={iconButton}>
      <ArrowLeft className="h-5 w-5" />
    </Link>
  )
}

/** Le titre de l'instruction et son état ; le toucher ouvre ses infos. */
function TitleButton({ p }: { p: Inner }) {
  const t = useMessages()
  const { top } = p
  return (
    <button type="button" onClick={top.onInfo} title={t.editor.page.info.open} className="btn-press group flex min-h-11 max-w-full min-w-0 items-center gap-1.5 rounded-2xl px-2 text-left hover:bg-slate-900/5 dark:hover:bg-white/10">
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-slate-900 dark:text-white">{top.title.trim() || t.editor.page.info.untitled}</span>
        <span className={cn('block truncate text-xs font-bold', top.statusTone === 'live' ? 'text-[var(--primary)]' : top.statusTone === 'error' ? 'text-rose-600' : 'text-slate-400')} aria-live="polite">
          {top.status}
        </span>
      </span>
      {!p.readOnly && <PencilLine className="h-4 w-4 shrink-0 text-slate-400 transition lg:opacity-0 lg:group-hover:opacity-100" />}
    </button>
  )
}

/** « 2 à vérifier » : les questions de l'IA, une à la fois. */
function QuestionsPill({ p, className }: { p: Inner; className?: string }) {
  const t = useMessages()
  return (
    <button type="button" onClick={p.top.onQuestions} className={cn('btn-press flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl bg-amber-100 px-3 text-xs font-black text-amber-900 dark:bg-amber-500/20 dark:text-amber-100', className)}>
      <MessageCircleQuestion className="h-4 w-4 shrink-0" /> {t.editor.page.questions.pill(p.top.questions)}
    </button>
  )
}

/** Le « … » de l'instruction. */
function InstructionMenu({ p }: { p: Inner }) {
  const t = useMessages()
  return <Menu bare label={t.editor.page.menu.label} items={p.top.menu} trigger={<span className={iconButton}><MoreHorizontal className="h-5 w-5" /></span>} />
}

/**
 * Le seul bouton de l'IA : les retouches de l'étape en un geste, et la conversation avec
 * l'assistant pour tout le reste. Il tourne pendant qu'elle travaille.
 */
function AssistMenu({ p, compact, side }: { p: Inner; compact?: boolean; side?: 'up' }) {
  const t = useMessages()
  const items: MenuItem[] = [
    ...ASSIST_ACTIONS.map((k) => ({ label: t.editor.assist.actions[k], icon: <Sparkles className="h-4 w-4" />, onClick: () => void p.assist.run(k), disabled: !!p.assist.busy })),
    { label: t.editor.stage.askAssistant, icon: <MessageCircle className="h-4 w-4" />, onClick: p.onAssistant, divider: true },
  ]
  return (
    <Menu
      bare
      side={side}
      label={t.editor.stage.assistant}
      items={items}
      trigger={
        <span className={cn('btn-press bg-gradient-accent shadow-accent flex h-11 items-center gap-1.5 rounded-2xl text-sm font-black text-white', compact ? 'w-11 justify-center' : 'px-3.5')}>
          {p.assist.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {!compact && t.editor.stage.assistant}
        </span>
      }
    />
  )
}

/** Passer d'une étape à l'autre : précédente, le choix, suivante. */
function StepNav({ p, className }: { p: Inner; className?: string }) {
  const t = useMessages()
  const total = p.content.steps.length
  if (!p.step) return <div className={className} />
  return (
    <div className={cn('flex min-w-0 items-center gap-1', className)}>
      <button type="button" onClick={() => p.onSelect(p.content.steps[p.index - 1]?.id)} disabled={p.index === 0} aria-label={t.editor.stage.previous} className={iconButton}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{t.editor.stage.goTo}</span>
        <select value={p.step.id} onChange={(e) => p.onSelect(e.target.value)} className="h-11 w-full appearance-none truncate rounded-2xl bg-slate-900/5 px-4 pr-8 text-sm font-black dark:bg-white/10">
          {p.content.steps.map((s, i) => (
            <option key={s.id} value={s.id}>
              {t.editor.step.of(i + 1, total)} · {s.title}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </label>
      <button type="button" onClick={() => p.onSelect(p.content.steps[p.index + 1]?.id)} disabled={p.index >= total - 1} aria-label={t.editor.stage.next} className={iconButton}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}

/** Sous l'image : ce qui touche le média de l'étape. */
function MediaBar({ p }: { p: Inner }) {
  const t = useMessages()
  if (p.readOnly) return null
  return (
    <div className="flex h-14 shrink-0 items-center border-t border-white/10 bg-slate-900 px-2">
      <button type="button" onClick={p.openMedia} className="btn-press flex h-11 items-center gap-2 rounded-2xl px-3 text-sm font-black text-white/90 hover:bg-white/10">
        <ImagePlus className="h-4 w-4" /> {t.editor.stage.editMedia}
      </button>
    </div>
  )
}

/** Une instruction encore vide : une seule chose à faire. */
function NoStep({ p }: { p: Inner }) {
  const t = useMessages()
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <span className="bg-primary-soft mx-auto flex h-16 w-16 items-center justify-center rounded-3xl text-[var(--primary)]">
        <Plus className="h-8 w-8" />
      </span>
      <p className="mt-4 text-lg font-black text-slate-900 dark:text-white">{t.editor.page.steps.empty}</p>
      <p className="mt-1 text-sm font-bold text-slate-500">{t.editor.stage.emptyHint}</p>
      {!p.readOnly && (
        <Button variant="primary" className="mt-6" onClick={p.onAddEnd} icon={<Plus className="h-5 w-5" />}>
          {t.editor.stage.firstStep}
        </Button>
      )}
    </div>
  )
}

/** Le « … » de l'étape. */
function StepMenu({ p, step, side }: { p: Inner; step: Step; side?: 'up' }) {
  const t = useMessages()
  return <Menu bare side={side} label={t.editor.stage.stepActions} items={stepMenu(p, step, t)} trigger={<span className={iconButton}><MoreHorizontal className="h-5 w-5" /></span>} />
}

/**
 * Le texte de l'étape, comme au poste, modifiable sur place : titre, mise en garde, consigne, points
 * clés. `menu` : le « … » de l'étape à côté du titre (ordinateur).
 */
function StageText({ p, step, menu = false }: { p: Inner; step: Step; menu?: boolean }) {
  const t = useMessages()
  const { index, readOnly } = p
  const set = (patch: Partial<Step>) => p.onChange({ ...step, ...patch })
  const keyPoints = step.keyPoints ?? []
  const warning = step.warning
  return (
    <>
      {p.remoteNote && !p.agentWorking && (
        <p className="animate-pop-in flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 dark:bg-sky-500/15 dark:text-sky-200" role="status">
          <Radio className="h-4 w-4 animate-pulse" /> {p.remoteNote}
        </p>
      )}
      {p.agentWorking && (
        <p className="flex items-center gap-2 rounded-2xl bg-violet-50 px-4 py-2 text-sm font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
          <Sparkles className="h-4 w-4 animate-pulse" /> {t.editor.step.assistantWorking}
        </p>
      )}
      {p.feedbackNote && <p className="rounded-2xl bg-amber-100 px-4 py-3 text-sm font-bold text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">{t.editor.stepEditor.operatorFeedback(p.feedbackNote)}</p>}

      <div className="flex items-start gap-4">
        <span className="bg-gradient-primary shadow-primary flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl text-3xl font-black text-white tabular-nums">{index + 1}</span>
        <AutoTextarea singleLine value={step.title} readOnly={readOnly} onChange={(e) => set({ title: e.target.value })} aria-label={t.editor.stage.titleLabel} placeholder={t.editor.stage.titlePlaceholder} className={cn(editable, 'min-w-0 flex-1 px-2 pt-1 leading-[1.05] font-black tracking-tighter hyphens-auto text-slate-900 dark:text-white', p.agentOpen ? 'text-3xl' : 'text-3xl sm:text-4xl')} />
        {menu && !readOnly && <StepMenu p={p} step={step} />}
      </div>

      {warning && (
        <div className={cn('flex items-start gap-3 rounded-3xl p-4 shadow-lg', WARNINGS[warning.level].className)}>
          <TriangleAlert className="mt-2 h-7 w-7 shrink-0" />
          <div className="min-w-0 flex-1">
            {readOnly ? (
              <p className="label-caps opacity-90">{WARNINGS[warning.level].label}</p>
            ) : (
              <Menu
                bare
                align="left"
                label={t.editor.stage.warningLevel}
                items={(Object.keys(WARNINGS) as WarningLevel[]).map((l) => ({ label: WARNINGS[l].label, icon: l === warning.level ? <Check className="h-4 w-4" /> : <span className="block h-4 w-4" />, onClick: () => set({ warning: { level: l, text: warning.text } }) }))}
                trigger={
                  <span className="label-caps -ml-1.5 flex h-10 items-center gap-1 rounded-xl px-1.5 opacity-90 hover:bg-black/10">
                    {WARNINGS[warning.level].label} <ChevronDown className="h-3.5 w-3.5" />
                  </span>
                }
              />
            )}
            <AutoTextarea autoFocus={!readOnly && !warning.text} value={warning.text} readOnly={readOnly} onChange={(e) => set({ warning: { level: warning.level, text: e.target.value } })} aria-label={t.editor.step.warningText} placeholder={t.editor.stage.warningPlaceholder} className={cn(editable, 'px-1 text-lg leading-snug font-black text-inherit placeholder:text-current/60 hover:bg-black/5 focus:bg-black/10 dark:focus:bg-black/20')} />
          </div>
          {!readOnly && (
            <button type="button" onClick={() => set({ warning: null })} aria-label={t.editor.stage.removeWarning} className="btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/10">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <AutoTextarea value={step.text} readOnly={readOnly} onChange={(e) => set({ text: e.target.value })} aria-label={t.editor.stage.textLabel} placeholder={t.editor.stage.textPlaceholder} className={cn(editable, 'px-2 py-1 text-xl leading-relaxed font-bold text-slate-700 sm:text-2xl dark:text-slate-200')} />

      {keyPoints.length > 0 && (
        <div className="bg-primary-soft rounded-3xl p-4">
          <p className="label-caps mb-2 text-[var(--primary-strong)] dark:text-sky-300">{t.editor.step.keyPoints}</p>
          <ul className="space-y-1">
            {keyPoints.map((k, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="mt-2 h-5 w-5 shrink-0 text-[var(--primary)]" />
                <AutoTextarea singleLine autoFocus={!readOnly && !k && i === keyPoints.length - 1} value={k} readOnly={readOnly} onChange={(e) => set({ keyPoints: keyPoints.map((x, j) => (j === i ? e.target.value : x)) })} aria-label={t.editor.stage.keyPoint(i + 1)} className={cn(editable, 'px-1 py-1 text-lg font-bold text-slate-800 dark:text-slate-100')} />
                {!readOnly && (
                  <button type="button" onClick={() => set({ keyPoints: keyPoints.filter((_, j) => j !== i) })} aria-label={t.editor.step.removeKeyPoint} className="btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-white/60">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ajouter seulement ce qui manque : une mise en garde, un point clé (trois au plus). */}
      {!readOnly && (!warning || keyPoints.length < 3) && (
        <div className="flex flex-wrap gap-1">
          {!warning && (
            <button type="button" onClick={() => set({ warning: { level: 'caution', text: '' } })} className="btn-press flex h-11 items-center gap-1.5 rounded-2xl px-3 text-sm font-black text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/10">
              <Plus className="h-4 w-4" /> {t.editor.stage.addWarningShort}
            </button>
          )}
          {keyPoints.length < 3 && (
            <button type="button" onClick={() => set({ keyPoints: [...keyPoints, ''] })} className="btn-press hover:bg-primary-soft flex h-11 items-center gap-1.5 rounded-2xl px-3 text-sm font-black text-[var(--primary)]">
              <Plus className="h-4 w-4" /> {t.editor.stage.addKeyPointShort}
            </button>
          )}
        </div>
      )}
    </>
  )
}

/** La bande des étapes (ordinateur) : toute l'instruction d'un coup d'œil, une étape d'un clic. */
function StepStrip({ p }: { p: Inner }) {
  const t = useMessages()
  const { content, step, readOnly, index } = p
  const total = content.steps.length
  const current = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    current.current?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [step?.id])
  return (
    <nav className="glass-nav flex h-24 shrink-0 items-center gap-1 border-t px-2" aria-label={t.editor.stage.stepsNav}>
      <button type="button" onClick={() => p.onSelect(content.steps[index - 1]?.id)} disabled={!step || index === 0} aria-label={t.editor.stage.previous} className={iconButton}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-1 py-2">
        {content.steps.map((s, i) => {
          const img = mediaThumb(s.media[0])
          const active = s.id === step?.id
          const fb = p.feedbackByStep?.[s.id] ?? 0
          const change = p.changes?.[s.id]
          return (
            <button key={s.id} ref={active ? current : undefined} type="button" onClick={() => p.onSelect(s.id)} aria-current={active ? 'step' : undefined} title={t.editor.stage.thumbTitle(i + 1, s.title)} className={cn('btn-press relative h-16 w-28 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 text-left', active ? 'ring-4 ring-[var(--primary)]' : 'opacity-80 hover:opacity-100')}>
              {img && <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              {(change === 'added' || change === 'modified') && (
                <span className={cn('absolute top-1 left-1 rounded-md px-1 text-[9px] font-black text-white uppercase', change === 'added' ? 'bg-emerald-500' : 'bg-amber-500')}>{change === 'added' ? t.editor.stepList.added : t.editor.stepList.modified}</span>
              )}
              {fb > 0 && <span className="absolute top-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white tabular-nums" title={t.editor.stepList.feedback(fb)}>{fb}</span>}
              <span className="absolute right-2 bottom-1 left-2 truncate text-[11px] font-black text-white">
                {i + 1}. {s.title}
              </span>
            </button>
          )
        })}
        {!readOnly && (
          <button type="button" onClick={p.onAddEnd} aria-label={t.editor.stage.addAtEnd} title={t.editor.stage.addAtEnd} className="btn-press flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-[var(--primary)] hover:text-[var(--primary)] dark:border-slate-700">
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>
      <button type="button" onClick={() => p.onSelect(content.steps[index + 1]?.id)} disabled={!step || index >= total - 1} aria-label={t.editor.stage.next} className={iconButton}>
        <ChevronRight className="h-5 w-5" />
      </button>
    </nav>
  )
}

/** Sur ordinateur : le poste en plein écran, à modifier sur place. */
function StageCanvas(p: Inner) {
  const t = useMessages()
  const { content, step, index, readOnly, top } = p
  const total = content.steps.length
  const hasMedia = !!step?.media.length

  // ← et → passent d'une étape à l'autre, comme au poste (pas pendant qu'on écrit).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="menu"]')) return
      if (e.key === 'ArrowRight') p.onSelect(content.steps[index + 1]?.id)
      else if (e.key === 'ArrowLeft') p.onSelect(content.steps[index - 1]?.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [p, content.steps, index])

  return (
    <div className={cn('fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-50 dark:bg-slate-950', p.agentOpen ? 'right-[424px]' : 'right-0')} role="region" aria-label={t.editor.stage.region}>
      {/* Au-dessus du contenu : les menus de l'en-tête s'ouvrent par-dessus l'étape. */}
      <header className="glass-nav relative z-20 border-b">
        <div className="flex h-16 items-center gap-1.5 px-3">
          <BackLink />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <TitleButton p={p} />
            {top.questions > 0 && !readOnly && <QuestionsPill p={p} />}
          </div>
          {p.badge}
          {!readOnly && p.history && <UndoButtons history={p.history} className="shrink-0" />}
          {!readOnly && step && <AssistMenu p={p} compact={p.agentOpen} />}
          <InstructionMenu p={p} />
          {top.primary(false)}
        </div>
        <div className="h-1.5 bg-slate-900/5 dark:bg-white/5">
          <div className="bg-gradient-primary h-full transition-[width] duration-500" style={{ width: `${step ? ((index + 1) / Math.max(1, total)) * 100 : 0}%` }} />
        </div>
      </header>
      {p.notices && <div className="shrink-0 space-y-2 px-4 pt-3">{p.notices}</div>}

      {step ? (
        <div key={step.id} className={cn('animate-fade-in flex min-h-0 flex-1', p.agentWorking && 'ring-4 ring-violet-400/70 ring-inset', p.remoteNote && !p.agentWorking && 'ring-4 ring-sky-400/80 ring-inset')}>
          {hasMedia && (
            <div className="flex min-w-0 flex-[1.5] flex-col bg-slate-900">
              <div className="relative min-h-0 flex-1">
                <StepMediaArea step={step} labels={t.editor.mediaArea} />
              </div>
              <MediaBar p={p} />
            </div>
          )}
          <div className={cn('flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-8', hasMedia ? 'max-w-[560px]' : 'mx-auto w-full max-w-3xl pt-12')}>
            {!hasMedia && !readOnly && (
              <button type="button" onClick={p.openMedia} className="btn-press flex h-28 w-full flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed border-slate-300 text-sm font-black text-slate-500 hover:border-[var(--primary)] hover:text-[var(--primary)] dark:border-slate-700">
                <ImagePlus className="h-6 w-6" /> {t.editor.stage.addMediaHint}
              </button>
            )}
            <StageText p={p} step={step} menu />
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-8">
          <NoStep p={p} />
        </div>
      )}

      <StepStrip p={p} />
    </div>
  )
}

/**
 * Sur téléphone : la barre de l'instruction en haut, l'étape comme au poste, et les étapes sous le
 * pouce en bas (comme les boutons du lecteur). La barre de l'app s'efface (`useImmersive`).
 */
function StagePhone(p: Inner) {
  const t = useMessages()
  const { step, readOnly, top } = p
  return (
    <div className="pb-28">
      <header className="glass-nav pt-safe sticky top-0 z-30 border-b">
        <div className="flex h-14 items-center gap-1 px-1.5">
          <BackLink />
          <div className="min-w-0 flex-1">
            <TitleButton p={p} />
          </div>
          {p.badge}
          {top.primary(true)}
          <InstructionMenu p={p} />
        </div>
      </header>

      <div className="space-y-3 px-3 pt-3">
        {top.questions > 0 && !readOnly && <QuestionsPill p={p} className="w-full justify-center" />}
        {p.notices}
        <div id="step-editor" className={cn('glass-panel scroll-mt-20 overflow-hidden rounded-[28px] p-0 transition-shadow', p.agentWorking && 'ring-4 ring-violet-400/70', p.remoteNote && !p.agentWorking && 'ring-4 ring-sky-400/80')}>
          {step ? (
            <>
              {/* Le média, comme au poste ; ses réglages juste dessous. */}
              <div className="relative h-[42dvh] bg-slate-900 sm:h-[50dvh]">
                {step.media.length ? (
                  <StepMediaArea key={step.id} step={step} labels={t.editor.mediaArea} />
                ) : (
                  <button type="button" disabled={readOnly} onClick={p.openMedia} className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/80">
                    <ImagePlus className="h-10 w-10" />
                    <span className="font-black">{readOnly ? t.editor.step.noMedia : t.editor.stage.addMediaHint}</span>
                  </button>
                )}
              </div>
              {step.media.length > 0 && <MediaBar p={p} />}
              <div className="space-y-4 p-5 sm:p-8">
                <StageText p={p} step={step} />
              </div>
            </>
          ) : (
            <div className="p-5">
              <NoStep p={p} />
            </div>
          )}
        </div>
      </div>

      {/* Les étapes sous le pouce ; elles se cachent pendant qu'on écrit. */}
      {step && (
        <nav className="glass-nav pb-safe kb-hide fixed inset-x-0 bottom-0 z-30 border-t" aria-label={t.editor.stage.stepsNav}>
          <div className="mx-auto flex max-w-2xl items-center gap-1.5 px-2 py-2">
            <StepNav p={p} className="min-w-0 flex-1" />
            {!readOnly && <StepMenu p={p} step={step} side="up" />}
            {!readOnly && <AssistMenu p={p} compact side="up" />}
          </div>
        </nav>
      )}
    </div>
  )
}

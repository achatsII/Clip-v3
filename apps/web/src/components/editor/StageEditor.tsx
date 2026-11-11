'use client'

import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Copy, ImagePlus, Loader2, MoreHorizontal, Plus, Sparkles, Trash2, TriangleAlert, X } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { StepMediaArea } from '@/components/player/StepMediaArea'
import { AutoTextarea } from '@/components/ui/Field'
import { Menu } from '@/components/ui/Menu'
import { Modal } from '@/components/ui/Modal'
import { WARNINGS } from '@/lib/model/catalog'
import type { InstructionContent, Source, Step, WarningLevel } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'
import { ASSIST_ACTIONS, useStepAssist } from './StepAssist'
import { StepEditor } from './StepEditor'

const LABELS = { zoom: 'Agrandir', doIt: 'À faire', avoid: 'À éviter' }

/** Un texte modifiable qui garde l'allure du lecteur : on le touche, on écrit. */
const editable = 'w-full rounded-xl bg-transparent transition hover:bg-slate-900/[0.03] focus:bg-white/80 focus:ring-4 focus:ring-[rgba(var(--primary-rgb),0.18)] focus:outline-none dark:hover:bg-white/5 dark:focus:bg-slate-900/60'

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

/** L'image d'une étape pour la bande des étapes. */
function thumbOf(s: Step): string | null {
  const m = s.media[0]
  if (!m) return null
  if (m.kind === 'image') return m.url
  if (m.kind === 'video') return m.posterUrl ?? null
  if (m.kind === 'document') return m.pageImageUrl ?? null
  return null
}

export interface StageEditorProps {
  content: InstructionContent
  step: Step
  index: number
  sources: Source[]
  readOnly?: boolean
  agentWorking?: boolean
  /** Le panneau de l'assistant est ouvert à droite : la vue lui laisse sa place. */
  agentOpen?: boolean
  /** « Enregistré », « Enregistrement… » : l'état de l'enregistrement, dans l'en-tête. */
  saveLabel?: ReactNode
  onChange: (s: Step) => void
  onSelect: (id: string) => void
  onInsertAfter: () => void
  /** Ajouter une étape à la fin (bande des étapes). */
  onAddEnd: () => void
  onSourceAdded: (s: Source) => void
  onMove: (dir: -1 | 1) => void
  onDuplicate: () => void
  onDelete: () => void
  /** Revenir à la fiche. */
  onExit: () => void
}

/**
 * La vue « Comme au poste » : l'étape telle que l'opérateur la verra, et chaque texte se modifie
 * là où il est. Sur ordinateur, en plein écran, dans la mise en page exacte du poste (le grand
 * média à gauche, le texte à droite), avec la bande des étapes en bas et tous les outils en haut.
 * Sur téléphone, la vue du téléphone. Le média se règle dans une fenêtre (les réglages de la fiche).
 */
export function StageEditor(props: StageEditorProps) {
  const wide = useWide()
  const [mediaOpen, setMediaOpen] = useState(false)
  const assist = useStepAssist({ content: props.content, step: props.step, onApply: props.onChange })
  const p = { ...props, assist, openMedia: () => setMediaOpen(true) }
  return (
    <>
      {wide ? <StageCanvas {...p} /> : <StagePhone {...p} />}
      {assist.element}
      <Modal open={mediaOpen} onClose={() => setMediaOpen(false)} size="lg" title={`Média de l’étape ${props.index + 1}`}>
        <StepEditor
          content={props.content}
          step={props.step}
          index={props.index}
          sources={props.sources}
          readOnly={props.readOnly}
          section="media"
          onChange={props.onChange}
          onMove={() => undefined}
          onDelete={() => undefined}
          onDuplicate={() => undefined}
          onInsertAfter={props.onInsertAfter}
          onSourceAdded={props.onSourceAdded}
        />
      </Modal>
    </>
  )
}

type Inner = StageEditorProps & { assist: ReturnType<typeof useStepAssist>; openMedia: () => void }

/** Toutes les actions sur l'étape, dans un menu : média, ajout, copie, déplacement, suppression. */
function stepMenu(p: Inner) {
  const total = p.content.steps.length
  return [
    { label: p.step.media.length ? 'Modifier le média' : 'Ajouter un média', icon: <ImagePlus className="h-4 w-4" />, onClick: p.openMedia },
    { label: 'Ajouter une étape après', icon: <Plus className="h-4 w-4" />, onClick: p.onInsertAfter },
    { label: 'Dupliquer l’étape', icon: <Copy className="h-4 w-4" />, onClick: p.onDuplicate },
    ...(p.index > 0 ? [{ label: 'Déplacer avant', icon: <ArrowLeft className="h-4 w-4" />, onClick: () => p.onMove(-1) }] : []),
    ...(p.index < total - 1 ? [{ label: 'Déplacer après', icon: <ArrowRight className="h-4 w-4" />, onClick: () => p.onMove(1) }] : []),
    { label: 'Supprimer l’étape', icon: <Trash2 className="h-4 w-4" />, onClick: p.onDelete, danger: true },
  ]
}

/** Les retouches par l'IA, dans un menu. */
function assistMenu(p: Inner) {
  return [...ASSIST_ACTIONS.map(([k, label]) => ({ label, icon: <Sparkles className="h-4 w-4" />, onClick: () => void p.assist.run(k) })), { label: 'Autre demande…', icon: <Sparkles className="h-4 w-4" />, onClick: p.assist.openCustom }]
}

/** Passer d'une étape à l'autre : précédente, le choix, suivante, et en ajouter une. */
function StepNav({ p, className, add = true }: { p: Inner; className?: string; add?: boolean }) {
  const total = p.content.steps.length
  return (
    <div className={cn('flex min-w-0 items-center gap-1.5', className)}>
      <button type="button" onClick={() => p.onSelect(p.content.steps[p.index - 1]?.id)} disabled={p.index === 0} aria-label="Étape précédente" className="btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl hover:bg-slate-900/5 disabled:opacity-30 dark:hover:bg-white/10">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Aller à l’étape</span>
        <select value={p.step.id} onChange={(e) => p.onSelect(e.target.value)} className="h-11 w-full appearance-none truncate rounded-2xl bg-slate-900/5 px-4 pr-8 text-sm font-black dark:bg-white/10">
          {p.content.steps.map((s, i) => (
            <option key={s.id} value={s.id}>
              Étape {i + 1} sur {total} · {s.title}
            </option>
          ))}
        </select>
        <ChevronRight className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-400" />
      </label>
      <button type="button" onClick={() => p.onSelect(p.content.steps[p.index + 1]?.id)} disabled={p.index >= total - 1} aria-label="Étape suivante" className="btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl hover:bg-slate-900/5 disabled:opacity-30 dark:hover:bg-white/10">
        <ChevronRight className="h-5 w-5" />
      </button>
      {!p.readOnly && add && (
        <button type="button" onClick={p.onInsertAfter} aria-label="Ajouter une étape après" title="Ajouter une étape après" className="btn-press bg-gradient-primary shadow-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white">
          <Plus className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

/** Le bouton « Améliorer » de l'IA ; il tourne pendant qu'elle travaille. */
function AssistButton({ p, compact }: { p: Inner; compact?: boolean }) {
  return (
    <Menu
      bare
      label="Améliorer avec l’IA"
      items={assistMenu(p)}
      trigger={
        <span className={cn('btn-press bg-gradient-accent flex h-11 items-center gap-1.5 rounded-2xl text-sm font-black text-white', compact ? 'w-11 justify-center' : 'px-3.5')}>
          {p.assist.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {!compact && 'Améliorer'}
        </span>
      }
    />
  )
}

/** Le texte de l'étape, comme au poste, modifiable sur place : titre, mise en garde, consigne, points clés. */
function StageText({ p }: { p: Inner }) {
  const { step, index, readOnly } = p
  const set = (patch: Partial<Step>) => p.onChange({ ...step, ...patch })
  const keyPoints = step.keyPoints ?? []
  return (
    <>
      {p.agentWorking && (
        <p className="flex items-center gap-2 rounded-2xl bg-violet-50 px-4 py-2 text-sm font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
          <Sparkles className="h-4 w-4 animate-pulse" /> L’assistant modifie cette étape…
        </p>
      )}
      <div className="flex items-start gap-4">
        <span className="bg-gradient-primary shadow-primary flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl text-3xl font-black text-white tabular-nums">{index + 1}</span>
        <AutoTextarea singleLine value={step.title} readOnly={readOnly} onChange={(e) => set({ title: e.target.value })} aria-label="Titre de l’étape" placeholder="Ce qu’il faut faire" className={cn(editable, 'px-2 pt-1 text-3xl leading-[1.05] font-black tracking-tighter text-slate-900 sm:text-4xl dark:text-white')} />
      </div>

      {step.warning ? (
        <div className={cn('flex items-start gap-3 rounded-3xl p-4 shadow-lg', WARNINGS[step.warning.level].className)}>
          <TriangleAlert className="mt-1 h-7 w-7 shrink-0" />
          <div className="min-w-0 flex-1">
            {!readOnly ? (
              <div className="mb-1 flex flex-wrap gap-1">
                {(Object.keys(WARNINGS) as WarningLevel[]).map((l) => (
                  <button key={l} type="button" onClick={() => set({ warning: { level: l, text: step.warning!.text } })} aria-pressed={step.warning!.level === l} className={cn('btn-press flex h-8 items-center gap-1 rounded-lg px-2 text-[11px] font-black tracking-widest uppercase', step.warning!.level === l ? 'bg-black/25' : 'bg-black/10 opacity-70')}>
                    {step.warning!.level === l && <Check className="h-3 w-3" />} {WARNINGS[l].label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="label-caps opacity-90">{WARNINGS[step.warning.level].label}</p>
            )}
            <AutoTextarea value={step.warning.text} readOnly={readOnly} onChange={(e) => set({ warning: { level: step.warning!.level, text: e.target.value } })} aria-label="Texte de la mise en garde" placeholder="Le risque, en une phrase" className={cn(editable, 'px-1 text-lg leading-snug font-black text-inherit placeholder:text-current/60 hover:bg-black/5 focus:bg-black/10 dark:focus:bg-black/20')} />
          </div>
          {!readOnly && (
            <button type="button" onClick={() => set({ warning: null })} aria-label="Retirer la mise en garde" className="btn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/10">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        !readOnly && (
          <button type="button" onClick={() => set({ warning: { level: 'caution', text: '' } })} className="btn-press flex h-12 w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-amber-300 text-sm font-black text-amber-700 dark:text-amber-300">
            <TriangleAlert className="h-4 w-4" /> Ajouter une mise en garde
          </button>
        )
      )}

      <AutoTextarea value={step.text} readOnly={readOnly} onChange={(e) => set({ text: e.target.value })} aria-label="Texte de l’étape" placeholder="Comment faire, en une ou deux phrases" className={cn(editable, 'px-2 py-1 text-xl leading-relaxed font-bold text-slate-700 sm:text-2xl dark:text-slate-200')} />

      {(keyPoints.length > 0 || !readOnly) && (
        <div className="bg-primary-soft rounded-3xl p-4">
          <p className="label-caps mb-2 text-[var(--primary-strong)] dark:text-sky-300">Points clés</p>
          <ul className="space-y-1">
            {keyPoints.map((k, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="mt-2 h-5 w-5 shrink-0 text-[var(--primary)]" />
                <AutoTextarea singleLine value={k} readOnly={readOnly} onChange={(e) => set({ keyPoints: keyPoints.map((x, j) => (j === i ? e.target.value : x)) })} aria-label={`Point clé ${i + 1}`} className={cn(editable, 'px-1 py-1 text-lg font-bold text-slate-800 dark:text-slate-100')} />
                {!readOnly && (
                  <button type="button" onClick={() => set({ keyPoints: keyPoints.filter((_, j) => j !== i) })} aria-label="Retirer le point clé" className="btn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-white/60">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!readOnly && keyPoints.length < 3 && (
            <button type="button" onClick={() => set({ keyPoints: [...keyPoints, ''] })} className="btn-press mt-1 flex h-10 items-center gap-1 rounded-xl px-2 text-sm font-black text-[var(--primary)]">
              <Plus className="h-4 w-4" /> Ajouter un point clé
            </button>
          )}
        </div>
      )}
    </>
  )
}

/** Sur ordinateur : le poste en plein écran, à modifier sur place. */
function StageCanvas(p: Inner) {
  const { content, step, index, readOnly } = p
  const total = content.steps.length
  const hasMedia = step.media.length > 0

  // ← et → passent d'une étape à l'autre, comme au poste (pas pendant qu'on écrit).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return
      if (e.key === 'ArrowRight') p.onSelect(content.steps[index + 1]?.id)
      else if (e.key === 'ArrowLeft') p.onSelect(content.steps[index - 1]?.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [p, content.steps, index])

  return (
    <div className={cn('fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-50 dark:bg-slate-950', p.agentOpen ? 'right-[424px]' : 'right-0')} role="region" aria-label="Comme au poste">
      {/* Au-dessus du contenu : les menus de l'en-tête s'ouvrent par-dessus l'étape. */}
      <header className="glass-nav relative z-20 border-b">
        <div className="flex h-16 items-center gap-3 px-4">
          <button type="button" onClick={p.onExit} className="btn-press flex h-11 shrink-0 items-center gap-1.5 rounded-2xl px-3 text-sm font-black text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" /> Fiche
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-slate-900 dark:text-white">{content.title}</p>
            {p.saveLabel && <p className="truncate text-xs font-bold text-slate-400">{p.saveLabel}</p>}
          </div>
          <StepNav p={p} className="w-[min(460px,40vw)]" />
          {!readOnly && (
            <div className="flex shrink-0 items-center gap-1.5">
              <AssistButton p={p} />
              <Menu bare label="Actions sur l’étape" items={stepMenu(p)} trigger={<span className="btn-press glass-card flex h-11 w-11 items-center justify-center rounded-2xl"><MoreHorizontal className="h-5 w-5" /></span>} />
            </div>
          )}
        </div>
        <div className="h-1.5 bg-slate-900/5 dark:bg-white/5">
          <div className="bg-gradient-primary h-full transition-[width] duration-500" style={{ width: `${((index + 1) / Math.max(1, total)) * 100}%` }} />
        </div>
      </header>

      <div key={step.id} className={cn('animate-fade-in flex min-h-0 flex-1', p.agentWorking && 'ring-4 ring-violet-400/70 ring-inset')}>
        {hasMedia && (
          <div className="relative min-w-0 flex-[1.5] bg-slate-900">
            <StepMediaArea step={step} labels={LABELS} />
          </div>
        )}
        <div className={cn('flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-8', hasMedia ? 'max-w-[560px]' : 'mx-auto w-full max-w-3xl pt-12')}>
          {hasMedia && !readOnly && (
            <div className="-mt-2 flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={p.openMedia} className="btn-press glass-card flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black">
                <ImagePlus className="h-4 w-4" /> Modifier le média
              </button>
              <p className="text-xs font-bold text-slate-400">Cliquez un texte pour le modifier.</p>
            </div>
          )}
          {!hasMedia && !readOnly && (
            <button type="button" onClick={p.openMedia} className="btn-press flex h-28 w-full flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed border-slate-300 text-sm font-black text-slate-500 dark:border-slate-700">
              <ImagePlus className="h-6 w-6" /> Ajouter une photo, un extrait, un schéma
            </button>
          )}
          <StageText p={p} />
        </div>
      </div>

      {/* La bande des étapes : on voit toute l'instruction, on va à une étape d'un clic. */}
      <nav className="glass-nav flex h-24 shrink-0 items-center gap-2 overflow-x-auto border-t px-4" aria-label="Étapes">
        {content.steps.map((s, i) => {
          const img = thumbOf(s)
          return (
            <button key={s.id} type="button" onClick={() => p.onSelect(s.id)} aria-current={s.id === step.id ? 'step' : undefined} title={`Étape ${i + 1} · ${s.title}`} className={cn('btn-press relative h-16 w-28 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 text-left', s.id === step.id ? 'ring-4 ring-[var(--primary)]' : 'opacity-80 hover:opacity-100')}>
              {img && <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />}
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <span className="absolute bottom-1 left-2 right-2 truncate text-[11px] font-black text-white">
                {i + 1}. {s.title}
              </span>
            </button>
          )
        })}
        {!readOnly && (
          <button type="button" onClick={p.onAddEnd} aria-label="Ajouter une étape à la fin" title="Ajouter une étape à la fin" className="btn-press flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-500 dark:border-slate-700">
            <Plus className="h-5 w-5" />
          </button>
        )}
      </nav>
    </div>
  )
}

/** Sur téléphone : la vue du téléphone, une étape à la fois, avec la barre pour passer de l'une à l'autre. */
function StagePhone(p: Inner) {
  const { step, readOnly } = p
  return (
    <div>
      {/* La barre reste en haut quand on descend écrire. */}
      <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 mb-2 flex items-center gap-1.5 rounded-2xl bg-white/95 px-1.5 py-1.5 shadow-[0_4px_16px_rgba(15,23,42,0.08)] dark:bg-slate-900/95">
        {/* Au téléphone, « Ajouter une étape » passe dans le menu ⋯ : le choix de l'étape garde sa place. */}
        <StepNav p={p} className="min-w-0 flex-1" add={false} />
        {!readOnly && (
          <>
            <AssistButton p={p} compact />
            <Menu bare label="Actions sur l’étape" items={stepMenu(p)} trigger={<span className="btn-press flex h-11 w-11 items-center justify-center rounded-2xl hover:bg-slate-900/5 dark:hover:bg-white/10"><MoreHorizontal className="h-5 w-5" /></span>} />
          </>
        )}
      </div>

      <div className={cn('glass-panel overflow-hidden rounded-[32px] p-0 transition-shadow', p.agentWorking && 'ring-4 ring-violet-400/70')}>
        {/* Le média, comme au poste */}
        <div className="relative h-[42dvh] bg-slate-900 sm:h-[50dvh]">
          {step.media.length ? (
            <StepMediaArea key={step.id} step={step} labels={LABELS} />
          ) : (
            <button type="button" disabled={readOnly} onClick={p.openMedia} className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/80">
              <ImagePlus className="h-10 w-10" />
              <span className="font-black">{readOnly ? 'Aucun média' : 'Ajouter une photo, un extrait, un schéma'}</span>
            </button>
          )}
        </div>

        {/* Le texte, comme au poste, modifiable sur place */}
        <div className="space-y-4 p-5 sm:p-8">
          {!readOnly && (
            <div className="-mt-1 flex flex-wrap items-center justify-between gap-2">
              {step.media.length > 0 && (
                <button type="button" onClick={p.openMedia} className="btn-press glass-card flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black">
                  <ImagePlus className="h-4 w-4" /> Modifier le média
                </button>
              )}
              <p className="text-xs font-bold text-slate-400">Touchez un texte pour le modifier.</p>
            </div>
          )}
          <StageText p={p} />
        </div>
      </div>
    </div>
  )
}

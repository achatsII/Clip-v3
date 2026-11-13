'use client'

import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Copy, Heading, ImagePlus, PencilLine, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { useRef } from 'react'
import { rangeText, strings as playerStrings } from '@/components/player/i18n'
import type { MenuItem } from '@/components/ui/Menu'
import { useMessages, type Messages } from '@/lib/i18n'
import { removeSection, sectionAt, setSectionRange, settleSection, startSection, startsSection } from '@/lib/model/sections'
import type { Check as StepCheck, Step } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'
import { CHECK_ICONS } from './CheckDialog'

/** Ce que les deux vues de l'éditeur font sur une étape : les mêmes gestes, rangés autrement. */
export interface StepActions {
  steps: Step[]
  index: number
  /** Les sections (toggle `sections`). */
  sections?: boolean
  onSteps: (steps: Step[]) => void
  onInsertAfter: () => void
  onDuplicate: () => void
  onMove: (dir: -1 | 1) => void
  onDelete: () => void
  /** Une section vient d'être créée : son nom s'ouvre à la saisie. */
  onNamingSection: (on: boolean) => void
}

/** Les actions sur l'étape, dans son « … » (vue « Comme au poste ») : média, ajout, copie, déplacement, suppression. */
export function stepMenu(a: StepActions & { openMedia: () => void }, step: Step, t: Messages): MenuItem[] {
  const total = a.steps.length
  return [
    { label: step.media.length ? t.editor.stage.editMedia : t.editor.stage.addMedia, icon: <ImagePlus className="h-4 w-4" />, onClick: a.openMedia },
    { label: t.editor.step.addAfter, icon: <Plus className="h-4 w-4" />, onClick: a.onInsertAfter },
    { label: t.editor.step.duplicate, icon: <Copy className="h-4 w-4" />, onClick: a.onDuplicate },
    { label: t.editor.stage.moveBefore, icon: <ArrowLeft className="h-4 w-4" />, onClick: () => a.onMove(-1), hidden: a.index === 0 },
    { label: t.editor.stage.moveAfter, icon: <ArrowRight className="h-4 w-4" />, onClick: () => a.onMove(1), hidden: a.index >= total - 1 },
    {
      label: t.editor.stage.newSection,
      icon: <Heading className="h-4 w-4" />,
      hidden: !a.sections || startsSection(a.steps, a.index),
      divider: true,
      onClick: () => {
        a.onSteps(startSection(a.steps, a.index, t.editor.stage.newSectionName))
        a.onNamingSection(true)
      },
    },
    { label: t.editor.stage.removeSection, icon: <X className="h-4 w-4" />, hidden: !a.sections || !step.section, onClick: () => a.onSteps(removeSection(a.steps, a.index)) },
    { label: t.editor.step.delete, icon: <Trash2 className="h-4 w-4" />, onClick: a.onDelete, danger: true, divider: true },
  ]
}

/**
 * Le nom de la section de l'étape, modifiable sur place : il change pour toutes les étapes de la
 * section. La plage est retenue au début de la saisie (un nom vidé ne fusionne pas deux sections).
 */
export function SectionField({ steps, index, readOnly, naming, onNamed, onSteps, className }: { steps: Step[]; index: number; readOnly?: boolean; naming?: boolean; onNamed: () => void; onSteps: (steps: Step[]) => void; className?: string }) {
  const t = useMessages()
  const range = useRef<{ start: number; end: number } | null>(null)
  const grab = () => {
    const g = sectionAt(steps, index)
    return g ? { start: g.start, end: g.end } : { start: index, end: index + 1 }
  }
  return (
    <input
      value={steps[index]?.section ?? ''}
      readOnly={readOnly}
      autoFocus={naming}
      onFocus={(e) => {
        range.current = grab()
        if (naming) {
          e.currentTarget.select()
          onNamed()
        }
      }}
      onChange={(e) => {
        const r = range.current ?? grab()
        range.current = r
        onSteps(setSectionRange(steps, r.start, r.end, e.target.value))
      }}
      onBlur={() => {
        const r = range.current
        range.current = null
        if (r) onSteps(settleSection(steps, r.start, r.end))
      }}
      aria-label={t.editor.stage.sectionLabel}
      className={cn('label-caps w-full rounded-xl bg-transparent px-2 py-1.5 text-[var(--primary-strong)] transition hover:bg-slate-900/[0.03] focus:bg-white/80 focus:ring-4 focus:ring-[rgba(var(--primary-rgb),0.18)] focus:outline-none dark:text-sky-300 dark:hover:bg-white/5 dark:focus:bg-slate-900/60', className)}
    />
  )
}

/**
 * Les relevés de l'étape, comme l'opérateur les lira (dans la langue de l'instruction) : le genre,
 * le libellé, et ce qui juge la réponse. Un toucher ouvre le relevé. `bare` : sans cadre ni titre
 * (la fiche les range déjà dans sa carte).
 */
export function ChecksBlock({ step, language, readOnly, onEdit, onKeep, onDismiss, bare }: { step: Step; language: string; readOnly?: boolean; onEdit: (c: StepCheck) => void; onKeep: (c: StepCheck) => void; onDismiss: (c: StepCheck) => void; bare?: boolean }) {
  const t = useMessages().editor.checks
  const r = playerStrings(language).records
  const detail = (c: StepCheck): string => {
    const parts: string[] = []
    if (c.kind === 'measure') parts.push(rangeText(c, r) ?? c.unit ?? t.kinds.measure)
    else if (c.kind === 'yesno') parts.push(c.expected ? t.expectedLine(c.expected === 'yes' ? r.yes : r.no) : t.kinds.yesno)
    else if (c.kind === 'choice') parts.push((c.options ?? []).map((o) => (o.bad ? `${o.label} (${t.bad.toLowerCase()})` : o.label)).join(' · '))
    else if (c.kind === 'checklist') parts.push((c.items ?? []).map((i) => i.label).join(' · '))
    else if (c.kind === 'measures') parts.push([`${c.count ?? 3} × ${t.kinds.measure.toLowerCase()}`, rangeText(c, r) ?? c.unit].filter(Boolean).join(' · '))
    else parts.push(t.kinds[c.kind])
    if (c.optional) parts.push(t.optional.toLowerCase())
    return parts.join(' · ')
  }
  const list = (
    <ul>
      {(step.checks ?? []).map((c) => (
        <li key={c.id} className={cn(c.proposed && 'my-1 rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/60 dark:border-violet-500/40 dark:bg-violet-500/10')}>
          <button type="button" disabled={readOnly} onClick={() => onEdit(c)} aria-label={t.edit(c.label)} className={cn('btn-press flex min-h-12 w-full items-center gap-3 rounded-2xl px-2 py-1.5 text-left hover:bg-slate-900/5 disabled:cursor-default dark:hover:bg-white/5', c.proposed && 'opacity-80')}>
            <span className={c.proposed ? 'text-violet-600' : 'text-[var(--primary)]'}>{CHECK_ICONS[c.kind]()}</span>
            <span className="min-w-0 flex-1">
              {c.proposed && (
                <span className="mb-0.5 inline-flex items-center gap-1 rounded-md bg-violet-600 px-1.5 py-0.5 text-[10px] font-black tracking-wide text-white uppercase">
                  <Sparkles className="h-3 w-3" /> {t.proposed}
                </span>
              )}
              <span className="block text-lg leading-snug font-black text-slate-900 dark:text-white">{c.label}</span>
              <span className="block text-sm font-bold text-slate-500">{detail(c)}</span>
            </span>
            {!readOnly && !c.proposed && <PencilLine className="h-4 w-4 shrink-0 text-slate-400" />}
          </button>
          {/* L'IA propose, l'auteur dispose : gardé, il ira au poste ; retiré, il disparaît. */}
          {c.proposed && !readOnly && (
            <div className="flex flex-wrap items-center gap-2 px-2 pb-2">
              <p className="min-w-40 flex-1 text-xs font-bold text-violet-800 dark:text-violet-200">{t.proposedHint}</p>
              {/* Les deux gestes restent ensemble, à droite, même quand la phrase prend toute la ligne. */}
              <span className="ml-auto flex shrink-0 items-center gap-2">
                <button type="button" onClick={() => onDismiss(c)} className="btn-press h-11 rounded-2xl px-3 text-sm font-black text-slate-500 hover:bg-white/70">
                  {t.dismiss}
                </button>
                <button type="button" onClick={() => onKeep(c)} className="btn-press flex h-11 items-center gap-1.5 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white">
                  <Check className="h-4 w-4" strokeWidth={3} /> {t.keep}
                </button>
              </span>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
  if (bare) return list
  return (
    <div className="rounded-3xl border-2 border-[var(--primary)]/25 bg-white/70 p-3 dark:bg-white/5">
      <p className="label-caps mb-1 flex items-center gap-1.5 px-1 text-[var(--primary-strong)] dark:text-sky-300">
        <ClipboardCheck className="h-4 w-4" /> {t.title}
      </p>
      {list}
    </div>
  )
}

/** Garder un relevé proposé par l'IA : il perd sa marque et ira au poste. */
export const keepCheck = (c: StepCheck): StepCheck => (({ proposed: _p, ...rest }) => rest)(c)

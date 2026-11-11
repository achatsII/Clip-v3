'use client'

import { Check, ChevronLeft, ChevronRight, ImagePlus, Plus, Sparkles, TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { StepMediaArea } from '@/components/player/StepMediaArea'
import { AutoTextarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { WARNINGS } from '@/lib/model/catalog'
import type { InstructionContent, Source, Step, WarningLevel } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'
import { StepEditor } from './StepEditor'

const LABELS = { zoom: 'Agrandir', doIt: 'À faire', avoid: 'À éviter' }

/** Un texte modifiable qui garde l'allure du lecteur : on le touche, on écrit. */
const editable = 'w-full rounded-xl bg-transparent transition hover:bg-slate-900/[0.03] focus:bg-white/80 focus:ring-4 focus:ring-[rgba(var(--primary-rgb),0.18)] focus:outline-none dark:hover:bg-white/5 dark:focus:bg-slate-900/60'

/**
 * La vue « comme au poste » : l'étape telle que l'opérateur la verra — le grand média, le titre,
 * la mise en garde, le texte, les points clés — et chaque texte se modifie là où il est. Le média
 * se règle dans une fenêtre (les mêmes réglages que la fiche). Au téléphone : une étape à la fois,
 * avec une barre pour passer d'une étape à l'autre et en ajouter une.
 */
export function StageEditor({
  content,
  step,
  index,
  sources,
  readOnly,
  agentWorking,
  onChange,
  onSelect,
  onInsertAfter,
  onSourceAdded,
}: {
  content: InstructionContent
  step: Step
  index: number
  sources: Source[]
  readOnly?: boolean
  agentWorking?: boolean
  onChange: (s: Step) => void
  onSelect: (id: string) => void
  onInsertAfter: () => void
  onSourceAdded: (s: Source) => void
}) {
  const [mediaOpen, setMediaOpen] = useState(false)
  const total = content.steps.length
  const set = (patch: Partial<Step>) => onChange({ ...step, ...patch })
  const keyPoints = step.keyPoints ?? []

  return (
    <div>
      {/* Passer d'une étape à l'autre, comme au poste ; la barre reste en haut quand on descend écrire. */}
      <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 mb-2 flex items-center gap-1.5 rounded-2xl bg-white/95 px-1.5 py-1.5 shadow-[0_4px_16px_rgba(15,23,42,0.08)] lg:top-4 dark:bg-slate-900/95">
        <button type="button" onClick={() => onSelect(content.steps[index - 1]?.id)} disabled={index === 0} aria-label="Étape précédente" className="btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl hover:bg-slate-900/5 disabled:opacity-30 dark:hover:bg-white/10">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Aller à l’étape</span>
          <select value={step.id} onChange={(e) => onSelect(e.target.value)} className="h-11 w-full appearance-none truncate rounded-2xl bg-slate-900/5 px-4 pr-8 text-sm font-black dark:bg-white/10">
            {content.steps.map((s, i) => (
              <option key={s.id} value={s.id}>
                Étape {i + 1} sur {total} · {s.title}
              </option>
            ))}
          </select>
          <ChevronRight className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 rotate-90 text-slate-400" />
        </label>
        <button type="button" onClick={() => onSelect(content.steps[index + 1]?.id)} disabled={index >= total - 1} aria-label="Étape suivante" className="btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl hover:bg-slate-900/5 disabled:opacity-30 dark:hover:bg-white/10">
          <ChevronRight className="h-5 w-5" />
        </button>
        {!readOnly && (
          <button type="button" onClick={onInsertAfter} aria-label="Ajouter une étape après" title="Ajouter une étape après" className="btn-press bg-gradient-primary shadow-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white">
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className={cn('glass-panel overflow-hidden rounded-[32px] p-0 transition-shadow', agentWorking && 'ring-4 ring-violet-400/70')}>
      {agentWorking && (
        <p className="flex items-center gap-2 bg-violet-50 px-4 py-2 text-sm font-black text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
          <Sparkles className="h-4 w-4 animate-pulse" /> L’assistant modifie cette étape…
        </p>
      )}

      {/* Le média, comme au poste */}
      <div className="relative h-[42dvh] bg-slate-900 sm:h-[50dvh]">
        {step.media.length ? (
          <StepMediaArea key={step.id} step={step} labels={LABELS} />
        ) : (
          <button type="button" disabled={readOnly} onClick={() => setMediaOpen(true)} className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/80">
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
              <button type="button" onClick={() => setMediaOpen(true)} className="btn-press glass-card flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-black">
                <ImagePlus className="h-4 w-4" /> Modifier le média
              </button>
            )}
            <p className="text-xs font-bold text-slate-400">Touchez un texte pour le modifier.</p>
          </div>
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
              <AutoTextarea value={step.warning.text} readOnly={readOnly} onChange={(e) => set({ warning: { level: step.warning!.level, text: e.target.value } })} aria-label="Texte de la mise en garde" placeholder="Le risque, en une phrase" className={cn(editable, 'px-1 text-lg leading-snug font-black text-inherit placeholder:text-current/60 focus:bg-black/10 hover:bg-black/5 dark:focus:bg-black/20')} />
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
          <div className="rounded-3xl bg-primary-soft p-4">
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
      </div>

      </div>

      <Modal open={mediaOpen} onClose={() => setMediaOpen(false)} size="lg" title={`Média de l’étape ${index + 1}`}>
        <StepEditor content={content} step={step} index={index} sources={sources} readOnly={readOnly} section="media" onChange={onChange} onMove={() => undefined} onDelete={() => undefined} onDuplicate={() => undefined} onInsertAfter={onInsertAfter} onSourceAdded={onSourceAdded} />
      </Modal>
    </div>
  )
}

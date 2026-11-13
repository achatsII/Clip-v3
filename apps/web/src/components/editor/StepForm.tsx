'use client'

import { ArrowDown, ArrowUp, Check, ClipboardCheck, Copy, Heading, Image as ImageIcon, Loader2, MessageCircle, Plus, Radio, Sparkles, Trash2, TriangleAlert, Type, X } from 'lucide-react'
import { useState } from 'react'
import { AiCost } from '@/components/billing/AiCost'
import { AutoTextarea, fieldLook, Input, Label } from '@/components/ui/Field'
import { locale, useMessages } from '@/lib/i18n'
import { WARNINGS } from '@/lib/model/catalog'
import { removeSection, startSection, startsSection } from '@/lib/model/sections'
import type { Check as StepCheck, InstructionContent, Source, Step, WarningLevel } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'
import { CheckDialog } from './CheckDialog'
import { iconButton } from './EditorBar'
import { FormCard } from './FormParts'
import { ASSIST_ACTIONS, type useStepAssist } from './StepAssist'
import { StepMediaEditor } from './StepMediaEditor'
import { ChecksBlock, keepCheck, SectionField, type StepActions } from './StepParts'

/** Du moins grave au plus grave : l'ordre où on les choisit. */
const LEVELS: WarningLevel[] = ['info', 'caution', 'danger']
const MAX_KEY_POINTS = 3
/** Une retouche par l'IA : deux par rangée au téléphone, à la suite au bureau. */
const chipShape = 'btn-press flex min-h-11 items-center justify-center gap-1.5 rounded-2xl px-3 py-2 text-center text-sm leading-tight font-black disabled:opacity-50'
const chip = cn(chipShape, 'glass-card text-slate-800 dark:text-slate-100')
const chipGhost = cn(chipShape, 'text-violet-800 hover:bg-white/60 dark:text-violet-200 dark:hover:bg-white/5')
const MAX_CHECKS = 4

export interface StepFormProps extends StepActions {
  content: InstructionContent
  step: Step
  sources: Source[]
  readOnly?: boolean
  records?: boolean
  assist: ReturnType<typeof useStepAssist>
  agentWorking?: boolean
  remoteNote?: string | null
  feedbackNote?: string | null
  namingSection: boolean
  onChange: (s: Step) => void
  onSourceAdded: (s: Source) => void
  onAssistant: () => void
}

/**
 * Une étape dans la fiche : tout ce qu'on peut y faire, à découvert et rangé en cartes — le texte
 * (et ses retouches par l'IA), le média, la mise en garde, les points clés, les relevés, la
 * section. En tête, sa place dans l'instruction et ses gestes (monter, descendre, dupliquer,
 * supprimer) ; à la fin, ajouter l'étape suivante.
 */
export function StepForm(p: StepFormProps) {
  const t = useMessages()
  const tf = t.editor.form
  const { step, index } = p
  const total = p.steps.length
  // Une étape d'un bloc commun se modifie dans le bloc : ici, elle se lit seulement.
  const readOnly = p.readOnly || !!step.fromBlock
  const set = (patch: Partial<Step>) => p.onChange({ ...step, ...patch })
  const keyPoints = step.keyPoints ?? []
  const warning = step.warning
  const checks = step.checks ?? []
  const setChecks = (list: StepCheck[]) => set({ checks: list.length ? list : undefined })
  const [editingCheck, setEditingCheck] = useState<StepCheck | 'new' | null>(null)
  const words = step.text.split(/\s+/).filter(Boolean).length
  const opens = startsSection(p.steps, index)

  return (
    <div id="step-editor" className={cn('scroll-mt-24 space-y-4 rounded-[32px] transition-shadow', p.agentWorking && 'ring-4 ring-violet-400/70 ring-offset-4 ring-offset-slate-50 dark:ring-offset-slate-950', p.remoteNote && !p.agentWorking && 'ring-4 ring-sky-400/80 ring-offset-4 ring-offset-slate-50 dark:ring-offset-slate-950')}>
      {/* Sa place, et ses gestes */}
      <div className="flex items-center gap-3">
        <span className="bg-gradient-primary shadow-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white tabular-nums">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="label-caps truncate text-slate-500">{t.editor.step.of(index + 1, total)}</p>
          {p.sections && step.section && <p className="label-caps truncate text-[var(--primary-strong)] dark:text-sky-300">{step.section}</p>}
        </div>
        {!readOnly && (
          <div className="flex shrink-0 items-center" role="group" aria-label={t.editor.stage.stepActions}>
            <button type="button" onClick={() => p.onMove(-1)} disabled={index === 0} aria-label={tf.moveUp} title={tf.moveUp} className={iconButton}>
              <ArrowUp className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => p.onMove(1)} disabled={index >= total - 1} aria-label={tf.moveDown} title={tf.moveDown} className={iconButton}>
              <ArrowDown className="h-5 w-5" />
            </button>
            <button type="button" onClick={p.onDuplicate} aria-label={t.editor.step.duplicate} title={t.editor.step.duplicate} className={iconButton}>
              <Copy className="h-5 w-5" />
            </button>
            <button type="button" onClick={p.onDelete} aria-label={t.editor.step.delete} title={t.editor.step.delete} className={cn(iconButton, 'hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10')}>
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

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

      {/* Le texte, et l'IA qui le retouche */}
      <FormCard icon={<Type className="h-4 w-4" />} title={tf.text}>
        <div className="space-y-4">
          <div>
            <Label htmlFor={`f-title-${step.id}`}>{tf.action}</Label>
            <AutoTextarea id={`f-title-${step.id}`} singleLine value={step.title} readOnly={readOnly} onChange={(e) => set({ title: e.target.value })} placeholder={t.editor.stage.titlePlaceholder} className={cn(fieldLook, 'text-lg font-black')} />
          </div>
          <div>
            <Label htmlFor={`f-text-${step.id}`} hint={tf.words(words)}>
              {tf.how}
            </Label>
            <AutoTextarea id={`f-text-${step.id}`} value={step.text} readOnly={readOnly} onChange={(e) => set({ text: e.target.value })} placeholder={t.editor.stage.textPlaceholder} className={cn(fieldLook, 'min-h-24 text-base')} />
          </div>
        </div>
        {!readOnly && (
          <div className="mt-4 rounded-2xl bg-violet-50/80 p-3 dark:bg-violet-500/10">
            <p className="label-caps mb-2 flex flex-wrap items-center gap-1.5 text-violet-700 dark:text-violet-200">
              <Sparkles className="h-3.5 w-3.5" /> {tf.ai} <AiCost operation="step_assist" className="font-bold tracking-normal normal-case opacity-80" />
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {ASSIST_ACTIONS.map((k) => (
                <button key={k} type="button" onClick={() => void p.assist.run(k)} disabled={!!p.assist.busy} className={chip}>
                  {p.assist.busy === k && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
                  {t.editor.assist.actions[k]}
                </button>
              ))}
              <button type="button" onClick={p.assist.openCustom} disabled={!!p.assist.busy} className={chip}>
                {tf.otherRequest}
              </button>
              <button type="button" onClick={p.onAssistant} className={chipGhost}>
                <MessageCircle className="h-4 w-4 shrink-0" /> {tf.openAssistant}
              </button>
            </div>
          </div>
        )}
      </FormCard>

      {/* Le média : l'aperçu et tous ses réglages */}
      <FormCard icon={<ImageIcon className="h-4 w-4" />} title={tf.media}>
        <StepMediaEditor content={p.content} step={step} sources={p.sources} readOnly={readOnly} onChange={p.onChange} onSourceAdded={p.onSourceAdded} expanded />
      </FormCard>

      {/* La mise en garde : son niveau, puis son texte, de la couleur du poste */}
      <FormCard icon={<TriangleAlert className="h-4 w-4" />} title={tf.warning}>
        <div role="radiogroup" aria-label={t.editor.stage.warningLevel} className="flex flex-wrap gap-1.5">
          {([null, ...LEVELS] as Array<WarningLevel | null>).map((level) => {
            const on = (warning?.level ?? null) === level
            return (
              <button
                key={level ?? 'none'}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={readOnly}
                onClick={() => set({ warning: level ? { level, text: warning?.text ?? '' } : null })}
                className={cn('btn-press flex h-11 items-center gap-1.5 rounded-2xl px-4 text-sm font-black disabled:cursor-default', on ? (level ? WARNINGS[level].className : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900') : 'glass-card text-slate-600 dark:text-slate-300')}
              >
                {on && <Check className="h-4 w-4" />}
                {level ? WARNINGS[level].label : tf.noWarning}
              </button>
            )
          })}
        </div>
        {warning && (
          <div className={cn('mt-3 flex items-start gap-3 rounded-3xl p-4 shadow-lg', WARNINGS[warning.level].className)}>
            <TriangleAlert className="mt-1 h-6 w-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <AutoTextarea autoFocus={!readOnly && !warning.text} value={warning.text} readOnly={readOnly} onChange={(e) => set({ warning: { level: warning.level, text: e.target.value } })} aria-label={t.editor.step.warningText} placeholder={t.editor.stage.warningPlaceholder} className="w-full rounded-xl bg-transparent px-1 text-lg leading-snug font-black text-inherit transition placeholder:text-current/60 hover:bg-black/5 focus:bg-black/10 focus:outline-none dark:focus:bg-black/20" />
            </div>
          </div>
        )}
      </FormCard>

      {/* Les points clés */}
      <FormCard icon={<Check className="h-4 w-4" />} title={t.editor.step.keyPoints} hint={tf.keyPointsHint}>
        {keyPoints.length > 0 && (
          <ul className="mb-2 space-y-2">
            {keyPoints.map((k, i) => (
              <li key={i} className="flex items-center gap-2">
                <Input autoFocus={!readOnly && !k && i === keyPoints.length - 1} value={k} readOnly={readOnly} onChange={(e) => set({ keyPoints: keyPoints.map((x, j) => (j === i ? e.target.value : x)) })} aria-label={t.editor.stage.keyPoint(i + 1)} wrapperClassName="flex-1" />
                {!readOnly && (
                  <button type="button" onClick={() => set({ keyPoints: keyPoints.filter((_, j) => j !== i) })} aria-label={t.editor.step.removeKeyPoint} title={t.editor.step.removeKeyPoint} className={iconButton}>
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {!readOnly && keyPoints.length < MAX_KEY_POINTS && (
          <button type="button" onClick={() => set({ keyPoints: [...keyPoints, ''] })} className="btn-press hover:bg-primary-soft flex h-11 items-center gap-1.5 rounded-2xl px-3 text-sm font-black text-[var(--primary)]">
            <Plus className="h-4 w-4" /> {t.editor.step.addKeyPoint}
          </button>
        )}
      </FormCard>

      {/* Les relevés (toggle `records`) */}
      {p.records && (
        <FormCard icon={<ClipboardCheck className="h-4 w-4" />} title={tf.checks} hint={tf.checksHint}>
          {checks.length > 0 && (
            <div className="mb-2">
              <ChecksBlock bare step={step} language={p.content.language} readOnly={readOnly} onEdit={setEditingCheck} onKeep={(c) => setChecks(checks.map((x) => (x.id === c.id ? keepCheck(x) : x)))} onDismiss={(c) => setChecks(checks.filter((x) => x.id !== c.id))} />
            </div>
          )}
          {!readOnly && checks.length < MAX_CHECKS && (
            <button type="button" onClick={() => setEditingCheck('new')} className="btn-press hover:bg-primary-soft flex h-11 items-center gap-1.5 rounded-2xl px-3 text-sm font-black text-[var(--primary)]">
              <Plus className="h-4 w-4" /> {tf.addCheck}
            </button>
          )}
        </FormCard>
      )}

      {/* La section (toggle `sections`) : les phases d'une longue instruction */}
      {p.sections && !readOnly && (
        <FormCard icon={<Heading className="h-4 w-4" />} title={tf.section} hint={tf.sectionHint}>
          {step.section ? (
            <div className="space-y-2">
              <div className="glass-input flex h-12 items-center rounded-2xl px-2">
                <SectionField steps={p.steps} index={index} naming={p.namingSection} onNamed={() => p.onNamingSection(false)} onSteps={p.onSteps} />
              </div>
              <div className="flex flex-wrap gap-1">
                {!opens && (
                  <button type="button" onClick={() => { p.onSteps(startSection(p.steps, index, t.editor.stage.newSectionName)); p.onNamingSection(true) }} className="btn-press hover:bg-primary-soft flex h-11 items-center gap-1.5 rounded-2xl px-3 text-sm font-black text-[var(--primary)]">
                    <Plus className="h-4 w-4" /> {t.editor.stage.newSection}
                  </button>
                )}
                <button type="button" onClick={() => p.onSteps(removeSection(p.steps, index))} className="btn-press flex h-11 items-center gap-1.5 rounded-2xl px-3 text-sm font-black text-slate-500 hover:bg-slate-900/5 dark:hover:bg-white/5">
                  <X className="h-4 w-4" /> {t.editor.stage.removeSection}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => { p.onSteps(startSection(p.steps, index, t.editor.stage.newSectionName)); p.onNamingSection(true) }} className="btn-press hover:bg-primary-soft flex h-11 items-center gap-1.5 rounded-2xl px-3 text-sm font-black text-[var(--primary)]">
              <Plus className="h-4 w-4" /> {tf.startSection}
            </button>
          )}
        </FormCard>
      )}

      {!readOnly && (
        <button type="button" onClick={p.onInsertAfter} className="btn-press flex h-14 w-full items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-slate-300 text-sm font-black text-slate-500 hover:border-[var(--primary)] hover:text-[var(--primary)] dark:border-slate-700">
          <Plus className="h-4 w-4" /> {tf.addAfter}
        </button>
      )}

      {editingCheck && (
        <CheckDialog
          check={editingCheck === 'new' ? null : editingCheck}
          locale={locale()}
          onClose={() => setEditingCheck(null)}
          onSave={(c) => setChecks(editingCheck === 'new' ? [...checks, c] : checks.map((x) => (x.id === c.id ? c : x)))}
          onRemove={editingCheck === 'new' ? undefined : () => setChecks(checks.filter((x) => x.id !== editingCheck.id))}
        />
      )}
    </div>
  )
}

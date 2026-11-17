'use client'

/**
 * Où s'applique une étape (toggle `variants`) et si elle reste dans la version courte (toggle
 * `quickMode`), dans les deux vues de l'éditeur. « Toutes », ou les variantes de l'étape ; l'étoile
 * « Essentielle », toujours allumée pour une étape avec un relevé ou une mise en garde.
 */
import { Star } from 'lucide-react'
import { useMessages } from '@/lib/i18n'
import { alwaysEssential, hasVariants, isEssential } from '@/lib/model/variants'
import type { InstructionContent, Step } from '@/lib/model/types'
import { useToggle } from '@/lib/toggles'
import { cn } from '@/lib/util/cn'

const chip = 'btn-press flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-black disabled:cursor-default'
const on = 'bg-gradient-primary shadow-primary text-white'
const off = 'glass-card text-slate-700 dark:text-slate-200'

export function StepScope({ content, step, onChange, readOnly, className }: { content: InstructionContent; step: Step; onChange: (s: Step) => void; readOnly?: boolean; className?: string }) {
  const t = useMessages().editor.variants
  const variantsOn = useToggle('variants') && hasVariants(content)
  const quickOn = useToggle('quickMode') && !!content.quick
  if (!variantsOn && !quickOn) return null
  const mine = step.variants ?? []
  const all = (content.variants ?? []).map((v) => v.id)
  const set = (ids: string[]) => {
    // Toutes les variantes, c'est partout : rien à noter.
    const next = ids.length && ids.length < all.length ? all.filter((id) => ids.includes(id)) : []
    if (next.length) onChange({ ...step, variants: next })
    else {
      const { variants: _v, ...rest } = step
      onChange(rest)
    }
  }
  const locked = alwaysEssential(step)
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {variantsOn && (
        <>
          <span className="label-caps mr-1 text-slate-500 dark:text-slate-400">{t.forLabel}</span>
          <button type="button" disabled={readOnly} aria-pressed={!mine.length} onClick={() => set([])} className={cn(chip, !mine.length ? on : off)}>
            {t.all}
          </button>
          {(content.variants ?? []).map((v) => {
            const sel = mine.includes(v.id)
            return (
              <button key={v.id} type="button" disabled={readOnly} aria-pressed={sel} onClick={() => set(sel ? mine.filter((x) => x !== v.id) : [...mine, v.id])} className={cn(chip, sel ? on : off)}>
                {v.name}
              </button>
            )
          })}
        </>
      )}
      {quickOn && (
        <button
          type="button"
          disabled={readOnly || locked}
          aria-pressed={isEssential(step)}
          onClick={() => onChange({ ...step, essential: !step.essential })}
          title={locked ? t.alwaysEssential : t.essentialHint}
          className={cn(chip, isEssential(step) ? 'bg-amber-400 text-amber-950 shadow-sm' : off, variantsOn && 'sm:ml-auto')}
        >
          <Star className={cn('h-4 w-4', isEssential(step) && 'fill-current')} /> {t.essential}
        </button>
      )}
    </div>
  )
}

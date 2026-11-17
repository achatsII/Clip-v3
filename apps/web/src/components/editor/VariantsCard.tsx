'use client'

/**
 * Les variantes d'une instruction (toggle `variants`) et sa version courte (toggle `quickMode`), dans
 * les infos de l'instruction : des noms de variantes (« Pompe A », « Pompe B ») et ce qui change, puis,
 * si l'auteur le veut, la version courte pour les habitués. Où s'applique chaque étape se dit sur
 * l'étape (`StepScope`). `src/lib/model/variants.ts`.
 */
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Label, Switch } from '@/components/ui/Field'
import { useMessages } from '@/lib/i18n'
import { MAX_VARIANTS, MAX_VARIANT_NAME, newVariant, removeVariant, withQuick } from '@/lib/model/variants'
import type { InstructionContent } from '@/lib/model/types'
import { useToggle } from '@/lib/toggles'

/** Rien à montrer quand les deux toggles sont coupés. */
export function useVariantsCard(): boolean {
  const variants = useToggle('variants')
  const quick = useToggle('quickMode')
  return variants || quick
}

export function VariantsCard({ content, onChange, readOnly }: { content: InstructionContent; onChange: (c: InstructionContent) => void; readOnly?: boolean }) {
  const t = useMessages().editor.variants
  const variantsOn = useToggle('variants')
  const quickOn = useToggle('quickMode')
  const [name, setName] = useState('')
  const list = content.variants ?? []
  const add = () => {
    const n = name.trim()
    if (!n || list.length >= MAX_VARIANTS || list.some((v) => v.name.toLowerCase() === n.toLowerCase())) return
    onChange({ ...content, variants: [...list, newVariant(n)] })
    setName('')
  }
  return (
    <div className="space-y-5">
      {variantsOn && (
        <section className="space-y-3">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t.intro}</p>
          {list.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {list.map((v) => (
                <span key={v.id} className="glass-card flex h-11 items-center gap-1 rounded-full pr-1 pl-4 text-sm font-black">
                  {v.name}
                  {!readOnly && (
                    <button type="button" onClick={() => onChange(removeVariant(content, v.id))} aria-label={t.remove(v.name)} title={t.remove(v.name)} className="btn-press flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-900/5 dark:hover:bg-white/10">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          {!readOnly && list.length < MAX_VARIANTS && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                add()
              }}
            >
              <Input value={name} maxLength={MAX_VARIANT_NAME} onChange={(e) => setName(e.target.value)} placeholder={t.addPlaceholder} aria-label={t.title} wrapperClassName="flex-1" />
              <Button type="submit" disabled={!name.trim()} icon={<Plus className="h-4 w-4" />}>
                {t.add}
              </Button>
            </form>
          )}
          {list.length === 1 && <p className="text-xs font-bold text-amber-700 dark:text-amber-300">{t.needTwo}</p>}
          {list.length >= MAX_VARIANTS && <p className="text-xs font-bold text-slate-400">{t.tooMany(MAX_VARIANTS)}</p>}
          {list.length >= 2 && (
            <div>
              <Label htmlFor="variants-label">{t.label}</Label>
              <Input id="variants-label" value={content.variantsLabel ?? ''} readOnly={readOnly} maxLength={MAX_VARIANT_NAME} onChange={(e) => onChange({ ...content, variantsLabel: e.target.value || undefined })} placeholder={t.labelPlaceholder} />
              <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">{t.stepHint}</p>
            </div>
          )}
        </section>
      )}
      {quickOn && <Switch checked={!!content.quick} disabled={readOnly} onChange={(on) => onChange(withQuick(content, on))} label={t.quick} description={t.quickHint} />}
    </div>
  )
}

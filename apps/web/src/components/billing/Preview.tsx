'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Eye, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Label, Segmented } from '@/components/ui/Field'
import { addonFor, MODULES } from '@/lib/billing/catalog'
import { CREDIT_LEVELS, DEFAULT_PREVIEW, PREVIEW_BASE_PLANS, PREVIEW_PLANS, readPreview, writePreview, type PreviewSelection } from '@/lib/billing/preview'
import { useBilling } from '@/lib/billing/state'
import { useMessages } from '@/lib/i18n'
import { cn } from '@/lib/util/cn'
import { MODULE_ICONS, useModules } from './Modules'

/**
 * L'aperçu de la facturation, en tête de la page Abonnement : ce que l'usine aurait (plan, modules,
 * crédits), choisi dans cet appareil. Toute l'app suit aussitôt : cadenas, invitations à l'essai,
 * jauges, conseiller d'achat. Rien ne s'achète, rien n'est débité.
 */
export function PreviewPanel() {
  const t = useMessages().billing
  const w = t.preview
  const { refresh } = useBilling()
  const queryClient = useQueryClient()
  const modules = useModules()
  const [sel, setSel] = useState<PreviewSelection>(readPreview)

  function change(next: PreviewSelection) {
    writePreview(next)
    const saved = readPreview()
    setSel(saved)
    void refresh()
    void queryClient.invalidateQueries({ queryKey: ['billing-plans'] })
  }

  const isDefault = sel.plan === DEFAULT_PREVIEW.plan && sel.credits === DEFAULT_PREVIEW.credits && DEFAULT_PREVIEW.modules.every((k) => sel.modules.includes(k))
  return (
    <section aria-label={w.title} className="rounded-[28px] border-2 border-dashed border-violet-300 bg-violet-50/70 p-5 dark:border-violet-500/40 dark:bg-violet-500/10">
      <div className="flex flex-wrap items-start gap-3">
        <span className="bg-gradient-accent shadow-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white">
          <Eye className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="label-caps text-violet-700 dark:text-violet-300">{w.eyebrow}</p>
          <h2 className="text-xl font-black tracking-tight">{w.title}</h2>
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{w.text}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[auto_1fr_auto]">
        <div>
          <Label>{w.plan}</Label>
          <Segmented value={sel.plan} onChange={(plan) => change({ ...sel, plan })} options={PREVIEW_BASE_PLANS.map((code) => ({ value: code, label: PREVIEW_PLANS.find((p) => p.code === code)!.name }))} />
        </div>
        <div>
          <Label>{w.modules}</Label>
          <div className="flex flex-wrap gap-2">
            {modules.map((m) => {
              const def = MODULES.find((x) => x.key === m.key)!
              const allowed = !!addonFor(def, sel.plan)
              const on = sel.modules.includes(m.key)
              return (
                <button
                  key={m.key}
                  type="button"
                  aria-pressed={on}
                  disabled={!allowed}
                  onClick={() => change({ ...sel, modules: on ? sel.modules.filter((k) => k !== m.key) : [...sel.modules, m.key] })}
                  className={cn('btn-press flex h-11 items-center gap-2 rounded-2xl px-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50', on ? 'bg-violet-600 text-white' : 'glass-card text-slate-700 dark:text-slate-200')}
                >
                  <span className="[&>svg]:h-4 [&>svg]:w-4">{MODULE_ICONS[m.key]}</span> {t.modules[m.key].name}
                </button>
              )
            })}
          </div>
          {modules.some((m) => !addonFor(MODULES.find((x) => x.key === m.key)!, sel.plan)) && <p className="mt-1.5 text-xs font-bold text-slate-500">{w.modulesNeed}</p>}
        </div>
        <div>
          <Label>{w.credits}</Label>
          <Segmented value={sel.credits} onChange={(credits) => change({ ...sel, credits })} options={CREDIT_LEVELS.map((c) => ({ value: c, label: w.creditLevels[c] }))} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-slate-500">
        <span>{w.deviceOnly}</span>
        {!isDefault && (
          <button type="button" onClick={() => change(DEFAULT_PREVIEW)} className="btn-press inline-flex h-9 items-center gap-1.5 rounded-xl px-2 font-black text-violet-700 hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-violet-500/20">
            <RotateCcw className="h-3.5 w-3.5" /> {w.reset}
          </button>
        )}
      </div>
    </section>
  )
}

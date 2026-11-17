'use client'

/**
 * La mise en page du PDF, à côté de son aperçu (toggle `printTemplates`, `src/lib/pdf/template.ts`).
 * La disposition et l'orientation sont à tous ; le cartouche, le pied de page, la couleur et « D'après
 * un exemple » viennent avec le logo et les couleurs de l'usine (`brand_kit`) : fermés, ils ouvrent
 * la fenêtre des forfaits. Qui règle l'usine enregistre la mise en page pour toutes les instructions.
 */
import { FileText, LayoutGrid, RectangleHorizontal, RectangleVertical, Rows3, Sparkles } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { LockBadge } from '@/components/billing/Billing'
import { Button } from '@/components/ui/Button'
import { ChoiceTile, Input, Label, Segmented, Switch } from '@/components/ui/Field'
import type { Entitlement } from '@/lib/billing/state'
import { useGate } from '@/lib/billing/state'
import { useMessages } from '@/lib/i18n'
import { HEADER_FIELDS, LAYOUTS, sameTemplate, shows, type PrintLayout, type PrintTemplate } from '@/lib/pdf/template'
import { cn } from '@/lib/util/cn'

const LAYOUT_ICONS: Record<PrintLayout, ReactNode> = {
  cards: <LayoutGrid className="h-5 w-5" />,
  table: <Rows3 className="h-5 w-5" />,
  onePage: <FileText className="h-5 w-5" />,
}

const aiButton = 'btn-press bg-gradient-accent flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl px-3.5 text-sm font-black text-white disabled:opacity-60'

export function PrintLayoutPanel({
  value,
  onChange,
  brand,
  plant,
  plantColor,
  canSave,
  saving,
  onSave,
  onExample,
  readingExample,
  note,
}: {
  value: PrintTemplate
  onChange: (t: PrintTemplate) => void
  /** Le droit au logo et aux couleurs de l'usine (`brand_kit`). */
  brand: Entitlement
  /** La mise en page enregistrée pour l'usine. */
  plant: PrintTemplate
  plantColor: string
  canSave: boolean
  saving: boolean
  onSave: () => void
  onExample: (file: File) => void
  readingExample: boolean
  /** Ce que dit « Une page » : réduit à tant, ou trop long. */
  note?: string | null
}) {
  const t = useMessages().instructions.printPreview
  const gate = useGate()
  const locked = brand === 'locked'
  const custom = (fn: () => void) => gate(brand, 'brand_kit', fn)
  const set = (patch: Partial<PrintTemplate>) => onChange({ ...value, ...patch })
  const exampleInput = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xs font-black tracking-widest text-slate-500 uppercase dark:text-slate-400">{t.layoutTitle}</h2>
        <div className="mt-2 grid gap-2">
          {LAYOUTS.map((l) => (
            <ChoiceTile key={l} selected={value.layout === l} onClick={() => set({ layout: l })} icon={LAYOUT_ICONS[l]} title={t.layouts[l].label} description={t.layouts[l].hint} />
          ))}
        </div>
        {note && (
          <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400" role="status">
            {note}
          </p>
        )}
      </section>

      <section>
        <Label>{t.orientation}</Label>
        <Segmented
          size="sm"
          value={value.orientation}
          onChange={(orientation) => set({ orientation })}
          options={[
            { value: 'portrait', label: t.portrait, icon: <RectangleVertical className="h-4 w-4" /> },
            { value: 'landscape', label: t.landscape, icon: <RectangleHorizontal className="h-4 w-4" /> },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xs font-black tracking-widest text-slate-500 uppercase dark:text-slate-400">
          {t.header} {locked && <LockBadge />}
        </h2>
        <div className="flex flex-wrap gap-2">
          {HEADER_FIELDS.map((f) => {
            const on = shows(value, f)
            return (
              <button
                key={f}
                type="button"
                aria-pressed={on}
                onClick={() => custom(() => set({ fields: { ...value.fields, [f]: !on } }))}
                className={cn('btn-press h-11 rounded-2xl px-3 text-sm font-black', on ? 'bg-[var(--primary-soft)] text-[var(--primary-strong)] dark:text-[var(--primary-light)]' : 'glass-card text-slate-500 line-through dark:text-slate-400')}
              >
                {t.fields[f]}
              </button>
            )
          })}
        </div>
        <div>
          <Label htmlFor="print-footer">{t.footer}</Label>
          <Input id="print-footer" value={value.footer ?? ''} placeholder={t.footerPlaceholder} readOnly={locked} onClick={() => locked && custom(() => undefined)} onChange={(e) => set({ footer: e.target.value })} maxLength={160} />
        </div>
        <Switch checked={value.pageNumbers !== false} onChange={(v) => custom(() => set({ pageNumbers: v }))} label={t.pageNumbers} />
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor="print-color">{t.color}</Label>
          <input
            id="print-color"
            type="color"
            value={value.accent ?? plantColor}
            onClick={(e) => {
              if (!locked) return
              e.preventDefault()
              custom(() => undefined)
            }}
            onChange={(e) => set({ accent: e.target.value })}
            className="h-11 w-14 cursor-pointer rounded-xl border-0 bg-transparent"
          />
          {value.accent && (
            <Button size="sm" variant="ghost" onClick={() => set({ accent: null })}>
              {t.plantColor}
            </Button>
          )}
        </div>
        <div>
          <button type="button" disabled={readingExample} onClick={() => custom(() => exampleInput.current?.click())} className={aiButton}>
            <Sparkles className={cn('h-4 w-4', readingExample && 'animate-pulse')} /> {t.fromExample}
          </button>
          <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">{t.fromExampleHint}</p>
          <input
            ref={exampleInput}
            type="file"
            accept=".pdf,.doc,.docx,.odt,image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) onExample(file)
            }}
          />
        </div>
        {locked && <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.brandHint}</p>}
      </section>

      {canSave &&
        (sameTemplate(value, plant) ? (
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t.plantDefault}</p>
        ) : (
          <Button className="w-full" loading={saving} onClick={onSave}>
            {t.saveForPlant}
          </Button>
        ))}
    </div>
  )
}

'use client'

import { Check, ChevronDown, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useMessages } from '@/lib/i18n'
import type { Labels, Nomenclature, TagFamily } from '@/lib/model/nomenclature'
import { cn, normalizeText } from '@/lib/util/cn'

/**
 * Les filtres de la bibliothèque par famille d'étiquettes (toggle `nomenclature`) : une pastille par
 * famille en liste, puis une fenêtre où l'on coche une ou plusieurs valeurs (l'une suffit). Une
 * valeur libre (un numéro) se cherche dans la barre de recherche, qui la trouve dans l'index.
 */
export function LabelFilters({ nomenclature, value, onChange }: { nomenclature: Nomenclature; value: Labels; onChange: (labels: Labels) => void }) {
  const [open, setOpen] = useState<TagFamily | null>(null)
  const families = nomenclature.families.filter((f) => f.kind === 'list' && f.values.length)
  const t = useMessages().nomenclature.filter
  if (!families.length) return null
  const set = (id: string, values: string[]) => {
    const next = { ...value }
    if (values.length) next[id] = values
    else delete next[id]
    onChange(next)
  }
  return (
    <>
      {families.map((f) => {
        const picked = value[f.id] ?? []
        const label = picked.length ? `${picked[0]}${picked.length > 1 ? ` ${t.more(picked.length - 1)}` : ''}` : f.name
        return (
          <span key={f.id} className="flex shrink-0 items-center">
            <button type="button" onClick={() => setOpen(f)} aria-haspopup="dialog" aria-label={picked.length ? `${f.name} : ${picked.join(', ')}` : f.name} className={cn('btn-press flex h-11 items-center gap-1.5 px-3 text-xs font-black', picked.length ? 'rounded-l-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'glass-card rounded-2xl')}>
              <span className="max-w-40 truncate">{label}</span>
              {!picked.length && <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />}
            </button>
            {!!picked.length && (
              <button type="button" onClick={() => set(f.id, [])} aria-label={t.clear} title={t.clear} className="btn-press flex h-11 w-10 items-center justify-center rounded-r-2xl border-l border-white/20 bg-slate-900 text-white dark:border-slate-900/10 dark:bg-white dark:text-slate-900">
                <X className="h-4 w-4" />
              </button>
            )}
          </span>
        )
      })}
      {open && <FamilyPicker family={open} selected={value[open.id] ?? []} onClose={() => setOpen(null)} onChange={(v) => set(open.id, v)} />}
    </>
  )
}

function FamilyPicker({ family, selected, onClose, onChange }: { family: TagFamily; selected: string[]; onClose: () => void; onChange: (v: string[]) => void }) {
  const t = useMessages().nomenclature.filter
  const [query, setQuery] = useState('')
  const q = normalizeText(query.trim())
  const shown = family.values.filter((v) => !q || normalizeText(`${v.label} ${v.code ?? ''}`).includes(q))
  return (
    <Modal
      open
      onClose={onClose}
      title={t.title(family.name)}
      footer={
        <>
          {!!selected.length && <Button onClick={() => onChange([])}>{t.clear}</Button>}
          <Button variant="primary" onClick={onClose}>
            {t.apply}
          </Button>
        </>
      }
    >
      {family.values.length > 8 && <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} className="mb-3 h-12" />}
      <div className="grid gap-1.5 sm:grid-cols-2">
        {shown.map((v) => {
          const on = selected.includes(v.label)
          return (
            <button key={v.label} type="button" aria-pressed={on} onClick={() => onChange(on ? selected.filter((x) => x !== v.label) : [...selected, v.label])} className={cn('btn-press flex min-h-12 items-center gap-2 rounded-2xl px-3 text-left text-sm font-black', on ? 'bg-primary-soft text-[var(--primary-strong)] dark:text-[var(--primary-light)]' : 'glass-card')}>
              <span className="min-w-0 flex-1 truncate">{v.label}</span>
              {v.code && <span className="shrink-0 text-xs font-bold text-slate-400">{v.code}</span>}
              {on && <Check className="h-4 w-4 shrink-0" />}
            </button>
          )
        })}
      </div>
      {!shown.length && <p className="px-1 py-2 text-sm font-bold text-slate-500">{t.none}</p>}
    </Modal>
  )
}

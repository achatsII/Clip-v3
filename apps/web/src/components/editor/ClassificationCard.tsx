'use client'

import { Check, Hash, MapPin, Plus, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useMessages } from '@/lib/i18n'
import { cleanValue, knownValue, norm, type Labels, type Nomenclature, type TagFamily } from '@/lib/model/nomenclature'
import { cn, normalizeText } from '@/lib/util/cn'

export interface ClassificationProps {
  labels: Labels
  nomenclature: Nomenclature
  readOnly?: boolean
  onChange: (labels: Labels) => void
  /** L'IA a classé l'instruction et personne n'a encore regardé. */
  aiCheck?: boolean
  onConfirm?: () => void
  /** Proposer le classement avec l'IA (à la demande) ; absent sans IA. */
  onSuggest?: () => Promise<void>
  /** Les postes où l'instruction va par leur règle. */
  ruleStations?: string[]
  /** Ajouter une valeur à une liste de l'usine (un administrateur) ; absent sinon. */
  onAddValue?: (familyId: string, value: string) => Promise<void>
  canSetUp?: boolean
}

/**
 * Le classement d'une instruction (toggle `nomenclature`) : une ligne par famille de l'usine, ses
 * valeurs en pastilles. Une liste se choisit dans une fenêtre (avec recherche dès 8 valeurs) ; une
 * valeur libre s'écrit, puis Entrée. L'IA propose, d'un toucher ; on retire ce qui ne va pas.
 */
export function ClassificationCard(p: ClassificationProps) {
  const t = useMessages().nomenclature.card
  const [picking, setPicking] = useState<TagFamily | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const families = p.nomenclature.families
  if (!families.length) {
    return (
      <div className="rounded-2xl bg-slate-900/5 p-4 text-sm font-bold text-slate-600 dark:bg-white/5 dark:text-slate-300">
        {t.noFamilies}{' '}
        {p.canSetUp && (
          <Link href="/reglages?onglet=classement" className="font-black text-[var(--primary-strong)] underline-offset-2 hover:underline dark:text-[var(--primary-light)]">
            {t.createFamilies}
          </Link>
        )}
      </div>
    )
  }
  const set = (familyId: string, values: string[]) => {
    const next: Labels = { ...p.labels }
    if (values.length) next[familyId] = values
    else delete next[familyId]
    p.onChange(next)
  }

  return (
    <div className="space-y-4">
      {p.aiCheck && !p.readOnly && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-violet-50 px-4 py-3 dark:bg-violet-500/10">
          <Sparkles className="h-5 w-5 shrink-0 text-violet-600 dark:text-violet-300" />
          <p className="min-w-0 flex-1 text-sm font-bold text-violet-900 dark:text-violet-100">{t.aiCheck}</p>
          <Button size="sm" variant="glass" icon={<Check className="h-4 w-4" />} onClick={p.onConfirm}>
            {t.aiOk}
          </Button>
        </div>
      )}
      {families.map((f) => (
        <FamilyRow key={f.id} family={f} values={p.labels[f.id] ?? []} readOnly={p.readOnly} onChange={(v) => set(f.id, v)} onPick={() => setPicking(f)} />
      ))}
      {!!p.ruleStations?.length && (
        <p className="flex items-start gap-2 text-sm font-bold text-slate-500 dark:text-slate-400">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {t.byRule(p.ruleStations)}
        </p>
      )}
      {p.onSuggest && !p.readOnly && (
        <button
          type="button"
          disabled={suggesting}
          onClick={async () => {
            setSuggesting(true)
            try {
              await p.onSuggest?.()
            } finally {
              setSuggesting(false)
            }
          }}
          className="btn-press bg-gradient-accent flex h-11 items-center gap-1.5 rounded-2xl px-3.5 text-sm font-black text-white disabled:opacity-60"
        >
          <Sparkles className={cn('h-4 w-4', suggesting && 'animate-pulse')} /> {suggesting ? t.suggesting : t.suggest}
        </button>
      )}
      <ValuePicker
        family={picking}
        selected={picking ? (p.labels[picking.id] ?? []) : []}
        onClose={() => setPicking(null)}
        onChange={(values) => picking && set(picking.id, values)}
        onAddValue={p.onAddValue}
      />
    </div>
  )
}

function FamilyRow({ family: f, values, readOnly, onChange, onPick }: { family: TagFamily; values: string[]; readOnly?: boolean; onChange: (v: string[]) => void; onPick: () => void }) {
  const t = useMessages().nomenclature.card
  const [typed, setTyped] = useState('')
  const full = !f.multiple && values.length >= 1
  const addTyped = () => {
    const v = cleanValue(typed)
    if (!v) return
    if (!values.some((x) => norm(x) === norm(v))) onChange(f.multiple ? [...values, v] : [v])
    setTyped('')
  }
  return (
    <div>
      <Label>{f.name}</Label>
      <div className="flex flex-wrap items-center gap-2">
        {values.map((v) => (
          <span key={v} className="bg-primary-soft inline-flex h-10 items-center gap-1 rounded-xl pr-1 pl-3 text-sm font-black text-[var(--primary-strong)] dark:text-[var(--primary-light)]">
            {f.kind === 'free' && <Hash className="h-3.5 w-3.5 opacity-60" />}
            {v}
            {!readOnly && (
              <button type="button" aria-label={t.remove(v)} onClick={() => onChange(values.filter((x) => x !== v))} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-rose-500 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        ))}
        {!readOnly && f.kind === 'list' && (
          <button type="button" onClick={onPick} aria-label={t.add(f.name)} className="btn-press glass-card flex h-10 items-center gap-1 rounded-xl px-3 text-sm font-black text-slate-600 dark:text-slate-300">
            <Plus className="h-4 w-4" /> {full ? t.choose : values.length ? '' : t.choose}
          </button>
        )}
        {!readOnly && f.kind === 'free' && !full && (
          <Input
            data-own-undo=""
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTyped()
              }
            }}
            onBlur={addTyped}
            placeholder={t.write}
            aria-label={t.add(f.name)}
            wrapperClassName="min-w-40 flex-1"
            className="h-10"
          />
        )}
      </div>
    </div>
  )
}

/** Choisir dans une liste de l'usine : une valeur (et la fenêtre se ferme) ou plusieurs. */
function ValuePicker({ family, selected, onClose, onChange, onAddValue }: { family: TagFamily | null; selected: string[]; onClose: () => void; onChange: (values: string[]) => void; onAddValue?: (familyId: string, value: string) => Promise<void> }) {
  const t = useMessages().nomenclature.card
  const [query, setQuery] = useState('')
  if (!family) return null
  const q = normalizeText(query.trim())
  const shown = family.values.filter((v) => !q || normalizeText(`${v.label} ${v.code ?? ''}`).includes(q))
  const typed = cleanValue(query)
  const exists = !!typed && !!knownValue(family, typed)
  const toggle = (label: string) => {
    if (!family.multiple) {
      onChange(selected.includes(label) ? [] : [label])
      onClose()
      setQuery('')
      return
    }
    onChange(selected.includes(label) ? selected.filter((x) => x !== label) : [...selected, label])
  }
  return (
    <Modal
      open
      onClose={() => {
        onClose()
        setQuery('')
      }}
      title={t.pickTitle(family.name)}
      footer={
        family.multiple ? (
          <Button
            variant="primary"
            onClick={() => {
              onClose()
              setQuery('')
            }}
          >
            {t.done}
          </Button>
        ) : undefined
      }
    >
      {(family.values.length > 8 || onAddValue) && <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} className="mb-3 h-12" />}
      <div className="grid gap-1.5 sm:grid-cols-2">
        {shown.map((v) => {
          const on = selected.includes(v.label)
          return (
            <button key={v.label} type="button" aria-pressed={on} onClick={() => toggle(v.label)} className={cn('btn-press flex min-h-12 items-center gap-2 rounded-2xl px-3 text-left text-sm font-black', on ? 'bg-primary-soft text-[var(--primary-strong)] dark:text-[var(--primary-light)]' : 'glass-card')}>
              <span className="min-w-0 flex-1 truncate">{v.label}</span>
              {v.code && <span className="shrink-0 text-xs font-bold text-slate-400">{v.code}</span>}
              {on && <Check className="h-4 w-4 shrink-0" />}
            </button>
          )
        })}
      </div>
      {!shown.length && <p className="px-1 py-2 text-sm font-bold text-slate-500">{t.none}</p>}
      {typed && !exists && (onAddValue ? (
        <button
          type="button"
          onClick={async () => {
            await onAddValue(family.id, typed)
            toggle(typed)
            setQuery('')
          }}
          className="btn-press mt-3 flex min-h-12 w-full items-center gap-2 rounded-2xl px-3 text-left text-sm font-black text-[var(--primary-strong)] hover:bg-slate-900/5 dark:text-[var(--primary-light)] dark:hover:bg-white/5"
        >
          <Plus className="h-4 w-4" /> {t.addToList(typed)}
        </button>
      ) : (
        <p className="mt-3 px-1 text-xs font-bold text-slate-400">{t.askAdmin}</p>
      ))}
    </Modal>
  )
}

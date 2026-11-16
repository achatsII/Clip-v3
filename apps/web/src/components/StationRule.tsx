'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Check, FolderTree, Hash, Loader2, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Input, Label } from '@/components/ui/Field'
import { errorText } from '@/components/ui/States'
import { Panel } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { qk } from '@/hooks/queries'
import type { Doc } from '@/lib/gateway/data'
import { useMessages } from '@/lib/i18n'
import { CATEGORIES, CATEGORY_KEYS } from '@/lib/model/catalog'
import { applyStationRule, previewRule } from '@/lib/model/classification'
import { cleanValue, hasRule, norm, readNomenclature, type StationRule as Rule, type TagFamily } from '@/lib/model/nomenclature'
import type { CategoryKey, Station } from '@/lib/model/types'
import { cn, normalizeText } from '@/lib/util/cn'

const EMPTY: Rule = { labels: {} }

/**
 * La règle d'un poste (toggle `nomenclature`) : les instructions classées ainsi y viennent d'elles-
 * mêmes. Dans une famille, l'une des valeurs suffit ; entre les familles, il les faut toutes. Le
 * nombre d'instructions qui y répondent se voit avant d'enregistrer.
 */
export function StationRuleCard({ station, canWrite }: { station: Doc<Station>; canWrite: boolean }) {
  const { org, data, can } = useSession()
  const words = useMessages()
  const t = words.nomenclature.rule
  const toast = useToast()
  const qc = useQueryClient()
  const nomenclature = useMemo(() => readNomenclature(org.json_data.nomenclature), [org.json_data.nomenclature])
  const saved = station.json_data.rule ?? EMPTY
  const [rule, setRule] = useState<Rule>(saved)
  const savedKey = JSON.stringify(saved)
  useEffect(() => setRule(JSON.parse(savedKey) as Rule), [savedKey])
  const dirty = JSON.stringify(rule) !== savedKey
  const [preview, setPreview] = useState<{ count: number; titles: string[] } | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [busy, setBusy] = useState(false)

  // Combien d'instructions y répondent : recompté quand la règle change (le serveur compte).
  const ruleKey = JSON.stringify(rule)
  useEffect(() => {
    const r = JSON.parse(ruleKey) as Rule
    if (!hasRule(r)) {
      setPreview(null)
      return
    }
    let live = true
    setPreview(null)
    const timer = setTimeout(() => {
      void previewRule(data, r)
        .then((p) => live && setPreview(p))
        .catch(() => live && setPreview(null))
    }, 400)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [ruleKey, data])

  if (!nomenclature.families.length) {
    return (
      <Panel>
        <h2 className="mb-2 flex items-center gap-2 text-lg font-black tracking-tight">
          <FolderTree className="h-5 w-5 text-slate-400" /> {t.title}
        </h2>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
          {t.noFamilies}{' '}
          {can('settings', 'write') && (
            <Link href="/reglages?onglet=classement" className="font-black text-[var(--primary-strong)] hover:underline dark:text-[var(--primary-light)]">
              {words.nomenclature.card.createFamilies}
            </Link>
          )}
        </p>
      </Panel>
    )
  }

  const setFamily = (id: string, values: string[]) => {
    const labels = { ...rule.labels }
    if (values.length) labels[id] = values
    else delete labels[id]
    setRule({ ...rule, labels })
  }
  const toggleCategory = (k: CategoryKey) => {
    const have = rule.categories ?? []
    const next = have.includes(k) ? have.filter((x) => x !== k) : [...have, k]
    setRule({ ...rule, categories: next.length ? next : undefined })
  }
  async function save(next: Rule | null) {
    setBusy(true)
    setProgress({ done: 0, total: 0 })
    try {
      const r = await applyStationRule(data, station, next && hasRule(next) ? next : null, (done, total) => setProgress({ done, total }))
      toast.success(t.saved(r.added, r.removed))
      void qc.invalidateQueries({ queryKey: qk.stations })
      void qc.invalidateQueries({ queryKey: qk.instructions })
    } catch (e) {
      toast.error(t.notSaved, errorText(e))
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <Panel>
      <h2 className="mb-1 flex items-center gap-2 text-lg font-black tracking-tight">
        <FolderTree className="h-5 w-5 text-[var(--primary)]" /> {t.title}
      </h2>
      <p className="mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">{t.intro}</p>
      <div className="space-y-4">
        {nomenclature.families.map((f) => (
          <RuleFamily key={f.id} family={f} values={rule.labels[f.id] ?? []} readOnly={!canWrite} onChange={(v) => setFamily(f.id, v)} />
        ))}
        <div>
          <Label>{t.category}</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_KEYS.map((k) => {
              const on = rule.categories?.includes(k) ?? false
              return (
                <button key={k} type="button" disabled={!canWrite} aria-pressed={on} onClick={() => toggleCategory(k)} className={cn('btn-press h-10 rounded-xl px-3 text-xs font-black', on ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : CATEGORIES[k].soft)}>
                  {CATEGORIES[k].label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-sm font-black text-slate-600 dark:text-slate-300" aria-live="polite">
          {progress ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> {t.applying(progress.done, progress.total)}
            </span>
          ) : (
            [!hasRule(rule) ? t.summaryNone : preview === null ? t.counting : t.matching(preview.count)]
          )}
        </p>
        {canWrite && hasRule(saved) && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => void save(null)}>
            {t.clear}
          </Button>
        )}
        {canWrite && (
          <Button variant="primary" loading={busy} disabled={!dirty} onClick={() => void save(rule)}>
            {t.save}
          </Button>
        )}
      </div>
      {/* Ce que le poste affichera : les premières instructions de la règle, avant d'enregistrer. */}
      {!!preview?.titles.length && hasRule(rule) && (
        <ul className="mt-3 space-y-1">
          {preview.titles.map((title) => (
            <li key={title} className="truncate rounded-xl bg-slate-900/5 px-3 py-2 text-sm font-bold text-slate-700 dark:bg-white/5 dark:text-slate-200">
              {title}
            </li>
          ))}
          {preview.count > preview.titles.length && <li className="px-3 text-xs font-bold text-slate-400">{t.andMore(preview.count - preview.titles.length)}</li>}
        </ul>
      )}
      <p className="mt-2 text-xs font-bold text-slate-400">{t.manualHint}</p>
    </Panel>
  )
}

/** Une famille de la règle : ses valeurs en pastilles à cocher (une liste) ou écrites (une valeur libre). */
function RuleFamily({ family: f, values, readOnly, onChange }: { family: TagFamily; values: string[]; readOnly: boolean; onChange: (v: string[]) => void }) {
  const t = useMessages().nomenclature
  const [query, setQuery] = useState('')
  const [typed, setTyped] = useState('')
  const toggle = (v: string) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])
  if (f.kind === 'free') {
    const add = () => {
      const v = cleanValue(typed)
      if (v && !values.some((x) => norm(x) === norm(v))) onChange([...values, v])
      setTyped('')
    }
    return (
      <div>
        <Label>{f.name}</Label>
        <div className="flex flex-wrap items-center gap-2">
          {values.map((v) => (
            <span key={v} className="bg-primary-soft inline-flex h-10 items-center gap-1 rounded-xl pr-1 pl-3 text-sm font-black text-[var(--primary-strong)] dark:text-[var(--primary-light)]">
              <Hash className="h-3.5 w-3.5 opacity-60" /> {v}
              {!readOnly && (
                <button type="button" aria-label={t.card.remove(v)} onClick={() => toggle(v)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-rose-500 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          ))}
          {!readOnly && (
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  add()
                }
              }}
              onBlur={add}
              placeholder={t.card.write}
              aria-label={t.card.add(f.name)}
              wrapperClassName="min-w-40 flex-1"
              className="h-10"
            />
          )}
        </div>
      </div>
    )
  }
  const q = normalizeText(query.trim())
  const shown = f.values.filter((v) => values.includes(v.label) || !q || normalizeText(`${v.label} ${v.code ?? ''}`).includes(q))
  return (
    <div>
      <Label>{f.name}</Label>
      {f.values.length > 12 && <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.filter.search} aria-label={t.filter.search} className="mb-2 h-11" />}
      <div className="flex flex-wrap gap-2">
        {shown.slice(0, 40).map((v) => {
          const on = values.includes(v.label)
          return (
            <button key={v.label} type="button" disabled={readOnly} aria-pressed={on} onClick={() => toggle(v.label)} className={cn('btn-press flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-black', on ? 'bg-primary-soft text-[var(--primary-strong)] dark:text-[var(--primary-light)]' : 'glass-card')}>
              {on && <Check className="h-4 w-4" />} {v.label}
            </button>
          )
        })}
        {!shown.length && <span className="text-sm font-bold text-slate-400">{t.filter.none}</span>}
      </div>
    </div>
  )
}

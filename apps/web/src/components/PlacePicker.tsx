'use client'

import { Check, ChevronDown, MapPin, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import type { Doc } from '@/lib/gateway/data'
import { locale, useMessages } from '@/lib/i18n'
import type { Station } from '@/lib/model/types'
import { cn, normalizeText } from '@/lib/util/cn'

/** Où : un secteur (les postes regroupés par zone ou ligne) ou un seul poste. */
export type Place = { kind: 'sector'; name: string } | { kind: 'station'; id: string } | null

const sectorOf = (s: Doc<Station>, none: string) => s.json_data.area?.trim() || none

/** Les postes d'un lieu ; null : partout. */
export function placeStations(place: Place, stations: Doc<Station>[], noSector: string): string[] | null {
  if (!place) return null
  if (place.kind === 'station') return [place.id]
  return stations.filter((s) => sectorOf(s, noSector) === place.name).map((s) => s._id)
}

/** Les secteurs et leurs postes, triés ; « Sans secteur » à la fin. */
export function sectorsOf(stations: Doc<Station>[], noSector: string): Array<[string, Doc<Station>[]]> {
  const m = new Map<string, Doc<Station>[]>()
  for (const s of stations) m.set(sectorOf(s, noSector), [...(m.get(sectorOf(s, noSector)) ?? []), s])
  return [...m.entries()].sort(([a], [b]) => (a === noSector ? 1 : b === noSector ? -1 : a.localeCompare(b, locale())))
}

/**
 * Le filtre « Où ? » : un bouton, puis une fenêtre qui liste les secteurs et leurs postes, avec une
 * recherche (des centaines de postes restent faciles à parcourir).
 */
export function PlacePicker({ value, onChange, stations }: { value: Place; onChange: (p: Place) => void; stations: Doc<Station>[] }) {
  const t = useMessages().instructions.list.place
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const groups = useMemo(() => sectorsOf(stations, t.noSector), [stations, t.noSector])
  const q = normalizeText(query.trim())
  const shown = groups
    .map(([name, items]) => [name, normalizeText(name).includes(q) ? items : items.filter((s) => normalizeText(`${s.json_data.name} ${s.json_data.code ?? ''}`).includes(q))] as const)
    .filter(([, items]) => items.length)
  const label = !value ? t.all : value.kind === 'sector' ? value.name : (stations.find((s) => s._id === value.id)?.json_data.name ?? t.all)
  const pick = (p: Place) => {
    onChange(p)
    setOpen(false)
    setQuery('')
  }
  if (!stations.length) return null
  return (
    <>
      <span className="flex shrink-0 items-center">
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={cn('btn-press flex h-11 items-center gap-1.5 px-3 text-xs font-black', value ? 'rounded-l-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'glass-card rounded-2xl')}>
          <MapPin className="h-4 w-4 shrink-0" /> <span className="max-w-40 truncate">{label}</span>
          {!value && <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />}
        </button>
        {value && (
          <button type="button" onClick={() => onChange(null)} aria-label={t.everywhere} title={t.everywhere} className="btn-press flex h-11 w-10 items-center justify-center rounded-r-2xl border-l border-white/20 bg-slate-900 text-white dark:border-slate-900/10 dark:bg-white dark:text-slate-900">
            <X className="h-4 w-4" />
          </button>
        )}
      </span>
      <Modal open={open} onClose={() => setOpen(false)} title={t.title}>
        {stations.length > 8 && <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} className="mb-3 h-12" />}
        <div className="space-y-4">
          <button type="button" onClick={() => pick(null)} className={cn('btn-press flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left font-black', !value ? 'bg-primary-soft text-[var(--primary-strong)] dark:text-sky-300' : 'glass-card')}>
            <MapPin className="h-5 w-5 shrink-0" /> <span className="flex-1">{t.everywhere}</span> {!value && <Check className="h-5 w-5" />}
          </button>
          {shown.map(([name, items]) => {
            const on = value?.kind === 'sector' && value.name === name
            return (
              <section key={name}>
                <button type="button" onClick={() => pick({ kind: 'sector', name })} className={cn('btn-press flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left', on ? 'bg-primary-soft text-[var(--primary-strong)] dark:text-sky-300' : 'hover:bg-slate-900/5 dark:hover:bg-white/5')}>
                  <span className="label-caps flex-1 text-slate-600 dark:text-slate-300">{name}</span>
                  <span className="text-xs font-bold text-slate-400">{t.sector(items.length)}</span>
                  {on && <Check className="h-5 w-5" />}
                </button>
                <div className="mt-1 grid gap-1 pl-3">
                  {items.map((s) => {
                    const sel = value?.kind === 'station' && value.id === s._id
                    return (
                      <button key={s._id} type="button" onClick={() => pick({ kind: 'station', id: s._id })} className={cn('btn-press flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-black', sel ? 'bg-primary-soft text-[var(--primary-strong)] dark:text-sky-300' : 'glass-card')}>
                        <span className="min-w-0 flex-1 truncate">{s.json_data.name}</span>
                        {s.json_data.code && <span className="shrink-0 text-xs font-bold text-slate-400">{s.json_data.code}</span>}
                        {sel && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
          {!shown.length && <p className="px-1 text-sm font-bold text-slate-500">{t.none}</p>}
        </div>
      </Modal>
    </>
  )
}

/** Les secteurs déjà nommés, proposés dans un champ (`list="sectors"`). */
export function SectorList({ stations }: { stations: Doc<Station>[] }) {
  const names = [...new Set(stations.map((s) => s.json_data.area?.trim()).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, locale()))
  return (
    <datalist id="sectors">
      {names.map((n) => (
        <option key={n} value={n} />
      ))}
    </datalist>
  )
}

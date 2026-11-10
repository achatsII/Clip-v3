'use client'

import { Check, ChevronDown, Clock, MapPin, Plus, Repeat, Tag, X } from 'lucide-react'
import { useState } from 'react'
import { CategoryIcon, PpeIcon } from '@/components/icons'
import { Input, Label, Select, Textarea } from '@/components/ui/Field'
import type { Doc } from '@/lib/gateway/data'
import { CATEGORIES, CATEGORY_KEYS, KINDS, PPE } from '@/lib/model/catalog'
import type { CategoryKey, InstructionContent, InstructionKind, Station } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'

export function MetaCard({
  content,
  stationIds,
  stations,
  readOnly,
  onChange,
  onStations,
  onCreateStation,
}: {
  content: InstructionContent
  stationIds: string[]
  stations: Doc<Station>[]
  readOnly?: boolean
  onChange: (c: InstructionContent) => void
  onStations: (ids: string[]) => void
  onCreateStation?: (name: string) => Promise<string | null>
}) {
  const [open, setOpen] = useState(false)
  const [tag, setTag] = useState('')
  const [stationQuery, setStationQuery] = useState('')
  const linked = stations.filter((s) => stationIds.includes(s._id))
  const set = (patch: Partial<InstructionContent>) => onChange({ ...content, ...patch })
  const matches = stations.filter((s) => !stationIds.includes(s._id) && `${s.json_data.name} ${s.json_data.code ?? ''}`.toLowerCase().includes(stationQuery.toLowerCase())).slice(0, 6)

  return (
    <div className="glass-panel rounded-[32px] p-4 sm:p-6">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 text-left" aria-expanded={open}>
        <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white', CATEGORIES[content.category].tile)}>
          <CategoryIcon category={content.category} className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-black">
            {KINDS[content.kind].label} · {CATEGORIES[content.category].label}
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {linked.length ? linked.map((s) => s.json_data.name).join(', ') : 'Aucun poste'}
            </span>
            {content.frequency && (
              <span className="inline-flex items-center gap-1">
                <Repeat className="h-3.5 w-3.5" /> {content.frequency}
              </span>
            )}
            {!!content.durationMin && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {content.durationMin} min
              </span>
            )}
            {!!content.ppe.length && <span>{content.ppe.length} EPI</span>}
          </span>
        </span>
        <ChevronDown className={cn('h-5 w-5 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="animate-slide-up mt-6 grid gap-5 lg:grid-cols-2">
          <div>
            <Label>Postes et équipements</Label>
            <div className="flex flex-wrap gap-2">
              {linked.map((s) => (
                <span key={s._id} className="glass-card inline-flex h-10 items-center gap-1.5 rounded-xl pr-1 pl-3 text-sm font-black">
                  {s.json_data.name}
                  {s.json_data.code && <span className="text-xs text-slate-400">{s.json_data.code}</span>}
                  {!readOnly && (
                    <button type="button" aria-label={`Retirer ${s.json_data.name}`} onClick={() => onStations(stationIds.filter((id) => id !== s._id))} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-rose-500 hover:text-white">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            {!readOnly && (
              <div className="relative mt-2">
                <Input value={stationQuery} onChange={(e) => setStationQuery(e.target.value)} placeholder="Ajouter un poste (nom ou code)" />
                {stationQuery && (
                  <div className="glass-panel absolute inset-x-0 top-14 z-20 rounded-2xl p-1.5">
                    {matches.map((s) => (
                      <button
                        key={s._id}
                        type="button"
                        onClick={() => {
                          onStations([...stationIds, s._id])
                          setStationQuery('')
                        }}
                        className="flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-bold hover:bg-slate-900/5 dark:hover:bg-white/5"
                      >
                        <MapPin className="h-4 w-4 text-slate-400" /> {s.json_data.name} <span className="text-slate-400">{s.json_data.code}</span>
                      </button>
                    ))}
                    {onCreateStation && (
                      <button
                        type="button"
                        onClick={async () => {
                          const id = await onCreateStation(stationQuery.trim())
                          if (id) onStations([...stationIds, id])
                          setStationQuery('')
                        }}
                        className="flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-black text-[var(--primary)] hover:bg-slate-900/5"
                      >
                        <Plus className="h-4 w-4" /> Créer le poste « {stationQuery.trim()} »
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="meta-kind">Format</Label>
              <Select id="meta-kind" disabled={readOnly} value={content.kind} onChange={(e) => set({ kind: e.target.value as InstructionKind, lockout: e.target.value === 'lockout' ? content.lockout ?? { equipment: content.equipment ?? '', energyPoints: [], restartSteps: [] } : content.lockout })}>
                {Object.entries(KINDS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="meta-cat">Catégorie</Label>
              <Select id="meta-cat" disabled={readOnly} value={content.category} onChange={(e) => set({ category: e.target.value as CategoryKey })}>
                {CATEGORY_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {CATEGORIES[k].label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="meta-freq">Fréquence</Label>
              <Input id="meta-freq" readOnly={readOnly} value={content.frequency ?? ''} onChange={(e) => set({ frequency: e.target.value })} placeholder="Une fois par mois" />
            </div>
            <div>
              <Label htmlFor="meta-dur">Durée (min)</Label>
              <Input id="meta-dur" type="number" inputMode="numeric" readOnly={readOnly} value={content.durationMin ?? ''} onChange={(e) => set({ durationMin: e.target.value ? Math.max(0, Number(e.target.value)) : null })} />
            </div>
          </div>

          <div className="lg:col-span-2">
            <Label>Équipements de protection (EPI)</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PPE).map(([k, label]) => {
                const on = content.ppe.includes(k)
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={readOnly}
                    aria-pressed={on}
                    onClick={() => set({ ppe: on ? content.ppe.filter((p) => p !== k) : [...content.ppe, k] })}
                    className={cn('btn-press inline-flex h-11 items-center gap-2 rounded-2xl px-3 text-sm font-black', on ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_8px_18px_rgba(255,160,0,0.3)]' : 'glass-card text-slate-600 dark:text-slate-300')}
                  >
                    <PpeIcon ppe={k} className="h-4 w-4" />
                    {label}
                    {on && <Check className="h-3.5 w-3.5" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="meta-tools">Outils et matériel</Label>
            <Textarea id="meta-tools" readOnly={readOnly} rows={3} value={content.tools.join('\n')} onChange={(e) => set({ tools: e.target.value.split('\n').map((t) => t.trimStart()) })} placeholder={'Clé de 13 mm\nChiffon propre'} />
          </div>
          <div>
            <Label htmlFor="meta-safety">Mises en garde avant de commencer</Label>
            <Textarea id="meta-safety" readOnly={readOnly} rows={3} value={content.safety.join('\n')} onChange={(e) => set({ safety: e.target.value.split('\n').map((t) => t.trimStart()) })} placeholder="Machine cadenassée avant toute intervention" />
          </div>
          <div className="lg:col-span-2">
            <Label>Étiquettes de recherche</Label>
            <div className="flex flex-wrap items-center gap-2">
              {content.tags.map((t) => (
                <span key={t} className="inline-flex h-9 items-center gap-1 rounded-xl bg-slate-900/5 pr-1 pl-3 text-sm font-bold dark:bg-white/10">
                  <Tag className="h-3.5 w-3.5 text-slate-400" /> {t}
                  {!readOnly && (
                    <button type="button" aria-label={`Retirer ${t}`} onClick={() => set({ tags: content.tags.filter((x) => x !== t) })} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-rose-500 hover:text-white">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
              {!readOnly && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const v = tag.trim().toLowerCase()
                    if (v && !content.tags.includes(v)) set({ tags: [...content.tags, v] })
                    setTag('')
                  }}
                >
                  <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="+ étiquette, n° de pièce…" className="glass-input h-9 w-44 rounded-xl px-3 text-sm font-bold" />
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

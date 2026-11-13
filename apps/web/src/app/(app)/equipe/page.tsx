'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, MoreHorizontal, Pencil, Printer, Trash2, UserPlus, Users } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { PlacePicker, placeStations, type Place } from '@/components/PlacePicker'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/Confirm'
import { Input, Label, Textarea } from '@/components/ui/Field'
import { Menu } from '@/components/ui/Menu'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorState, errorText, SkeletonRows } from '@/components/ui/States'
import { SearchField } from '@/components/ui/SearchField'
import { PageHeader } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { Academy, AcademyTeaser } from '@/components/team/Academy'
import { useEntitlement } from '@/lib/billing/state'
import { SkillsMatrix } from '@/components/team/SkillsMatrix'
import { useStations } from '@/hooks/queries'
import type { Doc } from '@/lib/gateway/data'
import { useMessages } from '@/lib/i18n'
import { addOperators, giveCode, listOperators, parseNames } from '@/lib/model/operators'
import { T } from '@/lib/model/repo'
import type { Operator, Shift } from '@/lib/model/types'
import { usePublicConfig } from '@/lib/toggles'
import { FALLBACK_TOGGLES } from '@/lib/toggleDefaults'
import { codesSheet } from '@/lib/pdf/codesSheet'
import { printHtml } from '@/lib/pdf/print'
import { cn, formatDate, initials } from '@/lib/util/cn'
import { matchesTokens, SEARCH_FROM, searchTokens } from '@/lib/util/people'
import { mapPool } from '@/lib/util/pool'

const SHIFTS: Shift[] = ['jour', 'soir', 'nuit', 'fds', 'rotation']
const KEY = ['operators'] as const

/**
 * L'équipe : les personnes qui travaillent aux postes, sans compte. On les ajoute en collant une
 * liste, chacune reçoit un code à 4 chiffres (tiré par le serveur, montré une seule fois, à
 * imprimer), et elles se nomment à la tablette avant de commencer.
 */
export default function TeamPage() {
  const words = useMessages()
  const t = words.team
  const { data, can } = useSession()
  const config = usePublicConfig()
  const on = config.data?.toggles.operators ?? FALLBACK_TOGGLES.operators
  // La matrice de compétences (toggle `training`) : un onglet, avec son lien (`?vue=competences`).
  const trainingOn = config.data?.toggles.training ?? FALLBACK_TOGGLES.training
  // L'Académie (module) : le toggle dit qu'elle est bâtie, la feature que l'usine l'a.
  const academyOn = config.data?.toggles.academy ?? FALLBACK_TOGGLES.academy
  const academy = useEntitlement('academy')
  const params = useSearchParams()
  const router = useRouter()
  const view: 'people' | 'skills' = trainingOn && params.get('vue') === 'competences' ? 'skills' : 'people'
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const stations = useStations()
  const canManage = can('stations', 'write')
  const ops = useQuery({ queryKey: KEY, queryFn: () => listOperators(data), enabled: on && canManage })
  // Des dizaines de personnes : chaque mot cherché (nom, équipe, poste), le quart, le lieu. `?q=` : un lien
  // (« À voir », un rapport) ouvre la page déjà cherchée.
  const [query, setQuery] = useState(() => params.get('q') ?? '')
  const [shift, setShift] = useState<Shift | 'none' | 'all'>('all')
  const [place, setPlace] = useState<Place>(null)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Doc<Operator> | null>(null)
  // Les codes à remettre : montrés une seule fois, à imprimer.
  const [codes, setCodes] = useState<Array<{ name: string; pin: string }> | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const stationName = useMemo(() => new Map((stations.data ?? []).map((s) => [s._id, s.json_data.name])), [stations.data])

  if (config.isLoading) return <SkeletonRows />
  if (!on) return <EmptyState icon={<Users className="h-7 w-7" />} title={t.offTitle} description={t.offHint} />
  if (!canManage) return <EmptyState icon={<Users className="h-7 w-7" />} title={t.title} description={t.adminOnly} />

  const refresh = () => void qc.invalidateQueries({ queryKey: KEY })
  const tokens = searchTokens(query)
  const placeIds = place ? new Set(placeStations(place, stations.data ?? [], words.instructions.list.place.noSector)) : null
  const matches = (o: Doc<Operator>) =>
    (shift === 'all' || (o.json_data.shift ?? 'none') === shift) &&
    (!placeIds || o.json_data.stationIds.some((id) => placeIds.has(id))) &&
    matchesTokens(tokens, o.json_data.name, o.json_data.team, ...o.json_data.stationIds.map((id) => stationName.get(id)))
  const list = (ops.data ?? []).filter(matches)
  const filtered = tokens.length > 0 || shift !== 'all' || !!place
  const shiftsHere = (['none', ...SHIFTS] as const).filter((s) => (ops.data ?? []).some((o) => (o.json_data.shift ?? 'none') === s))
  const clearFilters = () => {
    setQuery('')
    setShift('all')
    setPlace(null)
  }

  async function newCode(o: Doc<Operator>) {
    setBusy(o._id)
    try {
      const { pin } = await giveCode(o._id)
      setCodes([{ name: o.json_data.name, pin }])
      refresh()
    } catch (e) {
      toast.error(t.saveFailed, errorText(e))
    } finally {
      setBusy(null)
    }
  }

  async function remove(o: Doc<Operator>) {
    if (!(await confirm({ title: t.removeTitle(o.json_data.name), description: t.removeDescription, confirmLabel: t.remove, danger: true }))) return
    try {
      await data.patch(T.operator, o._id, { active: false })
      toast.success(t.removed)
      refresh()
    } catch (e) {
      toast.error(t.saveFailed, errorText(e))
    }
  }

  return (
    <div>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        actions={
          <Button variant="primary" icon={<UserPlus className="h-5 w-5" />} onClick={() => setAdding(true)}>
            {t.add}
          </Button>
        }
      />

      {trainingOn && !!ops.data?.length && (
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist">
          {(
            [
              ['people', words.training.people, '/equipe'],
              ['skills', words.training.matrix, '/equipe?vue=competences'],
            ] as const
          ).map(([v, label, href]) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => router.replace(href, { scroll: false })} className={cn('btn-press h-11 shrink-0 rounded-2xl px-4 text-sm font-black', view === v ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'glass-card')}>
              {label}
            </button>
          ))}
        </div>
      )}

      {(ops.data?.length ?? 0) > SEARCH_FROM && (
        <div className="mb-4 space-y-3">
          <SearchField value={query} onChange={setQuery} placeholder={t.search} />
          <div className="flex flex-wrap items-center gap-2">
            {shiftsHere.length > 1 && (
              <div role="radiogroup" aria-label={t.shift} className="no-scrollbar flex max-w-full gap-2 overflow-x-auto">
                {(['all', ...shiftsHere] as const).map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={shift === s} onClick={() => setShift(s)} className={cn('btn-press h-11 shrink-0 rounded-2xl px-3 text-sm font-black', shift === s ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'glass-card text-slate-700 dark:text-slate-200')}>
                    {s === 'all' ? t.allShifts : s === 'none' ? t.withoutShift : t.shifts[s]}
                  </button>
                ))}
              </div>
            )}
            {!!stations.data?.length && <PlacePicker value={place} onChange={setPlace} stations={stations.data} />}
          </div>
        </div>
      )}

      {ops.isLoading ? (
        <SkeletonRows />
      ) : ops.error ? (
        <ErrorState error={ops.error} onRetry={() => ops.refetch()} />
      ) : !ops.data?.length ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title={t.empty}
          description={t.emptyHint}
          action={
            <Button variant="primary" icon={<UserPlus className="h-5 w-5" />} onClick={() => setAdding(true)}>
              {t.add}
            </Button>
          }
        />
      ) : filtered && !list.length ? (
        <p className="glass-card rounded-[24px] p-6 text-center font-bold text-slate-500">
          {words.common.noMatch}{' '}
          <button type="button" onClick={clearFilters} className="font-black text-[var(--primary)]">
            {words.common.showAll}
          </button>
        </p>
      ) : view === 'skills' ? (
        // L'Académie (module) : niveaux, validation sur le terrain, couverture ; sans elle, la matrice simple.
        academyOn && academy !== 'locked' && academy !== 'pending' ? (
          <Academy operators={ops.data} query={matches} />
        ) : (
          <div className="space-y-5">
            <SkillsMatrix operators={ops.data} query={matches} />
            {academyOn && academy === 'locked' && <AcademyTeaser />}
          </div>
        )
      ) : (
        <>
          <p className="label-caps mb-2 px-1 text-slate-500">{filtered ? t.countOf(list.length, ops.data.length) : t.count(ops.data.length)}</p>
          <div className="space-y-2">
            {list.map((o) => {
              const op = o.json_data
              const meta = [op.shift ? t.shifts[op.shift] : null, op.team, ...op.stationIds.map((id) => stationName.get(id)).filter(Boolean)].filter(Boolean).join(' · ')
              return (
                <div key={o._id} className="glass-card relative flex items-center gap-3 rounded-[24px] p-3 has-[[aria-expanded=true]]:z-20">
                  <span className="bg-gradient-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black text-white">{initials(op.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-black text-slate-900 dark:text-white">{op.name}</span>
                    <span className="block truncate text-xs font-bold text-slate-500">
                      {!op.pinSetAt && <span className="text-amber-700 dark:text-amber-300">{t.noCode}</span>}
                      {!op.pinSetAt && meta && ' · '}
                      {meta || (op.pinSetAt ? t.codeSet(formatDate(op.pinSetAt)) : null)}
                    </span>
                  </span>
                  {!op.pinSetAt && (
                    <Button size="sm" loading={busy === o._id} onClick={() => void newCode(o)} icon={<KeyRound className="h-4 w-4" />} aria-label={t.giveCode}>
                      <span className="max-sm:hidden">{t.giveCode}</span>
                    </Button>
                  )}
                  <Menu
                    bare
                    items={[
                      { label: op.pinSetAt ? t.newCode : t.giveCode, icon: <KeyRound className="h-4 w-4" />, onClick: () => void newCode(o) },
                      { label: t.edit, icon: <Pencil className="h-4 w-4" />, onClick: () => setEditing(o) },
                      { label: t.remove, icon: <Trash2 className="h-4 w-4" />, onClick: () => void remove(o), danger: true, divider: true },
                    ]}
                    trigger={
                      <span className="btn-press flex h-11 w-11 items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-900/5 dark:hover:bg-white/10">
                        <MoreHorizontal className="h-5 w-5" />
                      </span>
                    }
                  />
                </div>
              )
            })}
          </div>
        </>
      )}

      <AddPeople
        open={adding}
        existing={(ops.data ?? []).map((o) => o.json_data.name)}
        onClose={() => setAdding(false)}
        onAdded={(given) => {
          setAdding(false)
          refresh()
          if (given.length) setCodes(given)
        }}
      />
      {editing && <EditPerson person={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      <CodesDialog codes={codes} onClose={() => setCodes(null)} />
    </div>
  )
}

/** Le quart : des pastilles qui passent à la ligne (un téléphone n'a pas la largeur de cinq choix). */
function ShiftPicker({ value, onChange }: { value: Shift | 'none'; onChange: (v: Shift | 'none') => void }) {
  const t = useMessages().team
  const options: Array<{ value: Shift | 'none'; label: string }> = [{ value: 'none', label: t.noShift }, ...SHIFTS.map((s) => ({ value: s, label: t.shifts[s] }))]
  return (
    <div role="radiogroup" aria-label={t.shift} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('btn-press h-11 rounded-2xl px-4 text-sm font-black', value === o.value ? 'bg-gradient-primary shadow-primary text-white' : 'glass-card text-slate-700 dark:text-slate-200')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Ajouter des personnes : une par ligne ; chacune reçoit son code tout de suite. */
function AddPeople({ open, existing, onClose, onAdded }: { open: boolean; existing: string[]; onClose: () => void; onAdded: (codes: Array<{ name: string; pin: string }>) => void }) {
  const t = useMessages().team
  const words = useMessages()
  const { data } = useSession()
  const toast = useToast()
  const [text, setText] = useState('')
  const [shift, setShift] = useState<Shift | 'none'>('none')
  const [busy, setBusy] = useState(false)
  const names = parseNames(text, existing)

  async function add() {
    setBusy(true)
    try {
      const { added, failed, error } = await addOperators(data, names, { shift: shift === 'none' ? null : shift })
      if (!added.length) throw error
      // Un code pour chacun, tout de suite ; s'il manque, « Donner un code » le rattrape.
      let refusal: unknown = null
      const pins = await mapPool(added, 4, (d) =>
        giveCode(d._id).then(
          (r) => ({ name: d.json_data.name, pin: r.pin }),
          (e: unknown) => {
            refusal ??= e
            return null
          },
        ),
      )
      const given = pins.filter((p): p is { name: string; pin: string } => !!p)
      toast.success(t.added(added.length), given.length ? t.addedHint : undefined)
      if (failed.length) toast.error(t.addFailed, failed.join(', '))
      if (refusal && given.length < added.length) toast.error(t.codesLater, errorText(refusal))
      setText('')
      onAdded(given)
    } catch (e) {
      toast.error(t.addFailed, errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.addTitle}
      footer={
        <>
          <Button onClick={onClose}>{words.common.cancel}</Button>
          <Button variant="primary" disabled={!names.length} loading={busy} onClick={() => void add()} icon={<UserPlus className="h-4 w-4" />}>
            {t.addConfirm(names.length)}
          </Button>
        </>
      }
    >
      <p className="mb-2 text-sm font-medium text-slate-500">{t.addHint}</p>
      <Textarea autoFocus rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={t.addPlaceholder} aria-label={t.addTitle} />
      <div className="mt-4">
        <Label>{t.shift}</Label>
        <ShiftPicker value={shift} onChange={setShift} />
      </div>
    </Modal>
  )
}

/** Modifier une personne : nom, quart, équipe, postes habituels. */
function EditPerson({ person, onClose, onSaved }: { person: Doc<Operator>; onClose: () => void; onSaved: () => void }) {
  const t = useMessages().team
  const words = useMessages()
  const { data } = useSession()
  const toast = useToast()
  const stations = useStations()
  const [name, setName] = useState(person.json_data.name)
  const [group, setGroup] = useState(person.json_data.team ?? '')
  const [shift, setShift] = useState<Shift | 'none'>(person.json_data.shift ?? 'none')
  const [ids, setIds] = useState<string[]>(person.json_data.stationIds ?? [])
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      await data.patch(T.operator, person._id, { name: name.trim(), team: group.trim() || null, shift: shift === 'none' ? null : shift, stationIds: ids })
      toast.success(t.saved)
      onSaved()
      onClose()
    } catch (e) {
      toast.error(t.saveFailed, errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={person.json_data.name}
      footer={
        <>
          <Button onClick={onClose}>{words.common.cancel}</Button>
          <Button variant="primary" disabled={!name.trim()} loading={busy} onClick={() => void save()}>
            {words.common.save}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="op-name">{t.name}</Label>
          <Input id="op-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>{t.shift}</Label>
          <ShiftPicker value={shift} onChange={setShift} />
        </div>
        <div>
          <Label htmlFor="op-group">{t.group}</Label>
          <Input id="op-group" value={group} onChange={(e) => setGroup(e.target.value)} placeholder={t.groupPlaceholder} />
        </div>
        {(stations.data?.length ?? 0) > 0 && (
          <div>
            <Label hint={t.stationsHint}>{t.stations}</Label>
            <div className="flex flex-wrap gap-2">
              {(stations.data ?? []).map((s) => {
                const on = ids.includes(s._id)
                return (
                  <button key={s._id} type="button" aria-pressed={on} onClick={() => setIds(on ? ids.filter((x) => x !== s._id) : [...ids, s._id])} className={cn('btn-press h-11 rounded-2xl px-3 text-sm font-black', on ? 'bg-gradient-primary text-white shadow-primary' : 'glass-card')}>
                    {s.json_data.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

/** Les codes à remettre, montrés une seule fois ; on peut les imprimer. */
function CodesDialog({ codes, onClose }: { codes: Array<{ name: string; pin: string }> | null; onClose: () => void }) {
  const t = useMessages().team
  const words = useMessages()
  const print = () => codes && void printHtml(codesSheet(codes, t, document.documentElement.lang || 'fr'))
  return (
    <Modal
      open={!!codes}
      onClose={onClose}
      title={codes?.length === 1 ? t.codeTitle(codes[0].name) : t.printTitle}
      footer={
        <>
          <Button onClick={onClose}>{words.common.close}</Button>
          <Button variant="primary" data-autofocus onClick={print} icon={<Printer className="h-4 w-4" />}>
            {t.print}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm font-bold text-slate-500">{t.codeHint(codes?.length ?? 1)}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {(codes ?? []).map((c) => (
          <div key={c.name} className="glass-card rounded-2xl p-4">
            <p className="truncate font-black">{c.name}</p>
            <p className="mt-1 text-4xl font-black tracking-[0.25em] text-[var(--primary)] tabular-nums">{c.pin}</p>
          </div>
        ))}
      </div>
    </Modal>
  )
}

'use client'

import { SectorList } from '@/components/PlacePicker'
import { useQueryClient } from '@tanstack/react-query'
import { MapPin, Plus, Printer, QrCode, Search } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { LockBadge } from '@/components/billing/Billing'
import { UsageMeter } from '@/components/billing/Usage'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Field'
import { MicButton } from '@/components/ui/MicButton'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorState, SkeletonRows, errorText } from '@/components/ui/States'
import { PageHeader } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { qk, useStationCounts, useStations } from '@/hooks/queries'
import { useBilling, useLimit } from '@/lib/billing/state'
import { locale, useMessages } from '@/lib/i18n'
import { nowIso, T } from '@/lib/model/repo'
import type { Station, StationKind } from '@/lib/model/types'
import { normalizeText } from '@/lib/util/cn'

/** Les types de poste, dans l'ordre du choix ; le libellé se lit au rendu. */
const KINDS: StationKind[] = ['poste', 'equipement', 'zone']

export default function StationsPage() {
  const { data, can, org } = useSession()
  const t = useMessages()
  const qc = useQueryClient()
  const toast = useToast()
  const stations = useStations()
  const perStation = useStationCounts()
  const { openPaywall } = useBilling()
  const limit = useLimit('stations', stations.data?.length)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ name: '', code: '', kind: 'poste' as StationKind, area: '' })
  const [busy, setBusy] = useState(false)

  const counts = perStation.data ?? new Map<string, number>()

  const list = useMemo(() => {
    const q = normalizeText(query)
    return (stations.data ?? []).filter((s) => !q || normalizeText(`${s.json_data.name} ${s.json_data.code ?? ''} ${s.json_data.area ?? ''}`).includes(q))
  }, [stations.data, query])

  const noArea = t.stations.list.noArea
  const byArea = useMemo(() => {
    const m = new Map<string, typeof list>()
    for (const s of list) {
      const a = s.json_data.area?.trim() || noArea
      m.set(a, [...(m.get(a) ?? []), s])
    }
    return [...m.entries()].sort(([a], [b]) => (a === noArea ? 1 : b === noArea ? -1 : a.localeCompare(b, locale())))
  }, [list, noArea])

  async function create() {
    if (!form.name.trim()) return
    setBusy(true)
    try {
      await data.insert<Station>(T.station, { name: form.name.trim(), code: form.code.trim() || undefined, kind: form.kind, area: form.area.trim() || undefined, linkMode: 'focus', createdAt: nowIso(), ...(org.json_data.notify?.sealed ? { notifySeal: org.json_data.notify.sealed } : {}) }, form.name.trim())
      await qc.invalidateQueries({ queryKey: qk.stations })
      toast.success(t.stations.list.created, t.stations.list.createdHint)
      setOpen(false)
      setForm({ name: '', code: '', kind: 'poste', area: form.area })
    } catch (e) {
      toast.error(t.stations.list.createFailed, errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const canWrite = can('stations', 'write')
  const atLimit = !!limit?.reached

  return (
    <div>
      <PageHeader
        title={t.stations.list.title}
        subtitle={t.stations.list.subtitle}
        actions={
          <>
            {!!stations.data?.length && (
              <Link href="/postes/etiquettes" className="btn-press glass-card inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-black">
                <Printer className="h-4 w-4" /> {t.stations.list.labels}
              </Link>
            )}
            {canWrite && (
              <Button variant="primary" icon={<Plus className="h-5 w-5" />} onClick={() => (atLimit ? openPaywall({ feature: 'stations', used: limit?.used, retry: () => setOpen(true) }) : setOpen(true))}>
                {t.stations.list.newStation} {atLimit && <LockBadge />}
              </Button>
            )}
          </>
        }
      />
      <UsageMeter feature="stations" limit={limit} className="mb-5" />

      {(stations.data?.length ?? 0) > 8 && (
        <div className="glass-panel mb-5 flex items-center gap-3 rounded-[24px] px-4">
          <Search className="h-5 w-5 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.stations.list.searchPlaceholder} className="h-14 min-w-0 flex-1 bg-transparent text-[15px] font-bold focus:outline-none" aria-label={t.stations.list.searchLabel} />
          <MicButton label={t.stations.list.searchByVoice} onText={(text) => setQuery((q) => (q ? `${q} ${text}` : text))} />
        </div>
      )}

      {stations.isLoading ? (
        <SkeletonRows />
      ) : stations.error ? (
        <ErrorState error={stations.error} onRetry={() => stations.refetch()} />
      ) : !stations.data?.length ? (
        <EmptyState icon={<MapPin className="h-7 w-7" />} title={t.stations.list.emptyTitle} description={t.stations.list.emptyDescription} action={canWrite ? <Button variant="primary" size="lg" icon={<Plus className="h-5 w-5" />} onClick={() => setOpen(true)}>{t.stations.list.newStation}</Button> : undefined} />
      ) : (
        <div className="space-y-8">
          {byArea.map(([area, items]) => (
            <section key={area}>
              <h2 className="label-caps mb-3 text-slate-500">{area}</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((s) => {
                  const n = counts.get(s._id) ?? 0
                  return (
                    <Link key={s._id} href={`/postes/${s._id}`} className="btn-press lift glass-card flex items-center gap-4 rounded-[24px] p-4">
                      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white ${n ? 'bg-gradient-to-br from-sky-500 to-blue-700' : 'bg-gradient-to-br from-slate-400 to-slate-600'}`}>
                        {s.json_data.linkId ? <QrCode className="h-7 w-7" /> : <MapPin className="h-7 w-7" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-black">{s.json_data.name}</span>
                        <span className="block truncate text-xs font-bold text-slate-500">
                          {[s.json_data.code, t.stations.kinds[s.json_data.kind]].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                      <span className={`rounded-xl px-2.5 py-1 text-xs font-black tabular-nums ${n ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'}`}>{n ? t.stations.list.instructionCount(n) : t.stations.list.uncovered}</span>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t.stations.create.title}
        footer={
          <>
            <Button onClick={() => setOpen(false)}>{t.common.cancel}</Button>
            <Button variant="primary" loading={busy} disabled={!form.name.trim()} onClick={create}>
              {t.stations.create.submit}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="st-name">{t.stations.create.name}</Label>
            <Input id="st-name" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.stations.create.namePlaceholder} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="st-code" hint={t.stations.create.optional}>{t.stations.create.code}</Label>
              <Input id="st-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder={t.stations.create.codePlaceholder} />
            </div>
            <div>
              <Label htmlFor="st-kind">{t.stations.create.kind}</Label>
              <Select id="st-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as StationKind })}>
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t.stations.kinds[k]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="st-area" hint={t.stations.create.optional}>{t.stations.create.area}</Label>
            {/* Les secteurs déjà nommés sont proposés : pas deux façons d'écrire « Usinage ». */}
            <Input id="st-area" list="sectors" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder={t.stations.create.areaPlaceholder} />
            <SectorList stations={stations.data ?? []} />
          </div>
        </div>
      </Modal>
    </div>
  )
}

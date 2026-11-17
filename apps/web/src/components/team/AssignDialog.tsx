'use client'

/**
 * « Former quelqu'un » (Académie) : un poste, des personnes, une date. Chacune paraît ensuite dans
 * « À faire » jusqu'à sa validation sur le terrain (`assignTraining`, `clip_assignment`). Les personnes
 * déjà qualifiées au poste restent choisissables (une requalification), avec la mention.
 */
import { useQueryClient } from '@tanstack/react-query'
import { GraduationCap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { Input, Label, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { PeopleChips } from '@/components/ui/PeopleChips'
import { errorText } from '@/components/ui/States'
import { useToast } from '@/components/ui/Toast'
import type { Doc } from '@/lib/gateway/data'
import { useMessages } from '@/lib/i18n'
import type { Standing } from '@/lib/model/academy'
import { ASSIGNMENTS_KEY, assignTraining, defaultDue } from '@/lib/model/assignments'
import type { Operator } from '@/lib/model/types'

export function AssignDialog({
  open,
  onClose,
  stations,
  operators,
  standing,
  initialStation,
}: {
  open: boolean
  onClose: () => void
  stations: Array<{ id: string; name: string }>
  operators: Array<Doc<Operator>>
  standing: (operatorId: string, stationId: string) => Standing
  initialStation?: string
}) {
  const t = useMessages().academy.assign
  const { data, profile, displayName } = useSession()
  const qc = useQueryClient()
  const toast = useToast()
  const [stationId, setStationId] = useState(initialStation ?? '')
  const [people, setPeople] = useState<string[]>([])
  const [due, setDue] = useState(() => defaultDue())
  const [busy, setBusy] = useState(false)
  const station = stations.find((s) => s.id === stationId)
  const active = useMemo(() => operators.filter((o) => o.json_data.active !== false), [operators])
  const options = useMemo(
    () =>
      active.map((o) => {
        const s = station ? standing(o._id, station.id) : null
        return { id: o._id, name: o.json_data.name, ...(s && (s.level === 'qualified' || s.level === 'trainer') ? { detail: t.qualified } : {}) }
      }),
    [active, station, standing, t.qualified],
  )

  async function submit() {
    if (!station || !people.length) return
    setBusy(true)
    try {
      const chosen = active.filter((o) => people.includes(o._id)).map((o) => ({ id: o._id, name: o.json_data.name }))
      await assignTraining(data, chosen, station, due || null, { id: profile.userId, name: displayName })
      await qc.invalidateQueries({ queryKey: ASSIGNMENTS_KEY })
      toast.success(t.done(chosen.length, station.name), t.doneHint)
      setPeople([])
      onClose()
    } catch (e) {
      toast.error(t.failed, errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.title}
      footer={
        <Button variant="primary" loading={busy} disabled={!station || !people.length} onClick={() => void submit()} icon={<GraduationCap className="h-4 w-4" />}>
          {t.submit(people.length)}
        </Button>
      }
    >
      <div className="space-y-5">
        <div>
          <Label htmlFor="assign-station">{t.station}</Label>
          <Select id="assign-station" value={stationId} onChange={(e) => setStationId(e.target.value)}>
            <option value="" disabled>
              {t.pickStation}
            </option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>{t.people}</Label>
          {options.length ? <PeopleChips people={options} selected={people} onToggle={(id) => setPeople((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))} /> : <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t.noPeople}</p>}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="assign-due">{t.due}</Label>
            <Input id="assign-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-auto" />
          </div>
          {due && (
            <Button size="sm" variant="ghost" onClick={() => setDue('')}>
              {t.noDue}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

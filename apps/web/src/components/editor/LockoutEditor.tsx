'use client'

import { Lock, Plus, Trash2 } from 'lucide-react'
import { EnergyIcon } from '@/components/icons'
import { Button, IconButton } from '@/components/ui/Button'
import { Input, Label, Select, Textarea } from '@/components/ui/Field'
import { useMessages } from '@/lib/i18n'
import { ENERGY } from '@/lib/model/catalog'
import { uid } from '@/lib/model/repo'
import type { EnergyPoint, EnergyType, LockoutData } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'

/** Les points d'isolement d'une fiche de cadenassage (RSST 188.1 à 188.13, CSA Z460). */
export function LockoutEditor({ value, readOnly, onChange }: { value: LockoutData; readOnly?: boolean; onChange: (v: LockoutData) => void }) {
  const t = useMessages().editor.lockout
  const set = (patch: Partial<LockoutData>) => onChange({ ...value, ...patch })
  const setPoint = (id: string, patch: Partial<EnergyPoint>) => set({ energyPoints: value.energyPoints.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
  const missing = value.energyPoints.filter((p) => !p.isolationDevice || !p.location || !p.verification).length

  return (
    <div className="glass-panel rounded-[32px] p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF2B5E] to-[#FF6B00] text-white">
          <Lock className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-black tracking-tight">{t.title}</h2>
          <p className="text-sm font-bold text-slate-500">{t.summary(value.energyPoints.length, missing)}</p>
        </div>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="lo-eq">{t.equipment}</Label>
          <Input id="lo-eq" readOnly={readOnly} value={value.equipment} onChange={(e) => set({ equipment: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="lo-loc">{t.location}</Label>
          <Input id="lo-loc" readOnly={readOnly} value={value.location ?? ''} onChange={(e) => set({ location: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="lo-locks">{t.locks}</Label>
          <Input id="lo-locks" type="number" inputMode="numeric" readOnly={readOnly} value={value.locksRequired ?? ''} onChange={(e) => set({ locksRequired: e.target.value ? Number(e.target.value) : undefined })} />
        </div>
      </div>
      <div className="space-y-3">
        {value.energyPoints.map((p) => (
          <div key={p.id} className="glass-card rounded-[24px] p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className={cn('flex h-11 min-w-11 items-center justify-center rounded-xl px-2 text-sm font-black', ENERGY[p.type].color)}>
                <EnergyIcon type={p.type} className="mr-1 h-4 w-4" />
                {p.tag}
              </span>
              <Select disabled={readOnly} value={p.type} onChange={(e) => setPoint(p.id, { type: e.target.value as EnergyType })} className="h-11 max-w-48">
                {Object.entries(ENERGY).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </Select>
              <Input readOnly={readOnly} value={p.tag} onChange={(e) => setPoint(p.id, { tag: e.target.value })} className="h-11 max-w-24" aria-label={t.tag} />
              <span className="flex-1" />
              {!readOnly && (
                <IconButton label={t.removeSource} onClick={() => set({ energyPoints: value.energyPoints.filter((x) => x.id !== p.id) })}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t.source} value={p.description} readOnly={readOnly} onChange={(v) => setPoint(p.id, { description: v })} />
              <Field label={t.magnitude} optional value={p.magnitude ?? ''} readOnly={readOnly} onChange={(v) => setPoint(p.id, { magnitude: v })} placeholder={t.magnitudePlaceholder} />
              <Field label={t.device} value={p.isolationDevice} readOnly={readOnly} onChange={(v) => setPoint(p.id, { isolationDevice: v })} />
              <Field label={t.deviceLocation} value={p.location} readOnly={readOnly} onChange={(v) => setPoint(p.id, { location: v })} />
              <Field label={t.lockingMethod} value={p.lockingMethod} readOnly={readOnly} onChange={(v) => setPoint(p.id, { lockingMethod: v })} />
              <Field label={t.verification} value={p.verification} readOnly={readOnly} onChange={(v) => setPoint(p.id, { verification: v })} />
            </div>
          </div>
        ))}
      </div>
      {!readOnly && (
        <Button
          className="mt-3"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => {
            const n = value.energyPoints.filter((p) => p.type === 'electrique').length + 1
            set({ energyPoints: [...value.energyPoints, { id: uid('ep_'), tag: `E${n}`, type: 'electrique', description: '', isolationDevice: '', location: '', lockingMethod: '', verification: '' }] })
          }}
        >
          {t.addSource}
        </Button>
      )}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="lo-mat">{t.material}</Label>
          <Textarea id="lo-mat" readOnly={readOnly} rows={3} value={(value.material ?? []).join('\n')} onChange={(e) => set({ material: e.target.value.split('\n') })} placeholder={t.materialPlaceholder} />
        </div>
        <div>
          <Label htmlFor="lo-restart">{t.restart}</Label>
          <Textarea id="lo-restart" readOnly={readOnly} rows={3} value={(value.restartSteps ?? []).join('\n')} onChange={(e) => set({ restartSteps: e.target.value.split('\n') })} placeholder={t.restartPlaceholder} />
        </div>
      </div>
    </div>
  )
}

/** Un champ d'un point d'isolement : vide, il est signalé, sauf s'il est facultatif (la magnitude). */
function Field({ label, value, onChange, readOnly, placeholder, optional }: { label: string; value: string; onChange: (v: string) => void; readOnly?: boolean; placeholder?: string; optional?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input readOnly={readOnly} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} invalid={!readOnly && !value.trim() && !optional} />
    </div>
  )
}

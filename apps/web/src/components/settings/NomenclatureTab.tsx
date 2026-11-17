'use client'

import { ChevronDown, Hash, List, Loader2, Pencil, Plus, Tags, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/components/providers/Session'
import { Button } from '@/components/ui/Button'
import { ChoiceTile, Input, Label, Switch, Textarea } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/Confirm'
import { errorText } from '@/components/ui/States'
import { Panel } from '@/components/ui/Surface'
import { useToast } from '@/components/ui/Toast'
import { qk } from '@/hooks/queries'
import { useMessages } from '@/lib/i18n'
import { forgetFamily, relabelValue, renamePublished } from '@/lib/model/classification'
import { addValues, cleanValue, displayName, familyId, MAX_FAMILIES, MAX_NAMING, NAME_SEPARATOR, norm, PRESET_KINDS, readNomenclature, type FamilyPreset, type Nomenclature, type TagFamily } from '@/lib/model/nomenclature'
import { useToggle } from '@/lib/toggles'
import { cn } from '@/lib/util/cn'

const PRESETS = Object.keys(PRESET_KINDS) as FamilyPreset[]

/**
 * Réglages › Classement (toggle `nomenclature`) : les familles d'étiquettes de l'usine. Une famille
 * se crée d'un toucher (département, machine, produit…) ; ses valeurs s'ajoutent en les collant d'un
 * coup. Renommer ou retirer une valeur met à jour les instructions classées ainsi, et les règles
 * des postes.
 */
export function NomenclatureTab() {
  const { org, updateOrg, can, data } = useSession()
  const t = useMessages().nomenclature.settings
  const toast = useToast()
  const qc = useQueryClient()
  const readOnly = !can('settings', 'write')
  const nomenclature = readNomenclature(org.json_data.nomenclature)
  const families = nomenclature.families
  const [open, setOpen] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  // Une valeur renommée ou retirée : les instructions suivent ; la page dit où on en est.
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  // Le modèle de nom : les familles devant le titre (toggle `nameTemplate`).
  const namingOn = useToggle('nameTemplate')

  async function save(next: Nomenclature, done?: string) {
    try {
      await updateOrg({ nomenclature: next })
      if (done) toast.success(done)
    } catch (e) {
      toast.error(t.notSaved, errorText(e))
      return Promise.reject(e)
    }
  }
  const setFamily = (f: TagFamily) => save({ ...nomenclature, families: families.map((x) => (x.id === f.id ? f : x)) })
  async function addPreset(p: FamilyPreset) {
    const f: TagFamily = { id: familyId(), name: t.presets[p], values: [], ...PRESET_KINDS[p] }
    await save({ ...nomenclature, families: [...families, f] }, t.saved)
    setOpen(f.id)
  }
  /** Une valeur renommée ou retirée : les instructions et les règles des postes suivent, en arrière-plan. */
  async function relabel(f: TagFamily, from: string, to: string | null) {
    setProgress({ done: 0, total: 0 })
    try {
      const n = await relabelValue(data, f.id, from, to, (done, total) => setProgress({ done, total }), nomenclature)
      toast.success(to ? t.renamed(n) : t.removedValue(n))
      void qc.invalidateQueries({ queryKey: qk.instructions })
    } catch (e) {
      toast.error(t.notSaved, errorText(e))
    } finally {
      setProgress(null)
    }
  }

  /** Le modèle de nom change : les versions publiées reprennent le début de leur nom, pour le poste. */
  async function setNaming(naming: string[]) {
    const next: Nomenclature = { ...nomenclature, naming }
    await save(next, t.naming.saved).catch(() => undefined)
    setProgress({ done: 0, total: 0 })
    try {
      await renamePublished(data, next, (done, total) => setProgress({ done, total }))
      void qc.invalidateQueries({ queryKey: qk.instructions })
    } catch (e) {
      toast.error(t.notSaved, errorText(e))
    } finally {
      setProgress(null)
    }
  }

  const unused = PRESETS.filter((p) => !families.some((f) => norm(f.name) === norm(t.presets[p])))
  return (
    <Panel className="max-w-3xl">
      <h2 className="mb-1 text-xl font-black tracking-tight">{t.title}</h2>
      <p className="mb-5 text-sm font-medium text-slate-500 dark:text-slate-400">{t.intro}</p>
      {readOnly && <p className="mb-4 rounded-2xl bg-slate-900/5 px-4 py-3 text-sm font-bold text-slate-600 dark:bg-white/5 dark:text-slate-300">{t.adminOnly}</p>}
      {progress && (
        <p className="bg-primary-soft mb-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-[var(--primary-strong)] dark:text-[var(--primary-light)]" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" /> {t.updating(progress.done, progress.total)}
        </p>
      )}

      {!families.length ? (
        <div className="rounded-[24px] border-2 border-dashed border-slate-200 p-6 text-center dark:border-slate-700">
          <span className="bg-primary-soft mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-[var(--primary)]">
            <Tags className="h-7 w-7" />
          </span>
          <p className="text-lg font-black">{t.emptyTitle}</p>
          <p className="mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">{t.emptyText}</p>
          {!readOnly && <PresetChips presets={unused} onPick={(p) => void addPreset(p)} onCustom={() => setCreating(true)} />}
        </div>
      ) : (
        <div className="space-y-3">
          {families.map((f) => (
            <FamilyCard
              key={f.id}
              family={f}
              open={open === f.id}
              readOnly={readOnly}
              onToggle={() => setOpen(open === f.id ? null : f.id)}
              onChange={(next) => void setFamily(next).catch(() => undefined)}
              onRelabel={(from, to) => relabel(f, from, to)}
              onRemove={() =>
                void save({ ...nomenclature, families: families.filter((x) => x.id !== f.id) }, t.saved)
                  .then(() => forgetFamily(data, f.id))
                  .then((n) => n && void qc.invalidateQueries({ queryKey: qk.stations }))
                  .catch(() => undefined)
              }
            />
          ))}
          {!readOnly && families.length < MAX_FAMILIES && (
            <div className="pt-2">
              <PresetChips presets={unused} onPick={(p) => void addPreset(p)} onCustom={() => setCreating(true)} />
            </div>
          )}
          {families.length >= MAX_FAMILIES && <p className="text-xs font-bold text-slate-400">{t.tooMany(MAX_FAMILIES)}</p>}
        </div>
      )}

      {namingOn && families.length > 0 && <NamingCard nomenclature={nomenclature} readOnly={readOnly} onChange={(naming) => void setNaming(naming)} />}

      <NewFamily
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={async (f) => {
          await save({ ...nomenclature, families: [...families, f] }, t.saved)
          setCreating(false)
          setOpen(f.id)
        }}
      />
    </Panel>
  )
}

/**
 * Le nom des instructions : les familles choisies passent devant le titre, dans l'ordre où on les
 * touche (au plus trois). L'exemple montre le nom tel qu'il paraîtra.
 */
function NamingCard({ nomenclature, readOnly, onChange }: { nomenclature: Nomenclature; readOnly: boolean; onChange: (naming: string[]) => void }) {
  const t = useMessages().nomenclature.settings.naming
  const naming = nomenclature.naming ?? []
  const families = nomenclature.families
  const sample = naming
    .map((id) => families.find((f) => f.id === id))
    .filter((f): f is TagFamily => !!f)
    .map((f) => f.values[0]?.label ?? `[${f.name}]`)
    .join(NAME_SEPARATOR)
  return (
    <section className="mt-6 rounded-[24px] border border-slate-200 p-4 dark:border-slate-700">
      <h3 className="text-lg font-black tracking-tight">{t.title}</h3>
      <p className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">{t.intro}</p>
      <div className="flex flex-wrap gap-2">
        {families.map((f) => {
          const at = naming.indexOf(f.id)
          const on = at >= 0
          const full = !on && naming.length >= MAX_NAMING
          return (
            <button
              key={f.id}
              type="button"
              disabled={readOnly || full}
              aria-pressed={on}
              title={full ? t.max(MAX_NAMING) : on ? t.unpick(f.name) : t.pick(f.name)}
              onClick={() => onChange(on ? naming.filter((x) => x !== f.id) : [...naming, f.id])}
              className={cn('btn-press flex h-11 items-center gap-2 rounded-full px-4 text-sm font-black disabled:opacity-40', on ? 'bg-gradient-primary shadow-primary text-white' : 'glass-card')}
            >
              {on && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-xs tabular-nums">{at + 1}</span>}
              {f.name}
            </button>
          )
        })}
      </div>
      <p className="mt-3 rounded-2xl bg-slate-900/[0.04] px-4 py-3 text-sm dark:bg-white/5">
        <span className="label-caps mr-2 text-slate-500 dark:text-slate-400">{t.example}</span>
        <span className="font-black">{sample ? displayName(t.exampleTitle, sample) : t.none}</span>
      </p>
    </section>
  )
}

function PresetChips({ presets, onPick, onCustom }: { presets: FamilyPreset[]; onPick: (p: FamilyPreset) => void; onCustom: () => void }) {
  const t = useMessages().nomenclature.settings
  return (
    <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
      {presets.map((p) => (
        <button key={p} type="button" onClick={() => onPick(p)} className="btn-press glass-card flex h-11 items-center gap-1.5 rounded-2xl px-4 text-sm font-black">
          <Plus className="h-4 w-4 text-[var(--primary)]" /> {t.presets[p]}
        </button>
      ))}
      <button type="button" onClick={onCustom} className="btn-press flex h-11 items-center gap-1.5 rounded-2xl px-4 text-sm font-black text-[var(--primary-strong)] hover:bg-slate-900/5 dark:text-[var(--primary-light)] dark:hover:bg-white/5">
        <Plus className="h-4 w-4" /> {t.addFamily}
      </button>
    </div>
  )
}

function NewFamily({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (f: TagFamily) => Promise<void> }) {
  const t = useMessages().nomenclature.settings
  const words = useMessages()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<TagFamily['kind']>('list')
  const [values, setValues] = useState('')
  const [busy, setBusy] = useState(false)
  async function create() {
    const clean = name.trim().slice(0, 40)
    if (!clean) return
    setBusy(true)
    try {
      await onCreate(addValues({ id: familyId(), name: clean, kind, multiple: kind === 'free', values: [] }, values))
      setName('')
      setValues('')
      setKind('list')
    } catch {
      /* le toast l'a dit */
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t.addFamilyTitle}
      footer={
        <>
          <Button onClick={onClose}>{words.common.cancel}</Button>
          <Button variant="primary" loading={busy} disabled={!name.trim()} onClick={() => void create()}>
            {t.create}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="family-name">{t.familyName}</Label>
          <Input id="family-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.familyNamePlaceholder} data-autofocus />
        </div>
        <div>
          <Label>{t.kind}</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceTile selected={kind === 'list'} onClick={() => setKind('list')} icon={<List className="h-5 w-5" />} title={t.kinds.list.label} description={t.kinds.list.hint} />
            <ChoiceTile selected={kind === 'free'} onClick={() => setKind('free')} icon={<Hash className="h-5 w-5" />} title={t.kinds.free.label} description={t.kinds.free.hint} />
          </div>
        </div>
        {kind === 'list' && (
          <div>
            <Label htmlFor="family-values">{t.values}</Label>
            <Textarea id="family-values" rows={3} value={values} onChange={(e) => setValues(e.target.value)} placeholder={t.addValuesPlaceholder} />
          </div>
        )}
      </div>
    </Modal>
  )
}

function FamilyCard({
  family: f,
  open,
  readOnly,
  onToggle,
  onChange,
  onRelabel,
  onRemove,
}: {
  family: TagFamily
  open: boolean
  readOnly: boolean
  onToggle: () => void
  onChange: (f: TagFamily) => void
  onRelabel: (from: string, to: string | null) => Promise<void>
  onRemove: () => void
}) {
  const t = useMessages().nomenclature.settings
  const confirm = useConfirm()
  const [name, setName] = useState(f.name)
  const [hint, setHint] = useState(f.hint ?? '')
  const [adding, setAdding] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const Icon = f.kind === 'list' ? List : Hash
  return (
    <div className="glass-card rounded-[24px] p-2">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-2 text-left">
        <span className="bg-primary-soft flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--primary-strong)] dark:text-[var(--primary-light)]">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-black">{f.name}</span>
          <span className="block truncate text-xs font-bold text-slate-500 dark:text-slate-400">
            {t.kinds[f.kind].label}
            {f.kind === 'list' ? ` · ${t.valuesCount(f.values.length)}` : ''}
            {f.kind === 'list' && f.values.length ? ` — ${f.values.slice(0, 4).map((v) => v.label).join(', ')}${f.values.length > 4 ? '…' : ''}` : ''}
          </span>
        </span>
        <ChevronDown className={cn('h-5 w-5 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-4 px-2 pt-3 pb-2">
          {!readOnly && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={`fname-${f.id}`}>{t.familyName}</Label>
                <Input id={`fname-${f.id}`} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name.trim() !== f.name && onChange({ ...f, name: name.trim().slice(0, 40) })} />
              </div>
              <div>
                <Label htmlFor={`fhint-${f.id}`}>{t.hint}</Label>
                <Input id={`fhint-${f.id}`} value={hint} onChange={(e) => setHint(e.target.value)} placeholder={t.hintPlaceholder} onBlur={() => hint.trim() !== (f.hint ?? '') && onChange({ ...f, hint: hint.trim() || undefined })} />
              </div>
            </div>
          )}
          {!readOnly && <Switch checked={f.multiple} onChange={(multiple) => onChange({ ...f, multiple })} label={t.multiple} description={t.multipleHint} />}
          <div>
            <Label>{f.kind === 'list' ? t.values : t.seenValues}</Label>
            {f.values.length ? (
              <div className="flex flex-wrap gap-2">
                {f.values.map((v) => (
                  <span key={v.label} className="glass-card inline-flex h-10 items-center gap-1 rounded-xl pr-1 pl-3 text-sm font-black">
                    {v.label}
                    {v.code && <span className="text-xs text-slate-400">{v.code}</span>}
                    {!readOnly && (
                      <>
                        <button type="button" aria-label={t.renameTitle(v.label)} title={t.rename} onClick={() => setRenaming(v.label)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-900/5 dark:hover:bg-white/10">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={t.removeValue(v.label)}
                          onClick={async () => {
                            const c = t.removeValueConfirm(v.label)
                            if (!(await confirm({ title: c.title, description: c.description, confirmLabel: c.confirm, danger: true }))) return
                            onChange({ ...f, values: f.values.filter((x) => x.label !== v.label) })
                            void onRelabel(v.label, null)
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-rose-500 hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm font-bold text-slate-400">{t.noValues}</p>
            )}
          </div>
          {!readOnly && (f.kind === 'list' || f.values.length > 0) && (
            <div className="flex items-start gap-2">
              <Textarea rows={2} value={adding} onChange={(e) => setAdding(e.target.value)} placeholder={t.addValuesPlaceholder} aria-label={t.values} wrapperClassName="flex-1" />
              <Button
                disabled={!adding.trim()}
                onClick={() => {
                  onChange(addValues(f, adding))
                  setAdding('')
                }}
              >
                {t.addValues}
              </Button>
            </div>
          )}
          {!readOnly && (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={async () => {
                  const c = t.removeFamilyConfirm(f.name)
                  if (await confirm({ title: c.title, description: c.description, confirmLabel: c.confirm, danger: true })) onRemove()
                }}
              >
                {t.removeFamily}
              </Button>
            </div>
          )}
        </div>
      )}
      <RenameValue
        value={renaming}
        onClose={() => setRenaming(null)}
        onRename={(to) => {
          const from = renaming
          if (!from) return
          setRenaming(null)
          if (f.values.some((v) => norm(v.label) === norm(to) && v.label !== from)) return
          onChange({ ...f, values: f.values.map((v) => (v.label === from ? { ...v, label: to } : v)) })
          void onRelabel(from, to)
        }}
      />
    </div>
  )
}

function RenameValue({ value, onClose, onRename }: { value: string | null; onClose: () => void; onRename: (to: string) => void }) {
  const t = useMessages().nomenclature.settings
  const words = useMessages()
  const [next, setNext] = useState('')
  const clean = cleanValue(next)
  return (
    <Modal
      open={!!value}
      onClose={onClose}
      size="sm"
      title={value ? t.renameTitle(value) : undefined}
      footer={
        <>
          <Button onClick={onClose}>{words.common.cancel}</Button>
          <Button variant="primary" disabled={!clean || clean === value} onClick={() => onRename(clean)}>
            {t.rename}
          </Button>
        </>
      }
    >
      <Label htmlFor="rename-value">{t.renameLabel}</Label>
      <Input id="rename-value" defaultValue={value ?? ''} onChange={(e) => setNext(e.target.value)} data-autofocus />
    </Modal>
  )
}

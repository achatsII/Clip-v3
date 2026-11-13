'use client'

import { Camera, Gauge, ListChecks, Plus, ToggleRight, Trash2, Type, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Input, Label, Switch } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useMessages } from '@/lib/i18n'
import { CHECK_KINDS, cleanChecks, newCheck, parseNumber } from '@/lib/model/checks'
import { uid } from '@/lib/model/repo'
import type { Check, CheckKind } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'

/** L'icône de chaque genre de relevé (éditeur, registre). */
export const CHECK_ICONS: Record<CheckKind, (cls?: string) => ReactNode> = {
  measure: (cls = 'h-5 w-5') => <Gauge className={cls} />,
  yesno: (cls = 'h-5 w-5') => <ToggleRight className={cls} />,
  choice: (cls = 'h-5 w-5') => <ListChecks className={cls} />,
  text: (cls = 'h-5 w-5') => <Type className={cls} />,
  photo: (cls = 'h-5 w-5') => <Camera className={cls} />,
}

/** Un nombre tel que l'éditeur l'affiche dans un champ (« 4,5 » en français). */
const asText = (n: number | null | undefined, locale: string) => (typeof n === 'number' ? n.toLocaleString(locale, { maximumFractionDigits: 6, useGrouping: false }) : '')

/**
 * Ajouter ou modifier un relevé : le genre, le libellé, puis seulement ce que ce genre demande (unité
 * et limites d'une mesure, bonne réponse d'un oui ou non, choix et écarts d'un choix). `check` null :
 * un nouveau relevé.
 */
export function CheckDialog({ check, locale, onSave, onRemove, onClose }: { check: Check | null; locale: string; onSave: (c: Check) => void; onRemove?: () => void; onClose: () => void }) {
  const words = useMessages()
  const t = words.editor.checks
  const [draft, setDraft] = useState<Check>(() => check ?? newCheck('measure'))
  const [min, setMin] = useState(() => asText(check?.min, locale))
  const [max, setMax] = useState(() => asText(check?.max, locale))
  const [target, setTarget] = useState(() => asText(check?.target, locale))
  const [invalid, setInvalid] = useState(false)
  const set = (patch: Partial<Check>) => {
    setInvalid(false)
    setDraft((d) => ({ ...d, ...patch }))
  }
  const kind = draft.kind

  function changeKind(k: CheckKind) {
    // Le libellé reste ; ce qui ne sert qu'à l'ancien genre part.
    const fresh = newCheck(k, draft.label)
    setDraft({ ...fresh, id: draft.id, ...(draft.optional ? { optional: true } : {}) })
    setInvalid(false)
  }

  function save() {
    const candidate = {
      ...draft,
      ...(kind === 'measure' ? { min: parseNumber(min), max: parseNumber(max), target: parseNumber(target) } : {}),
      ...(kind === 'choice' ? { options: (draft.options ?? []).filter((o) => o.label.trim()) } : {}),
    }
    const [clean] = cleanChecks([candidate], 1)
    if (!clean) return setInvalid(true)
    onSave(clean)
    onClose()
  }

  const options = draft.options ?? []
  return (
    <Modal
      open
      onClose={onClose}
      title={check ? t.editTitle : t.newTitle}
      footer={
        <>
          {check && onRemove && (
            <button
              type="button"
              onClick={() => {
                onRemove()
                onClose()
              }}
              className="btn-press mr-auto flex h-12 items-center gap-2 rounded-full px-4 text-sm font-black text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              <Trash2 className="h-4 w-4" /> {t.remove}
            </button>
          )}
          <Button onClick={onClose}>{words.common.cancel}</Button>
          <Button variant="primary" onClick={save}>
            {t.save}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <Label>{t.kind}</Label>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t.kind}>
            {CHECK_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => changeKind(k)}
                className={cn('btn-press flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center sm:min-h-16 sm:flex-row sm:justify-start sm:gap-2.5 sm:px-3 sm:text-left', kind === k ? 'bg-gradient-primary shadow-primary text-white' : 'glass-card text-slate-700 dark:text-slate-200')}
              >
                {CHECK_ICONS[k]('h-5 w-5 shrink-0')}
                <span className="min-w-0">
                  <span className="block text-sm leading-tight font-black">{t.kinds[k]}</span>
                  {/* L'explication, sur un écran qui a la place. */}
                  <span className={cn('block text-[11px] leading-tight font-bold max-sm:hidden', kind === k ? 'text-white/80' : 'text-slate-500')}>{t.kindHints[k]}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="check-label">{t.label}</Label>
          <Input id="check-label" autoFocus={!check} value={draft.label} onChange={(e) => set({ label: e.target.value })} placeholder={t.labelPlaceholders[kind]} invalid={invalid && !draft.label.trim()} />
        </div>

        {kind === 'measure' && (
          <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <Label htmlFor="check-unit">{t.unit}</Label>
                <Input id="check-unit" value={draft.unit ?? ''} onChange={(e) => set({ unit: e.target.value })} placeholder={t.unitPlaceholder} dictation={false} />
              </div>
              {(
                [
                  ['check-min', t.min, min, setMin],
                  ['check-max', t.max, max, setMax],
                  ['check-target', t.target, target, setTarget],
                ] as const
              ).map(([id, label, value, setValue]) => (
                <div key={id}>
                  <Label htmlFor={id}>{label}</Label>
                  <Input id={id} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} invalid={!!value.trim() && parseNumber(value) === null} dictation={false} className="tabular-nums" />
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm font-medium text-slate-500">{t.limitsHint}</p>
          </div>
        )}

        {kind === 'yesno' && (
          <div>
            <Label>{t.expected}</Label>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t.expected}>
              {(
                [
                  ['yes', t.yes],
                  ['no', t.no],
                  [null, t.expectedNone],
                ] as const
              ).map(([v, label]) => (
                <button key={String(v)} type="button" role="radio" aria-checked={(draft.expected ?? null) === v} onClick={() => set({ expected: v })} className={cn('btn-press h-11 rounded-2xl px-4 text-sm font-black', (draft.expected ?? null) === v ? 'bg-gradient-primary shadow-primary text-white' : 'glass-card')}>
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm font-medium text-slate-500">{t.expectedHint}</p>
          </div>
        )}

        {kind === 'choice' && (
          <div>
            <Label hint={t.badHint}>{t.options}</Label>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={o.id} className="flex items-center gap-2">
                  <Input value={o.label} onChange={(e) => set({ options: options.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)) })} placeholder={t.option(i + 1)} aria-label={t.option(i + 1)} wrapperClassName="flex-1" invalid={invalid && options.filter((x) => x.label.trim()).length < 2 && !o.label.trim()} />
                  <button type="button" aria-pressed={!!o.bad} onClick={() => set({ options: options.map((x) => (x.id === o.id ? { ...x, bad: !x.bad || undefined } : x)) })} className={cn('btn-press h-11 shrink-0 rounded-2xl px-3 text-sm font-black', o.bad ? 'bg-rose-600 text-white' : 'glass-card text-slate-500')}>
                    {t.bad}
                  </button>
                  {options.length > 2 && (
                    <button type="button" onClick={() => set({ options: options.filter((x) => x.id !== o.id) })} aria-label={t.removeOption} className="btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-900/5">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <button type="button" onClick={() => set({ options: [...options, { id: uid('op_'), label: '' }] })} className="btn-press hover:bg-primary-soft flex h-11 items-center gap-1.5 rounded-2xl px-3 text-sm font-black text-[var(--primary)]">
                  <Plus className="h-4 w-4" /> {t.addOption}
                </button>
              )}
            </div>
          </div>
        )}

        <Switch checked={!!draft.optional} onChange={(v) => set({ optional: v || undefined })} label={t.optional} description={t.optionalHint} />

        {invalid && (
          <p role="alert" className="text-sm font-black text-rose-600">
            {t.invalid}
          </p>
        )}
      </div>
    </Modal>
  )
}

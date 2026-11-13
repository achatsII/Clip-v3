'use client'

import { Camera, Check as CheckIcon, CheckCircle2, ClipboardCheck, Info, Loader2, ScanLine, TriangleAlert, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ScanSheet } from '@/components/ScanSheet'
import { Input } from '@/components/ui/Field'
import { hasCapability } from '@/lib/bridge/native'
import type { FilesApi } from '@/lib/gateway/files'
import { compressImage } from '@/lib/media/image'
import { canScan, scanNative } from '@/lib/media/scan'
import { blocks, liveChecks, parseNumber, readingsStats, verdict, type Answers, type CheckAnswer } from '@/lib/model/checks'
import type { Check, ItemState, Step } from '@/lib/model/types'
import { cn } from '@/lib/util/cn'
import { rangeText, type PlayerStrings } from './i18n'

type T = PlayerStrings['records']

/**
 * Ce que l'opérateur relève à une étape, sous ses consignes : une mesure (grand champ, unité,
 * limites, verdict tout de suite), un oui ou non, un choix, un texte, une photo. Un écart demande une
 * note. `nudge` change quand on veut passer sans avoir tout rempli : ce qui manque se signale.
 */
export function StepChecks({ step, answers, onAnswer, t, files, nudge, preview }: { step: Step; answers: Answers; onAnswer: (checkId: string, a: CheckAnswer) => void; t: T; files: FilesApi | null; nudge: number; preview?: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  // Une proposition de l'IA que l'auteur n'a pas gardée n'existe pas au poste (ni dans l'aperçu).
  const checks = liveChecks(step)
  const missing = checks.some((c) => blocks(c, answers[c.id]))
  useEffect(() => {
    if (nudge) box.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [nudge])
  if (!checks.length) return null
  return (
    <section ref={box} aria-label={t.title} className={cn('rounded-3xl border-2 bg-white/70 p-4 dark:bg-white/5', nudge && missing ? 'animate-shake border-rose-400' : 'border-[var(--primary)]/25')}>
      <p className="label-caps mb-3 flex items-center gap-1.5 text-[var(--primary-strong)] dark:text-sky-300">
        <ClipboardCheck className="h-4 w-4" /> {t.title}
      </p>
      <div className="space-y-5">
        {checks.map((c) => (
          <CheckField key={c.id} check={c} answer={answers[c.id]} onAnswer={(a) => onAnswer(c.id, a)} t={t} files={files} flag={!!nudge && blocks(c, answers[c.id])} preview={preview} />
        ))}
      </div>
      {!!nudge && missing && (
        <p role="alert" className="mt-4 text-base font-black text-rose-600 dark:text-rose-400">
          {t.needed}
        </p>
      )}
    </section>
  )
}

function CheckField({ check, answer, onAnswer, t, files, flag, preview }: { check: Check; answer: CheckAnswer | undefined; onAnswer: (a: CheckAnswer) => void; t: T; files: FilesApi | null; flag: boolean; preview?: boolean }) {
  const value = answer?.value ?? null
  const ok = verdict(check, value)
  const set = (v: CheckAnswer['value']) => onAnswer({ value: v, note: answer?.note, authorizedBy: answer?.authorizedBy })
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className={cn('text-lg leading-snug font-black text-slate-900 dark:text-white', flag && 'text-rose-600 dark:text-rose-400')}>{check.label}</p>
        {check.optional && <span className="shrink-0 text-xs font-bold text-slate-400">{t.optional}</span>}
      </div>
      {/* Comment mesurer : l'outil, l'endroit (module Relevés). */}
      {check.how && (
        <p className="-mt-1 mb-2 flex items-start gap-1.5 text-sm font-bold text-slate-500 dark:text-slate-400">
          <Info className="mt-0.5 h-4 w-4 shrink-0" /> <span className="sr-only">{t.how} : </span>
          {check.how}
        </p>
      )}

      {check.kind === 'measure' && <MeasureField check={check} value={typeof value === 'number' ? value : null} onValue={set} t={t} />}

      {check.kind === 'measures' && <MeasuresField check={check} value={Array.isArray(value) ? (value as Array<number | null>) : []} onValue={set} t={t} />}

      {check.kind === 'checklist' && <ChecklistField check={check} value={value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, ItemState>) : {}} onValue={set} t={t} />}

      {check.kind === 'yesno' && (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={check.label}>
          {([true, false] as const).map((v) => {
            const on = value === v
            const bad = on && ok === false
            return (
              <button
                key={String(v)}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => set(v)}
                className={cn('btn-press h-16 rounded-2xl text-xl font-black', on ? (bad ? 'bg-rose-600 text-white shadow-lg' : 'bg-gradient-primary shadow-primary text-white') : 'glass-card text-slate-800 dark:text-slate-100')}
              >
                {v ? t.yes : t.no}
              </button>
            )
          })}
        </div>
      )}

      {check.kind === 'choice' && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={check.label}>
          {(check.options ?? []).map((o) => {
            const on = value === o.id
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => set(o.id)}
                className={cn('btn-press min-h-14 rounded-2xl px-5 text-lg font-black', on ? (o.bad ? 'bg-rose-600 text-white shadow-lg' : 'bg-gradient-primary shadow-primary text-white') : 'glass-card text-slate-800 dark:text-slate-100')}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      )}

      {check.kind === 'text' && (check.scan ? <ScanText value={typeof value === 'string' ? value : ''} onValue={set} t={t} label={check.label} /> : <Input value={typeof value === 'string' ? value : ''} onChange={(e) => set(e.target.value)} placeholder={t.textPlaceholder} aria-label={check.label} className="h-14 text-lg" />)}

      {check.kind === 'photo' &&
        ((check.photos ?? 1) > 1 ? (
          <PhotosField max={check.photos ?? 2} value={Array.isArray(value) ? (value as string[]) : typeof value === 'string' && value ? [value] : []} onValue={set} t={t} files={files} preview={preview} label={check.label} />
        ) : (
          <PhotoField value={typeof value === 'string' ? value : null} onValue={set} t={t} files={files} preview={preview} label={check.label} />
        ))}

      {/* Le verdict, tout de suite : dans la norme, ou l'écart et sa note. */}
      {ok === true && (
        <p className="mt-2 flex items-center gap-1.5 text-base font-black text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5" /> {t.ok}
        </p>
      )}
      {ok === false && (
        <div className="animate-pop-in mt-3 rounded-2xl bg-rose-50 p-3 dark:bg-rose-500/10">
          <p className="mb-2 flex items-center gap-1.5 text-base font-black text-rose-700 dark:text-rose-300">
            <TriangleAlert className="h-5 w-5" /> {t.noteAsk(check.kind === 'measure' ? t.bad : t.deviation)}
          </p>
          <Input value={answer?.note ?? ''} onChange={(e) => onAnswer({ value, note: e.target.value, authorizedBy: answer?.authorizedBy })} placeholder={t.notePlaceholder} aria-label={t.noteLabel} className={cn('h-14 text-lg', flag && !answer?.note?.trim() && 'ring-2 ring-rose-400')} />
          {/* Le module Relevés : un écart se fait autoriser, et l'on dit par qui. */}
          {check.authorize && (
            <>
              <p className="mt-3 mb-2 text-base font-black text-rose-700 dark:text-rose-300">{t.authorizedBy}</p>
              <Input value={answer?.authorizedBy ?? ''} onChange={(e) => onAnswer({ value, note: answer?.note, authorizedBy: e.target.value })} placeholder={t.authorizedPlaceholder} aria-label={t.authorizedBy} className={cn('h-14 text-lg', flag && !answer?.authorizedBy?.trim() && 'ring-2 ring-rose-400')} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** Une mesure : le texte tapé reste tel quel (« 4, » en cours de saisie), le nombre part dès qu'il est lisible. */
function MeasureField({ check, value, onValue, t }: { check: Check; value: number | null; onValue: (v: number | null) => void; t: T }) {
  const [text, setText] = useState(() => (value === null ? '' : t.num(value)))
  const range = rangeText(check, t)
  return (
    <div>
      <div className="flex items-stretch gap-2">
        <input
          inputMode="decimal"
          autoComplete="off"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            onValue(parseNumber(e.target.value))
          }}
          aria-label={t.valueLabel(check.label)}
          className="glass-input h-16 w-full min-w-0 flex-1 rounded-2xl px-4 text-3xl font-black tabular-nums focus:ring-2 focus:ring-[var(--primary)] focus:outline-none"
        />
        {check.unit && <span className="flex shrink-0 items-center rounded-2xl bg-slate-900/5 px-4 text-xl font-black text-slate-600 dark:bg-white/10 dark:text-slate-200">{check.unit}</span>}
      </div>
      {(range || typeof check.target === 'number') && (
        <p className="mt-1.5 text-sm font-bold text-slate-500">
          {[range, typeof check.target === 'number' ? t.target(t.num(check.target), check.unit ?? '') : null].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  )
}

/** Une photo de preuve : prise à l'appareil, envoyée tout de suite (dans l'aperçu, gardée sur place). */
function PhotoField({ value, onValue, t, files, preview, label }: { value: string | null; onValue: (v: string | null) => void; t: T; files: FilesApi | null; preview?: boolean; label: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  async function take(file: File) {
    setFailed(false)
    if (preview || !files) {
      onValue(URL.createObjectURL(file))
      return
    }
    setBusy(true)
    try {
      const { blob } = await compressImage(file)
      onValue((await files.upload(blob, file.name, 'execution')).url)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      {value && <img src={value} alt={label} className="h-20 w-20 rounded-2xl object-cover shadow" />}
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className={cn('btn-press flex h-14 items-center gap-2 rounded-2xl px-5 text-lg font-black', value ? 'glass-card' : 'bg-gradient-primary shadow-primary text-white')}>
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />} {busy ? t.uploading : value ? t.retakePhoto : t.takePhoto}
      </button>
      {failed && <p className="w-full text-sm font-black text-rose-600">{t.photoFailed}</p>}
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && void take(e.target.files[0])} />
    </div>
  )
}

/** Des mesures répétées : une lecture par case, jugée tout de suite ; puis la plus basse, la plus haute, la moyenne. */
function MeasuresField({ check, value, onValue, t }: { check: Check; value: Array<number | null>; onValue: (v: Array<number | null>) => void; t: T }) {
  const count = check.count ?? 3
  const [texts, setTexts] = useState<string[]>(() => Array.from({ length: count }, (_, i) => (typeof value[i] === 'number' ? t.num(value[i] as number) : '')))
  const range = rangeText(check, t)
  const nums = Array.from({ length: count }, (_, i) => parseNumber(texts[i] ?? ''))
  const stats = nums.every((n) => n !== null) ? readingsStats(nums as number[]) : null
  const out = (n: number | null) => n !== null && ((typeof check.min === 'number' && n < check.min) || (typeof check.max === 'number' && n > check.max))
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <label key={i} className="block">
            <span className="mb-1 block text-xs font-black tracking-wide text-slate-500 uppercase">{t.reading(i + 1)}</span>
            <span className="flex items-stretch gap-1">
              <input
                inputMode="decimal"
                autoComplete="off"
                value={texts[i] ?? ''}
                onChange={(e) => {
                  const next = [...texts]
                  next[i] = e.target.value
                  setTexts(next)
                  onValue(next.map((x) => parseNumber(x ?? '')))
                }}
                aria-label={`${check.label} — ${t.reading(i + 1)}`}
                className={cn('glass-input h-14 w-full min-w-0 rounded-2xl px-3 text-2xl font-black tabular-nums focus:ring-2 focus:ring-[var(--primary)] focus:outline-none', out(nums[i]) && 'text-rose-600 ring-2 ring-rose-400')}
              />
              {check.unit && <span className="flex shrink-0 items-center rounded-2xl bg-slate-900/5 px-2.5 text-base font-black text-slate-600 dark:bg-white/10 dark:text-slate-200">{check.unit}</span>}
            </span>
          </label>
        ))}
      </div>
      {(range || stats) && (
        <p className="mt-1.5 text-sm font-bold text-slate-500">
          {[range, stats ? t.stats(t.num(stats.low), t.num(stats.high), t.num(stats.mean)) : null].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  )
}

const ITEM_LOOK: Record<ItemState, string> = {
  ok: 'bg-emerald-500 text-white shadow-lg',
  ko: 'bg-rose-600 text-white shadow-lg',
  na: 'bg-slate-700 text-white shadow-lg dark:bg-slate-200 dark:text-slate-900',
}

/** Une liste de vérification : chaque point, conforme, pas conforme (un écart) ou sans objet ; de grosses cibles. */
function ChecklistField({ check, value, onValue, t }: { check: Check; value: Record<string, ItemState>; onValue: (v: Record<string, ItemState>) => void; t: T }) {
  return (
    <ul className="space-y-2">
      {(check.items ?? []).map((item) => (
        <li key={item.id} className="glass-card flex flex-wrap items-center gap-2 rounded-2xl p-2 pl-3">
          <span className="min-w-0 flex-1 text-base leading-snug font-black text-slate-900 dark:text-white">{item.label}</span>
          <span className="flex gap-1.5" role="radiogroup" aria-label={item.label}>
            {(['ok', 'ko', 'na'] as const).map((st) => {
              const on = value[item.id] === st
              return (
                <button key={st} type="button" role="radio" aria-checked={on} aria-label={t.items[st]} title={t.items[st]} onClick={() => onValue({ ...value, [item.id]: st })} className={cn('btn-press flex h-12 min-w-12 items-center justify-center rounded-xl px-2 text-sm font-black', on ? ITEM_LOOK[st] : 'bg-slate-900/5 text-slate-600 dark:bg-white/10 dark:text-slate-300')}>
                  {st === 'ok' ? <CheckIcon className="h-6 w-6" strokeWidth={3} /> : st === 'ko' ? <X className="h-6 w-6" strokeWidth={3} /> : t.itemNa}
                </button>
              )
            })}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Un numéro de lot ou de série : tapé, ou lu au scanner (la coquille d'abord, sinon la caméra du navigateur). */
function ScanText({ value, onValue, t, label }: { value: string; onValue: (v: string) => void; t: T; label: string }) {
  const [sheet, setSheet] = useState(false)
  async function scan() {
    if (hasCapability('scan')) {
      const v = await scanNative(label).catch(() => null)
      if (v) onValue(v)
      return
    }
    setSheet(true)
  }
  return (
    <div className="flex items-stretch gap-2">
      <Input value={value} onChange={(e) => onValue(e.target.value)} placeholder={t.textPlaceholder} aria-label={label} className="h-14 text-lg" wrapperClassName="flex-1" dictation={false} />
      {canScan() && (
        <button type="button" onClick={() => void scan()} className="btn-press bg-gradient-primary shadow-primary flex h-14 shrink-0 items-center gap-2 rounded-2xl px-4 text-base font-black text-white">
          <ScanLine className="h-5 w-5" /> {t.scan}
        </button>
      )}
      <ScanSheet open={sheet} onClose={() => setSheet(false)} title={label} onResult={(v) => { setSheet(false); onValue(v) }} />
    </div>
  )
}

/** Plusieurs photos de preuve (jusqu'à `max`) : chacune envoyée tout de suite, et retirable. */
function PhotosField({ max, value, onValue, t, files, preview, label }: { max: number; value: string[]; onValue: (v: string[]) => void; t: T; files: FilesApi | null; preview?: boolean; label: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  async function take(file: File) {
    setFailed(false)
    if (preview || !files) {
      onValue([...value, URL.createObjectURL(file)].slice(0, max))
      return
    }
    setBusy(true)
    try {
      const { blob } = await compressImage(file)
      onValue([...value, (await files.upload(blob, file.name, 'execution')).url].slice(0, max))
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      {value.map((url, i) => (
        <span key={url} className="relative">
          <img src={url} alt={`${label} ${i + 1}`} className="h-20 w-20 rounded-2xl object-cover shadow" />
          <button type="button" aria-label={t.removePhoto} onClick={() => onValue(value.filter((u) => u !== url))} className="btn-press absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white shadow">
            <X className="h-4 w-4" />
          </button>
        </span>
      ))}
      {value.length < max && (
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className={cn('btn-press flex h-14 items-center gap-2 rounded-2xl px-5 text-lg font-black', value.length ? 'glass-card' : 'bg-gradient-primary shadow-primary text-white')}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />} {busy ? t.uploading : value.length ? t.addPhoto : t.takePhoto}
        </button>
      )}
      <span className="text-sm font-black text-slate-500 tabular-nums">{t.photosCount(value.length, max)}</span>
      {failed && <p className="w-full text-sm font-black text-rose-600">{t.photoFailed}</p>}
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && void take(e.target.files[0])} />
    </div>
  )
}

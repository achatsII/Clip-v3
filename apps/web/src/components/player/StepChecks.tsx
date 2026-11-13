'use client'

import { Camera, CheckCircle2, ClipboardCheck, Loader2, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/Field'
import type { FilesApi } from '@/lib/gateway/files'
import { compressImage } from '@/lib/media/image'
import { blocks, parseNumber, verdict, type Answers, type CheckAnswer } from '@/lib/model/checks'
import type { Check, Step } from '@/lib/model/types'
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
  const missing = (step.checks ?? []).some((c) => blocks(c, answers[c.id]))
  useEffect(() => {
    if (nudge) box.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [nudge])
  if (!step.checks?.length) return null
  return (
    <section ref={box} aria-label={t.title} className={cn('rounded-3xl border-2 bg-white/70 p-4 dark:bg-white/5', nudge && missing ? 'animate-shake border-rose-400' : 'border-[var(--primary)]/25')}>
      <p className="label-caps mb-3 flex items-center gap-1.5 text-[var(--primary-strong)] dark:text-sky-300">
        <ClipboardCheck className="h-4 w-4" /> {t.title}
      </p>
      <div className="space-y-5">
        {step.checks.map((c) => (
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
  const set = (v: CheckAnswer['value']) => onAnswer({ value: v, note: answer?.note })
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className={cn('text-lg leading-snug font-black text-slate-900 dark:text-white', flag && 'text-rose-600 dark:text-rose-400')}>{check.label}</p>
        {check.optional && <span className="shrink-0 text-xs font-bold text-slate-400">{t.optional}</span>}
      </div>

      {check.kind === 'measure' && <MeasureField check={check} value={typeof value === 'number' ? value : null} onValue={set} t={t} />}

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

      {check.kind === 'text' && <Input value={typeof value === 'string' ? value : ''} onChange={(e) => set(e.target.value)} placeholder={t.textPlaceholder} aria-label={check.label} className="h-14 text-lg" />}

      {check.kind === 'photo' && <PhotoField value={typeof value === 'string' ? value : null} onValue={set} t={t} files={files} preview={preview} label={check.label} />}

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
          <Input value={answer?.note ?? ''} onChange={(e) => onAnswer({ value, note: e.target.value })} placeholder={t.notePlaceholder} aria-label={t.noteLabel} className={cn('h-14 text-lg', flag && 'ring-2 ring-rose-400')} />
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

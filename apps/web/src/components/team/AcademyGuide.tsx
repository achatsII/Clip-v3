'use client'

/**
 * L'Académie en trois gestes : le parcours de chaque poste (ses instructions et leurs questions), qui
 * doit être formé, puis la validation au poste et sur le terrain. Chaque geste dit où l'usine en est.
 * « Compris » le replie, retenu sur l'appareil ; « Comment ça marche » le rouvre.
 */
import { Check, HelpCircle } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { useMessages } from '@/lib/i18n'
import { cn } from '@/lib/util/cn'

const KEY = 'clip_pref_academy_guide'
const listeners = new Set<() => void>()
function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'hidden'
  } catch {
    return true
  }
}
function write(open: boolean) {
  try {
    localStorage.setItem(KEY, open ? 'open' : 'hidden')
  } catch {
    /* appareil sans stockage : le choix vaut pour cette page */
  }
  listeners.forEach((fn) => fn())
}
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useGuideOpen(): [boolean, (open: boolean) => void] {
  return [useSyncExternalStore(subscribe, read, () => true), write]
}

export function AcademyGuide({ withQuestions, toTrain, signed, onPaths }: { withQuestions: number; toTrain: number; signed: number; onPaths: () => void }) {
  const t = useMessages().academy.guide
  const [open, setOpen] = useGuideOpen()
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-press flex h-11 items-center gap-2 rounded-2xl px-2 text-sm font-black text-slate-500 dark:text-slate-400">
        <HelpCircle className="h-4 w-4" /> {t.show}
      </button>
    )
  }
  const states = [t.pathsState(withQuestions), t.peopleState(toTrain), t.signedState(signed)]
  const done = [withQuestions > 0, toTrain > 0 || signed > 0, signed > 0]
  return (
    <section className="glass-panel rounded-[28px] p-5" aria-labelledby="academy-guide">
      <div className="mb-4 flex items-center gap-3">
        <h2 id="academy-guide" className="flex-1 text-lg font-black tracking-tight">
          {t.title}
        </h2>
        <button type="button" onClick={() => setOpen(false)} className="btn-press h-11 rounded-2xl px-3 text-sm font-black text-slate-500 hover:bg-slate-900/5 dark:text-slate-400 dark:hover:bg-white/10">
          {t.hide}
        </button>
      </div>
      <ol className="grid gap-3 md:grid-cols-3">
        {t.steps.map((step, i) => (
          <li key={step.title} className="flex gap-3 rounded-[22px] bg-slate-900/[0.03] p-4 dark:bg-white/5">
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black', done[i] ? 'bg-emerald-500 text-white' : 'bg-[var(--primary-soft)] text-[var(--primary-strong)] dark:text-[var(--primary-light)]')}>{done[i] ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}</span>
            <div className="min-w-0">
              <p className="font-black">{step.title}</p>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{step.text}</p>
              <p className="mt-2 text-xs font-black text-slate-500 dark:text-slate-400">{states[i]}</p>
              {i === 0 && (
                <button type="button" onClick={onPaths} className="btn-press mt-1 h-11 text-sm font-black text-[var(--primary-strong)] dark:text-[var(--primary-light)]">
                  {t.seePaths}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

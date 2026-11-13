'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Delete, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PublicLoading, PublicMessage } from '@/components/public/PublicShell'
import { SearchField } from '@/components/ui/SearchField'
import type { DataApi, Doc } from '@/lib/gateway/data'
import { useMessages } from '@/lib/i18n'
import { listOperators, orderForStation, saveStationSession, verifyCode, type StationSession } from '@/lib/model/operators'
import type { Operator } from '@/lib/model/types'
import { cn, initials } from '@/lib/util/cn'
import { matchesTokens, SEARCH_FROM, searchTokens } from '@/lib/util/people'

/** Sans recherche, au plus ce nombre de noms à la fois : au-delà, on cherche le sien. */
const SHOWN = 24

/**
 * « Qui êtes-vous ? » à la tablette du poste : on touche son nom (ceux du poste d'abord), puis on tape
 * son code à 4 chiffres sur un grand pavé. Le serveur vérifie le code. Si l'identification ne peut
 * pas se faire (lien d'avant, serveur muet), on laisse continuer : le travail ne s'arrête jamais.
 * Une grande équipe : une grande recherche (chaque mot du nom), sans clavier qui s'ouvre tout seul.
 */
export function WhoAreYou({ link, data, stationId, canIdentify, onDone, onSkip }: { link: string; data: DataApi; stationId: string | null; canIdentify: boolean; onDone: (s: StationSession) => void; onSkip: () => void }) {
  const t = useMessages().publicLinks.kiosk.who
  const ops = useQuery({ queryKey: ['k-operators'], queryFn: () => listOperators(data), enabled: canIdentify, staleTime: 5 * 60_000 })
  const [picked, setPicked] = useState<Doc<Operator> | null>(null)
  const [query, setQuery] = useState('')

  if (!canIdentify) return <PublicMessage title={t.title} description={t.outdated} action={<SkipButton onSkip={onSkip} />} />
  if (ops.isLoading) return <PublicLoading />
  if (ops.error) return <PublicMessage title={t.title} description={t.unavailable} action={<SkipButton onSkip={onSkip} />} />
  const { mine, others } = orderForStation(ops.data ?? [], stationId)
  if (!mine.length && !others.length) return <PublicMessage title={t.title} description={t.empty} action={<SkipButton onSkip={onSkip} />} />
  if (picked) return <PinPad link={link} operator={picked} onBack={() => setPicked(null)} onDone={onDone} onSkip={onSkip} />

  const total = mine.length + others.length
  const tokens = searchTokens(query)
  const found = tokens.length ? [...mine, ...others].filter((o) => matchesTokens(tokens, o.json_data.name, o.json_data.team)) : []
  // Les gens du poste d'abord ; les autres, en entier si l'équipe est petite, sinon par la recherche.
  const main = mine.length ? mine : others.slice(0, SHOWN)
  const rest = mine.length ? others.slice(0, Math.max(0, SHOWN - mine.length)) : []
  const hidden = total - main.length - rest.length
  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 pt-10 pb-16 sm:px-8">
      <h1 className="text-4xl font-black tracking-tighter sm:text-5xl">{t.title}</h1>
      <p className="mt-2 text-lg font-bold text-slate-500">{t.hint}</p>
      {total > SEARCH_FROM && <SearchField size="station" value={query} onChange={setQuery} placeholder={t.search} className="mt-6" />}
      {tokens.length ? (
        found.length ? (
          <NameGrid people={found} onPick={setPicked} />
        ) : (
          <div className="glass-card mt-6 rounded-[28px] p-6 text-center">
            <p className="text-xl font-black">{t.noMatch}</p>
            <p className="mt-1 font-bold text-slate-500">{t.noMatchHint}</p>
            <div className="mt-5">
              <SkipButton onSkip={onSkip} />
            </div>
          </div>
        )
      ) : (
        <>
          <NameGrid people={main} onPick={setPicked} />
          {rest.length > 0 && (
            <>
              <p className="label-caps mt-10 mb-3 text-slate-500">{t.others}</p>
              <NameGrid people={rest} onPick={setPicked} small />
            </>
          )}
          {hidden > 0 && <p className="mt-6 text-center text-lg font-bold text-slate-500">{t.more(hidden)}</p>}
        </>
      )}
    </main>
  )
}

function SkipButton({ onSkip }: { onSkip: () => void }) {
  const t = useMessages().publicLinks.kiosk.who
  return (
    <button type="button" onClick={onSkip} className="btn-press glass-card mx-auto flex h-14 items-center gap-2 rounded-full px-6 font-black">
      {t.continueWithout}
    </button>
  )
}

function NameGrid({ people, onPick, small }: { people: Doc<Operator>[]; onPick: (o: Doc<Operator>) => void; small?: boolean }) {
  return (
    <div className={cn('mt-6 grid gap-3', small ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
      {people.map((o) => (
        <button key={o._id} type="button" onClick={() => onPick(o)} className={cn('btn-press glass-card flex items-center gap-4 rounded-[28px] text-left', small ? 'min-h-16 p-3' : 'min-h-24 p-4')}>
          <span className={cn('bg-gradient-primary shadow-primary flex shrink-0 items-center justify-center rounded-2xl font-black text-white', small ? 'h-11 w-11 text-base' : 'h-16 w-16 text-2xl')}>{initials(o.json_data.name)}</span>
          <span className={cn('min-w-0 font-black tracking-tight', small ? 'text-base' : 'text-2xl')}>{o.json_data.name}</span>
        </button>
      ))}
    </div>
  )
}

/** Le pavé du code : 4 chiffres, envoyés dès le dernier. */
function PinPad({ link, operator, onBack, onDone, onSkip }: { link: string; operator: Doc<Operator>; onBack: () => void; onDone: (s: StationSession) => void; onSkip: () => void }) {
  const t = useMessages().publicLinks.kiosk.who
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<'wrongPin' | 'locked' | 'noPin' | 'unavailable' | null>(null)

  useEffect(() => {
    if (pin.length !== 4 || busy) return
    setBusy(true)
    void verifyCode(link, operator._id, pin).then((r) => {
      setBusy(false)
      if (r.ok) {
        saveStationSession(link, r.session)
        onDone(r.session)
        return
      }
      setPin('')
      setError(r.error === 'wrongPin' || r.error === 'locked' || r.error === 'noPin' ? r.error : 'unavailable')
    })
  }, [pin, busy, link, operator._id, onDone])

  const press = (d: string) => {
    if (busy) return
    setError(null)
    setPin((p) => (p.length < 4 ? p + d : p))
  }
  const message = error === 'wrongPin' ? t.wrong : error === 'locked' ? t.locked : error === 'noPin' ? t.noPin : error === 'unavailable' ? t.unavailable : t.pinHint

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center px-4 pt-10 pb-10">
      <button type="button" onClick={onBack} className="btn-press mb-6 flex h-12 items-center gap-2 self-start rounded-2xl px-3 font-black text-slate-600 dark:text-slate-300">
        <ArrowLeft className="h-5 w-5" /> {t.notMe}
      </button>
      <h1 className="text-center text-4xl font-black tracking-tighter">{t.pinTitle(operator.json_data.name)}</h1>
      <p className={cn('mt-3 min-h-14 text-center text-lg font-bold', error ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500')} role="status" aria-live="polite">
        {busy ? t.checking : message}
      </p>
      <div className={cn('mt-4 flex gap-4', error === 'wrongPin' && 'animate-shake')} aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn('h-5 w-5 rounded-full border-2 border-[var(--primary)] transition', i < pin.length ? 'bg-[var(--primary)]' : 'bg-transparent')} />
        ))}
      </div>
      <div className="mt-8 grid w-full grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <Key key={d} onClick={() => press(d)}>
            {d}
          </Key>
        ))}
        <Key onClick={() => setPin((p) => p.slice(0, -1))} label={t.erase}>
          <Delete className="h-7 w-7" />
        </Key>
        <Key onClick={() => press('0')}>0</Key>
        <span className="flex items-center justify-center">{busy && <Loader2 className="h-7 w-7 animate-spin text-[var(--primary)]" />}</span>
      </div>
      {error === 'unavailable' && (
        <div className="mt-8">
          <SkipButton onSkip={onSkip} />
        </div>
      )}
    </main>
  )
}

function Key({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="btn-press glass-card flex h-20 items-center justify-center rounded-[24px] text-3xl font-black tabular-nums">
      {children}
    </button>
  )
}

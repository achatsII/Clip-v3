'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { locale, useMessages } from '@/lib/i18n'
import { cn } from '@/lib/util/cn'
import { matchesTokens, searchTokens } from '@/lib/util/people'
import { SearchField } from './SearchField'

export interface PersonOption {
  id: string
  name: string
  /** Ce qui aide à départager deux homonymes (courriel, rôle) : cherché, montré au survol. */
  detail?: string
}

/** Au-delà, les personnes non choisies se trouvent par la recherche. */
const SHOWN = 24
const SEARCH_FROM_CHIPS = 12

/**
 * Choisir des personnes parmi beaucoup (groupes d'approbation, destinataires) : celles qui sont
 * choisies d'abord, une recherche dès qu'il y en a plus d'une douzaine, et au plus 24 autres à la fois.
 */
export function PeopleChips({ people, selected, onToggle, prefix }: { people: PersonOption[]; selected: string[]; onToggle: (id: string) => void; prefix?: ReactNode }) {
  const t = useMessages().common
  const [query, setQuery] = useState('')
  const tokens = searchTokens(query)
  const sorted = useMemo(() => [...people].sort((a, b) => a.name.localeCompare(b.name, locale())), [people])
  const chosen = sorted.filter((p) => selected.includes(p.id))
  const others = sorted.filter((p) => !selected.includes(p.id) && matchesTokens(tokens, p.name, p.detail))
  const shown = tokens.length ? others : others.slice(0, SHOWN)
  const hidden = others.length - shown.length
  return (
    <div className="space-y-2">
      {people.length > SEARCH_FROM_CHIPS && <SearchField value={query} onChange={setQuery} placeholder={t.searchPeople} />}
      <div className="flex flex-wrap gap-2">
        {prefix}
        {[...chosen, ...shown].map((p) => {
          const on = selected.includes(p.id)
          return (
            <button key={p.id} type="button" aria-pressed={on} title={p.detail} onClick={() => onToggle(p.id)} className={cn('btn-press h-11 max-w-full truncate rounded-2xl px-3 text-sm font-black', on ? 'bg-gradient-primary shadow-primary text-white' : 'glass-card text-slate-700 dark:text-slate-200')}>
              {p.name}
            </button>
          )
        })}
      </div>
      {tokens.length > 0 && !others.length && <p className="text-sm font-bold text-slate-500">{t.noMatch}</p>}
      {hidden > 0 && <p className="text-xs font-bold text-slate-500">{t.moreHidden(hidden)}</p>}
    </div>
  )
}

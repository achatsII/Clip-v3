'use client'

/**
 * Le choix de la langue de l'outil : une liste du système (la roue du téléphone, la liste de
 * l'ordinateur), qui tient les dix-huit langues sans déborder. Chaque langue s'écrit dans sa
 * propre langue. `compact` : la petite version, sans cadre, sous un formulaire (connexion).
 */
import { Globe } from 'lucide-react'
import { LANG_NAMES, LANGS, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/util/cn'
import { Select } from './Field'

export function LanguageSelect({ value, onChange, label, compact = false, langs = LANGS, className }: { value: Lang; onChange: (l: Lang) => void; label: string; compact?: boolean; langs?: readonly Lang[]; className?: string }) {
  const options = langs.map((l) => (
    <option key={l} value={l} lang={l}>
      {LANG_NAMES[l]}
    </option>
  ))
  if (!compact)
    return (
      <Select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as Lang)} className={className}>
        {options}
      </Select>
    )
  return (
    <label className={cn('btn-press relative inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200', className)}>
      <Globe className="h-4 w-4 shrink-0" aria-hidden />
      <span lang={value}>{LANG_NAMES[value]}</span>
      {/* La vraie liste, invisible par-dessus : le toucher ouvre la liste du système. */}
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as Lang)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
        {options}
      </select>
    </label>
  )
}

'use client'

import { Search, X } from 'lucide-react'
import { useMessages } from '@/lib/i18n'
import { cn } from '@/lib/util/cn'

/**
 * La barre de recherche d'une liste : la loupe, le champ, et ✕ pour effacer. `station` : plus
 * grande, pour une tablette au poste (et jamais de clavier qui s'ouvre tout seul).
 */
export function SearchField({ value, onChange, placeholder, size = 'md', className, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; size?: 'md' | 'station'; className?: string; autoFocus?: boolean }) {
  const t = useMessages().common
  const big = size === 'station'
  return (
    <div className={cn('glass-panel flex items-center gap-3 rounded-[24px]', big ? 'px-5' : 'px-4', className)}>
      <Search className={cn('shrink-0 text-slate-400', big ? 'h-6 w-6' : 'h-5 w-5')} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        enterKeyHint="search"
        className={cn('min-w-0 flex-1 bg-transparent font-bold focus:outline-none [&::-webkit-search-cancel-button]:hidden', big ? 'h-16 text-xl' : 'h-12 text-[15px]')}
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label={t.clear} className={cn('btn-press flex shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-900/5 dark:hover:bg-white/10', big ? 'h-12 w-12' : 'h-11 w-11')}>
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

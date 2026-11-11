'use client'

import { useState } from 'react'
import { Segmented } from '@/components/ui/Field'
import { LANG_NAMES, LANGS, setLang, useLang, useMessages } from '@/lib/i18n'
import { applyBrandColor, readTheme, saveTheme, THEME_PRESETS, type UiTheme } from '@/lib/theme'
import { cn } from '@/lib/util/cn'

/**
 * La langue de l'outil, l'affichage et la couleur : les mêmes réglages dans Réglages → Apparence et
 * dans le menu Mon compte du téléphone. Chaque langue s'écrit dans sa propre langue.
 */
export function AppearanceControls({ brandColor, compact = false }: { brandColor?: string | null; compact?: boolean }) {
  const t = useMessages().settings.appearance
  const lang = useLang()
  const [theme, setTheme] = useState<UiTheme>(() => (typeof window === 'undefined' ? { mode: 'system', preset: 'ocean' } : readTheme()))
  const update = (next: UiTheme) => {
    setTheme(next)
    saveTheme(next)
    applyBrandColor(brandColor)
  }
  return (
    <div>
      <p className="label-caps mb-2 text-slate-500">{t.language}</p>
      <Segmented value={lang} onChange={setLang} options={LANGS.map((l) => ({ value: l, label: <span lang={l}>{LANG_NAMES[l]}</span> }))} />
      <p className="mt-2 text-xs font-medium text-slate-500">{t.languageNote}</p>
      <p className="label-caps mt-6 mb-2 text-slate-500">{t.display}</p>
      <Segmented
        value={theme.mode}
        onChange={(mode) => update({ ...theme, mode })}
        options={[
          { value: 'light', label: t.light },
          { value: 'dark', label: t.dark },
          { value: 'system', label: t.system },
        ]}
      />
      <p className="label-caps mt-6 mb-2 text-slate-500">{t.color}</p>
      <div className={compact ? 'grid grid-cols-5 gap-2' : 'flex flex-wrap gap-3'}>
        {THEME_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => update({ ...theme, preset: p.value })}
            className={cn('btn-press flex flex-col items-center gap-1.5 rounded-2xl p-2', theme.preset === p.value && 'bg-slate-900/5 dark:bg-white/10')}
            aria-pressed={theme.preset === p.value}
          >
            <span className={cn('rounded-2xl shadow-inner', compact ? 'h-10 w-10' : 'h-12 w-12')} style={{ backgroundImage: p.swatch }} />
            <span className="text-[11px] font-black text-slate-600 dark:text-slate-300">{p.label}</span>
          </button>
        ))}
      </div>
      {brandColor && <p className="mt-4 text-xs font-medium text-slate-500">{t.brandColorNote}</p>}
    </div>
  )
}

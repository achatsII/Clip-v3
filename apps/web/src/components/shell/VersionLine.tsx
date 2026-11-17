'use client'

/**
 * La version de CLIP (2.0.x, `src/lib/version.ts`) : en petit sous le menu, en entier dans le compte et
 * dans Réglages › Données, avec la date de mise en ligne, le commit et, dans l'app, la version de la
 * coquille (qui charge le site : sa version change moins souvent).
 */
import { useEffect, useState } from 'react'
import type { NativeEnvironment } from '@clip/bridge'
import { nativeEnv } from '@/lib/bridge/native'
import { useMessages } from '@/lib/i18n'
import { cn, formatDate } from '@/lib/util/cn'
import { APP_VERSION, BUILD_DATE, BUILD_SHA } from '@/lib/version'

export function VersionLine({ detailed, className }: { detailed?: boolean; className?: string }) {
  const t = useMessages().shell.version
  // Lu après l'affichage : le serveur ne connaît pas la coquille (pas d'écart à l'hydratation).
  const [shell, setShell] = useState<NativeEnvironment | null>(null)
  useEffect(() => setShell(nativeEnv()), [])
  const built = BUILD_DATE ? t.built(formatDate(BUILD_DATE)) : ''
  if (!detailed) {
    return (
      <p className={cn('text-[11px] font-bold text-slate-400 tabular-nums', className)} title={[t.label(APP_VERSION), built, BUILD_SHA].filter(Boolean).join(' · ')}>
        {t.short(APP_VERSION)}
      </p>
    )
  }
  return (
    <div className={cn('text-sm font-medium text-slate-500 dark:text-slate-400', className)}>
      <p>
        <span className="font-black text-slate-700 tabular-nums dark:text-slate-200">{t.label(APP_VERSION)}</span>
        {built && <span> · {built}</span>}
        {BUILD_SHA && <span className="tabular-nums"> · {BUILD_SHA}</span>}
      </p>
      {shell && <p className="tabular-nums">{t.app(shell.platform, shell.appVersion, shell.buildNumber)}</p>}
    </div>
  )
}

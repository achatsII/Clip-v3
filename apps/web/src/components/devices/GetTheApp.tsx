'use client'

import { Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { QrCode } from '@/components/QrCode'
import { PRODUCT } from '@/lib/brand/product'
import { useMessages } from '@/lib/i18n'
import { cn } from '@/lib/util/cn'

/** La marque a-t-elle une fiche dans un magasin ? Sans fiche, rien à installer. */
export const hasStoreLink = (): boolean => !!(PRODUCT.stores.ios || PRODUCT.stores.android)

/**
 * « L'app sur votre téléphone » (toggle `storeLinks`) : un code QR vers `/app` du site, qui envoie au bon magasin selon
 * le téléphone, et les liens des deux magasins. Sur l'accueil à l'ordinateur, et dans le menu.
 */
export function GetTheApp({ onLater, className, hideTitle }: { onLater?: () => void; className?: string; hideTitle?: boolean }) {
  const t = useMessages().devices.getApp
  // Le site où l'on est (production, QA, aperçu) : le code mène à son `/app`.
  const [origin, setOrigin] = useState('')
  useEffect(() => setOrigin(window.location.origin), [])
  const { ios, android } = PRODUCT.stores
  const store = 'btn-press glass-card inline-flex h-11 items-center rounded-full px-4 text-sm font-black text-slate-900 dark:text-white'
  return (
    <div className={cn('flex flex-col items-center gap-5 sm:flex-row', className)}>
      {origin ? (
        <QrCode value={`${origin}/app`} size={168} className="shrink-0" />
      ) : (
        <div className="flex h-[168px] w-[168px] shrink-0 items-center justify-center rounded-2xl bg-white/60 dark:bg-white/10">
          <Smartphone className="h-10 w-10 text-slate-400" />
        </div>
      )}
      <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
        {!hideTitle && <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{t.title}</h2>}
        <p className="font-medium text-slate-600 dark:text-slate-300">{t.why}</p>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t.scan}</p>
        <div className="flex flex-wrap justify-center gap-2 pt-1 sm:justify-start">
          {ios && (
            <a href={ios} target="_blank" rel="noopener noreferrer" className={store}>
              {t.appStore}
            </a>
          )}
          {android && (
            <a href={android} target="_blank" rel="noopener noreferrer" className={store}>
              {t.googlePlay}
            </a>
          )}
          {onLater && (
            <button type="button" onClick={onLater} className="btn-press h-11 rounded-full px-4 text-sm font-bold text-slate-500 hover:bg-slate-900/5 dark:text-slate-400 dark:hover:bg-white/10">
              {t.later}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

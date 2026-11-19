'use client'

import { Copy, Monitor, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { callNative, hasCapability } from '@/lib/bridge/native'
import { PRODUCT } from '@/lib/brand/product'
import { useMessages } from '@/lib/i18n'
import { cn } from '@/lib/util/cn'

/**
 * Dans l'app mobile, « Sur votre ordinateur » (toggle `desktopHint`) : l'adresse du site que l'app affiche, à copier ou à
 * s'envoyer (feuille de partage du téléphone). Jamais un lien cliquable vers le site, où se trouvent les prix : l'app
 * ne vend rien et n'invite pas à acheter ailleurs (règle 3.1.3(f) d'Apple).
 */
export function OpenOnComputer({ onLater, className, hideTitle }: { onLater?: () => void; className?: string; hideTitle?: boolean }) {
  const t = useMessages().devices.computer
  const toast = useToast()
  // Le site que l'app affiche (production, ou la QA d'une build de test) ; sans fenêtre, celui de la marque.
  const [site, setSite] = useState(PRODUCT.webUrl)
  useEffect(() => setSite(window.location.origin), [])
  const host = site.replace(/^https?:\/\//, '')
  const link = `${site}/connexion`
  const canShare = hasCapability('share')

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      toast.success(t.copied, host)
    } catch {
      // Copie refusée : l'adresse reste à l'écran, à sélectionner.
    }
  }

  const button = 'btn-press glass-card inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-black text-slate-900 dark:text-white'
  const [before, after] = t.body.split('{host}')
  return (
    <div className={cn('flex items-start gap-4', className)}>
      <span className="bg-primary-soft flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--primary-strong)] dark:text-[var(--primary-light)]">
        <Monitor className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        {!hideTitle && <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">{t.title}</h2>}
        <p className="font-medium text-slate-600 dark:text-slate-300">
          {before}
          <strong className="font-black text-slate-900 select-all [overflow-wrap:anywhere] dark:text-white">{host}</strong>
          {after}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={copy} className={button}>
            <Copy className="h-4 w-4" /> {t.copy}
          </button>
          {canShare && (
            <button type="button" onClick={() => void callNative('share', { url: link }).catch(() => undefined)} className={button}>
              <Send className="h-4 w-4" /> {t.send}
            </button>
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

'use client'

import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { PRODUCT } from '@/lib/brand/product'
import { useMessages } from '@/lib/i18n'
import { GetTheApp } from './GetTheApp'

/**
 * `/app` ouvert à l'ordinateur (un téléphone y part tout de suite vers son magasin) : le code QR à viser avec le
 * téléphone, les liens des magasins, et le chemin vers l'outil dans le navigateur. `ask` : un téléphone sans lien pour
 * la marque (CLIP chez Google : l'app y est privée).
 */
export function AppDownload() {
  const t = useMessages().devices.getApp
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
      <Logo />
      <div className="glass-panel w-full max-w-2xl rounded-[32px] p-6 sm:p-8">
        <h1 className="sr-only">{t.pageTitle}</h1>
        <GetTheApp />
        {!(PRODUCT.stores.ios && PRODUCT.stores.android) && <p className="mt-5 text-center text-sm font-medium text-slate-500 sm:text-left dark:text-slate-400">{t.ask}</p>}
      </div>
      <Link href="/connexion" className="btn-press flex h-11 items-center rounded-full px-5 text-sm font-bold text-slate-500 hover:bg-slate-900/5 dark:text-slate-400 dark:hover:bg-white/10">
        {t.pageBack}
      </Link>
    </main>
  )
}

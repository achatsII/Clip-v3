'use client'

import { ArrowUpRight, LogOut } from 'lucide-react'
import { callNative, hasCapability, nativeEnv } from '@/lib/bridge/native'
import { storeAppLink, webHost, type Product } from '@/lib/brand/product'
import { logout } from '@/lib/gateway/client'
import { useMessages } from '@/lib/i18n'

/**
 * Un texte de `devices` avec le nom (`{app}`) et l'adresse (`{host}`) d'une autre marque. Posés à l'affichage, après
 * `brandify` : dans le dictionnaire, « CLIP » serait devenu « Kiplo » dans la build de Kiplo.
 */
export function fillApp(s: string, p: Product): string {
  return s.replaceAll('{app}', p.name).replaceAll('{host}', webHost(p))
}

/**
 * Connecté à une entreprise de l'autre marque (une marque par entreprise, `src/lib/brand/orgBrand.ts`) : ni ses
 * données ni ses prix, seulement le chemin vers la bonne app. Toujours « Se déconnecter », pour entrer avec un autre
 * compte.
 */
export function BrandElsewhere({ other }: { other: Product }) {
  const { devices, shell } = useMessages()
  const t = devices.elsewhere
  const platform = nativeEnv()?.platform ?? null
  // Dans l'app mobile, l'autre app s'installe de son magasin ; sur le web, son site s'ouvre.
  const store = platform ? other.stores[platform] : undefined

  function install() {
    if (!store) return
    const page = store
    if (!hasCapability('openExternal')) {
      window.location.href = page
      return
    }
    void callNative('openExternal', { url: storeAppLink(page) }).catch(() => {
      window.location.href = page
    })
  }

  const action = 'btn-press bg-gradient-primary shadow-primary mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-black text-white'
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="glass-panel max-w-md rounded-[32px] p-8 text-center">
        <h1 className="text-2xl font-black tracking-tight text-balance">{fillApp(t.title, other)}</h1>
        <p className="mt-2 font-medium text-slate-500 dark:text-slate-400">{fillApp(t.body, other)}</p>
        {platform ? (
          store ? (
            <button type="button" onClick={install} className={action}>
              {fillApp(t.install, other)} <ArrowUpRight className="h-5 w-5" />
            </button>
          ) : (
            <p className="mt-5 rounded-2xl bg-slate-900/5 p-3 text-sm font-bold dark:bg-white/10">{fillApp(t.noStore, other)}</p>
          )
        ) : (
          <a href={`${other.webUrl}/connexion`} className={action}>
            {fillApp(t.open, other)} <ArrowUpRight className="h-5 w-5" />
          </a>
        )}
        <p className="mt-4 text-sm font-bold text-slate-500 select-all dark:text-slate-400">{fillApp(t.computer, other)}</p>
        <button type="button" onClick={() => logout(true)} className="btn-press mx-auto mt-3 flex h-11 items-center gap-2 rounded-full px-5 font-bold text-slate-500 dark:text-slate-400">
          <LogOut className="h-4 w-4" /> {shell.signOut}
        </button>
      </div>
    </div>
  )
}

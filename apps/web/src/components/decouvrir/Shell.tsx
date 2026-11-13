'use client'

/**
 * La coque de l'espace Découvrir : en-tête (Vidéos, Conseiller), pied de page. Aucune donnée de Clip ne
 * s'y charge : l'espace s'ouvre vite et ne demande rien à l'app. Interrupteur allumé : « Accès jusqu'au
 * 15 déc. » pour un prospect, « Se déconnecter », la visite et chaque page envoyées au suivi.
 */
import { LogOut, MessageCircle, MonitorPlay } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { LogoMark } from '@/components/Logo'
import { IconButton } from '@/components/ui/Button'
import { AccessContext, loadAccess, signOut, useAccess, type AccessSetup } from '@/lib/decouvrir/access'
import { ADVISOR_PATH, LIBRARY_PATH, LOGIN_PATH } from '@/lib/decouvrir/catalog'
import { startVisit, track } from '@/lib/decouvrir/tracker'
import { LANG_NAMES, LANGS, messagesIn, setLang, useLang, useMessages } from '@/lib/i18n'
import { cn } from '@/lib/util/cn'

/** Le libellé d'une page pour le suivi : en français, la langue des rapports de Sandboxes. */
function pageLabel(path: string): string | undefined {
  const t = messagesIn('fr').decouvrir.shell
  return path === LIBRARY_PATH ? t.videos : path.startsWith(ADVISOR_PATH) ? t.advisor : undefined
}

/** Espace relié, hors de l'écran d'entrée : la visite, la session (fin, type) et chaque page ouverte. */
function useAccessSync(enabled: boolean, path: string) {
  useEffect(() => {
    if (!enabled) return
    startVisit()
    void loadAccess()
  }, [enabled])
  useEffect(() => {
    if (!enabled) return
    const libelle = pageLabel(path)
    track({ type: 'page', chemin: path, ...(libelle ? { libelle } : {}) })
  }, [enabled, path])
}

function SignOutButton() {
  const t = useMessages().decouvrir.shell
  const [busy, setBusy] = useState(false)
  return (
    <IconButton
      label={t.signOut}
      disabled={busy}
      onClick={() => {
        setBusy(true)
        void signOut()
      }}
    >
      <LogOut className="h-5 w-5" />
    </IconButton>
  )
}

export function DecouvrirShell({ setup, children }: { setup: AccessSetup; children: ReactNode }) {
  const t = useMessages().decouvrir.shell
  const lang = useLang()
  const path = usePathname() ?? LIBRARY_PATH
  const linked = setup.mode === 'sandboxes'
  const entering = path === LOGIN_PATH
  useAccessSync(linked && !entering, path)
  const { info } = useAccess()
  const until = linked && !entering && info?.type === 'prospect' && info.fin ? t.until(info.fin) : null
  const nav = [
    { href: LIBRARY_PATH, label: t.videos, icon: MonitorPlay, on: path === LIBRARY_PATH },
    { href: ADVISOR_PATH, label: t.advisor, icon: MessageCircle, on: path.startsWith(ADVISOR_PATH) },
  ]

  return (
    <AccessContext.Provider value={setup}>
      <div className="flex min-h-dvh flex-col">
        <header className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href={LIBRARY_PATH} aria-label={t.home} className="btn-press flex min-h-11 min-w-0 items-center gap-3 rounded-2xl">
            <LogoMark className="h-10 w-10 shrink-0" />
            <span className="min-w-0 leading-none">
              <span className="block text-xl font-black tracking-tighter text-slate-900 dark:text-white">CLIP</span>
              {until ? (
                <span className="mt-1 block truncate text-[11.5px] font-bold text-slate-500 dark:text-slate-400">{until}</span>
              ) : (
                <span className="label-caps mt-1 block text-[9px] text-slate-500 dark:text-slate-400">{t.brand}</span>
              )}
            </span>
          </Link>
          {!entering && (
            <nav aria-label={t.nav} className="flex shrink-0 items-center gap-1 sm:gap-2">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={n.on ? 'page' : undefined}
                  className={cn(
                    'btn-press inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-black transition-colors',
                    n.on ? 'bg-white/75 text-slate-900 shadow-[0_6px_18px_rgba(15,23,42,0.07)] dark:bg-white/10 dark:text-white' : 'text-slate-600 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white',
                  )}
                >
                  <n.icon className={cn('h-[18px] w-[18px] shrink-0', n.on ? 'text-[var(--primary)]' : 'text-slate-400 dark:text-slate-500')} aria-hidden />
                  <span className="max-sm:sr-only">{n.label}</span>
                </Link>
              ))}
              {linked && <SignOutButton />}
            </nav>
          )}
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6">{children}</main>
        <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 pb-8 text-[12.5px] font-semibold text-slate-500 sm:px-6 dark:text-slate-400">
          <span>{t.by}</span>
          {!entering && <span className="max-sm:order-last max-sm:w-full">{t.fictional}</span>}
          {/* La langue, avant même d'entrer : chaque langue s'écrit dans sa propre langue. */}
          <span role="group" aria-label={t.language} className="flex items-center">
            {LANGS.map((l, i) => (
              <Fragment key={l}>
                {i > 0 && <span aria-hidden>·</span>}
                <button
                  type="button"
                  lang={l}
                  aria-pressed={lang === l}
                  onClick={() => setLang(l)}
                  className={cn('btn-press flex h-11 min-w-11 items-center justify-center rounded-xl px-2.5 font-bold', lang === l ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300')}
                >
                  {LANG_NAMES[l]}
                </button>
              </Fragment>
            ))}
          </span>
        </footer>
      </div>
    </AccessContext.Provider>
  )
}

'use client'

/**
 * Les petits morceaux interactifs du site : script en ligne, langue du document, fermeture des menus
 * à la navigation, lien actif, choix mensuel ou annuel. Aucun texte ici (tout arrive par les props).
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import type { SiteLang } from '@/lib/site/lang'
import { ROUTES, type PageKey } from '@/lib/site/routes'
import { cx } from './ui'

/**
 * Un script en ligne, exécuté au premier chargement de la page, avant l'affichage (guide « Preventing
 * flash before hydration » de Next) : `text/javascript` au serveur, `text/plain` au client, pour que
 * React ne l'exécute ni ne le signale lors d'une navigation interne.
 */
export function InlineScript({ html }: { html: string }) {
  return <script type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />
}

/** `<html lang>` suit la langue de la page du site, d'une navigation interne à l'autre. */
export function SiteLanguage({ lang }: { lang: SiteLang }) {
  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'fr-CA'
  }, [lang])
  return null
}

/** Les menus (popover) se ferment quand on change de page. */
export function PopoverCloser() {
  const pathname = usePathname()
  useEffect(() => {
    document.querySelectorAll<HTMLElement>('[popover]').forEach((el) => {
      try {
        if (el.matches(':popover-open')) el.hidePopover()
      } catch {
        /* navigateur sans l'API Popover : rien d'ouvert */
      }
    })
  }, [pathname])
  return null
}

/** Un lien de la navigation, marqué quand c'est la page en cours. */
export function NavLink({ href, children, className, activeClassName }: { href: string; children: ReactNode; className?: string; activeClassName?: string }) {
  const pathname = usePathname()
  const active = pathname === href
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={cx(className, active && activeClassName)}>
      {children}
    </Link>
  )
}

/**
 * Mensuel ou annuel : les deux prix sont déjà dans la page ; ce bouton change l'attribut
 * `data-interval` du conteneur, et le CSS montre l'un ou l'autre (liens d'inscription compris).
 */
export function IntervalToggle({ target, labels, initial = 'month' }: { target: string; labels: { group: string; month: string; year: string; bonus: string }; initial?: 'month' | 'year' }) {
  const [period, setPeriod] = useState<'month' | 'year'>(initial)
  useEffect(() => {
    document.getElementById(target)?.setAttribute('data-interval', period)
  }, [period, target])
  return (
    <div role="group" aria-label={labels.group} className="glass-card inline-flex rounded-full p-1">
      {(['month', 'year'] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={period === value}
          onClick={() => setPeriod(value)}
          className={cx(
            'btn-press inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-black',
            period === value ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white',
          )}
        >
          {value === 'month' ? labels.month : labels.year}
          {value === 'year' && (
            <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-black', period === value ? 'bg-emerald-400 text-slate-900' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300')}>
              {labels.bonus}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/** Le lien vers la même page dans l'autre langue (les slugs sont traduits : `ROUTES`). */
export function LangLink({ lang, className, children, label }: { lang: SiteLang; className?: string; children: ReactNode; label?: string }) {
  const pathname = usePathname()
  const other = lang === 'fr' ? 'en' : 'fr'
  const page = (Object.keys(ROUTES) as PageKey[]).find((key) => ROUTES[key][lang] === pathname) ?? 'home'
  const hreflang = other === 'fr' ? 'fr-CA' : 'en'
  return (
    <Link href={ROUTES[page][other]} hrefLang={hreflang} lang={hreflang} aria-label={label} className={className}>
      {children}
    </Link>
  )
}

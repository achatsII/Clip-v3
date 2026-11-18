'use client'

/**
 * Les petits morceaux interactifs du site : script en ligne, langue du document, fermeture des menus
 * à la navigation, lien actif, choix mensuel ou annuel. Aucun texte ici (tout arrive par les props).
 */
import { useArm } from './experiments'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { HREFLANG, SITE_LANG_NAMES, SITE_LANGS, type SiteLang } from '@/lib/site/lang'
import { ROUTES, type PageKey } from '@/lib/site/routes'
import { trackEvent } from '@/lib/site/consent'
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
    document.documentElement.lang = HREFLANG[lang]
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
export function IntervalToggle({ target, labels, initial = 'month', lang, offer }: { target: string; labels: { group: string; month: string; year: string; bonus: string }; initial?: 'month' | 'year'; lang: SiteLang; offer: string }) {
  const [period, setPeriod] = useState<'month' | 'year'>(initial)
  const [touched, setTouched] = useState(false)
  // Test A/B « prix-intervalle » : les tarifs s'ouvrent au mois (témoin) ou à l'année, tant qu'on n'a pas choisi.
  const arm = useArm('prix-intervalle', { lang, page: 'pricing', offer, place: 'page' })
  useEffect(() => {
    if (!touched) setPeriod(arm === 'annee' ? 'year' : initial)
  }, [arm, initial, touched])
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
          onClick={() => {
            setTouched(true)
            setPeriod(value)
          }}
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

/**
 * Le menu des langues : la même page dans chacune des langues du site (les slugs sont traduits : `ROUTES`).
 * Un « popover » natif, comme les autres menus du site ; chaque langue s'écrit dans sa propre langue.
 */
export function LangMenu({ lang, id, label, className, children }: { lang: SiteLang; id: string; label: string; className?: string; children: ReactNode }) {
  const pathname = usePathname()
  const page = (Object.keys(ROUTES) as PageKey[]).find((key) => ROUTES[key][lang] === pathname) ?? 'home'
  return (
    <>
      <button type="button" popoverTarget={id} aria-label={label} title={label} className={className}>
        {children}
      </button>
      <div id={id} popover="auto" className="site-popover site-menu">
        <nav aria-label={label} className="glass-float rounded-[30px] p-3">
          <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {SITE_LANGS.map((l) => (
              <li key={l}>
                <Link
                  href={ROUTES[page][l]}
                  hrefLang={HREFLANG[l]}
                  lang={HREFLANG[l]}
                  aria-current={l === lang ? 'page' : undefined}
                  className={cx(
                    'btn-press flex min-h-11 items-center rounded-2xl px-3 text-[15px] font-bold',
                    l === lang ? 'bg-gradient-primary shadow-primary text-white' : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/10',
                  )}
                >
                  {SITE_LANG_NAMES[l]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  )
}

/**
 * La mesure des gestes du site (Google Analytics 4, seulement avec l'accord : `trackEvent`) : la page des
 * tarifs vue (`vue_prix`), un bouton d'essai (`clic_essai`), une démo avec l'équipe (`clic_demo`). Chaque
 * événement porte l'offre (la marque), le type de page, la langue et l'emplacement (en-tête, pied, page).
 */
export function SiteAnalytics({ lang, offer }: { lang: SiteLang; offer: string }) {
  const pathname = usePathname()
  const page = (Object.keys(ROUTES) as PageKey[]).find((key) => ROUTES[key][lang] === pathname) ?? 'home'
  useEffect(() => {
    if (page === 'pricing') trackEvent('vue_prix', { offre: offer, type_page: page, langue: lang, emplacement: 'page' })
  }, [page, lang, offer])
  useEffect(() => {
    const book = new Set(Object.values(ROUTES.book))
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest('a')
      if (!a) return
      const href = a.getAttribute('href') ?? ''
      const emplacement = a.closest('[data-place]')?.getAttribute('data-place') ?? (a.closest('header') ? 'entete' : a.closest('footer') ? 'pied' : 'page')
      const params = { offre: offer, type_page: page, langue: lang, emplacement }
      if (href.includes('inscription=1')) trackEvent('clic_essai', params)
      else if (book.has(href.split('?')[0])) trackEvent('clic_demo', params)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [page, lang, offer])
  return null
}


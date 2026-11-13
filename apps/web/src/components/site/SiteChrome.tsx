/**
 * L'enveloppe de chaque page du site (composants serveur) : lien d'évitement, en-tête de verre, pied
 * de page, bannière des témoins. Les menus sont des « popover » natifs : ils s'ouvrent, se ferment au
 * clic dehors et à Échap sans script ; `PopoverCloser` les referme quand on change de page.
 */
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { content } from '@/lib/site/content'
import { fmt, type SiteLang } from '@/lib/site/lang'
import { II_LOGO } from '@/lib/site/media'
import { HUBSPOT_ID, LOGIN_PATH, primaryCta, ROUTES, SOLUTIONS, type SolutionKey } from '@/lib/site/routes'
import { LangLink, NavLink, PopoverCloser, SiteLanguage } from './client'
import { ConsentBanner, CookieSettingsButton } from './Consent'
import { ClipMark, Container, cx, PrimaryCta, SiteIcon } from './ui'

const SOLUTION_ICONS: Record<SolutionKey, string> = { knowledge: 'brain', training: 'graduation', lockout: 'lock', translation: 'languages' }
const SOLUTION_TILES: Record<SolutionKey, string> = {
  knowledge: 'from-[#00C6FF] to-[#0078FF]',
  training: 'from-[#3ee0a1] to-[#10a96d]',
  lockout: 'from-[#FF2B5E] to-[#FF6B00]',
  translation: 'from-[#9b2cfa] to-[#2c62fa]',
}

export function SiteShell({ lang, children }: { lang: SiteLang; children: ReactNode }) {
  const t = content(lang)
  return (
    <div className="site-root min-h-dvh" data-site={lang} lang={lang === 'en' ? 'en' : undefined}>
      <a href="#contenu" className="sr-only z-[60] rounded-full bg-slate-900 px-5 py-3 font-black text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        {t.a11y.skip}
      </a>
      <SiteHeader lang={lang} />
      <main id="contenu" className="overflow-x-clip pt-16">
        {children}
      </main>
      <SiteFooter lang={lang} />
      <ConsentBanner hubId={HUBSPOT_ID} t={t.consent} privacyUrl={t.brand.privacyUrl} />
      <SiteLanguage lang={lang} />
    </div>
  )
}

function SolutionLinks({ lang, compact }: { lang: SiteLang; compact?: boolean }) {
  const t = content(lang)
  return (
    <ul className={cx('grid gap-2', !compact && 'sm:grid-cols-2')}>
      {SOLUTIONS.map((key) => (
        <li key={key}>
          <Link
            href={ROUTES[key][lang]}
            className={cx('group flex min-h-11 gap-3 rounded-[20px] p-3 hover:bg-white/70 dark:hover:bg-white/5', compact ? 'items-center' : 'items-start')}
          >
            <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white', SOLUTION_TILES[key])}>
              <SiteIcon name={SOLUTION_ICONS[key]} />
            </span>
            <span>
              <span className="block text-[15px] font-black text-slate-900 dark:text-white">{t.solutions[key].menu}</span>
              {!compact && <span className="mt-0.5 block text-sm font-medium text-slate-500 dark:text-slate-400">{t.solutions[key].teaser}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function SiteHeader({ lang }: { lang: SiteLang }) {
  const t = content(lang)
  const cta = primaryCta(lang)
  const nav =
    'inline-flex h-11 items-center rounded-full px-4 text-[15px] font-bold text-slate-700 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white'
  const active = 'bg-[var(--primary-soft)] text-[var(--primary-strong)] dark:text-sky-300'
  return (
    <header className="glass-nav fixed inset-x-0 top-0 z-40 border-b">
      <Container wide className="flex h-16 items-center gap-2">
        <Link href={ROUTES.home[lang]} aria-label={t.a11y.home} className="btn-press -ml-1 inline-flex h-11 items-center gap-2.5 rounded-2xl px-1">
          <ClipMark />
          <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white" aria-hidden>
            {t.brand.wordmark}
          </span>
        </Link>
        <nav aria-label={t.a11y.mainNav} className="ml-4 hidden items-center gap-1 lg:flex">
          <NavLink href={ROUTES.features[lang]} className={nav} activeClassName={active}>
            {t.nav.features}
          </NavLink>
          <button type="button" popoverTarget="site-solutions" className={cx(nav, 'gap-1.5')}>
            {t.nav.solutions}
            <ChevronDown className="h-4 w-4" aria-hidden />
          </button>
          <NavLink href={ROUTES.pricing[lang]} className={nav} activeClassName={active}>
            {t.nav.pricing}
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <LangLink
            lang={lang}
            label={t.a11y.switchLang}
            className="hidden h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-black text-slate-600 hover:bg-slate-900/5 sm:inline-flex dark:text-slate-300 dark:hover:bg-white/10"
          >
            {t.nav.langShort}
          </LangLink>
          <a
            href={LOGIN_PATH}
            className="hidden h-11 items-center rounded-full px-4 text-[15px] font-bold text-slate-700 hover:bg-slate-900/5 md:inline-flex dark:text-slate-200 dark:hover:bg-white/10"
          >
            {t.nav.login}
          </a>
          <PrimaryCta cta={cta} labels={t.cta} size="sm" arrow={false} className="max-[359px]:hidden" />
          <button
            type="button"
            popoverTarget="site-mobile-menu"
            aria-label={t.a11y.menu}
            className="btn-press inline-flex h-11 w-11 items-center justify-center rounded-2xl text-slate-800 hover:bg-slate-900/5 lg:hidden dark:text-white dark:hover:bg-white/10"
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>
        </div>
      </Container>

      <div id="site-solutions" popover="auto" className="site-popover site-menu">
        <div className="glass-float rounded-[30px] p-3">
          <p className="label-caps px-3 pt-2 pb-1 text-slate-500 dark:text-slate-400">{t.nav.solutionsTitle}</p>
          <SolutionLinks lang={lang} />
        </div>
      </div>

      <div id="site-mobile-menu" popover="auto" className="site-popover site-sheet lg:hidden">
        <div className="mx-auto flex min-h-full max-w-lg flex-col px-4 pb-8">
          <div className="flex h-16 items-center justify-between">
            <span className="inline-flex items-center gap-2.5">
              <ClipMark />
              <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white" aria-hidden>
                {t.brand.wordmark}
              </span>
            </span>
            <button
              type="button"
              popoverTarget="site-mobile-menu"
              popoverTargetAction="hide"
              aria-label={t.a11y.closeMenu}
              className="btn-press inline-flex h-11 w-11 items-center justify-center rounded-2xl text-slate-800 hover:bg-slate-900/5 dark:text-white"
            >
              <X className="h-6 w-6" aria-hidden />
            </button>
          </div>
          <nav aria-label={t.a11y.mainNav} className="mt-4 flex flex-col gap-1">
            <Link href={ROUTES.features[lang]} className="flex min-h-14 items-center justify-between rounded-2xl px-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {t.nav.features}
              <ArrowRight className="h-5 w-5 text-slate-400" aria-hidden />
            </Link>
            <Link href={ROUTES.pricing[lang]} className="flex min-h-14 items-center justify-between rounded-2xl px-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {t.nav.pricing}
              <ArrowRight className="h-5 w-5 text-slate-400" aria-hidden />
            </Link>
            <p className="label-caps mt-4 px-3 text-slate-500 dark:text-slate-400">{t.nav.solutions}</p>
            <SolutionLinks lang={lang} compact />
          </nav>
          <div className="mt-auto grid gap-2 pt-8">
            <PrimaryCta cta={cta} labels={t.cta} size="lg" />
            <a href={LOGIN_PATH} className="btn-press glass-card inline-flex h-14 items-center justify-center rounded-full text-base font-black text-slate-900 dark:text-white">
              {t.nav.login}
            </a>
            <LangLink lang={lang} className="inline-flex h-12 items-center justify-center text-sm font-black text-slate-600 dark:text-slate-300">
              {t.nav.langName}
            </LangLink>
          </div>
        </div>
      </div>
      <PopoverCloser />
    </header>
  )
}

export function SiteFooter({ lang }: { lang: SiteLang }) {
  const t = content(lang)
  const year = new Date().getFullYear()
  const link = 'inline-flex min-h-11 items-center text-[15px] font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
  const cta = primaryCta(lang)
  return (
    <footer className="mt-8 border-t border-slate-900/5 bg-white/40 dark:border-white/5 dark:bg-slate-950/40">
      <Container wide className="py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href={ROUTES.home[lang]} aria-label={t.a11y.home} className="inline-flex h-11 items-center gap-2.5">
              <ClipMark />
              <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white" aria-hidden>
                {t.brand.wordmark}
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-[15px] font-medium text-slate-600 dark:text-slate-300">{t.footer.tagline}</p>
            <a
              href={t.brand.companyUrl}
              className="mt-6 inline-flex min-h-11 items-center gap-3 rounded-2xl text-sm font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            >
              {t.brand.poweredBy}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={II_LOGO.onLight} alt={t.brand.company} width={130} height={40} loading="lazy" className="h-10 w-auto dark:hidden" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={II_LOGO.onDark} alt={t.brand.company} width={130} height={40} loading="lazy" className="hidden h-10 w-auto dark:block" />
            </a>
          </div>
          <nav aria-label={t.footer.product}>
            <p className="label-caps text-slate-500 dark:text-slate-400">{t.footer.product}</p>
            <ul className="mt-3">
              <li>
                <Link href={ROUTES.features[lang]} className={link}>
                  {t.nav.features}
                </Link>
              </li>
              <li>
                <Link href={ROUTES.pricing[lang]} className={link}>
                  {t.nav.pricing}
                </Link>
              </li>
              {cta.kind === 'trial' && (
                <li>
                  <a href={cta.href} className={link}>
                    {t.cta.trial}
                  </a>
                </li>
              )}
              <li>
                <Link href={ROUTES.book[lang]} className={link}>
                  {t.cta.book}
                </Link>
              </li>
              <li>
                <a href={LOGIN_PATH} className={link}>
                  {t.nav.login}
                </a>
              </li>
            </ul>
          </nav>
          <nav aria-label={t.footer.solutions}>
            <p className="label-caps text-slate-500 dark:text-slate-400">{t.footer.solutions}</p>
            <ul className="mt-3">
              {SOLUTIONS.map((key) => (
                <li key={key}>
                  <Link href={ROUTES[key][lang]} className={link}>
                    {t.solutions[key].menu}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="label-caps text-slate-500 dark:text-slate-400">{t.footer.company}</p>
            <ul className="mt-3">
              <li>
                <a href={t.brand.privacyUrl} className={link}>
                  {t.footer.privacy}
                </a>
              </li>
              <li>
                <CookieSettingsButton className={link}>{t.footer.cookies}</CookieSettingsButton>
              </li>
            </ul>
            <p className="label-caps mt-6 text-slate-500 dark:text-slate-400">{t.footer.language}</p>
            <LangLink lang={lang} className={link}>
              {t.nav.langName}
            </LangLink>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-slate-900/5 pt-6 text-sm font-medium text-slate-500 sm:flex-row sm:justify-between dark:border-white/5 dark:text-slate-400">
          <p>{fmt(t.footer.rights, { year })}</p>
          <p>{t.footer.imagesNote}</p>
        </div>
      </Container>
    </footer>
  )
}

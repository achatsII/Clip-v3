/**
 * La page des fonctions : une section par temps du travail (capturer, générer, retoucher…), chacune
 * avec sa boucle ou sa démo. Une fonction réservée à certains forfaits le dit (tiré du manifeste).
 */
import Link from 'next/link'
import type { FeatureKey } from '@/lib/billing/catalog'
import { content, listOf, planName } from '@/lib/site/content'
import { DEMO, demoLangsFor } from '@/lib/site/content/demo'
import { breadcrumbLd, graph } from '@/lib/site/jsonld'
import { fmt, type SiteLang } from '@/lib/site/lang'
import type { LoopKey } from '@/lib/site/media'
import { plansWith, siteCatalog } from '@/lib/site/pricing'
import { primaryCta, ROUTES } from '@/lib/site/routes'
import { AnnotateDemo } from '../AnnotateDemo'
import { Breadcrumbs, FinalCta, JsonLd, LoopFrame, PhotoCard } from '../blocks'
import { GenerateDemo } from '../GenerateDemo'
import { PlayerDemo } from '../PlayerDemo'
import { ModuleCards } from '../pricing'
import { ButtonLink, Container, cx, Eyebrow, PrimaryCta, SectionHeading } from '../ui'

const LOOP_MEDIA: Record<string, LoopKey> = { capture: 'capture', edit: 'edit', modernize: 'modernize', deploy: 'deploy', station: 'station', export: 'export' }
const WIDE_MEDIA = new Set(['generateDemo', 'playerDemo'])

export function FeaturesPage({ lang }: { lang: SiteLang }) {
  const t = content(lang)
  const f = t.features
  const c = siteCatalog()
  const badge = (feature: string) => {
    if (!feature) return null
    const names = plansWith(c, feature as FeatureKey).map((p) => planName(p.code, lang, c))
    return names.length ? fmt(f.planBadge, { plans: listOf(names, lang) }) : null
  }
  const playerUi = {
    operatorLanguage: t.demo.player.operatorLanguage,
    close: t.a11y.close,
    voiceNote: t.demo.player.voiceNote,
    noVoice: t.demo.player.noVoice,
    stepPhoto: t.demo.player.stepPhoto,
    sent: t.demo.player.sent,
  }
  const annotateUi = { ...t.demo.annotate, badge: t.demo.badge, restart: t.demo.restart }

  function media(kind: string, label: string) {
    if (kind === 'generateDemo')
      return <GenerateDemo t={{ ...t.demo.generate, badge: t.demo.badge, accelerated: t.demo.accelerated, restart: t.demo.restart }} title={DEMO[lang].title} steps={DEMO[lang].steps} />
    if (kind === 'playerDemo') return <PlayerDemo instructions={DEMO} langs={demoLangsFor(lang)} ui={playerUi} siteLang={lang} />
    if (kind === 'annotateDemo') return <AnnotateDemo t={annotateUi} />
    if (kind === 'plantPhoto') return <PhotoCard photo="plant" alt={t.solutionPages.translation.photoAlt} className="aspect-[4/3]" />
    return <LoopFrame loop={LOOP_MEDIA[kind] ?? 'capture'} label={label} lang={lang} />
  }

  return (
    <>
      <JsonLd json={graph([breadcrumbLd(lang, 'features')])} />
      <section className="relative pt-8 pb-10 sm:pt-12">
        <div className="site-halo" aria-hidden />
        <Container wide className="relative">
          <Breadcrumbs lang={lang} page="features" />
          <div className="mt-6 max-w-4xl">
            <Eyebrow>{f.eyebrow}</Eyebrow>
            <h1 className="mt-4 text-[2.4rem] leading-[1.03] font-black tracking-tighter text-balance text-slate-900 sm:text-6xl lg:text-7xl dark:text-white">{f.h1}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed font-medium text-slate-600 sm:text-xl dark:text-slate-300">{f.sub}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryCta cta={primaryCta(lang)} labels={t.cta} size="lg" />
              <ButtonLink href={ROUTES.pricing[lang]} tone="glass" size="lg">
                {t.cta.pricing}
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      <nav aria-label={f.jump} className="glass-nav sticky top-16 z-30 border-y">
        <Container wide>
          <ul className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto py-2">
            {f.groups.map((g) => (
              <li key={g.id} className="shrink-0">
                <a
                  href={`#${g.id}`}
                  className="inline-flex h-11 items-center rounded-full px-4 text-sm font-black whitespace-nowrap text-slate-600 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                >
                  {g.nav}
                </a>
              </li>
            ))}
          </ul>
        </Container>
      </nav>

      {f.groups.map((g, i) => {
        const wide = WIDE_MEDIA.has(g.media)
        return (
          <section key={g.id} id={g.id} aria-labelledby={`${g.id}-titre`} className="scroll-mt-32 py-14 sm:py-20">
            <Container wide>
              <div className={cx('grid items-center gap-10 lg:gap-16', !wide && 'lg:grid-cols-2')}>
                <div className={cx('site-reveal', !wide && i % 2 === 1 && 'lg:order-2', wide && 'mx-auto max-w-3xl text-center')}>
                  <Eyebrow className={wide ? 'justify-center' : undefined}>{g.nav}</Eyebrow>
                  <h2 id={`${g.id}-titre`} className="mt-3 text-3xl leading-[1.05] font-black tracking-tighter text-balance text-slate-900 sm:text-5xl dark:text-white">
                    {g.title}
                  </h2>
                  <p className="mt-4 text-lg leading-relaxed font-medium text-slate-600 dark:text-slate-300">{g.text}</p>
                  <ul className={cx('mt-7 grid gap-3', wide ? 'text-left sm:grid-cols-2' : '')}>
                    {g.items.map((item) => {
                      const b = badge(item.feature)
                      return (
                        <li key={item.title} className="glass-card rounded-[22px] p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-black text-slate-900 dark:text-white">{item.title}</h3>
                            {b && <span className="label-caps rounded-lg bg-[var(--primary-soft)] px-2 py-0.5 text-[10px] text-[var(--primary-strong)] dark:text-sky-300">{b}</span>}
                          </div>
                          <p className="mt-1 text-[15px] leading-relaxed font-medium text-slate-600 dark:text-slate-300">{item.text}</p>
                        </li>
                      )
                    })}
                  </ul>
                </div>
                <div className={cx('site-reveal', wide ? 'mx-auto w-full max-w-6xl' : i % 2 === 1 && 'lg:order-1')}>{media(g.media, g.title)}</div>
              </div>
            </Container>
          </section>
        )
      })}

      <section className="py-14 sm:py-20">
        <Container wide>
          <SectionHeading eyebrow={f.modules.eyebrow} title={f.modules.title} text={f.modules.text} center />
          <div className="mt-10" data-interval="month">
            <ModuleCards lang={lang} />
          </div>
        </Container>
      </section>

      <section className="py-10">
        <Container>
          <div className="site-reveal glass-panel rounded-[32px] p-6 text-center sm:p-10">
            <h2 className="text-2xl font-black tracking-tighter text-slate-900 sm:text-3xl dark:text-white">{f.platforms.title}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed font-medium text-slate-600 dark:text-slate-300">{f.platforms.text}</p>
            <Link href={ROUTES.pricing[lang]} className="mt-5 inline-flex min-h-11 items-center text-sm font-black text-[var(--primary-strong)] underline underline-offset-4 dark:text-sky-300">
              {t.cta.pricing}
            </Link>
          </div>
        </Container>
      </section>

      <FinalCta lang={lang} title={t.home.final.title} text={t.home.final.text} secondary={{ href: ROUTES.pricing[lang], label: t.cta.pricing }} />
    </>
  )
}

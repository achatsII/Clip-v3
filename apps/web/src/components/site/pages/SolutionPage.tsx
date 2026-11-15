/**
 * Une page « solution » (même gabarit pour les quatre) : le titre, le problème, comment Clip le règle,
 * une démo, la FAQ, puis des liens vers les fonctions, les tarifs et les autres solutions.
 */
import { ArrowRight, ShieldCheck, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { content } from '@/lib/site/content'
import { DEMO, demoLangsFor } from '@/lib/site/content/demo'
import { breadcrumbLd, faqLd, graph } from '@/lib/site/jsonld'
import type { SiteLang } from '@/lib/site/lang'
import type { PhotoKey } from '@/lib/site/media'
import { primaryCta, ROUTES, SOLUTIONS, type SolutionKey } from '@/lib/site/routes'
import { AnnotateDemo } from '../AnnotateDemo'
import { Breadcrumbs, Faq, FinalCta, JsonLd, LockoutSheet, PhotoCard } from '../blocks'
import { GenerateDemo } from '../GenerateDemo'
import { PlayerDemo } from '../PlayerDemo'
import { ButtonLink, Container, cx, Eyebrow, IconTile, PrimaryCta, SectionHeading } from '../ui'

const TONES = ['primary', 'ai', 'success', 'dark'] as const

export function SolutionPage({ lang, page }: { lang: SiteLang; page: SolutionKey }) {
  const t = content(lang)
  const s = t.solutionPages[page]
  const common = t.solutionCommon
  const playerUi = {
    operatorLanguage: t.demo.player.operatorLanguage,
    close: t.a11y.close,
    voiceNote: t.demo.player.voiceNote,
    noVoice: t.demo.player.noVoice,
    stepPhoto: t.demo.player.stepPhoto,
    sent: t.demo.player.sent,
  }
  const lockout = 'sheetTitle' in s ? s : null
  const academy = 'academy' in s ? s.academy : null
  const others = SOLUTIONS.filter((k) => k !== page)

  return (
    <>
      <JsonLd json={graph([breadcrumbLd(lang, page), faqLd(s.faq)])} />

      <section className="relative pt-8 pb-12 sm:pt-12 sm:pb-16">
        <div className="site-halo" aria-hidden />
        <Container wide className="relative">
          <Breadcrumbs lang={lang} page={page} />
          <div className="mt-6 grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
            <div>
              <Eyebrow>{s.eyebrow}</Eyebrow>
              <h1 className="mt-4 text-[2.35rem] leading-[1.03] font-black tracking-tighter text-balance text-slate-900 sm:text-6xl dark:text-white">{s.h1}</h1>
              <p className="mt-6 text-lg leading-relaxed font-medium text-pretty text-slate-600 sm:text-xl dark:text-slate-300">{s.sub}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <PrimaryCta cta={primaryCta(lang)} labels={t.cta} size="lg" />
                <ButtonLink href={ROUTES.pricing[lang]} tone="glass" size="lg">
                  {t.cta.pricing}
                </ButtonLink>
              </div>
            </div>
            <PhotoCard photo={s.photo as PhotoKey} alt={s.photoAlt} priority className="aspect-[4/3]" />
          </div>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container wide>
          <SectionHeading title={s.problem.title} />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {s.problem.items.map((p) => (
              <div key={p.title} className="site-reveal glass-card rounded-[28px] p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <TriangleAlert className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-xl font-black tracking-tight text-slate-900 dark:text-white">{p.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed font-medium text-slate-600 dark:text-slate-300">{p.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container wide>
          <SectionHeading title={s.solution.title} />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {s.solution.items.map((item, i) => (
              <div key={item.title} className="site-reveal glass-panel flex gap-5 rounded-[28px] p-6">
                <IconTile name={item.icon} tone={TONES[i] ?? 'primary'} />
                <div>
                  <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed font-medium text-slate-600 dark:text-slate-300">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
          {academy && (
            <div className="site-reveal bg-gradient-accent shadow-accent relative mt-6 overflow-hidden rounded-[28px] p-6 text-white sm:p-8">
              <span className="grid-pattern absolute inset-0 opacity-40" aria-hidden />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-2xl font-black tracking-tight">{academy.title}</h3>
                  <p className="mt-2 max-w-2xl text-[15px] leading-relaxed font-bold text-white/90">{academy.text}</p>
                </div>
                <ButtonLink href={ROUTES.pricing[lang]} tone="light" arrow>
                  {t.cta.pricing}
                </ButtonLink>
              </div>
            </div>
          )}
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container wide>
          <SectionHeading eyebrow={common.demoEyebrow} title={s.demo.title} text={s.demo.text} center />
          <div className="site-reveal mx-auto mt-10 max-w-6xl">
            {s.demo.kind === 'generate' && (
              <GenerateDemo t={{ ...t.demo.generate, badge: t.demo.badge, accelerated: t.demo.accelerated, restart: t.demo.restart }} title={DEMO[lang].title} steps={DEMO[lang].steps} />
            )}
            {s.demo.kind === 'player' && <PlayerDemo instructions={DEMO} langs={demoLangsFor(lang)} ui={playerUi} siteLang={lang} training={page === 'training'} />}
            {s.demo.kind === 'annotate' && <AnnotateDemo t={{ ...t.demo.annotate, badge: t.demo.badge, restart: t.demo.restart }} />}
          </div>
          {lockout && (
            <div className="mx-auto mt-16 grid max-w-6xl items-start gap-8 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="site-reveal lg:sticky lg:top-28">
                <h2 className="text-3xl leading-[1.05] font-black tracking-tighter text-slate-900 sm:text-4xl dark:text-white">{lockout.sheetTitle}</h2>
                <p className="mt-3 text-lg font-medium text-slate-600 dark:text-slate-300">{lockout.sheetText}</p>
                <p className="mt-6 flex gap-3 rounded-[22px] bg-amber-500/10 p-4 text-sm leading-relaxed font-bold text-amber-800 dark:text-amber-200">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                  {lockout.disclaimer}
                </p>
              </div>
              <div className="site-reveal">
                <LockoutSheet lang={lang} />
              </div>
            </div>
          )}
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container>
          <SectionHeading title={common.faqTitle} center />
          <Faq items={s.faq} className="site-reveal mx-auto mt-10 max-w-3xl" />
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container wide>
          <SectionHeading title={common.related} />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              { href: ROUTES.features[lang], title: common.relatedFeatures, text: common.relatedFeaturesText },
              { href: ROUTES.pricing[lang], title: common.relatedPricing, text: common.relatedPricingText },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="site-reveal glass-panel group flex items-center justify-between gap-4 rounded-[28px] p-6 hover:-translate-y-0.5">
                <span>
                  <span className="block text-xl font-black tracking-tight text-slate-900 dark:text-white">{l.title}</span>
                  <span className="mt-1 block text-[15px] font-medium text-slate-600 dark:text-slate-300">{l.text}</span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            ))}
          </div>
          <p className="label-caps mt-10 text-slate-500 dark:text-slate-400">{common.otherSolutions}</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {others.map((k) => (
              <li key={k}>
                <Link
                  href={ROUTES[k][lang]}
                  className={cx(
                    'glass-card flex min-h-11 items-center justify-between gap-3 rounded-[22px] px-5 py-4 text-[15px] font-black text-slate-800 hover:bg-white/80 dark:text-slate-100 dark:hover:bg-slate-700/60',
                  )}
                >
                  {t.solutions[k].menu}
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <FinalCta lang={lang} title={t.home.final.title} text={t.home.final.text} secondary={{ href: ROUTES.features[lang], label: t.cta.features }} />
    </>
  )
}

/**
 * L'accueil du site : le héros et le film, le constat, comment ça marche, la démo de la génération,
 * les fonctions en vitrine (dont le poste, en démo), pour qui, ce qui est vrai, les tarifs, la FAQ et
 * l'appel final. Une seule action principale : essayer ou réserver une démo (`primaryCta`).
 */
import { Brain, Check, Clock, Languages, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { content, SITE_DICTS } from '@/lib/site/content'
import { DEMO, demoLangsFor } from '@/lib/site/content/demo'
import { faqLd, graph, organizationLd, softwareLd, videoLd, websiteLd } from '@/lib/site/jsonld'
import type { SiteLang } from '@/lib/site/lang'
import type { LoopKey } from '@/lib/site/media'
import { primaryCta, ROUTES } from '@/lib/site/routes'
import { Faq, FinalCta, JsonLd, LoopFrame, PhotoCard } from '../blocks'
import { FilmButton } from '../FilmButton'
import { GenerateDemo } from '../GenerateDemo'
import { PlayerDemo } from '../PlayerDemo'
import { PlanCards } from '../pricing'
import { CheckList, Container, cx, Eyebrow, IconTile, PrimaryCta, SectionHeading } from '../ui'

const HOW_LOOPS: LoopKey[] = ['capture', 'generate', 'station']
const SHOWCASE_LOOPS: Record<string, LoopKey> = { edit: 'edit', modernize: 'modernize', approve: 'deploy', export: 'export' }
const ROLE_TONES = ['primary', 'success', 'dark', 'danger', 'ai'] as const
const FACT_TILES = [
  'bg-gradient-primary shadow-primary',
  'bg-gradient-accent shadow-accent',
  'bg-gradient-to-br from-[#2EE59D] to-[#18c480] shadow-[0_15px_35px_rgba(24,196,128,0.3)]',
  'bg-gradient-to-br from-slate-700 to-slate-900 shadow-[0_15px_35px_rgba(15,23,42,0.3)]',
]
const STATION_DEMO = 'station-demo'

export function HomePage({ lang }: { lang: SiteLang }) {
  const t = content(lang)
  const h = t.home
  const cta = primaryCta(lang)
  const json = graph([organizationLd(lang), websiteLd(), softwareLd(lang), videoLd(lang), faqLd(h.faq.items)])
  const playerUi = {
    operatorLanguage: t.demo.player.operatorLanguage,
    close: t.a11y.close,
    voiceNote: t.demo.player.voiceNote,
    noVoice: t.demo.player.noVoice,
    stepPhoto: t.demo.player.stepPhoto,
    sent: t.demo.player.sent,
  }

  return (
    <>
      <JsonLd json={json} />

      {/* Le héros */}
      <section className="relative pt-10 pb-14 sm:pt-16 sm:pb-20">
        <div className="site-halo" aria-hidden />
        <Container className="relative text-center">
          <p className="glass-card mx-auto inline-flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-black text-slate-700 dark:text-slate-200">
            <span className="bg-gradient-accent flex h-7 w-7 items-center justify-center rounded-full text-white">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
            </span>
            {h.hero.pill}
          </p>
          <h1 className="mx-auto mt-6 max-w-5xl text-[2.6rem] leading-[1.02] font-black tracking-tighter text-balance text-slate-900 sm:text-6xl lg:text-7xl xl:text-[5.4rem] dark:text-white">
            {h.hero.h1.before}
            <span className="site-gradient-text">{h.hero.h1.highlight}</span>
            {h.hero.h1.after}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed font-medium text-pretty text-slate-600 sm:text-xl dark:text-slate-300">{h.hero.sub}</p>
          <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <PrimaryCta cta={cta} labels={t.cta} size="lg" />
            <FilmButton
              lang={lang}
              labels={{
                button: t.cta.film,
                length: t.cta.filmLength,
                title: t.film.title,
                note: t.film.note,
                close: t.a11y.close,
                poster: t.film.poster,
                tracks: { fr: SITE_DICTS.en.nav.langName, en: SITE_DICTS.fr.nav.langName },
              }}
            />
          </div>
          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-bold text-slate-500 dark:text-slate-400">
            {h.hero.trust.map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-500" strokeWidth={3} aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </Container>
        <Container wide className="relative mt-12 sm:mt-16">
          <div className="relative mx-auto max-w-5xl">
            <LoopFrame loop="hero" label={h.hero.videoLabel} lang={lang} priority />
            {/* Deux faits en verre, hors de l'image (la boucle a ses propres libellés). */}
            {(
              [
                [Clock, 1, '-right-24 top-[9%] xl:-right-32'],
                [Languages, 2, '-left-24 bottom-[10%] xl:-left-32 [animation-delay:1.6s]'],
              ] as const
            ).map(([Icon, i, place]) => (
              <p key={i} className={cx('glass-float animate-float absolute hidden items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 lg:flex dark:text-white', place)}>
                <span className={cx('flex h-8 w-8 items-center justify-center rounded-xl text-white', i === 1 ? 'bg-gradient-accent' : 'bg-gradient-primary')}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {h.hero.chips[i]}
              </p>
            ))}
          </div>
        </Container>
      </section>

      {/* Le constat */}
      <section className="py-16 sm:py-24">
        <Container wide>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="site-reveal">
              <Eyebrow>{h.problem.eyebrow}</Eyebrow>
              <h2 className="mt-4 font-black tracking-tighter text-slate-900 dark:text-white">
                <span className="block text-2xl sm:text-3xl">{h.problem.lead}</span>
                <span className="site-danger-text block py-1 text-[2.6rem] leading-[0.95] whitespace-nowrap sm:text-7xl xl:text-[5.25rem]">{h.problem.stat}</span>
                <span className="mt-1 block text-[1.7rem] leading-[1.1] text-balance sm:text-4xl">{h.problem.statLine}</span>
              </h2>
              <div className="mt-7 max-w-md" aria-hidden>
                <div className="h-3 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#FFC800] via-[#FF6B00] to-[#FF2B5E]" />
                </div>
                <div className="label-caps mt-2 flex justify-between text-slate-500 dark:text-slate-400">
                  <span>{h.problem.timeline[0]}</span>
                  <span className="text-[#FF2B5E]">{h.problem.timeline[1]}</span>
                </div>
              </div>
              <p className="mt-7 text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">{h.problem.kicker}</p>
            </div>
            <PhotoCard
              photo="expert"
              alt={h.problem.photoAlt}
              className="site-reveal aspect-[4/3]"
              tag={
                <span className="inline-flex items-center gap-2">
                  <Brain className="h-4 w-4 text-[#FF2B5E]" aria-hidden />
                  {h.problem.photoTag}
                </span>
              }
            />
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {h.problem.pains.map((p) => (
              <div key={p.title} className="site-reveal glass-card rounded-[28px] p-6">
                <IconTile name={p.icon} tone="dark" />
                <h3 className="mt-4 text-xl font-black tracking-tight text-slate-900 dark:text-white">{p.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed font-medium text-slate-600 dark:text-slate-300">{p.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Comment ça marche */}
      <section className="py-16 sm:py-24">
        <Container wide>
          <SectionHeading eyebrow={h.how.eyebrow} title={h.how.title} center />
          <ol className="mt-12 grid gap-10 lg:grid-cols-3 lg:gap-6">
            {h.how.steps.map((s, i) => (
              <li key={s.title} className="site-reveal flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="bg-gradient-primary shadow-primary flex h-10 w-10 items-center justify-center rounded-2xl text-lg font-black text-white tabular-nums">{i + 1}</span>
                  <p className="label-caps text-[var(--primary-strong)] dark:text-sky-300">{s.eyebrow}</p>
                </div>
                <h3 className="mt-4 text-2xl leading-tight font-black tracking-tighter text-slate-900 dark:text-white">{s.title}</h3>
                <p className="mt-2 text-base leading-relaxed font-medium text-slate-600 dark:text-slate-300">{s.text}</p>
                <LoopFrame loop={HOW_LOOPS[i] ?? 'capture'} label={s.alt} lang={lang} className="mt-6" />
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* La démo de la génération */}
      <section className="py-16 sm:py-24">
        <Container wide>
          <SectionHeading eyebrow={h.demo.eyebrow} title={h.demo.title} text={h.demo.text} center />
          <div className="site-reveal mx-auto mt-10 max-w-6xl">
            <GenerateDemo
              t={{ ...t.demo.generate, badge: t.demo.badge, accelerated: t.demo.accelerated, restart: t.demo.restart }}
              title={DEMO[lang].title}
              steps={DEMO[lang].steps}
              stationHref={`#${STATION_DEMO}`}
            />
          </div>
        </Container>
      </section>

      {/* Les fonctions en vitrine */}
      <section className="py-16 sm:py-24">
        <Container wide>
          <SectionHeading eyebrow={h.showcase.eyebrow} title={h.showcase.title} center />
          <div className="mt-16 space-y-24 sm:space-y-32">
            {h.showcase.rows.map((row, i) =>
              row.key === 'station' ? (
                <div key={row.key} id={STATION_DEMO} className="scroll-mt-24">
                  <div className="site-reveal mx-auto max-w-3xl text-center">
                    <Eyebrow className="justify-center">{row.eyebrow}</Eyebrow>
                    <h3 className="mt-3 text-3xl leading-[1.05] font-black tracking-tighter text-balance text-slate-900 sm:text-5xl dark:text-white">{row.title}</h3>
                    <p className="mt-4 text-lg leading-relaxed font-medium text-slate-600 dark:text-slate-300">{row.text}</p>
                    <ul className="mt-5 flex flex-wrap justify-center gap-2">
                      {row.points.map((p) => (
                        <li key={p} className="glass-card inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                          <Check className="h-4 w-4 text-emerald-500" strokeWidth={3} aria-hidden />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="site-reveal mx-auto mt-10 max-w-6xl">
                    <PlayerDemo instructions={DEMO} langs={demoLangsFor(lang)} ui={playerUi} siteLang={lang} />
                  </div>
                </div>
              ) : (
                <div key={row.key} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                  <div className={cx('site-reveal', i % 2 === 1 && 'lg:order-2')}>
                    <Eyebrow>{row.eyebrow}</Eyebrow>
                    <h3 className="mt-3 text-3xl leading-[1.05] font-black tracking-tighter text-balance text-slate-900 sm:text-[2.6rem] dark:text-white">{row.title}</h3>
                    <p className="mt-4 text-lg leading-relaxed font-medium text-slate-600 dark:text-slate-300">{row.text}</p>
                    <CheckList items={row.points} className="mt-6" />
                  </div>
                  <LoopFrame loop={SHOWCASE_LOOPS[row.key] ?? 'edit'} label={row.alt} lang={lang} className={cx('site-reveal', i % 2 === 1 && 'lg:order-1')} />
                </div>
              ),
            )}
          </div>
          <div className="site-reveal mt-16 text-center">
            <Link href={ROUTES.features[lang]} className="btn-press glass-card inline-flex h-12 items-center rounded-full px-6 text-sm font-black text-slate-900 dark:text-white">
              {t.cta.features}
            </Link>
          </div>
        </Container>
      </section>

      {/* Pour qui */}
      <section className="py-16 sm:py-24">
        <Container wide>
          <SectionHeading eyebrow={h.roles.eyebrow} title={h.roles.title} center />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {h.roles.items.map((r, i) => (
              <div key={r.title} className={cx('site-reveal glass-card rounded-[28px] p-6', i < 3 ? 'lg:col-span-2' : 'lg:col-span-3', i === 4 && 'sm:col-span-2 lg:col-span-3')}>
                <IconTile name={r.icon} tone={ROLE_TONES[i] ?? 'primary'} />
                <h3 className="mt-4 text-xl font-black tracking-tight text-slate-900 dark:text-white">{r.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed font-medium text-slate-600 dark:text-slate-300">{r.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Ce qui est vrai */}
      <section className="py-16 sm:py-24">
        <Container wide>
          <SectionHeading eyebrow={h.facts.eyebrow} title={h.facts.title} center />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {h.facts.items.map((f, i) => (
              <div key={f.label} className={cx('site-reveal relative overflow-hidden rounded-[28px] p-6 text-white', FACT_TILES[i])}>
                <span className="grid-pattern absolute inset-0 opacity-50" aria-hidden />
                <span className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/25 blur-2xl" aria-hidden />
                <p className="relative text-6xl font-black tracking-tighter tabular-nums">{f.value}</p>
                <p className="relative mt-3 text-[15px] leading-snug font-bold text-white/90">{f.label}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Aperçu des tarifs */}
      <section className="py-16 sm:py-24">
        <Container wide>
          <SectionHeading eyebrow={h.pricing.eyebrow} title={h.pricing.title} text={h.pricing.text} center />
          <div className="mt-12" data-interval="month">
            <PlanCards lang={lang} compact />
          </div>
          <div className="site-reveal mt-10 text-center">
            <Link href={ROUTES.pricing[lang]} className="btn-press glass-card inline-flex h-12 items-center rounded-full px-6 text-sm font-black text-slate-900 dark:text-white">
              {h.pricing.link}
            </Link>
          </div>
        </Container>
      </section>

      {/* Questions fréquentes */}
      <section className="py-16 sm:py-24">
        <Container>
          <SectionHeading eyebrow={h.faq.eyebrow} title={h.faq.title} center />
          <Faq items={h.faq.items} className="site-reveal mx-auto mt-10 max-w-3xl" />
        </Container>
      </section>

      <FinalCta lang={lang} title={h.final.title} text={h.final.text} secondary={{ href: ROUTES.pricing[lang], label: t.cta.pricing }} />
    </>
  )
}

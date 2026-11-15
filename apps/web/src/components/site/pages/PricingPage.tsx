/**
 * La page des tarifs, tirée du manifeste : forfaits (mensuel ou annuel), ce que chacun comprend,
 * tableau comparatif, modules, prix en crédits des opérations d'IA, questions sur les forfaits.
 */
import { Check } from 'lucide-react'
import { content } from '@/lib/site/content'
import { breadcrumbLd, faqLd, graph, softwareLd } from '@/lib/site/jsonld'
import type { SiteLang } from '@/lib/site/lang'
import { ROUTES } from '@/lib/site/routes'
import { Breadcrumbs, Faq, FinalCta, JsonLd } from '../blocks'
import { IntervalToggle } from '../client'
import { CompareTable, CreditsTable, ModuleCards, PlanCards } from '../pricing'
import { Container, Eyebrow, SectionHeading } from '../ui'

const TARGET = 'site-pricing'

export function PricingPage({ lang }: { lang: SiteLang }) {
  const t = content(lang)
  const p = t.pricing
  return (
    <>
      <JsonLd json={graph([breadcrumbLd(lang, 'pricing'), softwareLd(lang), faqLd(p.faq.items)])} />
      <div id={TARGET} data-interval="month">
        <section className="relative pt-8 pb-10 sm:pt-12">
          <div className="site-halo" aria-hidden />
          <Container wide className="relative">
            <Breadcrumbs lang={lang} page="pricing" />
            <div className="mx-auto mt-6 max-w-4xl text-center">
              <Eyebrow className="justify-center">{p.eyebrow}</Eyebrow>
              <h1 className="mt-4 text-[2.4rem] leading-[1.03] font-black tracking-tighter text-balance text-slate-900 sm:text-6xl lg:text-7xl dark:text-white">{p.h1}</h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed font-medium text-slate-600 sm:text-xl dark:text-slate-300">{p.sub}</p>
              <div className="mt-8 flex justify-center">
                <IntervalToggle target={TARGET} labels={{ group: p.intervalLabel, month: p.monthly, year: p.yearly, bonus: p.yearlyBonus }} />
              </div>
            </div>
          </Container>
        </section>

        <section className="pb-10">
          <Container wide>
            <PlanCards lang={lang} />
            <div className="site-reveal glass-card mt-6 flex flex-col gap-4 rounded-[28px] p-5 sm:flex-row sm:items-center sm:p-6">
              <p className="label-caps shrink-0 text-slate-500 dark:text-slate-400">{p.allPlans.title}</p>
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                {p.allPlans.points.map((x) => (
                  <li key={x} className="inline-flex items-center gap-2 text-[15px] font-bold text-slate-700 dark:text-slate-200">
                    <Check className="h-4 w-4 text-emerald-500" strokeWidth={3} aria-hidden />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>

        <section className="py-14 sm:py-20" aria-labelledby="comparer">
          <Container wide>
            <h2 id="comparer" className="site-reveal text-3xl font-black tracking-tighter text-slate-900 max-md:sr-only sm:text-4xl dark:text-white">
              {p.compare.title}
            </h2>
            <div className="mt-8">
              <CompareTable lang={lang} />
            </div>
          </Container>
        </section>

        <section className="py-14 sm:py-20">
          <Container wide>
            <SectionHeading eyebrow={p.modules.eyebrow} title={p.modules.title} text={p.modules.text} center />
            <div className="mt-10">
              <ModuleCards lang={lang} />
            </div>
          </Container>
        </section>
      </div>

      <section className="py-14 sm:py-20">
        <Container wide>
          <SectionHeading eyebrow={p.creditsInfo.eyebrow} title={p.creditsInfo.title} text={p.creditsInfo.text} />
          <div className="mt-10">
            <CreditsTable lang={lang} />
          </div>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container>
          <SectionHeading title={p.faq.title} center />
          <Faq items={p.faq.items} className="site-reveal mx-auto mt-10 max-w-3xl" />
        </Container>
      </section>

      <FinalCta lang={lang} title={t.home.final.title} text={t.home.final.text} secondary={{ href: ROUTES.features[lang], label: t.cta.features }} />
    </>
  )
}

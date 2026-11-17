/**
 * Un guide du site : le titre et le chapeau qui répondent tout de suite, le sommaire, les sections, la
 * FAQ, l'encart de la marque, puis d'autres guides. Une colonne de lecture, lisible au téléphone.
 */
import { ArrowRight, Clock } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { content } from '@/lib/site/content'
import { approvedGuides, guideDate, guidePath, GUIDES, GUIDES_APPROVED, GUIDES_UPDATED, guidesIn, isApproved, type GuideKey } from '@/lib/site/guides'
import { guideCrumbs, guideImage } from '@/lib/site/guides/metadata'
import { articleLd, crumbListLd, faqLd, graph, organizationLd } from '@/lib/site/jsonld'
import type { SiteLang } from '@/lib/site/lang'
import { ROUTES } from '@/lib/site/routes'
import { Breadcrumbs, Faq, FinalCta, JsonLd } from '../blocks'
import { Container, Eyebrow } from '../ui'

export function GuidePage({ lang, guide }: { lang: SiteLang; guide: GuideKey }) {
  const d = guidesIn(lang)
  if (!d) notFound()
  const g = d.guides[guide]
  const t = content(lang)
  const path = guidePath(guide, lang)
  const crumbs = guideCrumbs(lang, guide)
  // Les autres guides : ceux qui se montrent ; pendant la relecture d'un guide pas encore approuvé, tous.
  const related = (isApproved(guide) ? approvedGuides() : [...GUIDES]).filter((k) => k !== guide).slice(0, 3)
  const image = guideImage(guide)

  return (
    <>
      <JsonLd
        json={graph([
          organizationLd(lang),
          articleLd(lang, { path, headline: g.h1, description: g.description, published: GUIDES_APPROVED[guide] ?? GUIDES_UPDATED, modified: GUIDES_UPDATED, image }),
          faqLd(g.faq),
          crumbListLd(crumbs),
        ])}
      />

      <article>
        <header className="relative pt-8 pb-10 sm:pt-12 sm:pb-14">
          <div className="site-halo" aria-hidden />
          <Container className="relative max-w-3xl">
            <Breadcrumbs lang={lang} crumbs={crumbs} />
            <Eyebrow className="mt-6">{d.ui.guides}</Eyebrow>
            <h1 className="mt-4 text-[2.2rem] leading-[1.05] font-black tracking-tighter text-balance text-slate-900 sm:text-5xl dark:text-white">{g.h1}</h1>
            <p className="mt-6 text-lg leading-relaxed font-medium text-pretty text-slate-700 sm:text-xl dark:text-slate-200">{g.lead}</p>
            <p className="mt-6 inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden />
                {d.ui.readingTime(g.minutes)}
              </span>
              <span aria-hidden>·</span>
              <span>{d.ui.updated(guideDate(GUIDES_UPDATED, lang))}</span>
            </p>
          </Container>
        </header>

        <Container className="max-w-3xl">
          <nav aria-label={d.ui.contents} className="glass-card rounded-[28px] p-6 sm:p-7">
            <p className="label-caps text-slate-500 dark:text-slate-400">{d.ui.contents}</p>
            <ol className="mt-3 space-y-1">
              {g.sections.map((s, i) => (
                <li key={s.heading}>
                  <a href={`#s${i + 1}`} className="inline-flex min-h-11 items-center gap-3 text-[15px] font-bold text-slate-700 hover:text-[var(--primary-strong)] dark:text-slate-200 dark:hover:text-[var(--primary-light)]">
                    <span className="w-5 shrink-0 text-right text-slate-400 tabular-nums">{i + 1}</span>
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-12 space-y-12 sm:mt-14">
            {g.sections.map((s, i) => (
              <section key={s.heading} id={`s${i + 1}`} className="scroll-mt-28">
                <h2 className="text-2xl leading-tight font-black tracking-tight text-balance text-slate-900 sm:text-3xl dark:text-white">{s.heading}</h2>
                {s.paragraphs.map((p) => (
                  <p key={p} className="mt-4 text-[17px] leading-relaxed font-medium text-pretty text-slate-700 dark:text-slate-300">
                    {p}
                  </p>
                ))}
                {s.list &&
                  (s.list.ordered ? (
                    <ol className="mt-5 list-decimal space-y-2 pl-6 text-[17px] leading-relaxed font-medium text-slate-700 marker:font-black marker:text-[var(--primary-strong)] dark:text-slate-300 dark:marker:text-[var(--primary-light)]">
                      {s.list.items.map((item) => (
                        <li key={item} className="pl-1">
                          {item}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <ul className="mt-5 list-disc space-y-2 pl-6 text-[17px] leading-relaxed font-medium text-slate-700 marker:text-[var(--primary-strong)] dark:text-slate-300 dark:marker:text-[var(--primary-light)]">
                      {s.list.items.map((item) => (
                        <li key={item} className="pl-1">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ))}
              </section>
            ))}
          </div>

          <section className="mt-16" aria-labelledby="guide-faq">
            <h2 id="guide-faq" className="text-2xl leading-tight font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {d.ui.faq}
            </h2>
            <Faq items={g.faq} className="mt-6" />
          </section>
        </Container>
      </article>

      <FinalCta lang={lang} title={g.cta.title} text={g.cta.text} secondary={{ href: ROUTES.pricing[lang], label: t.cta.pricing }} />

      {related.length > 0 && (
        <section className="pb-16 sm:pb-24" aria-labelledby="guide-related">
          <Container wide>
            <h2 id="guide-related" className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {d.ui.related}
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {related.map((k) => (
                <GuideCard key={k} lang={lang} guide={k} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  )
}

/** Un guide dans une liste : son titre, sa promesse, son temps de lecture. */
export function GuideCard({ lang, guide }: { lang: SiteLang; guide: GuideKey }) {
  const d = guidesIn(lang)
  if (!d) return null
  const g = d.guides[guide]
  return (
    <Link href={guidePath(guide, lang)} className="group site-reveal glass-card btn-press flex min-h-44 flex-col rounded-[28px] p-6 transition-transform hover:-translate-y-0.5">
      <h3 className="text-xl leading-snug font-black tracking-tight text-balance text-slate-900 dark:text-white">{g.h1}</h3>
      <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed font-medium text-slate-600 dark:text-slate-300">{g.description}</p>
      <span className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-black text-[var(--primary-strong)] dark:text-[var(--primary-light)]">
        {d.ui.readingTime(g.minutes)}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  )
}

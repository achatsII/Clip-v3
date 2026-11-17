/**
 * La page des guides : un titre, une phrase, puis les guides qui se montrent (approuvés). Tant qu'aucun ne
 * l'est, la page (hors des moteurs et des liens) les liste tous, pour la relecture.
 */
import { notFound } from 'next/navigation'
import { approvedGuides, GUIDES, guidesIn } from '@/lib/site/guides'
import { guideCrumbs } from '@/lib/site/guides/metadata'
import { crumbListLd, graph, organizationLd } from '@/lib/site/jsonld'
import type { SiteLang } from '@/lib/site/lang'
import { Breadcrumbs, JsonLd } from '../blocks'
import { Container, Eyebrow } from '../ui'
import { GuideCard } from './GuidePage'

export function GuidesIndexPage({ lang }: { lang: SiteLang }) {
  const d = guidesIn(lang)
  if (!d) notFound()
  const approved = approvedGuides()
  const list = approved.length ? approved : [...GUIDES]
  const crumbs = guideCrumbs(lang, null)

  return (
    <>
      <JsonLd json={graph([organizationLd(lang), crumbListLd(crumbs)])} />
      <section className="relative pt-8 pb-10 sm:pt-12 sm:pb-14">
        <div className="site-halo" aria-hidden />
        <Container wide className="relative">
          <Breadcrumbs lang={lang} crumbs={crumbs} />
          <Eyebrow className="mt-6">{d.ui.guides}</Eyebrow>
          <h1 className="mt-4 max-w-3xl text-[2.35rem] leading-[1.03] font-black tracking-tighter text-balance text-slate-900 sm:text-6xl dark:text-white">{d.index.h1}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed font-medium text-pretty text-slate-600 sm:text-xl dark:text-slate-300">{d.index.lead}</p>
        </Container>
      </section>
      <section className="pb-16 sm:pb-24">
        <Container wide>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {list.map((k) => (
              <GuideCard key={k} lang={lang} guide={k} />
            ))}
          </div>
        </Container>
      </section>
    </>
  )
}

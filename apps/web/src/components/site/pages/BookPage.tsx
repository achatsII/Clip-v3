/**
 * Réserver une démo : le calendrier HubSpot intégré (sa hauteur suit ses étapes) et ce qu'on regarde
 * ensemble. Avec le libre-service ouvert, la voie « essayer seul » reste à un clic.
 */
import { content } from '@/lib/site/content'
import { breadcrumbLd, graph } from '@/lib/site/jsonld'
import type { SiteLang } from '@/lib/site/lang'
import { MEETINGS_URL, primaryCta, ROUTES } from '@/lib/site/routes'
import { Breadcrumbs, JsonLd } from '../blocks'
import { MeetingsCalendar } from '../MeetingsCalendar'
import { ButtonLink, CheckList, Container, Eyebrow } from '../ui'

export function BookPage({ lang }: { lang: SiteLang }) {
  const t = content(lang)
  const b = t.book
  const cta = primaryCta(lang)
  const src = `${MEETINGS_URL}?${new URLSearchParams({ embed: 'true', 'background-color': 'transparent', language: lang }).toString()}`
  return (
    <>
      <JsonLd json={graph([breadcrumbLd(lang, 'book')])} />
      <section className="relative pt-8 pb-16 sm:pt-12">
        <div className="site-halo" aria-hidden />
        <Container wide className="relative">
          <Breadcrumbs lang={lang} page="book" />
          <div className="mt-6 grid items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
            <div className="lg:sticky lg:top-28">
              <Eyebrow>{b.eyebrow}</Eyebrow>
              <h1 className="mt-4 text-[2.4rem] leading-[1.03] font-black tracking-tighter text-balance text-slate-900 sm:text-6xl dark:text-white">{b.h1}</h1>
              <p className="mt-6 text-lg leading-relaxed font-medium text-slate-600 sm:text-xl dark:text-slate-300">{b.sub}</p>
              <div className="glass-card mt-8 rounded-[28px] p-6">
                <h2 className="label-caps text-slate-500 dark:text-slate-400">{b.agendaTitle}</h2>
                <CheckList items={b.agenda} className="mt-4" />
              </div>
              {cta.kind === 'trial' && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <p className="text-[15px] font-bold text-slate-600 dark:text-slate-300">{b.selfServe}</p>
                  <ButtonLink href={cta.href} app tone="glass" size="sm" arrow>
                    {t.cta.trial}
                  </ButtonLink>
                </div>
              )}
            </div>
            <MeetingsCalendar
              src={src}
              title={b.calendarTitle}
              labels={{ loading: b.loading, fallback: b.fallback, booked: b.booked, newTab: t.a11y.newTab }}
              conversionPath={`${ROUTES.book[lang]}/confirmation`}
            />
          </div>
        </Container>
      </section>
    </>
  )
}

/**
 * Des blocs de page du site (composants serveur) : données structurées, fil d'Ariane, questions
 * fréquentes, cadre d'appareil des boucles, bandeau d'appel final, fiche de cadenassage en maquette.
 */
import { ChevronRight, Glasses, Hand, Layers, Lock, Plus, RotateCcw, ShieldAlert } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { content } from '@/lib/site/content'
import { crumbsFor } from '@/lib/site/crumbs'
import { fmt, type SiteLang } from '@/lib/site/lang'
import { LOOPS, PHOTOS, type LoopKey } from '@/lib/site/media'
import { primaryCta, type PageKey } from '@/lib/site/routes'
import { LoopVideo } from './LoopVideo'
import { ButtonLink, Container, cx, PrimaryCta } from './ui'

/** Un bloc JSON-LD (un `@graph`, déjà échappé par `graph`). */
export function JsonLd({ json }: { json: string }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}

export function Breadcrumbs({ lang, page }: { lang: SiteLang; page: PageKey }) {
  const t = content(lang)
  const crumbs = crumbsFor(lang, page)
  return (
    <nav aria-label={t.a11y.breadcrumb} className="text-sm font-bold text-slate-500 dark:text-slate-400">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((c, i) => (
          <li key={c.path} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
            {i < crumbs.length - 1 ? (
              <Link href={c.path} className="inline-flex min-h-11 items-center hover:text-slate-800 dark:hover:text-white">
                {c.name}
              </Link>
            ) : (
              <span aria-current="page" className="text-slate-700 dark:text-slate-200">
                {c.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** Les questions fréquentes : `details` natifs (lisibles sans script, et par les moteurs). */
export function Faq({ items, className }: { items: Array<{ q: string; a: string }>; className?: string }) {
  return (
    <div className={cx('site-faq glass-panel divide-y divide-slate-900/5 rounded-[32px] px-5 sm:px-8 dark:divide-white/5', className)}>
      {items.map((item) => (
        <details key={item.q} className="group py-1">
          <summary className="flex min-h-16 items-center justify-between gap-4 py-3 text-left text-lg font-black tracking-tight text-slate-900 dark:text-white">
            {item.q}
            <span className="site-faq-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900/5 text-slate-600 dark:bg-white/10 dark:text-slate-300">
              <Plus className="h-4 w-4" aria-hidden />
            </span>
          </summary>
          <p className="pb-5 text-base leading-relaxed font-medium text-slate-600 dark:text-slate-300">{item.a}</p>
        </details>
      ))}
    </div>
  )
}

/** Une boucle du produit dans un cadre de verre (tablette posée sur le fond). */
export function LoopFrame({ loop, label, lang, priority, className }: { loop: LoopKey; label: string; lang: SiteLang; priority?: boolean; className?: string }) {
  const t = content(lang)
  return (
    <div
      className={cx(
        'site-frame rounded-[30px] border border-white/70 bg-white/40 p-2 shadow-[0_40px_90px_-35px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:rounded-[36px] sm:p-2.5 dark:border-white/10 dark:bg-slate-800/40',
        className,
      )}
    >
      <LoopVideo loop={LOOPS[loop]} label={label} labels={{ pause: t.a11y.pause, play: t.a11y.play }} priority={priority} className="aspect-video rounded-[22px] sm:rounded-[28px]" />
    </div>
  )
}

/** Le bandeau d'appel final : la photo de l'usine, le bouton principal, un lien secondaire. */
export function FinalCta({ lang, title, text, secondary }: { lang: SiteLang; title: string; text: string; secondary?: { href: string; label: string } }) {
  const t = content(lang)
  const photo = PHOTOS.plant
  return (
    <section className="py-16 sm:py-24">
      <Container wide>
        <div className="site-reveal relative isolate overflow-hidden rounded-[40px] px-6 py-16 text-center sm:px-12 sm:py-24">
          <Image src={photo.src} alt="" fill sizes="(min-width: 1280px) 1216px, 100vw" className="-z-20 object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-950/90 via-slate-950/75 to-[#0056d6]/70" aria-hidden />
          <h2 className="mx-auto max-w-3xl text-[2rem] leading-[1.04] font-black tracking-tighter text-balance text-white sm:text-6xl">{title}</h2>
          <p className="mx-auto mt-5 max-w-xl text-lg font-medium text-white/85 sm:text-xl">{text}</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryCta cta={primaryCta(lang)} labels={t.cta} size="lg" />
            {secondary && (
              <ButtonLink href={secondary.href} tone="light" size="lg">
                {secondary.label}
              </ButtonLink>
            )}
          </div>
        </div>
      </Container>
    </section>
  )
}

/** Une photo d'illustration dans une carte arrondie, avec une étiquette de verre. */
export function PhotoCard({ photo, alt, tag, className, priority, sizes }: { photo: keyof typeof PHOTOS; alt: string; tag?: ReactNode; className?: string; priority?: boolean; sizes?: string }) {
  const p = PHOTOS[photo]
  return (
    <div className={cx('relative overflow-hidden rounded-[32px] shadow-[0_40px_90px_-35px_rgba(15,23,42,0.5)] sm:rounded-[40px]', className)}>
      <Image src={p.src} alt={alt} width={p.width} height={p.height} preload={priority} sizes={sizes ?? '(min-width: 1024px) 50vw, 100vw'} className="h-full w-full object-cover" />
      {tag && <div className="glass-float absolute bottom-4 left-4 max-w-[80%] rounded-2xl px-4 py-3 text-sm font-black text-slate-900 dark:text-white">{tag}</div>}
    </div>
  )
}

const ENERGY_TILE: Record<string, string> = { electric: 'bg-yellow-400 text-slate-900', pneumatic: 'bg-sky-500 text-white' }

/**
 * La fiche de cadenassage telle que l'opérateur la voit au poste (`Player`, vue d'ensemble d'une
 * fiche `lockout`) : en maquette, avec les mots du dictionnaire du site.
 */
export function LockoutSheet({ lang }: { lang: SiteLang }) {
  const s = content(lang).demo.lockout
  return (
    <div className="glass-panel rounded-[32px] p-5 sm:p-7">
      <p className="text-2xl leading-tight font-black tracking-tighter text-slate-900 sm:text-3xl dark:text-white">{s.title}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="glass-card inline-flex h-11 items-center gap-2 rounded-2xl px-4 font-black text-slate-800 dark:text-slate-100">
          <Layers className="h-5 w-5 text-[var(--primary)]" aria-hidden />
          {fmt(s.steps, { count: 4 })}
        </span>
        <span className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-br from-[#FF2B5E] to-[#FF6B00] px-4 font-black text-white">
          <Lock className="h-5 w-5" aria-hidden />
          {fmt(s.locks, { count: s.points.length })}
        </span>
      </div>
      <p className="label-caps mt-6 text-slate-500 dark:text-slate-400">{s.ppeTitle}</p>
      <div className="mt-2 flex flex-wrap gap-3">
        {s.ppe.map((p, i) => {
          const Icon = i === 0 ? Glasses : Hand
          return (
            <span
              key={p}
              className="flex min-w-24 flex-col items-center gap-2 rounded-[24px] bg-gradient-to-br from-[#2563eb] to-[#0ea5e9] p-3 text-center text-white shadow-[0_12px_30px_rgba(37,99,235,0.3)]"
            >
              <Icon className="h-8 w-8" aria-hidden />
              <span className="text-sm leading-tight font-black">{p}</span>
            </span>
          )
        })}
      </div>
      <div className="mt-5 rounded-[24px] bg-gradient-to-br from-[#FF2B5E] to-[#FF6B00] p-4 text-white shadow-[0_15px_35px_rgba(255,43,94,0.3)]">
        <p className="label-caps flex items-center gap-2 opacity-90">
          <ShieldAlert className="h-4 w-4" aria-hidden />
          {s.safetyTitle}
        </p>
        <p className="mt-1 text-lg leading-snug font-black">{s.safety}</p>
      </div>
      <p className="label-caps mt-6 text-slate-500 dark:text-slate-400">{s.energyTitle}</p>
      <div className="mt-2 grid gap-3">
        {s.points.map((e) => (
          <div key={e.tag} className="glass-card flex items-start gap-3 rounded-[22px] p-4">
            <span className={cx('flex h-14 min-w-14 items-center justify-center rounded-2xl px-2 text-lg font-black', ENERGY_TILE[e.type] ?? 'bg-slate-500 text-white')}>{e.tag}</span>
            <div className="min-w-0 text-sm font-bold text-slate-700 dark:text-slate-200">
              <p className="text-base font-black text-slate-900 dark:text-white">{e.name}</p>
              <p>{e.description}</p>
              <p className="mt-1">
                <span className="opacity-60">{s.device}</span> {e.device} — {e.location}
              </p>
              <p>
                <span className="opacity-60">{s.verify}</span> {e.verify}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="label-caps mt-6 flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
        {s.restartTitle}
      </p>
      <ol className="mt-2 space-y-2">
        {s.restart.map((r, i) => (
          <li key={r} className="flex items-center gap-3 text-[15px] font-bold text-slate-700 dark:text-slate-200">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white tabular-nums dark:bg-white dark:text-slate-900">{i + 1}</span>
            {r}
          </li>
        ))}
      </ol>
    </div>
  )
}

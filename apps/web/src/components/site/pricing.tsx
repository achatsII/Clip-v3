/**
 * Les forfaits du site (composants serveur), tirés du manifeste : cartes, tableau comparatif, modules,
 * prix en crédits des opérations d'IA. Les deux prix (mensuel et annuel) sont dans la page ;
 * `IntervalToggle` choisit celui qui se montre. Aucun prix, forfait ni quantité écrit ici.
 */
import { Check, Minus, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { FEATURE_ORDER, type FeatureKey } from '@/lib/billing/catalog'
import { loadMessages, type Messages } from '@/lib/i18n/core'
import type { PlanInterval } from '@/lib/billing/intent'
import { content, listOf, planName } from '@/lib/site/content'
import { fmt, siteNum, type SiteLang } from '@/lib/site/lang'
import { formatPrice, LIMIT_KEYS, priceOf, siteCatalog, type SitePlan } from '@/lib/site/pricing'
import { pathOf, planCta, ROUTES } from '@/lib/site/routes'
import { ButtonLink, cx, type ButtonTone } from './ui'

/** Les features oui-ou-non montrées dans les forfaits (les modules ont leur propre section). */
const MODULE_FEATURES = new Set<FeatureKey>(['academy', 'records_plus'])
const BOOLEAN_FEATURES = FEATURE_ORDER.filter((k) => k !== 'ai_credits' && !(LIMIT_KEYS as readonly string[]).includes(k) && !MODULE_FEATURES.has(k))

// Le nom de chaque fonction : celui de l'app, dans la langue de la page (`billing.feature`, chargé au serveur).
const label = (key: FeatureKey, words: Messages) => words.billing.feature[key]

// La quantité d'une limite : la phrase de l'app (`billing.count`, le bon pluriel dans chaque langue).
function limitLine(plan: SitePlan, key: (typeof LIMIT_KEYS)[number], lang: SiteLang, words: Messages): string {
  const t = content(lang)
  const v = plan.limits[key]
  if (v === null) return t.limitsUnlimited[key] ?? ''
  return words.billing.count[key](v)
}

function PriceBlock({ plan, lang, featured }: { plan: SitePlan; lang: SiteLang; featured: boolean }) {
  const t = content(lang).pricing
  // Le forfait gratuit n'a pas de prix au manifeste : zéro, dans la devise des autres forfaits.
  const currency = siteCatalog().plans.find((p) => p.paid)?.prices[0]?.currency ?? 'CAD'
  const muted = featured ? 'text-white/75' : 'text-slate-500 dark:text-slate-400'
  if (plan.quote)
    return (
      <div className="mt-5">
        <p className="text-4xl font-black tracking-tighter">{t.quote}</p>
        <p className={cx('mt-1 text-sm font-bold', muted)}>{t.quoteNote}</p>
      </div>
    )
  if (!plan.paid)
    return (
      <div className="mt-5">
        <p className="text-4xl font-black tracking-tighter tabular-nums">
          {formatPrice(0, currency, lang)}
          <span className={cx('ml-1 text-base font-bold tracking-normal', muted)}>{t.perMonth}</span>
        </p>
        <p className={cx('mt-1 text-sm font-bold', muted)}>{t.freeForever}</p>
      </div>
    )
  return (
    <div className="mt-5">
      {(['month', 'year'] as PlanInterval[]).map((interval) => {
        const p = priceOf(plan, interval)
        if (!p) return null
        return (
          <div key={interval} className={interval === 'month' ? 'site-when-month' : 'site-when-year'}>
            <p className="text-4xl font-black tracking-tighter tabular-nums">
              {formatPrice(p.amountCents, p.currency, lang)}
              <span className={cx('ml-1 text-base font-bold tracking-normal', muted)}>{interval === 'month' ? t.perMonth : t.perYear}</span>
            </p>
            <p className={cx('mt-1 text-sm font-bold', muted)}>{interval === 'month' ? t.billedMonthly : t.billedYearly}</p>
          </div>
        )
      })}
    </div>
  )
}

function PlanButton({ plan, lang, featured }: { plan: SitePlan; lang: SiteLang; featured: boolean }) {
  const t = content(lang)
  const name = planName(plan.code, lang)
  const tone: ButtonTone = featured ? 'light' : 'glass'
  // Sur devis : on en parle, rien ne s'achète.
  if (plan.quote)
    return (
      <ButtonLink href={pathOf('book', lang)} tone={featured ? 'light' : 'dark'} size="lg" className="w-full" arrow>
        {t.pricing.contact}
      </ButtonLink>
    )
  return (
    <>
      {(['month', 'year'] as PlanInterval[]).map((interval) => {
        const cta = planCta(lang, { code: plan.code, paid: plan.paid, interval })
        const text = cta.kind === 'book' ? t.cta.book : plan.paid ? fmt(t.pricing.choose, { plan: name }) : t.pricing.start
        return (
          <ButtonLink key={interval} href={cta.href} app={cta.app} tone={tone} size="lg" className={cx('w-full', interval === 'month' ? 'site-when-month' : 'site-when-year')} arrow>
            {text}
          </ButtonLink>
        )
      })}
    </>
  )
}

/** Les cartes des forfaits ; le forfait sur devis en dernier (on en parle avec l'équipe). */
export async function PlanCards({ lang, compact }: { lang: SiteLang; compact?: boolean }) {
  const words = await loadMessages(lang)
  const t = content(lang)
  const c = siteCatalog()
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {c.plans.map((plan, i) => {
          const featured = plan.featured
          const previous = i > 0 ? c.plans[i - 1] : null
          const gained = BOOLEAN_FEATURES.filter((k) => plan.features[k] && !(previous?.features[k] ?? false))
          return (
            <div
              key={plan.code}
              className={cx(
                'site-reveal relative flex flex-col overflow-hidden rounded-[32px] p-6',
                featured ? 'bg-gradient-primary shadow-primary text-white' : 'glass-panel text-slate-900 dark:text-white',
              )}
            >
              {featured && <span className="grid-pattern absolute inset-0 opacity-40" aria-hidden />}
              <div className="relative flex flex-1 flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-2xl font-black tracking-tight">{planName(plan.code, lang)}</h3>
                  {featured && (
                    <span className="label-caps inline-flex shrink-0 items-center gap-1 rounded-xl bg-white/20 px-2 py-1 text-[10px]">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      {t.pricing.featured}
                    </span>
                  )}
                </div>
                {t.planPitch[plan.code] && <p className={cx('mt-1.5 text-sm leading-snug font-bold', featured ? 'text-white/85' : 'text-slate-500 dark:text-slate-400')}>{t.planPitch[plan.code]}</p>}
                <PriceBlock plan={plan} lang={lang} featured={featured} />
                {!compact && (
                  <>
                    <ul className="mt-5 space-y-2 text-sm font-bold">
                      <li className="flex items-start gap-2">
                        <Check className={cx('mt-0.5 h-4 w-4 shrink-0', featured ? 'text-white' : 'text-emerald-500')} strokeWidth={3} aria-hidden />
                        {fmt(t.pricing.credits, { credits: siteNum(plan.credits, lang) })}
                      </li>
                      {LIMIT_KEYS.map((k) => (
                        <li key={k} className="flex items-start gap-2">
                          <Check className={cx('mt-0.5 h-4 w-4 shrink-0', featured ? 'text-white' : 'text-emerald-500')} strokeWidth={3} aria-hidden />
                          {limitLine(plan, k, lang, words)}
                        </li>
                      ))}
                    </ul>
                    {gained.length > 0 && (
                      <>
                        {previous && (
                          <p className={cx('label-caps mt-5 text-[10px]', featured ? 'text-white/80' : 'text-slate-500 dark:text-slate-400')}>
                            {fmt(t.pricing.everythingIn, { plan: planName(previous.code, lang) })}
                          </p>
                        )}
                        <ul className="mt-2 space-y-2 text-sm font-bold">
                          {gained.map((k) => (
                            <li key={k} className="flex items-start gap-2">
                              <Check className={cx('mt-0.5 h-4 w-4 shrink-0', featured ? 'text-white' : 'text-[var(--primary)]')} strokeWidth={3} aria-hidden />
                              {label(k, words)}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </>
                )}
                {!compact && (
                  <div className="mt-auto pt-6">
                    <PlanButton plan={plan} lang={lang} featured={featured} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

/** Le tableau comparatif (à partir de la tablette ; au téléphone, les cartes disent déjà tout). */
export async function CompareTable({ lang }: { lang: SiteLang }) {
  const words = await loadMessages(lang)
  const t = content(lang)
  const c = siteCatalog()
  const yes = (
    <>
      <Check className="mx-auto h-5 w-5 text-emerald-500" strokeWidth={3} aria-hidden />
      <span className="sr-only">{t.a11y.included}</span>
    </>
  )
  const no = (
    <>
      <Minus className="mx-auto h-5 w-5 text-slate-300 dark:text-slate-600" aria-hidden />
      <span className="sr-only">{t.a11y.notIncluded}</span>
    </>
  )
  const rows: Array<{ key: FeatureKey; cells: React.ReactNode[] }> = [
    {
      key: 'ai_credits',
      cells: c.plans.map((p) => (
        <span key={p.code} className="tabular-nums">
          {siteNum(p.credits, lang)}
        </span>
      )),
    },
    ...LIMIT_KEYS.map((k) => ({
      key: k as FeatureKey,
      cells: c.plans.map((p) => (
        <span key={p.code} className="tabular-nums">
          {p.limits[k] === null ? t.unlimitedCell[k] : siteNum(p.limits[k] as number, lang)}
        </span>
      )),
    })),
    ...BOOLEAN_FEATURES.map((k) => ({ key: k, cells: c.plans.map((p) => (p.features[k] ? yes : no)) })),
  ]
  return (
    <div className="glass-panel hidden overflow-hidden rounded-[32px] md:block">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{t.pricing.compare.title}</caption>
        <thead>
          <tr className="border-b border-slate-900/5 dark:border-white/5">
            <th scope="col" className="p-5 text-sm font-black text-slate-500 dark:text-slate-400">
              {t.pricing.compare.feature}
            </th>
            {c.plans.map((p) => (
              <th key={p.code} scope="col" className={cx('p-5 text-center text-base font-black', p.featured ? 'text-[var(--primary-strong)] dark:text-[var(--primary-light)]' : 'text-slate-900 dark:text-white')}>
                {planName(p.code, lang)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-slate-900/5 last:border-0 dark:border-white/5">
              <th scope="row" className="p-4 pl-5 text-[15px] font-bold text-slate-700 dark:text-slate-200">
                {label(row.key, words)}
              </th>
              {row.cells.map((cell, i) => (
                <td key={c.plans[i]?.code ?? i} className={cx('p-4 text-center text-[15px] font-black text-slate-900 dark:text-white', c.plans[i]?.featured && 'bg-[var(--primary-soft)]/60')}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Les modules en option (Académie, Relevés) : leur prix selon le forfait de base. */
export function ModuleCards({ lang }: { lang: SiteLang }) {
  const t = content(lang)
  const c = siteCatalog()
  const features = [...new Set(c.modules.map((m) => m.feature))]
  const more: Partial<Record<FeatureKey, string>> = { academy: ROUTES.training[lang], records_plus: ROUTES.features[lang] }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {features.map((feature, i) => {
        const text = t.modules[feature]
        const variants = c.modules.filter((m) => m.feature === feature)
        if (!text) return null
        return (
          <div
            key={feature}
            className={cx(
              'site-reveal relative overflow-hidden rounded-[32px] p-6 text-white sm:p-8',
              i % 2 ? 'bg-gradient-to-br from-[#3ee0a1] to-[#10a96d] shadow-[0_15px_35px_rgba(24,196,128,0.3)]' : 'bg-gradient-accent shadow-accent',
            )}
          >
            <span className="grid-pattern absolute inset-0 opacity-40" aria-hidden />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-3xl font-black tracking-tighter">{text.name}</h3>
                <span className="label-caps rounded-xl bg-white/20 px-2.5 py-1 text-[10px]">{t.pricing.quote}</span>
              </div>
              <p className="mt-2 text-lg font-bold text-white/90">{text.pitch}</p>
              <ul className="mt-5 space-y-2 text-[15px] font-bold">
                {text.points.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={3} aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
              {/* Sur devis, avec le forfait qui les reçoit : l'équipe de Clip les ajoute à l'abonnement de l'usine. */}
              <p className="mt-6 rounded-[22px] bg-white/15 p-4 text-[15px] font-black">{fmt(t.pricing.modules.withPlan, { plan: listOf([...new Set(variants.map((m) => planName(m.basePlan, lang)))], lang) })}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                <ButtonLink href={pathOf('book', lang)} tone="light" size="lg" arrow>
                  {t.pricing.contact}
                </ButtonLink>
                {more[feature] && (
                  <Link href={more[feature] as string} className="inline-flex min-h-11 items-center gap-1 text-sm font-black underline underline-offset-4">
                    {feature === 'academy' ? t.solutions.training.menu : t.cta.features}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Les crédits d'IA : comment ils se dépensent (au coût réel, après chaque réponse ; aucun prix fixe
 * ni estimation), et la banque de chaque forfait.
 */
export function CreditsTable({ lang }: { lang: SiteLang }) {
  const t = content(lang)
  const c = siteCatalog()
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
      <ul className="glass-panel space-y-4 rounded-[32px] p-6 sm:p-8">
        {t.pricing.creditsInfo.how.map((line) => (
          <li key={line} className="flex items-start gap-3 text-[15px] font-bold text-slate-700 dark:text-slate-200">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden />
            {line}
          </li>
        ))}
      </ul>
      <div className="bg-gradient-accent shadow-accent relative overflow-hidden rounded-[32px] p-6 text-white sm:p-8">
        <span className="grid-pattern absolute inset-0 opacity-40" aria-hidden />
        <div className="relative">
          <p className="label-caps text-white/80">{t.pricing.creditsInfo.perMonthTitle}</p>
          <ul className="mt-4 space-y-3">
            {c.plans.map((p) => (
              <li key={p.code} className="text-lg font-black">
                {planName(p.code, lang)} · <span className="tabular-nums">{fmt(t.pricing.credits, { credits: siteNum(p.credits, lang) })}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

import { notFound } from 'next/navigation'
import { PRODUCT } from '@/lib/brand/product'
import type { SiteLang } from '@/lib/site/lang'
import { privacyText } from '@/lib/site/privacy'
import { Container } from '../ui'

/** La politique de confidentialité de la marque publique (CLIP renvoie à celle de son entreprise). */
export function PrivacyPage({ lang }: { lang: SiteLang }) {
  if (PRODUCT.company) notFound()
  const t = privacyText(lang === 'fr' ? 'fr' : 'en', PRODUCT)
  return (
    <Container className="py-14 sm:py-20">
      <article className="mx-auto max-w-3xl" lang={lang === 'fr' ? 'fr-CA' : 'en'}>
        <h1 className="text-4xl font-black tracking-tighter text-slate-900 sm:text-5xl dark:text-white">{t.title}</h1>
        <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">{t.updated}</p>
        <p className="mt-6 text-lg leading-relaxed font-medium text-slate-700 dark:text-slate-200">{t.intro}</p>
        {t.sections.map((s) => (
          <section key={s.title} className="mt-10">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{s.title}</h2>
            {s.paragraphs.map((x) => (
              <p key={x} className="mt-3 leading-relaxed font-medium text-slate-700 dark:text-slate-300">
                {x}
              </p>
            ))}
          </section>
        ))}
      </article>
    </Container>
  )
}

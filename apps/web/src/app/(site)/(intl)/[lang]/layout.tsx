import { SiteShell } from '@/components/site/SiteChrome'
import { intlLang } from '@/lib/site/intl'
import { INTL_LANGS } from '@/lib/site/lang'

/**
 * Les pages du site dans les autres langues (espagnol, portugais, allemand…), sous /<langue>, avec les
 * slugs anglais. Statiques : une page par langue, rien d'autre (`dynamicParams = false` : /xx répond 404).
 */
export const dynamicParams = false
export const generateStaticParams = () => INTL_LANGS.map((lang) => ({ lang }))

export default async function IntlSiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  return <SiteShell lang={intlLang((await params).lang)}>{children}</SiteShell>
}

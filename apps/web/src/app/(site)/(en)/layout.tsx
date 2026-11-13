import { SiteShell } from '@/components/site/SiteChrome'

/** Les pages anglaises du site, sous /en (slugs traduits). Le contenu porte `lang="en"`. */
export default function EnglishSiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell lang="en">{children}</SiteShell>
}

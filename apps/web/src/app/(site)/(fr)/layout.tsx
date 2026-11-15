import { SiteShell } from '@/components/site/SiteChrome'

/** Les pages françaises du site (la langue par défaut, à la racine). */
export default function FrenchSiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell lang="fr">{children}</SiteShell>
}

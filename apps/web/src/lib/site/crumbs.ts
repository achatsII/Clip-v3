/**
 * Le fil d'Ariane d'une page : l'accueil, puis la page. Le même à l'écran (`Breadcrumbs`) et dans
 * les données structurées (`breadcrumbLd`) ; il n'y a pas de page « Solutions » à part entière.
 */
import { content } from './content'
import type { SiteLang } from './lang'
import { pageLabel, ROUTES, type PageKey } from './routes'

export interface Crumb {
  name: string
  path: string
}

export function crumbsFor(lang: SiteLang, page: PageKey): Crumb[] {
  const t = content(lang)
  const home = { name: t.breadcrumb.home, path: ROUTES.home[lang] }
  return page === 'home' ? [home] : [home, { name: pageLabel(page, t), path: ROUTES[page][lang] }]
}

/**
 * L'intercepteur de requêtes (Next 16 : « proxy », environnement Node) de l'espace Découvrir — rien d'autre
 * de Clip ne passe ici. `DECOUVRIR_ACCES` absent ou « ouvert » : l'espace reste public, l'écran d'entrée
 * renvoie à `/decouvrir` et l'API de l'espace répond 404. « sandboxes » : sans session Découvrir valide,
 * l'écran d'entrée (courriel prérempli, suite, message si l'accès a pris fin). Lecture du cookie seulement,
 * aucun appel réseau : la revérification de l'accès (15 minutes) se fait dans les routes /api/decouvrir/*,
 * qui vérifient elles-mêmes la session. Les fichiers (vidéos, affiches, sous-titres) restent publics.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { gate } from '@/lib/decouvrir/server/access'
import { accessMode } from '@/lib/decouvrir/server/config'
import { DECOUVRIR_COOKIE, openSession } from '@/lib/decouvrir/server/session'

export function proxy(req: NextRequest) {
  const mode = accessMode()
  const page = !req.nextUrl.pathname.startsWith('/api/')
  const session = mode === 'sandboxes' && page ? openSession(req.cookies.get(DECOUVRIR_COOKIE)?.value) : null
  const decision = gate({ mode, pathname: req.nextUrl.pathname, search: req.nextUrl.search, session, now: Date.now() })
  if (decision.kind === 'absent') return NextResponse.json({ ok: false, raison: 'inactif' }, { status: 404 })
  const res = decision.kind === 'next' ? NextResponse.next() : NextResponse.redirect(new URL(decision.location, req.url))
  if (decision.clear) res.cookies.delete(DECOUVRIR_COOKIE)
  return res
}

export const config = {
  // /decouvrir et ses pages, sans les fichiers (vidéos, affiches, sous-titres) ; l'API de l'espace.
  matcher: ['/decouvrir', '/decouvrir/((?!videos/)[^.]*)', '/api/decouvrir/:path*'],
}

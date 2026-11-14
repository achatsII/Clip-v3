/**
 * Le suivi de l'espace Découvrir vers Sandboxes (POST /api/v1/suivi) : les gestes du navigateur, vérifiés
 * un à un, avec la personne tirée de la session (jamais du navigateur). Au plus 100 événements et 64 Ko par
 * appel. Réponses : 200 reçu ; 422 quand Sandboxes a refusé la forme (réessayer ne servirait à rien) ; 502
 * sinon, que le navigateur réessaie. Sans Sandboxes configuré : 200, rien d'envoyé.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { cleanEvents, isVisitId, MAX_BATCH_BYTES } from '@/lib/decouvrir/contract'
import { personOf, relay } from '@/lib/decouvrir/server/access'
import { inactive, isLinked, readJson, withDecouvrir } from '@/lib/decouvrir/server/route'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isLinked()) return inactive()
  const read = await readJson(req, MAX_BATCH_BYTES)
  if (!read.ok) return NextResponse.json({ ok: false }, { status: read.status })
  const body = (read.body ?? {}) as { session?: unknown; evenements?: unknown }
  return withDecouvrir(req, async ({ session, deps }) => {
    const evenements = cleanEvents(body.evenements, deps.now())
    if (!evenements.length) return NextResponse.json({ ok: true, recus: 0 })
    const visite = isVisitId(body.session) ? body.session : `s_${deps.now().toString(36)}`
    const r = await relay('POST', '/api/v1/suivi', { personne: personOf(session), session: visite, evenements }, deps)
    if (r.kind === 'absent') return NextResponse.json({ ok: true, recus: 0, relie: false })
    if (r.kind === 'ok') return NextResponse.json({ ok: true, recus: typeof r.json?.recus === 'number' ? r.json.recus : evenements.length })
    return NextResponse.json({ ok: false }, { status: r.status === 400 || r.status === 413 ? 422 : 502 })
  })
}

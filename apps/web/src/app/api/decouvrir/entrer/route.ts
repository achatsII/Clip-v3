/**
 * Entrer dans l'espace Découvrir (interrupteur allumé) : l'application de Clip si elle existe, sinon
 * `sandboxes` et Sandboxes (`src/lib/decouvrir/server/access.ts`). Pose seulement le cookie `clip_decouvrir` :
 * jamais une session de Clip. Répond une raison (`identifiants`, `aucun_acces`, `expire`, `indisponible`),
 * que l'écran d'entrée traduit.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { publicInfo, signIn } from '@/lib/decouvrir/server/access'
import { decouvrirDeps, inactive, isLinked, readJson, setDecouvrirCookie } from '@/lib/decouvrir/server/route'

export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'no-store' }

export async function POST(req: NextRequest) {
  if (!isLinked()) return inactive()
  const read = await readJson(req, 8 * 1024)
  if (!read.ok) return NextResponse.json({ ok: false, raison: 'requete' }, { status: read.status, headers: noStore })
  const body = (read.body ?? {}) as { courriel?: unknown; motDePasse?: unknown }
  const courriel = String(body.courriel ?? '').trim().slice(0, 320)
  const motDePasse = String(body.motDePasse ?? '').slice(0, 512)
  if (!courriel || !motDePasse) return NextResponse.json({ ok: false, raison: 'requete' }, { status: 400, headers: noStore })
  const r = await signIn(courriel, motDePasse, decouvrirDeps())
  if (!r.ok) return NextResponse.json({ ok: false, raison: r.raison, ...(r.fin ? { fin: r.fin } : {}) }, { status: r.status, headers: noStore })
  const res = NextResponse.json({ ok: true, session: publicInfo(r.session) }, { headers: noStore })
  // Sans SESSION_SECRET, la session ne peut pas se garder : la connexion « ne répond pas », sans détail technique.
  if (!setDecouvrirCookie(res, r.session)) return NextResponse.json({ ok: false, raison: 'indisponible' }, { status: 503, headers: noStore })
  return res
}

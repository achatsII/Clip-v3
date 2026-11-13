/** La session de l'espace Découvrir : ce que le navigateur peut en savoir (revérifiée au besoin), et la sortie. */
import { NextResponse, type NextRequest } from 'next/server'
import { publicInfo } from '@/lib/decouvrir/server/access'
import { inactive, isLinked, withDecouvrir } from '@/lib/decouvrir/server/route'
import { DECOUVRIR_COOKIE } from '@/lib/decouvrir/server/session'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return withDecouvrir(req, async ({ session }) => NextResponse.json({ ok: true, session: publicInfo(session) }))
}

/** Se déconnecter : le cookie est effacé (la passerelle ne révoque pas les jetons ; ils expirent d'eux-mêmes). */
export async function DELETE() {
  if (!isLinked()) return inactive()
  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  res.cookies.delete(DECOUVRIR_COOKIE)
  return res
}

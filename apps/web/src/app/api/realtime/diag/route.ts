/**
 * Le diagnostic du direct : un appareil où le temps réel ne passe pas dit pourquoi (état, message et
 * code d'Ably, navigateur), une fois par page. Rien de personnel : ni compte, ni usine, ni contenu.
 * Lu dans les journaux du serveur (Vercel) pour trouver ce qui bloque sur un réseau ou un appareil.
 */
import { NextResponse, type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const cut = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : typeof v === 'boolean' || typeof v === 'number' ? v : undefined)

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return new NextResponse(null, { status: 400 })
  console.warn(
    '[realtime-diag]',
    JSON.stringify({
      state: cut(body.state, 20),
      reason: cut(body.reason, 300),
      available: cut(body.available, 5),
      hasOrg: cut(body.hasOrg, 5),
      via: cut(body.via, 10),
      ua: cut(req.headers.get('user-agent'), 160),
    }),
  )
  return new NextResponse(null, { status: 204 })
}

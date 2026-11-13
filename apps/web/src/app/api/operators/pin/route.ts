/**
 * Donne un nouveau code à 4 chiffres à une personne (Équipe › « Nouveau code »).
 *
 * Seul un administrateur de l'usine le peut. Le code est tiré au hasard ici, son empreinte (jamais le
 * code) s'écrit dans la fiche de la personne avec le jeton de l'administrateur, et le code revient
 * une seule fois, pour qu'il le remette à la personne. Un refus rend un code d'erreur, jamais une
 * phrase : la page le dit dans la langue de l'outil.
 */
import { randomInt } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { ROLES } from '@/lib/model/catalog'
import { T } from '@/lib/model/repo'
import { roleOf } from '@/lib/model/roles'
import type { Operator, OrgSettings } from '@/lib/model/types'
import { bearer, dataWith, gatewayJson } from '@/lib/server/gateway'
import { currentKeyId, hashPin, randomPin } from '@/lib/server/operators'

export const dynamic = 'force-dynamic'

const OBJECT_ID = /^[0-9a-f]{24}$/i

interface Me {
  user?: { sub?: string }
  results?: { email?: string }
}
interface OrgMe {
  organization?: { role?: string }
}

export async function POST(req: NextRequest) {
  const token = bearer(req.headers.get('authorization'))
  if (!token) return NextResponse.json({ error: 'authRequired' }, { status: 401 })
  if (!currentKeyId()) return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  const body = (await req.json().catch(() => ({}))) as { operatorId?: string }
  const operatorId = body.operatorId ?? ''
  if (!OBJECT_ID.test(operatorId)) return NextResponse.json({ error: 'badRequest' }, { status: 400 })

  // Qui demande, et a-t-il le droit de gérer les postes de l'usine ?
  const [me, orgMe] = await Promise.all([gatewayJson<Me>('/api/v1/auth/me', token), gatewayJson<OrgMe>('/api/v1/org/me', token)])
  const userId = me?.user?.sub
  if (!userId) return NextResponse.json({ error: 'authRequired' }, { status: 401 })
  const data = dataWith(token)
  const org = (await data.filter<OrgSettings>(T.org, { sort: { _id: 1 }, limit: 1 }).catch(() => []))[0]
  if (!org) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const role = roleOf(org.json_data, { userId, email: me?.results?.email ?? '', orgRole: orgMe?.organization?.role ?? null })
  if (ROLES[role].permissions.stations !== 'write') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const op = await data.get<Operator>(T.operator, operatorId).catch(() => null)
  if (!op) return NextResponse.json({ error: 'unknown' }, { status: 404 })
  const pin = randomPin(() => randomInt(0, 10_000) / 10_000)
  const pinHash = hashPin(operatorId, pin)
  if (!pinHash) return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  const pinSetAt = new Date().toISOString()
  try {
    await data.patch(T.operator, operatorId, { pinHash, pinSetAt })
  } catch {
    return NextResponse.json({ error: 'saveFailed' }, { status: 502 })
  }
  return NextResponse.json({ pin, pinSetAt }, { headers: { 'Cache-Control': 'no-store' } })
}

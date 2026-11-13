/**
 * Au poste, « Qui êtes-vous ? » : vérifie le code à 4 chiffres d'une personne.
 *
 * Le serveur échange lui-même le lien du poste (il ne croit pas le navigateur sur l'usine ni sur la
 * portée), lit la fiche de la personne avec le jeton invité de ce lien, compare le code à son
 * empreinte, et rend une session signée pour ce poste, valable 12 heures au plus. Cinq essais ratés
 * de suite bloquent ce nom à ce poste pendant 10 minutes.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { T } from '@/lib/model/repo'
import type { Operator } from '@/lib/model/types'
import { dataWith, gatewayJson } from '@/lib/server/gateway'
import { checkPin, currentKeyId, lockedUntil, MAX_TRIES, noteFailure, noteSuccess, PIN, signSession } from '@/lib/server/operators'

export const dynamic = 'force-dynamic'

const OBJECT_ID = /^[0-9a-f]{24}$/i
const LINK = /^[A-Za-z0-9_-]{6,80}$/
/** Une session au poste dure au plus un quart (12 h) ; la page la termine plus tôt quand personne n'y touche. */
const SESSION_MS = 12 * 3600_000

interface Exchange {
  access_token?: string
  data?: { organization_id?: string; scope?: { resources?: Array<{ data_type?: string; actions?: string[] }> } }
}

export async function POST(req: NextRequest) {
  if (!currentKeyId()) return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  const body = (await req.json().catch(() => ({}))) as { link?: string; operatorId?: string; pin?: string }
  const link = body.link ?? ''
  const operatorId = body.operatorId ?? ''
  const pin = body.pin ?? ''
  if (!LINK.test(link) || !OBJECT_ID.test(operatorId) || !PIN.test(pin)) return NextResponse.json({ error: 'badRequest' }, { status: 400 })

  const key = `${link}:${operatorId}`
  const until = lockedUntil(key)
  if (until) return NextResponse.json({ error: 'locked', until }, { status: 429 })

  // Le lien, échangé ici : son jeton invité, son usine, et s'il ouvre bien la liste des personnes.
  const ex = await gatewayJson<Exchange>(`/api/v1/redirect/${encodeURIComponent(link)}`, null)
  if (!ex?.access_token) return NextResponse.json({ error: 'deadLink' }, { status: 404 })
  const opens = ex.data?.scope?.resources?.some((r) => r.data_type === T.operator && r.actions?.includes('read'))
  if (!opens) return NextResponse.json({ error: 'linkOutdated' }, { status: 409 })

  const op = await dataWith(ex.access_token)
    .get<Operator>(T.operator, operatorId)
    .catch(() => null)
  if (!op || !op.json_data.active) return NextResponse.json({ error: 'unknown' }, { status: 404 })
  if (!op.json_data.pinHash) return NextResponse.json({ error: 'noPin' }, { status: 409 })

  if (!checkPin(operatorId, pin, op.json_data.pinHash)) {
    noteFailure(key)
    const locked = lockedUntil(key)
    return NextResponse.json(locked ? { error: 'locked', until: locked } : { error: 'wrongPin', tries: MAX_TRIES }, { status: locked ? 429 : 401 })
  }
  noteSuccess(key)
  const exp = Date.now() + SESSION_MS
  const session = signSession({ op: operatorId, name: op.json_data.name, link, org: ex.data?.organization_id ?? '', exp })
  if (!session) return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  return NextResponse.json({ session, operator: { id: operatorId, name: op.json_data.name }, exp }, { headers: { 'Cache-Control': 'no-store' } })
}

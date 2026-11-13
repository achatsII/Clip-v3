/**
 * Un besoin exprimé au conseiller, devenu proposition dans Sandboxes (POST /api/v1/besoins). Sans Sandboxes
 * configuré : 503, et l'écran dit que le besoin n'a pas pu être transmis (il reste dans la conversation).
 */
import { NextResponse, type NextRequest } from 'next/server'
import { cleanNeed, isConversationId } from '@/lib/decouvrir/contract'
import { personOf, relay } from '@/lib/decouvrir/server/access'
import { inactive, isLinked, readJson, withDecouvrir } from '@/lib/decouvrir/server/route'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isLinked()) return inactive()
  const read = await readJson(req, 32 * 1024)
  if (!read.ok) return NextResponse.json({ ok: false }, { status: read.status })
  const body = (read.body ?? {}) as Record<string, unknown>
  const need = cleanNeed(body)
  if (!need) return NextResponse.json({ ok: false }, { status: 400 })
  const conversationId = isConversationId(body.conversationId) ? body.conversationId : undefined
  return withDecouvrir(req, async ({ session, deps }) => {
    const r = await relay('POST', '/api/v1/besoins', { personne: personOf(session), ...(conversationId ? { conversationId } : {}), ...need }, deps)
    if (r.kind === 'ok') return NextResponse.json({ ok: true, id: typeof r.json?.id === 'string' ? r.json.id : null })
    return NextResponse.json({ ok: false, relie: r.kind !== 'absent' }, { status: r.kind === 'absent' ? 503 : 502 })
  })
}

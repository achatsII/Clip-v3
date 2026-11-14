/** Une conversation du conseiller vers Sandboxes (PUT /api/v1/conversations/:id) : le fil complet à chaque échange. */
import { NextResponse, type NextRequest } from 'next/server'
import { cleanConversation, fitConversation, isConversationId, MAX_CONVERSATION_BYTES } from '@/lib/decouvrir/contract'
import { personOf, relay } from '@/lib/decouvrir/server/access'
import { inactive, isLinked, readJson, withDecouvrir } from '@/lib/decouvrir/server/route'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isLinked()) return inactive()
  const { id } = await ctx.params
  if (!isConversationId(id)) return NextResponse.json({ ok: false }, { status: 400 })
  const read = await readJson(req, MAX_CONVERSATION_BYTES)
  if (!read.ok) return NextResponse.json({ ok: false }, { status: read.status })
  const payload = cleanConversation(read.body)
  if (!payload) return NextResponse.json({ ok: false }, { status: 400 })
  return withDecouvrir(req, async ({ session, deps }) => {
    // La personne s'ajoute : le corps reste sous la limite de Sandboxes (les plus vieux messages tombent d'abord).
    const body = fitConversation({ personne: personOf(session), ...payload })
    const r = await relay('PUT', `/api/v1/conversations/${encodeURIComponent(id)}`, body, deps)
    if (r.kind === 'absent') return NextResponse.json({ ok: true, relie: false })
    if (r.kind === 'ok') return NextResponse.json({ ok: true })
    return NextResponse.json({ ok: false }, { status: 502 })
  })
}

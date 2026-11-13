/**
 * Le relais limité de la passerelle pour le conseiller de l'espace Découvrir (interrupteur allumé) :
 * seulement l'assistant et le téléversement direct, avec les jetons de la session Découvrir. Renouvelle les
 * jetons avant leur expiration et UNE fois sur 401, avec l'application qui les a émis, et renvoie les
 * nouveaux jetons dans la même réponse. Un 402 ou un 403 passe tel quel et ne déconnecte jamais.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { gatewayRouteAllowed } from '@/lib/decouvrir/server/access'
import { inactive, isLinked, withDecouvrir } from '@/lib/decouvrir/server/route'
import { withTokens } from '@/lib/decouvrir/server/tokens'

export const dynamic = 'force-dynamic'
/** L'assistant peut prendre du temps (un document à lire). */
export const maxDuration = 120

/** Un document du conseiller : 4 Mo au plus (l'écran le dit avant l'envoi). */
const MAX_BODY_BYTES = 4.5 * 1024 * 1024

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  if (!isLinked()) return inactive()
  const { path: parts } = await ctx.params
  const path = `/${parts.map(encodeURIComponent).join('/')}`
  if (!gatewayRouteAllowed(req.method, path)) return NextResponse.json({ success: false, error: 'route' }, { status: 403 })
  const declared = Number(req.headers.get('content-length') ?? Number.NaN)
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return NextResponse.json({ success: false, error: 'trop_gros' }, { status: 413 })
  const body = await req.arrayBuffer()
  if (body.byteLength > MAX_BODY_BYTES) return NextResponse.json({ success: false, error: 'trop_gros' }, { status: 413 })
  const contentType = req.headers.get('content-type')
  return withDecouvrir(req, async ({ session, deps, update, close }) => {
    const forward = (access: string) =>
      fetch(`${deps.config.gateway}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${access}`, ...(contentType ? { 'Content-Type': contentType } : {}) },
        body: body.byteLength ? body : undefined,
        cache: 'no-store',
        signal: AbortSignal.timeout(110_000),
      })
    let s = session
    if (s.exp - deps.now() < 60_000 && s.refresh) {
      const t = await deps.refresh(s.refresh, s.app)
      if (t?.access_token) update((s = withTokens(s, t, deps.now())))
    }
    let res: Response
    try {
      res = await forward(s.access)
      if (res.status === 401) {
        const t = s.refresh ? await deps.refresh(s.refresh, s.app) : null
        if (!t?.access_token) return close('session')
        update((s = withTokens(s, t, deps.now())))
        res = await forward(s.access)
      }
    } catch {
      return NextResponse.json({ success: false, error: 'injoignable' }, { status: 502 })
    }
    return new NextResponse(res.body, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json' } })
  })
}

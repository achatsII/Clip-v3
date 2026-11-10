/**
 * Crée un lien public à portée limitée (tablette de poste, code QR, lien direct).
 *
 * La portée est bâtie ici, côté serveur, à partir du type de lien et de la ressource partagée
 * (skill api-plateforme-ii, §2.10.1) : le navigateur ne choisit jamais les données ouvertes.
 * L'appel à la Gateway part avec le jeton de l'utilisateur, qui doit déjà avoir ces droits.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { buildScope, permissionsFor, type LinkType } from '@/lib/server/scope'

const GATEWAY_URL = (process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://qa.gateway.intelligenceindustrielle.com').replace(/\/$/, '')
const SHARED_APP = (process.env.NEXT_PUBLIC_APP_IDENTIFIER || 'html') === 'html'
const OBJECT_ID = /^[0-9a-f]{24}$/i

interface Body {
  type?: LinkType
  id?: string
  mode?: 'focus' | 'only'
  assistant?: boolean
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ') || auth.length < 20) return NextResponse.json({ error: 'Connexion requise' }, { status: 401 })

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }
  const type = body.type
  const id = body.id ?? ''
  if ((type !== 'station' && type !== 'instruction') || !OBJECT_ID.test(id)) {
    return NextResponse.json({ error: 'Lien inconnu' }, { status: 400 })
  }

  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000'
  const origin = `${proto}://${host}`
  const path = type === 'station' ? 'p' : 'i'

  const res = await fetch(`${GATEWAY_URL}/api/v1/redirect/create`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redirect_url: `${origin}/${path}`,
      permissions: permissionsFor(type, !!body.assistant),
      scope: buildScope(type, id, { mode: body.mode === 'only' ? 'only' : 'focus', sharedApp: SHARED_APP, slug: 'clip-v3' }),
    }),
  }).catch(() => null)

  if (!res) return NextResponse.json({ error: 'La Gateway ne répond pas' }, { status: 502 })
  const text = await res.text()
  let json: { id?: string; error?: string } = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    /* corps non JSON */
  }
  if (!res.ok || !json.id) {
    const status = res.status === 401 || res.status === 403 ? res.status : 502
    return NextResponse.json({ error: json.error ?? 'Le lien n’a pas pu être créé' }, { status })
  }
  return NextResponse.json({ id: json.id, url: `${origin}/${path}/${json.id}` })
}

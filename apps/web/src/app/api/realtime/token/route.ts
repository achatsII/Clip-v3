/**
 * Un jeton Ably pour l'appareil d'une personne connectée, limité au canal de son organisation.
 * La personne se prouve par son jeton de la Gateway (relu par /api/v1/auth/me) : le navigateur ne
 * choisit jamais son canal. Sans ABLY_KEY, le temps réel est éteint (404) et l'app relit à intervalle.
 * Ses refus ne s'affichent jamais (src/lib/realtime/client.ts ne lit que le statut) : ils restent en français.
 */
import { Rest } from 'ably'
import { NextResponse, type NextRequest } from 'next/server'
import { orgChannel } from '@/lib/realtime/events'

const GATEWAY_URL = (process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://qa.gateway.intelligenceindustrielle.com').replace(/\/$/, '')

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const key = process.env.ABLY_KEY
  if (!key) return NextResponse.json({ error: 'Temps réel non configuré' }, { status: 404 }) // i18n-ignore : jamais montré
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ') || auth.length < 20) return NextResponse.json({ error: 'Connexion requise' }, { status: 401 })

  const me = await fetch(`${GATEWAY_URL}/api/v1/auth/me`, { headers: { Authorization: auth }, cache: 'no-store' }).catch(() => null)
  if (!me) return NextResponse.json({ error: 'La Gateway ne répond pas' }, { status: 502 }) // i18n-ignore : jamais montré
  if (!me.ok) return NextResponse.json({ error: 'Connexion requise' }, { status: 401 })
  const who = (await me.json().catch(() => null)) as { user?: { sub?: string }; results?: { organization?: { id?: string } } } | null
  const orgId = who?.results?.organization?.id
  if (!orgId) return NextResponse.json({ error: 'Aucune organisation' }, { status: 403 })

  const tokenRequest = await new Rest({ key }).auth.createTokenRequest({
    clientId: who?.user?.sub || undefined,
    capability: { [orgChannel(orgId)]: ['publish', 'subscribe', 'presence'] },
    ttl: 60 * 60 * 1000,
  })
  return NextResponse.json(tokenRequest, { headers: { 'Cache-Control': 'no-store' } })
}

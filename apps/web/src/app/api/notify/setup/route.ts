/**
 * Active les avertissements de l'usine (Réglages › Avertissements, administrateur).
 *
 * Avec le jeton de l'administrateur, le serveur crée le **lien de service** : un lien invité qui ne
 * lit que les réglages de l'usine et les fiches de contact, et qui envoie des courriels (s'il en a
 * le droit). Le serveur le scelle avec sa clé, le range dans les réglages de l'usine et sur chaque
 * poste : une tablette peut alors faire avertir les bonnes personnes sans jamais pouvoir l'ouvrir.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { SHARED_APP } from '@/lib/config'
import { ROLES } from '@/lib/model/catalog'
import { nowIso, T } from '@/lib/model/repo'
import type { NotifySettings, Station } from '@/lib/model/types'
import { callerOf } from '@/lib/server/caller'
import { bearer, dataWith, GATEWAY_URL } from '@/lib/server/gateway'
import { currentKeyId, seal } from '@/lib/server/keys'
import { canEmail, exchangeLink, NOTIFY_PURPOSE } from '@/lib/server/notify'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const token = bearer(req.headers.get('authorization'))
  if (!token) return NextResponse.json({ error: 'authRequired' }, { status: 401 })
  if (!currentKeyId()) return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  const caller = await callerOf(token)
  if (!caller) return NextResponse.json({ error: 'authRequired' }, { status: 401 })
  if (ROLES[caller.role].permissions.settings !== 'write') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const slug = SHARED_APP ? { 'json_data.app_identifier': 'clip-v3' } : {}
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000'
  const res = await fetch(`${GATEWAY_URL}/api/v1/redirect/create`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redirect_url: `${proto}://${host}/accueil`,
      permissions: ['data:read', 'communication:send_email'],
      scope: {
        resources: [
          { data_type: T.org, filter: slug, actions: ['read'] },
          { data_type: T.contact, filter: slug, actions: ['read'] },
        ],
      },
    }),
    cache: 'no-store',
  }).catch(() => null)
  const created = res?.ok ? ((await res.json().catch(() => ({}))) as { id?: string }) : {}
  if (!created.id) return NextResponse.json({ error: 'linkFailed' }, { status: 502 })

  // Le lien, vérifié tout de suite : son usine, et s'il peut envoyer des courriels.
  const ex = await exchangeLink(created.id)
  if (!ex?.org) return NextResponse.json({ error: 'linkFailed' }, { status: 502 })
  const sealed = seal({ link: created.id, org: ex.org }, NOTIFY_PURPOSE)
  if (!sealed) return NextResponse.json({ error: 'unavailable' }, { status: 503 })
  const email = canEmail(ex.ex)

  const data = dataWith(token)
  const current = caller.org.json_data.notify
  const notify: NotifySettings = {
    on: true,
    danger: current?.danger ?? true,
    deviation: current?.deviation ?? true,
    // La première fois : les administrateurs et les approbateurs sont avertis des dangers et des écarts.
    recipients: current?.recipients ?? Object.entries(caller.org.json_data.members).filter(([id, m]) => !id.startsWith('email:') && (m.role === 'admin' || m.role === 'approver')).map(([id]) => id),
    sealed,
    email,
    setAt: nowIso(),
    setByName: caller.name,
  }
  try {
    await data.patch(T.org, caller.org._id, { notify })
    const stations = await data.filter<Station>(T.station, { limit: 1000 })
    for (const s of stations) await data.patch(T.station, s._id, { notifySeal: sealed })
  } catch {
    return NextResponse.json({ error: 'saveFailed' }, { status: 502 })
  }
  return NextResponse.json({ ok: true, email }, { headers: { 'Cache-Control': 'no-store' } })
}

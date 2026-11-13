/**
 * Avertit les bonnes personnes d'un événement (toggle `notify`).
 *
 * - **Depuis l'app** (jeton de la personne) : une instruction à approuver (les approbateurs de la
 *   revue), des changements demandés ou une publication (la personne qui a demandé), un danger ou
 *   un écart (ceux que l'usine a nommés), un essai (soi-même). Le serveur lit l'instruction avec le
 *   jeton de la personne : elle ne choisit pas à qui un avertissement va, sauf pour une publication.
 * - **Depuis une tablette** (lien de poste) : un danger ou un écart. Le serveur échange lui-même le
 *   lien, lit le poste, ouvre le lien de service scellé qui y est rangé, et vérifie qu'il est de la
 *   même usine. Le texte vient de la tablette ; le nom du poste, du serveur.
 *
 * L'envoi passe toujours par le lien de service de l'usine ; au plus 30 avertissements par heure
 * pour une tablette, 60 pour une personne. Un événement sans avertissement à faire rend `sent: 0`.
 */
import { NextResponse, type NextRequest } from 'next/server'
import type { Doc } from '@/lib/gateway/data'
import { T } from '@/lib/model/repo'
import type { Instruction, NotifySettings, OrgSettings, Station } from '@/lib/model/types'
import { callerOf } from '@/lib/server/caller'
import { bearer, dataWith } from '@/lib/server/gateway'
import { allow, deliver, exchangeLink, recipientsOf, serviceToken, type Message, type NotifyKind } from '@/lib/server/notify'

export const dynamic = 'force-dynamic'

const KINDS: NotifyKind[] = ['review', 'changes', 'published', 'danger', 'deviation', 'test']
const OBJECT_ID = /^[0-9a-f]{24}$/i

interface Body {
  kind?: NotifyKind
  instructionId?: string
  /** Le lien du poste (tablette). */
  link?: string
  /** Une publication : la personne qui avait demandé l'approbation. */
  to?: string[]
  instruction?: string
  who?: string
  text?: string
}

const clip = (s: unknown, n: number) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, n) : '')

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body
  const kind = body.kind
  if (!kind || !KINDS.includes(kind)) return NextResponse.json({ error: 'badRequest' }, { status: 400 })
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000'
  const origin = `${proto}://${host}`
  const where = (path: string) => `${origin}${path}`
  const none = (reason: string) => NextResponse.json({ sent: 0, reason })

  const token = bearer(req.headers.get('authorization'))

  /* ─────────── Depuis une tablette : un danger ou un écart ─────────── */
  if (!token) {
    if (kind !== 'danger' && kind !== 'deviation') return NextResponse.json({ error: 'authRequired' }, { status: 401 })
    const link = body.link ?? ''
    if (!allow(`l:${link}`, 30)) return NextResponse.json({ error: 'tooMany' }, { status: 429 })
    const ex = await exchangeLink(link)
    if (!ex) return NextResponse.json({ error: 'deadLink' }, { status: 404 })
    const stationId = ex.ex.data?.scope?.resources?.find((r) => r.data_type === T.station)?.filter?._id
    if (typeof stationId !== 'string') return none('noStation')
    const station = await dataWith(ex.token).get<Station>(T.station, stationId).catch(() => null)
    if (!station?.json_data.notifySeal) return none('off')
    const service = await serviceToken(station.json_data.notifySeal, ex.org)
    if (!service) return none('noService')
    const org = (await dataWith(service.token).filter<OrgSettings>(T.org, { sort: { _id: 1 }, limit: 1 }).catch(() => []))[0]
    const n = org?.json_data.notify
    if (!n?.on || !n[kind]) return none('off')
    const message: Message = { kind, instruction: clip(body.instruction, 120), station: station.json_data.name, who: clip(body.who, 80), text: clip(body.text, 280), url: where(kind === 'danger' ? '/retours' : '/registre?ecarts=1') }
    return NextResponse.json({ sent: 1, ...(await deliver(service, recipientsOf(n.recipients), message)) })
  }

  /* ─────────── Depuis l'app ─────────── */
  const caller = await callerOf(token)
  if (!caller) return NextResponse.json({ error: 'authRequired' }, { status: 401 })
  if (!allow(`u:${caller.userId}`, 60)) return NextResponse.json({ error: 'tooMany' }, { status: 429 })
  const n: NotifySettings | undefined = caller.org.json_data.notify
  if (!n?.on) return none('off')
  const service = await serviceToken(n.sealed, caller.orgId)
  if (!service) return none('noService')

  if (kind === 'test') return NextResponse.json({ sent: 1, ...(await deliver(service, [caller.userId], { kind, url: where('/accueil') })) })

  if (kind === 'danger' || kind === 'deviation') {
    if (!n[kind]) return none('off')
    const message: Message = { kind, instruction: clip(body.instruction, 120), who: clip(body.who, 80) || caller.name, text: clip(body.text, 280), url: where(kind === 'danger' ? '/retours' : '/registre?ecarts=1') }
    return NextResponse.json({ sent: 1, ...(await deliver(service, recipientsOf(n.recipients, caller.userId), message)) })
  }

  // Une instruction : lue avec le jeton de la personne, pour savoir qui avertir.
  if (!OBJECT_ID.test(body.instructionId ?? '')) return NextResponse.json({ error: 'badRequest' }, { status: 400 })
  const doc: Doc<Instruction> | null = await dataWith(token).get<Instruction>(T.instruction, body.instructionId!).catch(() => null)
  if (!doc) return NextResponse.json({ error: 'unknown' }, { status: 404 })
  const i = doc.json_data
  const url = where(`/instructions/${doc._id}`)
  let to: string[] = []
  let message: Message = { kind, instruction: i.title, url }
  if (kind === 'review') {
    if (i.status !== 'review' || !i.review) return none('notInReview')
    // Les approbateurs de la revue, sinon ceux de l'usine (rôle approbateur ou administrateur).
    const named = i.review.approverIds ?? []
    const members = Object.entries(caller.org.json_data.members).filter(([, m]) => m.role === 'approver' || m.role === 'admin').map(([id]) => id)
    to = recipientsOf(named.length ? named : members, caller.userId)
    message = { ...message, who: i.review.requestedByName }
  } else if (kind === 'changes') {
    const c = i.review?.changesRequested
    if (!c) return none('noChanges')
    to = recipientsOf([i.review?.requestedBy, i.authorId], caller.userId)
    message = { ...message, who: c.byName, text: c.comment }
  } else if (kind === 'published') {
    if (i.status !== 'published') return none('notPublished')
    to = recipientsOf((body.to ?? []).slice(0, 5), caller.userId)
  }
  return NextResponse.json({ sent: 1, ...(await deliver(service, to, message)) })
}

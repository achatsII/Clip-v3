/**
 * Avertir les bonnes personnes (côté serveur, toggle `notify`). Le serveur n'a pas de jeton à lui :
 * il ouvre le **lien de service** de l'usine, créé par un administrateur et scellé avec une clé du
 * serveur (`seal`), recopié sur chaque poste. Son jeton invité ne lit que les réglages de l'usine et
 * les fiches de contact, et envoie des courriels ; les notifications passent par le service push
 * d'Expo. Personne d'autre que le serveur ne peut ouvrir le lien.
 */
import { messagesIn } from '@/lib/i18n/core'
import { T } from '@/lib/model/repo'
import type { Contact } from '@/lib/model/types'
import { dataWith, GATEWAY_URL, gatewayJson } from './gateway'
import { unseal } from './keys'

/** L'usage de la clé qui scelle le lien de service. */
export const NOTIFY_PURPOSE = 'notify-link-v1'

/** Ce que le scellé garde : le lien de service, et l'usine à laquelle il appartient. */
export interface ServiceLink {
  link: string
  org: string
}

export interface Exchange {
  access_token?: string
  data?: { organization_id?: string; permissions?: string[]; scope?: { resources?: Array<{ data_type?: string; filter?: Record<string, unknown>; actions?: string[] }> } }
}

/** Un lien échangé contre son jeton invité ; null s'il est mort. */
export async function exchangeLink(link: string): Promise<{ token: string; org: string; ex: Exchange } | null> {
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(link)) return null
  const ex = await gatewayJson<Exchange>(`/api/v1/redirect/${encodeURIComponent(link)}`, null)
  if (!ex?.access_token) return null
  return { token: ex.access_token, org: ex.data?.organization_id ?? '', ex }
}

/** Le jeton peut-il envoyer des courriels ? */
export const canEmail = (ex: Exchange) => (ex.data?.permissions ?? []).some((p) => p === 'communication:send_email' || p === 'communication:*' || p === '*')

/** Le jeton du lien de service de cette usine ; null si le scellé est faux, d'une autre usine, ou le lien mort. */
export async function serviceToken(sealed: string | null | undefined, org: string): Promise<{ token: string; email: boolean } | null> {
  const s = unseal<ServiceLink>(sealed, NOTIFY_PURPOSE)
  if (!s || !s.org || s.org !== org) return null
  const r = await exchangeLink(s.link)
  if (!r || r.org !== org) return null
  return { token: r.token, email: canEmail(r.ex) }
}

export type NotifyKind = 'review' | 'changes' | 'published' | 'danger' | 'deviation' | 'request' | 'test'

export interface Message {
  kind: NotifyKind
  /** L'instruction en cause. */
  instruction?: string
  station?: string
  who?: string
  text?: string
  /** Où l'avertissement mène, dans CLIP. */
  url: string
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Le titre et le texte d'un avertissement, dans une langue. */
export function compose(m: Message, lang: string): { title: string; body: string; html: string } {
  const t = messagesIn(lang).notify
  const instruction = (m.instruction ?? '').slice(0, 120)
  const who = (m.who ?? '').slice(0, 80)
  const text = (m.text ?? '').slice(0, 280)
  const station = (m.station ?? '').slice(0, 80)
  const [title, body] =
    m.kind === 'review'
      ? [t.review.title(instruction), t.review.body(who)]
      : m.kind === 'changes'
        ? [t.changes.title(instruction), t.changes.body(who, text)]
        : m.kind === 'published'
          ? [t.published.title(instruction), t.published.body]
          : m.kind === 'danger'
            ? [t.danger.title(station), t.danger.body(instruction, who, text)]
            : m.kind === 'deviation'
              ? [t.deviation.title(station), t.deviation.body(instruction, who, text)]
              : m.kind === 'request'
                ? [t.request.title(who, text), t.request.body(instruction)]
                : [t.test.title, t.test.body]
  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#0f172a;max-width:520px"><h2 style="margin:0 0 8px;font-size:20px">${esc(title)}</h2><p style="margin:0 0 18px;font-size:15px;color:#334155">${esc(body)}</p><a href="${esc(m.url)}" style="display:inline-block;background:#0078FF;color:#fff;text-decoration:none;font-weight:800;padding:12px 20px;border-radius:999px">${esc(t.open)}</a><p style="margin:24px 0 0;font-size:12px;color:#94a3b8">${esc(t.footer)}</p></div>`
  return { title, body, html }
}

/** Un courriel par personne (personne ne voit l'adresse des autres). */
async function sendEmail(token: string, to: string, subject: string, html: string): Promise<boolean> {
  const res = await fetch(`${GATEWAY_URL}/api/v1/communication/email`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipients: to, subject, body: html, body_type: 'html' }),
    cache: 'no-store',
  }).catch(() => null)
  return !!res?.ok
}

/** Les notifications des téléphones, par le service push d'Expo (cent à la fois au plus). */
export async function sendPush(messages: Array<{ to: string; title: string; body: string; url: string }>): Promise<number> {
  let sent = 0
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100).map((m) => ({ to: m.to, title: m.title, body: m.body, sound: 'default', data: { url: m.url } }))
    const res = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(chunk), cache: 'no-store' }).catch(() => null)
    if (res?.ok) sent += chunk.length
  }
  return sent
}

/** Les personnes à joindre, sans doublon ni l'auteur de l'événement. */
export const recipientsOf = (ids: Array<string | null | undefined>, except?: string | null): string[] => [...new Set(ids.filter((x): x is string => !!x && x !== except && !x.startsWith('email:')))]

/**
 * Avertit ces personnes : un courriel (si le lien de service le peut et que la personne le veut) et
 * une notification sur chaque téléphone où elle l'a permis, dans sa langue. Rend ce qui est parti.
 */
export async function deliver(service: { token: string; email: boolean }, userIds: string[], m: Message): Promise<{ emails: number; pushes: number }> {
  if (!userIds.length) return { emails: 0, pushes: 0 }
  const contacts = await dataWith(service.token)
    .filter<Contact>(T.contact, { filter: { 'json_data.userId': { $in: userIds.slice(0, 100) } }, limit: 200 })
    .catch(() => [])
  let emails = 0
  const pushes: Array<{ to: string; title: string; body: string; url: string }> = []
  const seen = new Set<string>()
  for (const { json_data: c } of contacts) {
    if (seen.has(c.userId)) continue
    seen.add(c.userId)
    const msg = compose(m, c.lang || 'fr')
    if (service.email && c.emails !== false && c.email && (await sendEmail(service.token, c.email, msg.title, msg.html))) emails += 1
    if (c.push !== false) for (const p of c.pushTokens ?? []) pushes.push({ to: p.token, title: msg.title, body: msg.body, url: m.url })
  }
  return { emails, pushes: pushes.length ? await sendPush(pushes) : 0 }
}

/* ───────────────────────── Le frein ───────────────────────── */

const hits = new Map<string, number[]>()

/** Au plus `max` avertissements par heure pour cette source (une tablette, une personne). */
export function allow(key: string, max = 30, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 3600_000)
  if (recent.length >= max) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  return true
}

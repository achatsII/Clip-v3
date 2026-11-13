/**
 * Avertir les bonnes personnes, côté app (toggle `notify`) : l'événement part au serveur sans
 * attendre et sans jamais bloquer le travail ; la fiche de contact de la personne (courriel,
 * langue, téléphones) se tient à jour toute seule.
 */
import { getAccessToken } from './gateway/client'
import type { DataApi, Doc } from './gateway/data'
import { nowIso, T } from './model/repo'
import type { Contact } from './model/types'

export interface NotifyEvent {
  kind: 'review' | 'changes' | 'published' | 'danger' | 'deviation' | 'request' | 'test'
  instructionId?: string
  /** Une publication : la personne qui avait demandé l'approbation. */
  to?: string[]
  instruction?: string
  who?: string
  text?: string
}

/** Fait avertir ; `link` : depuis une tablette (le serveur échange lui-même le lien du poste). */
export async function notifyEvent(e: NotifyEvent, opts: { link?: string } = {}): Promise<{ sent: number; emails?: number; pushes?: number; reason?: string } | null> {
  const token = opts.link ? null : getAccessToken()
  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ ...e, ...(opts.link ? { link: opts.link } : {}) }),
    })
    return (await res.json().catch(() => null)) as { sent: number } | null
  } catch {
    return null
  }
}

/** La fiche de contact de la personne : créée la première fois, mise à jour si son nom, son courriel ou sa langue changent. */
export async function ensureContact(data: DataApi, me: { userId: string; name: string; email: string }, lang: string): Promise<Doc<Contact> | null> {
  const found = (await data.filter<Contact>(T.contact, { filter: { 'json_data.userId': { $eq: me.userId } }, limit: 1 }))[0]
  if (!found) return data.insert<Contact>(T.contact, { userId: me.userId, name: me.name, email: me.email || null, lang, pushTokens: [], emails: true, push: true, updatedAt: nowIso() }, me.name)
  const c = found.json_data
  if (c.name !== me.name || (c.email ?? '') !== (me.email ?? '') || c.lang !== lang) {
    await data.patch(T.contact, found._id, { name: me.name, email: me.email || null, lang, updatedAt: nowIso() })
    return { ...found, json_data: { ...c, name: me.name, email: me.email || null, lang } }
  }
  return found
}

/** Ajoute le téléphone où la coquille a reçu le droit d'avertir (cinq au plus, le plus récent gardé). */
export async function addPushToken(data: DataApi, contact: Doc<Contact>, token: string, platform: 'ios' | 'android'): Promise<void> {
  const others = (contact.json_data.pushTokens ?? []).filter((p) => p.token !== token)
  const pushTokens = [...others, { token, platform, updatedAt: nowIso() }].slice(-5)
  await data.patch(T.contact, contact._id, { pushTokens, push: true, updatedAt: nowIso() })
}

/** Ce que la personne veut recevoir. */
export async function setContactPrefs(data: DataApi, contactId: string, prefs: Partial<Pick<Contact, 'emails' | 'push'>>): Promise<void> {
  await data.patch(T.contact, contactId, { ...prefs, updatedAt: nowIso() })
}

/**
 * Le contrat de l'espace Découvrir avec Sandboxes (docs/INTEGRATION.md du dépôt `sandboxes`, §2 à §4) :
 * le mode d'accès, les événements du suivi et leurs lots, la conversation du conseiller et le besoin
 * exprimé (bloc ```besoin). Partagé par le navigateur, le serveur et les tests : aucune dépendance,
 * aucun texte d'écran (les messages vivent dans le dictionnaire `decouvrir`).
 *
 * Les bornes suivent celles que Sandboxes vérifie (`src/lib/domain/validation.ts` de son dépôt) : un champ
 * trop long y vaut un refus de tout l'appel, il est donc coupé ici, avant l'envoi.
 */

/** DECOUVRIR_ACCES : « ouvert » (absent, ou toute autre valeur) — l'espace reste public ; « sandboxes » — il demande une connexion. */
export type AccessMode = 'ouvert' | 'sandboxes'
/** Qui entre : un client du produit, un prospect ouvert par Intelligence Industrielle, l'équipe d'II. */
export type PersonType = 'client' | 'prospect' | 'equipe'
/** Pourquoi une session de l'espace ne s'ouvre pas, ou se ferme. */
export type CloseReason = 'aucun_acces' | 'expire' | 'session'

export function isCloseReason(v: unknown): v is CloseReason {
  return v === 'aucun_acces' || v === 'expire' || v === 'session'
}

/** Les dates d'accès se disent à l'heure du Québec (Sandboxes fait finir un accès à 23 h 59, heure du Québec). */
const TZ = 'America/Toronto'

/**
 * Le dernier jour d'accès, écrit dans une langue : `fin` est l'instant où l'accès se termine, le jour
 * affiché est donc celui de `fin − 1 ms`. « 12 décembre » (long) ou « 15 déc. » (court) ; en français, le
 * premier du mois s'écrit « 1er ».
 */
export function lastDay(fin: number, locale: string, month: 'long' | 'short'): string {
  const text = new Intl.DateTimeFormat(locale, { day: 'numeric', month, timeZone: TZ }).format(fin - 1)
  return locale.startsWith('fr') ? text.replace(/^1 /, '1er ') : text
}

/* ───────────────────────────── Suivi (POST /api/v1/suivi) ───────────────────────────── */

export const EVENT_TYPES = ['page', 'video', 'video_fin', 'parcours', 'demo', 'conseiller', 'sortie'] as const
export type EventType = (typeof EVENT_TYPES)[number]
export const ADVISOR_ACTIONS = ['ouvre', 'question', 'fichier'] as const

/**
 * Un geste dans l'espace. Champs selon le type (§3) : page (chemin, libelle?) · video (videoId, pct, sec =
 * la position dans la vidéo, chapitre?, libelle = son titre) · video_fin (videoId, libelle?) · parcours
 * (libelle) · demo (chemin, libelle?) · conseiller (libelle : ouvre, question, fichier ; donnees?) · sortie
 * (sec = la durée de la visite depuis son début). Clip n'a pas de démo : il n'envoie jamais `demo`.
 */
export interface SuiviEvent {
  at: number
  type: EventType
  chemin?: string
  libelle?: string
  videoId?: string
  pct?: number
  sec?: number
  chapitre?: string
  donnees?: Record<string, unknown>
}

/** Au plus 100 événements et 64 Ko par appel. */
export const MAX_EVENTS = 100
export const MAX_BATCH_BYTES = 64 * 1024
/** Place gardée dans chaque lot pour l'enveloppe que le serveur ajoute (personne, session). */
const ENVELOPE_BYTES = 4 * 1024
/** `donnees` d'un événement : 4 Ko au plus pour Sandboxes ; on garde une marge. */
const MAX_DATA_BYTES = 3500

const bytes = (s: string) => new TextEncoder().encode(s).length

/** Coupe une file d'événements en lots qui respectent le contrat (nombre et taille), dans l'ordre. */
export function batches<T>(events: T[], max = MAX_EVENTS, maxBytes = MAX_BATCH_BYTES): T[][] {
  const budget = Math.max(1024, maxBytes - ENVELOPE_BYTES)
  const out: T[][] = []
  let cur: T[] = []
  let size = 2
  for (const e of events) {
    const b = bytes(JSON.stringify(e)) + 1
    if (cur.length && (cur.length >= max || size + b > budget)) {
      out.push(cur)
      cur = []
      size = 2
    }
    cur.push(e)
    size += b
  }
  if (cur.length) out.push(cur)
  return out
}

const str = (v: unknown, max: number): string | undefined => {
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s ? s.slice(0, max) : undefined
}
const int = (v: unknown, min: number, max: number): number | undefined => {
  const n = typeof v === 'number' ? v : Number.NaN
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : undefined
}

/** Les données d'un geste du conseiller : six champs au plus, une question coupée à 500 caractères. */
function cleanData(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>).slice(0, 6)) {
    const key = k.slice(0, 40)
    if (typeof v === 'string') out[key] = v.slice(0, key === 'texte' ? 500 : 200)
    else if (typeof v === 'number' && Number.isFinite(v)) out[key] = v
  }
  if (!Object.keys(out).length) return undefined
  if (bytes(JSON.stringify(out)) > MAX_DATA_BYTES) return typeof out.texte === 'string' ? { texte: out.texte } : undefined
  return out
}

/**
 * Un événement du navigateur, vérifié champ par champ (le reste est ignoré) ; null s'il ne suit pas le
 * contrat. Les nombres s'arrondissent ; une heure future, vieille de plus d'une semaine ou en secondes
 * devient maintenant.
 */
export function cleanEvent(raw: unknown, now: number): SuiviEvent | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const type = r.type as EventType
  if (!EVENT_TYPES.includes(type)) return null
  const at0 = typeof r.at === 'number' && Number.isFinite(r.at) ? r.at : now
  const at = at0 > now || now - at0 > 7 * 86_400_000 ? now : Math.round(at0)
  const chemin = str(r.chemin, 300)
  const libelle = str(r.libelle, 200)
  const videoId = str(r.videoId, 80)
  switch (type) {
    case 'page':
    case 'demo':
      if (!chemin?.startsWith('/')) return null
      return { at, type, chemin, ...(libelle ? { libelle } : {}) }
    case 'video': {
      const pct = int(r.pct, 0, 100)
      const sec = int(r.sec, 0, 86_400)
      if (!videoId || pct === undefined || sec === undefined) return null
      const chapitre = str(r.chapitre, 20)
      return { at, type, videoId, pct, sec, ...(chapitre ? { chapitre } : {}), ...(libelle ? { libelle } : {}) }
    }
    case 'video_fin':
      return videoId ? { at, type, videoId, ...(libelle ? { libelle } : {}) } : null
    case 'parcours':
      return libelle ? { at, type, libelle } : null
    case 'conseiller': {
      if (!ADVISOR_ACTIONS.includes(libelle as (typeof ADVISOR_ACTIONS)[number])) return null
      const donnees = cleanData(r.donnees)
      return { at, type, libelle, ...(donnees ? { donnees } : {}) }
    }
    case 'sortie': {
      const sec = int(r.sec, 0, 86_400)
      return sec === undefined ? null : { at, type, sec }
    }
  }
  return null
}

/** La liste reçue du navigateur : au plus 100 événements, seulement ceux qui suivent le contrat. */
export function cleanEvents(raw: unknown, now: number): SuiviEvent[] {
  if (!Array.isArray(raw)) return []
  const out: SuiviEvent[] = []
  for (const r of raw.slice(0, MAX_EVENTS)) {
    const e = cleanEvent(r, now)
    if (e) out.push(e)
  }
  return out
}

/** Identifiant de visite (`session` du suivi) : s_ suivi de 6 à 64 lettres et chiffres. */
export function isVisitId(v: unknown): v is string {
  return typeof v === 'string' && /^s_[A-Za-z0-9]{6,64}$/.test(v)
}

/* ───────────────────────────── Besoin (POST /api/v1/besoins) ───────────────────────────── */

/** Un besoin exprimé, devenu proposition (le corps de POST /besoins, sans `personne` ni `conversationId`). */
export interface Need {
  titre: string
  probleme: string
  contexte?: string
  frequence?: string
  impact?: string
  contournement?: string
  verbatims: string[]
  modulesLies: string[]
  existant?: string
}

const list = (v: unknown, n: number, max: number): string[] => (Array.isArray(v) ? v.map((x) => str(x, max)).filter((x): x is string => !!x).slice(0, n) : [])

/** Les champs facultatifs d'un besoin et leur longueur (Sandboxes : 500 pour la fréquence, 2 000 pour les autres). */
const NEED_FIELDS = { contexte: 1000, frequence: 500, impact: 1000, contournement: 1000, existant: 1000 } as const

/** Le besoin vérifié, aux limites du contrat (titre 200, problème 4 000, 20 verbatims et 20 modules) ; null sans titre ni problème. */
export function cleanNeed(raw: unknown): Need | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const titre = str(r.titre, 200)
  const probleme = str(r.probleme, 4000)
  if (!titre || !probleme) return null
  const need: Need = { titre, probleme, verbatims: list(r.verbatims, 20, 500), modulesLies: list(r.modulesLies, 20, 60) }
  for (const [k, max] of Object.entries(NEED_FIELDS) as [keyof typeof NEED_FIELDS, number][]) {
    const v = str(r[k], max)
    if (v) need[k] = v
  }
  return need
}

/** Un bloc ```besoin (l'étiquette peut porter un autre mot, ex. ```besoin json), jusqu'à sa fermeture ou la fin du texte. */
const NEED_BLOCK = /```[^\n`]*\bbesoin\b[^\n`]*\r?\n([\s\S]*?)(?:```|$)/gi

function parseNeed(body: string): Need | null {
  const t = body.trim()
  for (const candidate of [t, t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)]) {
    if (!candidate.startsWith('{')) continue
    try {
      const need = cleanNeed(JSON.parse(candidate))
      if (need) return need
    } catch {
      /* JSON invalide : on essaie la forme suivante, puis on ignore le bloc */
    }
  }
  return null
}

/**
 * Retire du message du conseiller tout bloc ```besoin (valide ou non : la personne ne voit jamais de JSON)
 * et rend le premier besoin valide, un seul par réponse. Un bloc invalide est ignoré ; le reste du message
 * est gardé tel quel.
 */
export function extractNeed(text: string): { text: string; need: Need | null } {
  let need: Need | null = null
  const cleaned = text.replace(NEED_BLOCK, (_m, body: string) => {
    if (!need) need = parseNeed(body)
    return ''
  })
  return { text: cleaned.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(), need }
}

/* ───────────────────────────── Conversation (PUT /api/v1/conversations/:id) ───────────────────────────── */

/** Le fil complet repart à chaque échange : 256 Ko au plus. */
export const MAX_CONVERSATION_BYTES = 256 * 1024

export interface ConversationPayload {
  debut: number
  maj: number
  messages: { role: 'user' | 'assistant'; texte: string; at: number }[]
  extrait: { besoins: string[]; idees: string[]; modules: string[]; outils: string[]; resume?: string; entreprise?: string; role?: string }
  videos: { id: string; titre?: string; pct: number }[]
}

/** Identifiant de conversation du produit (`c_…`, tiré au hasard par le navigateur). */
export function isConversationId(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z0-9_-]{6,80}$/.test(v)
}

/** La conversation vérifiée et bornée : les 200 derniers messages, 8 000 caractères par message, des listes bornées, 50 vidéos. */
export function cleanConversation(raw: unknown): ConversationPayload | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const debut = int(r.debut, 0, Number.MAX_SAFE_INTEGER)
  const maj = int(r.maj, 0, Number.MAX_SAFE_INTEGER)
  if (debut === undefined || maj === undefined || !Array.isArray(r.messages)) return null
  const messages = r.messages
    .slice(-200)
    .map((m) => {
      const x = (m ?? {}) as Record<string, unknown>
      const role = x.role === 'user' || x.role === 'assistant' ? x.role : null
      const texte = str(x.texte, 8000)
      const at = int(x.at, 0, Number.MAX_SAFE_INTEGER)
      return role && texte && at !== undefined ? { role, texte, at } : null
    })
    .filter((m): m is ConversationPayload['messages'][number] => !!m)
  const e = (r.extrait && typeof r.extrait === 'object' ? r.extrait : {}) as Record<string, unknown>
  const extrait: ConversationPayload['extrait'] = { besoins: list(e.besoins, 50, 300), idees: list(e.idees, 50, 300), modules: list(e.modules, 30, 100), outils: list(e.outils, 30, 100) }
  const resume = str(e.resume, 1000)
  const entreprise = str(e.entreprise, 300)
  const role = str(e.role, 300)
  if (resume) extrait.resume = resume
  if (entreprise) extrait.entreprise = entreprise
  if (role) extrait.role = role
  const videos = (Array.isArray(r.videos) ? r.videos : [])
    .slice(0, 50)
    .map((v) => {
      const x = (v ?? {}) as Record<string, unknown>
      const id = str(x.id, 80)
      const pct = int(x.pct, 0, 100)
      const titre = str(x.titre, 200)
      return id && pct !== undefined ? { id, pct, ...(titre ? { titre } : {}) } : null
    })
    .filter((v): v is ConversationPayload['videos'][number] => !!v)
  return { debut, maj, messages, extrait, videos }
}

/**
 * Un corps qui tient dans `maxBytes` : les plus vieux messages tombent d'abord (le fil le plus récent est
 * celui qui compte), jamais le dernier.
 */
export function fitConversation<T extends { messages: unknown[] }>(body: T, maxBytes = MAX_CONVERSATION_BYTES): T {
  let cur = body
  while (cur.messages.length > 1 && bytes(JSON.stringify(cur)) > maxBytes) {
    const drop = Math.max(1, Math.ceil(cur.messages.length / 10))
    cur = { ...cur, messages: cur.messages.slice(Math.min(drop, cur.messages.length - 1)) }
  }
  return cur
}

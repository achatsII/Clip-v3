/**
 * Le conseiller de l'espace Découvrir : la consigne (gabarit du skill espace-decouvrir, référence 04, et la
 * règle « jamais seulement non » du contrat de Sandboxes, §4), sa sortie structurée, la liste des vidéos à
 * recommander, ce qu'il retient d'un échange à l'autre et la conversation telle que Sandboxes la reçoit.
 * Fonctions pures. Les consignes données au modèle restent en français : elles ne s'affichent pas.
 */
import { messagesIn } from '@/lib/i18n/core'
import { clock, VIDEO_IDS, type VideoId } from './catalog'
import { fitConversation, type ConversationPayload } from './contract'
import { KNOWLEDGE } from './knowledge'
import type { VideoChapter } from './videos'

/** Ce que le conseiller retient de la conversation, aux noms de l'`extrait` que Sandboxes attend. */
export interface Extract {
  entreprise?: string
  role?: string
  besoins: string[]
  idees: string[]
  modules: string[]
  outils: string[]
  resume?: string
}

export const EMPTY_EXTRACT: Extract = { besoins: [], idees: [], modules: [], outils: [] }

/** Au plus 40 éléments par liste, les plus récents. */
const MAX_LIST = 40

const str = (description: string) => ({ type: 'string', description })
const strList = (description: string) => ({ type: 'array', items: { type: 'string' }, description })

/** La sortie structurée (`json_schema` d'AskAI v4) : la réponse, et ce qui est retenu. */
export const ADVISOR_SCHEMA = {
  type: 'object',
  properties: {
    reponse: str('La réponse à la personne, en markdown court (avec, à la fin, le bloc ```besoin quand un besoin est reformulé).'),
    extraction: {
      type: 'object',
      properties: {
        entreprise: str("Nom de l'entreprise, ou chaîne vide"),
        role: str('Rôle de la personne, ou chaîne vide'),
        besoins: strList('Besoins exprimés (cumulés)'),
        idees: strList('Idées de fonctions proposées par la personne (cumulées)'),
        modules: strList("Fonctions de Clip qui l'intéressent"),
        outils: strList('Outils actuels (Word, Excel, cartables, logiciel qualité…)'),
        resume: str('Le besoin en une phrase, ou chaîne vide'),
      },
      required: ['besoins', 'idees', 'modules', 'outils'],
    },
  },
  required: ['reponse', 'extraction'],
}

/** La consigne du conseiller, avec ses variables remplies. */
export function advisorSystem(v: { connaissances: string; personne: string; videos: string; retenu: string }): string {
  return `Tu es le conseiller de Clip, le logiciel d'Intelligence Industrielle qui fait des instructions de travail en usine avec l'IA : on filme l'expert, l'IA rédige, l'opérateur suit l'instruction au poste.
Tu parles à ${v.personne}, qui découvre le logiciel. Réponds dans la langue de la personne (français québécois par défaut), en vouvoyant ; simple, chaleureux, direct.

Tu réponds uniquement avec la base de connaissance ci-dessous : ce qui n'y est pas, Clip ne le fait pas aujourd'hui. Tu ne dis jamais seulement « non ».

Ce qui existe : réponse courte (4 à 8 lignes) ; d'abord oui ou en partie, puis comment (l'écran et le geste, les libellés entre guillemets), puis où le voir : la vidéo par son titre exact et, si tu le connais, son chapitre et son heure. Ne recommande jamais une vidéo « à venir ».

Ce qui n'existe pas encore :
1. Dis-le simplement : « Pas encore dans Clip aujourd'hui. »
2. Dis ce qui s'en approche déjà, seulement d'après la base de connaissance.
3. Si la base le marque comme prévu (« Ce qu'on prévoit ensuite », « prévu »), dis-le sans date : « C'est dans ce qu'on prévoit ensuite. » Sinon, n'en parle pas.
4. Invite : « Voulez-vous nous l'expliquer davantage ? Votre besoin ira directement à l'équipe produit. »
5. Si la personne continue, pose deux ou trois questions, une à la fois, sans redemander ce qu'elle a déjà dit : ce qui se passe aujourd'hui, à quelle fréquence, qui est touché, ce que ça coûte, ce qui serait idéal.
6. Quand le besoin est clair, reformule-le en trois lignes, puis termine « reponse » par ce bloc, une seule fois par besoin (l'écran le retire du message et l'envoie à l'équipe produit : n'en parle pas dans le texte) :
\`\`\`besoin
{"titre":"…","probleme":"…","contexte":"…","frequence":"…","impact":"…","contournement":"…","verbatims":["…"],"modulesLies":["…"],"existant":"…"}
\`\`\`
   « titre » et « probleme » sont obligatoires ; les autres champs, seulement ce que la personne a dit (sinon, omets-les). « verbatims » : ses mots exacts, courts. « modulesLies » : les fonctions de Clip touchées, en un ou deux mots (« traduction », « au poste », « approbation »). « existant » : ce qui s'en approche aujourd'hui, d'après la base.

Jamais : promettre une date ; dire qu'une fonction existe quand elle n'existe pas ; refuser sèchement ; dire qu'on ne le fera pas ; inventer une fonction, un chiffre, un client ou un prix (les prix : « un conseiller d'Intelligence Industrielle vous les donnera ») ; nommer un outil interne.

Aussi : termine par une seule question de découverte (l'usine, les postes, les tâches à documenter, les langues des opérateurs, les outils actuels, ce qui coince, qui écrit et qui approuve), sans redemander ce qui est déjà su. Un document joint (une procédure, une photo, un tableau) : dis ce que Clip en ferait, ce qu'il faudrait pour l'importer, ce qui manque. Tiens à jour ce que tu retiens (extraction) : garde le déjà retenu, ajoute le nouveau, sans doublon.

Déjà retenu : ${v.retenu}
Vidéos déjà regardées : ${v.videos}
Base de connaissance :
${v.connaissances}`
}

/** Une vidéo publiée, pour la liste du conseiller : son titre exact (celui du catalogue) et ses chapitres. */
export interface GuideVideo {
  id: VideoId
  chapters: VideoChapter[]
}

/**
 * Les vidéos de l'espace, pour que le conseiller recommande la bonne : celles qui sont tournées, avec leur
 * titre exact, leur résumé et leurs chapitres ; puis celles à venir, qu'il ne recommande pas.
 */
export function videoGuide(published: GuideVideo[]): string {
  const words = messagesIn('fr').decouvrir.videos
  const ready = new Set(published.map((v) => v.id))
  const lines = published.map((v) => {
    const w = words[v.id]
    const ch = v.chapters.length ? ` Chapitres : ${v.chapters.map((c, i) => `${i + 1}. ${c.title} (${clock(c.t)})`).join(' · ')}.` : ''
    return `- « ${w.title} » : ${w.summary}${ch}`
  })
  const upcoming = VIDEO_IDS.filter((id) => !ready.has(id)).map((id) => `« ${words[id].title} »`)
  return [
    '## Les vidéos de cet espace (à recommander par leur titre exact)',
    ...(lines.length ? lines : ['- Aucune vidéo publiée pour l’instant.']),
    ...(upcoming.length ? [`Vidéos à venir (pas encore tournées, ne les recommande pas) : ${upcoming.join(', ')}.`] : []),
  ].join('\n')
}

/** La liste fusionnée, sans doublon (insensible à la casse), bornée aux plus récents. */
function mergeList(prev: string[], next: unknown): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of [...prev, ...(Array.isArray(next) ? next : [])]) {
    if (typeof x !== 'string') continue
    const t = x.trim().slice(0, 300)
    const key = t.toLowerCase()
    if (!t || seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out.slice(-MAX_LIST)
}

const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined)

/** Ce que le conseiller retient : le déjà retenu, et le nouveau, sans doublon. */
export function mergeExtract(prev: Extract, next: unknown): Extract {
  const n = (next && typeof next === 'object' ? next : {}) as Record<string, unknown>
  const out: Extract = {
    besoins: mergeList(prev.besoins, n.besoins),
    idees: mergeList(prev.idees, n.idees),
    modules: mergeList(prev.modules, n.modules),
    outils: mergeList(prev.outils, n.outils),
  }
  const entreprise = text(n.entreprise, 300) ?? prev.entreprise
  const role = text(n.role, 300) ?? prev.role
  const resume = text(n.resume, 1000) ?? prev.resume
  if (entreprise) out.entreprise = entreprise
  if (role) out.role = role
  if (resume) out.resume = resume
  return out
}

/** Un message du fil, tel que l'écran le garde. */
export interface AdvisorMessage {
  role: 'user' | 'assistant'
  text: string
  at: number
  /** Les documents joints (leur nom). */
  files?: string[]
  /** Le besoin que porte cette réponse : en cours d'envoi, ajouté aux propositions, ou seulement retenu. */
  need?: 'envoi' | 'ok' | 'noted'
}

/** Une conversation du conseiller, dans l'onglet. `id` : `c_` et 14 caractères, tiré au hasard. */
export interface AdvisorThread {
  id: string
  startedAt: number
  updatedAt: number
  messages: AdvisorMessage[]
  extract: Extract
}

/** La conversation telle que Sandboxes la reçoit (PUT /api/v1/conversations/:id) : le fil complet, un document joint en une ligne. */
export function toConversationPayload(t: AdvisorThread, videos: ConversationPayload['videos']): ConversationPayload {
  const attached = messagesIn('fr').decouvrir.advisor.attached
  const e = t.extract
  return fitConversation(
    {
      debut: t.startedAt,
      maj: t.updatedAt,
      messages: t.messages.slice(-200).map((m) => ({ role: m.role, texte: (m.files?.length ? `${m.text}\n${attached(m.files.join(', '))}` : m.text).slice(0, 8000), at: m.at })),
      extrait: { besoins: e.besoins, idees: e.idees, modules: e.modules, outils: e.outils, ...(e.resume ? { resume: e.resume } : {}), ...(e.entreprise ? { entreprise: e.entreprise } : {}), ...(e.role ? { role: e.role } : {}) },
      videos: videos.slice(0, 50),
    },
    240 * 1024,
  )
}

/** L'historique envoyé à l'assistant : les 14 derniers messages. */
export function historyOf(messages: AdvisorMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages.slice(-14).map((m) => ({ role: m.role, content: m.text }))
}

export interface AdvisorRequestInput {
  /** La question de la personne (vide : seulement un document). */
  question: string
  /** Un document texte, lu dans le navigateur (15 000 caractères au plus). */
  doc?: { name: string; text: string }
  /** Un PDF ou une image, téléversé : son adresse publique. */
  files?: Array<{ url: string; filename: string; mimeType: string; sizeBytes: number }>
  /** Le fil d'avant cette question. */
  history: AdvisorMessage[]
  /** Le nom de la personne (session de l'espace), s'il est connu. */
  personne?: string | null
  /** Les vidéos vues dans ce navigateur. */
  seen: { titre: string; pct: number }[]
  retenu: Extract
  /** Les vidéos publiées et leurs chapitres. */
  published: GuideVideo[]
}

/** Le corps de l'appel à l'assistant (POST /api/v4/assistant/ask, par le relais de l'espace). */
export function advisorRequest(i: AdvisorRequestInput): Record<string, unknown> {
  const prompt = [i.question.trim() || 'Analyse le document joint.', i.doc && `Contenu du document « ${i.doc.name} » :\n${i.doc.text.slice(0, 15_000)}`].filter(Boolean).join('\n\n')
  return {
    prompt,
    system_instruction: advisorSystem({
      connaissances: `${KNOWLEDGE}\n${videoGuide(i.published)}`,
      personne: i.personne?.trim() || 'une personne',
      videos: i.seen.length ? i.seen.map((v) => `${v.titre} (${v.pct} %)`).join(', ') : 'aucune',
      retenu: JSON.stringify(i.retenu),
    }),
    provider: 'google',
    level: 'mid',
    thinking: 'disabled',
    json_schema: ADVISOR_SCHEMA,
    history: historyOf(i.history),
    ...(i.files?.length ? { files: i.files } : {}),
  }
}

/** La réponse de l'assistant : le JSON structuré (déjà lu par la passerelle, ou dans le texte), sinon le texte seul. */
export function readAdvisorReply(results: { parsed_json?: unknown; assistant_response?: string } | null | undefined): { reponse: string; extraction: unknown } {
  const parsed = results?.parsed_json as { reponse?: unknown; extraction?: unknown } | null | undefined
  if (parsed && typeof parsed.reponse === 'string') return { reponse: parsed.reponse, extraction: parsed.extraction }
  const raw = results?.assistant_response ?? ''
  try {
    const j = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '')) as { reponse?: unknown; extraction?: unknown }
    if (j && typeof j.reponse === 'string') return { reponse: j.reponse, extraction: j.extraction }
  } catch {
    /* une réponse en texte libre */
  }
  return { reponse: raw, extraction: null }
}

/**
 * L'assistant d'édition : la personne demande (texte, dictée ou voix), l'IA rend une liste
 * d'opérations (opération `edit_agent`), et l'app les applique une à une, sous ses yeux : elle va
 * à l'étape, la modifie, passe à la suivante. Ce qui demande de voir une photo ou de dessiner part
 * à une IA spécialisée (annotate, illustrate, visual), chacune facturée à son prix.
 *
 * Revoir les médias, seulement quand il le faut : l'assistant lit d'abord le texte (les notes écrites
 * et les transcriptions des notes vocales comprises, presque gratuites). S'il ne peut pas faire la
 * demande sans voir ou entendre une source, il rend une seule opération `look` ; l'app lui joint
 * alors ces sources pour un deuxième tour (vidéo en basse définition), facturé selon leur taille
 * (`look_s`, `look_m`, `look_l`). Une tâche simple ne coûte jamais ce deuxième tour.
 *
 * Les étapes se désignent par leur identifiant, jamais par leur numéro : une étape ajoutée,
 * retirée ou déplacée plus haut dans la liste ne fait pas viser la mauvaise.
 *
 * Les langues : l'assistant répond à la personne dans la langue de l'outil (`getLang()`) et écrit
 * le contenu dans celle de l'instruction (`content.language`). Les consignes données au modèle
 * restent en français ; ce que l'app montre (actions, erreurs) se lit dans le dictionnaire.
 */
import type { AiApi, AiOperation, AskFile } from '../gateway/ai'
import { ApiError } from '../gateway/client'
import { getLang, messages } from '../i18n'
import { LANGUAGES, PPE } from '../model/catalog'
import { layoutOf, mediaLabel } from '../model/media'
import { uid } from '../model/repo'
import type { FilesApi } from '../gateway/files'
import type { Annotation, InstructionContent, OrgSettings, Source, Step, StepLayout, StepMedia, WarningLevel } from '../model/types'
import { annotateImage, createVisual, illustrationPrompt } from './assist'
import { languageCode, translateContent, translateImage, translateMediaTexts } from './translate'
import { localizeMedia, mediaKey, withMediaTranslation } from '../model/translation'
import { enrichMedia, generationTier, measureSources, prepareForAi } from './generate'
import { resolveMedia, warningFrom } from './normalize'
import { standardBlock } from './prompts'
import type { LiveTool } from './useLiveVoice'

export const AGENT_OPS = ['set_instruction', 'add_step', 'update_step', 'delete_step', 'move_step', 'annotate', 'clear_annotations', 'illustrate', 'visual', 'set_layout', 'set_media', 'remove_media', 'use_media', 'look', 'translate', 'translate_media', 'translate_image'] as const
export type AgentOpName = (typeof AGENT_OPS)[number]

export interface AgentOp {
  op: AgentOpName
  /** Identifiant de l'étape visée (existante, ou `id` donné à une étape ajoutée plus haut). */
  step?: string
  /** add_step : identifiant de la nouvelle étape, réutilisable par les opérations suivantes. */
  id?: string
  /** add_step, move_step : l'étape après laquelle placer, ou « start ». */
  after?: string
  title?: string
  text?: string
  keyPoints?: string[]
  warningLevel?: WarningLevel | 'none'
  warningText?: string
  /** Numéro du média de l'étape, 1 = premier. */
  media?: number
  /** annotate, illustrate, visual : ce qu'il faut marquer ou dessiner, précisément. */
  request?: string
  layout?: StepLayout
  caption?: string
  verdict?: 'do' | 'dont' | 'none'
  summary?: string
  ppe?: string[]
  tools?: string[]
  safety?: string[]
  /** look : les sources à revoir (S1, S2…), le moins possible. */
  sources?: string[]
  /** look : ce qu'il faut y trouver. */
  question?: string
  /** use_media : la source d'où prendre le média (S1…). */
  source?: string
  /** use_media, vidéo : un extrait (start, end, en secondes) ou une image figée (at). */
  start?: number
  end?: number
  at?: number
  /** use_media, document : la page. */
  page?: number
  /** translate : les langues visées (codes). */
  languages?: string[]
  /** translate_media, translate_image : la langue visée ; la langue de l'instruction par défaut. */
  language?: string
  /** translate : refaire aussi les images où du texte se lit (seulement si la personne le demande). */
  images?: boolean
}

export interface AgentTurn {
  reply: string
  operations: AgentOp[]
  suggestions: string[]
}

const str = (description: string) => ({ type: 'string', description })
const strList = (description: string) => ({ type: 'array', items: { type: 'string' }, description })

/** Une langue nommée pour le modèle : « français du Québec », « anglais nord-américain (English) », ou son code. */
function languageName(lang: string): string {
  if (lang === 'fr') return 'français du Québec'
  if (lang === 'en') return 'anglais nord-américain (English)'
  return `la langue « ${lang} »`
}

/** « en français du Québec », « en anglais nord-américain (English) », « dans la langue « es » ». */
const inLanguage = (lang: string) => (lang === 'fr' || lang === 'en' ? `en ${languageName(lang)}` : `dans ${languageName(lang)}`)

/** La langue de l'instruction (une instruction ancienne peut ne pas l'avoir). */
const contentLang = (content: InstructionContent) => content.language || 'fr'

/** La forme de la réponse ; `ui` : la langue de la personne, celle de l'outil. */
export const agentSchema = (ui: string) => ({
  type: 'object',
  properties: {
    reply: str(`Ta réponse à la personne : 1 à 3 phrases simples, ${inLanguage(ui)}`),
    operations: {
      type: 'array',
      description: 'Les modifications, dans l’ordre où l’app doit les appliquer',
      items: {
        type: 'object',
        properties: {
          op: { type: 'string', enum: [...AGENT_OPS] },
          step: str('Identifiant de l’étape visée, tel qu’entre crochets (ex. st_ab12), ou l’id d’une étape ajoutée plus haut'),
          id: str('add_step seulement : un identifiant court pour la nouvelle étape (n1, n2…)'),
          after: str('add_step et move_step : identifiant de l’étape après laquelle placer, ou start'),
          title: str('Titre de l’étape, ou de l’instruction pour set_instruction'),
          text: str('Texte de l’étape'),
          keyPoints: strList('Points clés de l’étape (0 à 3)'),
          warningLevel: { type: 'string', enum: ['danger', 'caution', 'info', 'none'] },
          warningText: str('Texte de la mise en garde'),
          media: { type: 'number', description: 'Numéro du média de l’étape, 1 = premier' },
          request: str('annotate, illustrate, visual : quoi marquer ou dessiner, avec la forme (cercle, cadre, flèche), la couleur et le texte à écrire'),
          layout: { type: 'string', enum: ['focus', 'compare', 'grid'] },
          caption: str('Légende courte d’un média'),
          verdict: { type: 'string', enum: ['do', 'dont', 'none'] },
          summary: str('set_instruction : le résumé'),
          ppe: strList(`set_instruction : les EPI, parmi ces clés : ${Object.keys(PPE).join(', ')}`),
          tools: strList('set_instruction : les outils'),
          safety: strList('set_instruction : les mises en garde générales'),
          sources: strList('look : les sources à revoir (S1, S2…), le moins possible'),
          question: str('look : ce qu’il faut trouver dans ces sources'),
          source: str('use_media : la source d’où prendre le média (S1…)'),
          start: { type: 'number', description: 'use_media, vidéo : début de l’extrait, en secondes' },
          end: { type: 'number', description: 'use_media, vidéo : fin de l’extrait, en secondes' },
          at: { type: 'number', description: 'use_media, vidéo : l’instant d’une image figée, en secondes (à la place d’un extrait)' },
          page: { type: 'number', description: 'use_media, document : la page, 1 = première' },
          languages: strList('translate : les langues visées, en codes (en, es, pt, ar, ht, tl, vi, zh…)'),
          language: str('translate_media, translate_image : la langue visée, en code ; vide = la langue de l’instruction'),
          images: { type: 'boolean', description: 'translate : refaire aussi les images où du texte se lit, seulement si la personne le demande (plus cher)' },
        },
        required: ['op'],
      },
    },
    suggestions: strList(`2 à 4 prochaines demandes utiles pour CETTE instruction, courtes (8 mots au plus), à l’impératif, ${inLanguage(ui)}`),
  },
  required: ['reply', 'operations', 'suggestions'],
})

/**
 * `lang.ui` : la langue de la personne (l'outil) ; `lang.content` : celle de l'instruction.
 * `translate` : faux quand la traduction n'est pas offerte (toggle coupé, ou pas dans le plan).
 */
export function agentSystem(org: Pick<OrgSettings, 'standard' | 'learnings'>, lang: { ui: string; content: string }, opts: { translate?: boolean } = {}): string {
  return `Tu es l’assistant d’édition de CLIP. Tu modifies une instruction de travail d’usine à la demande de la personne qui la rédige. Tu rends une liste d’opérations que l’app applique une à une, sous ses yeux.
- Fais exactement ce qui est demandé ; ne touche à rien d’autre et garde le texte existant qu’on ne te demande pas de changer.
- Une étape = une action. Respecte le standard de l’usine ci-dessous (ton, nombre de mots).
- Désigne une étape par son identifiant entre crochets. Une étape que tu ajoutes reçoit un id (n1, n2…) que tu réutilises plus bas. Les opérations s’appliquent dans l’ordre donné.
- Tu ne vois pas les photos. Pour marquer quelque chose sur une photo : annotate, avec une demande précise (quoi, cercle, cadre ou flèche, couleur, texte à écrire) ; un autre modèle, qui voit la photo, place les marques. annotate ne vise qu’un média photo ou image.
- Les sources d’origine (S1, S2…) sont listées sous l’instruction ; les notes écrites et les transcriptions des notes vocales y sont en entier : lis-les d’abord.
- Revoir des sources (look) coûte du temps et des crédits : seulement quand la demande ne peut pas se faire sans voir ou entendre une source — une valeur dite ou montrée qui n’est pas dans le texte, un geste ou un moment à retrouver, un meilleur moment de vidéo à choisir, ce que montre une photo. Jamais pour reformuler, raccourcir, réordonner, traduire ou ajouter une mise en garde. Pour revoir : UNE opération look, seule, avec sources (le moins possible) et question ; l’app te joint ces sources et tu fais alors la demande.
- Mettre à une étape un média tiré d’une source : use_media, avec source et, pour une vidéo, start et end (un extrait) ou at (une image figée) ; avec media, il remplace ce média de l’étape, sinon il s’ajoute.
- Un dessin explicatif (vue de face, coupe, plan, 3D) : visual. Une illustration à partir de la photo de l’étape : illustrate (seulement si l’étape a une photo).
- Montrer ce qu’il faut faire et ne pas faire : set_media avec verdict do ou dont, puis set_layout compare.
- Traduire pour les opérateurs : translate, avec languages (codes) ; la traduction couvre les textes, les marques sur les photos, les légendes, les outils et les schémas. images: true seulement si la personne demande aussi les images : l’IA redessine celles où du texte se lit, avec ce texte traduit (plus cher). Refaire une traduction existante : translate.
- Un seul média : translate_media traduit sa légende, ses marques ou son schéma ; translate_image redessine une photo ou une image avec son texte traduit (plus cher). language : la langue visée ; sans language, celle de l’instruction (un média dont le texte est dans une autre langue). Vers une autre langue, l’instruction doit déjà y être traduite (voir TRADUCTIONS) ; sinon, translate d’abord.${opts.translate === false ? '\n- La traduction n’est pas offerte à cette personne : n’utilise jamais translate, translate_media ni translate_image ; dis-le simplement dans reply.' : ''}
- Mise en garde : danger (blessure possible), caution (erreur ou bris possible), info.
- N’invente aucune valeur (couple, pression, cote, référence) : si elle manque, demande-la dans reply, sans opération.
- Demande floue : UNE question courte dans reply, sans opération.
- reply dit ce que tu as fait ; ne prétends jamais avoir fait une chose absente des opérations.
- Langues : tu parles à la personne ${inLanguage(lang.ui)} (reply et suggestions). Tout ce que tu écris dans l’instruction (titres, textes, points clés, mises en garde, légendes, résumé, outils, texte à écrire sur une photo) est ${inLanguage(lang.content)}, la langue de l’instruction, même si la demande est faite dans une autre langue.

${standardBlock(org)}`
}

function mediaLine(m: StepMedia, i: number): string {
  const bits = [`${i + 1} ${mediaLabel(m).toLowerCase()}`]
  if (m.kind === 'image' && m.annotations?.length) {
    const labels = m.annotations.flatMap((a) => (a.text && /\p{L}/u.test(a.text) ? [`« ${a.text.slice(0, 40)} »`] : [])).slice(0, 4)
    bits.push(`${m.annotations.length} marque(s)${labels.length ? ` (${labels.join(', ')})` : ''}`)
  }
  if (m.kind === 'html' && m.title) bits.push(`« ${m.title} »`)
  if (m.verdict) bits.push(m.verdict === 'do' ? 'à faire' : 'à éviter')
  if (m.caption) bits.push(`légende « ${m.caption} »`)
  return bits.join(', ')
}

/** Une durée pour le modèle : « 3 min 20 s ». */
const durationText = (sec?: number) => (!sec || sec <= 0 ? 'durée inconnue' : sec >= 60 ? `${Math.floor(sec / 60)} min ${String(Math.round(sec % 60)).padStart(2, '0')} s` : `${Math.round(sec)} s`)

/**
 * Les sources d'origine, telles que l'assistant les lit : une ligne chacune (S1, S2… dans l'ordre de
 * l'instruction), et en entier les notes écrites et les transcriptions des notes vocales, du texte
 * presque gratuit (au plus ~5 000 caractères en tout).
 */
export function sourcesBlock(sources: Source[]): string {
  let budget = 5000
  const excerpt = (text: string) => {
    const t = text.replace(/\s+/g, ' ').trim()
    const cut = t.slice(0, Math.max(0, Math.min(1500, budget)))
    budget -= cut.length
    return cut.length < t.length ? `${cut}…` : cut
  }
  return sources
    .map((src, i) => {
      const id = `S${i + 1}`
      const name = src.originalName ?? src.name
      if (src.kind === 'video') return `${id} — vidéo, ${durationText(src.durationSec)}${name ? `, « ${name} »` : ''}`
      if (src.kind === 'photo') return `${id} — photo${name ? ` « ${name} »` : ''}${src.text ? `, légende : « ${excerpt(src.text)} »` : ''}`
      if (src.kind === 'document') return `${id} — document${name ? ` « ${name} »` : ''}${src.pageCount ? `, ${src.pageCount} pages` : ''}`
      if (src.kind === 'audio') return `${id} — note vocale, ${durationText(src.durationSec)}${src.text ? `, transcription : « ${excerpt(src.text)} »` : ''}`
      if (src.kind === 'note' && src.text) return `${id} — note écrite : « ${excerpt(src.text)} »`
      return `${id} — ${src.kind}`
    })
    .join('\n')
}

export function agentPrompt(content: InstructionContent, focusStepId: string | null, request: string, sources: Source[] = []): string {
  const lines = [`TITRE : ${content.title}`, `RÉSUMÉ : ${content.summary}`]
  if (content.equipment) lines.push(`ÉQUIPEMENT : ${content.equipment}`)
  lines.push(`EPI : ${content.ppe.join(', ') || 'aucun'}`)
  if (content.tools.length) lines.push(`OUTILS : ${content.tools.join(', ')}`)
  if (content.safety.length) lines.push(`MISES EN GARDE GÉNÉRALES : ${content.safety.join(' | ')}`)
  const translated = Object.keys(content.translations ?? {})
  lines.push(`TRADUCTIONS : ${translated.length ? translated.map((c) => `${c} (${LANGUAGES[c]?.native ?? c})`).join(', ') : 'aucune'}`)
  lines.push('ÉTAPES :')
  content.steps.forEach((s, i) => {
    lines.push(`${i + 1}. [${s.id}] ${s.title} — ${s.text}${s.keyPoints?.length ? ` (points clés : ${s.keyPoints.join(' ; ')})` : ''}${s.warning ? ` (${s.warning.level} : ${s.warning.text})` : ''}`)
    lines.push(`   médias : ${s.media.length ? s.media.map(mediaLine).join(' ; ') : 'aucun'}${s.media.length > 1 ? ` ; disposition : ${layoutOf(s)}` : ''}`)
  })
  const focus = focusStepId ? content.steps.findIndex((s) => s.id === focusStepId) : -1
  if (focus >= 0) lines.push(`\nLa personne regarde l’étape ${focus + 1} [${focusStepId}] : « cette étape » désigne celle-là.`)
  if (sources.length) lines.push(`\nSOURCES D’ORIGINE :\n${sourcesBlock(sources)}`)
  lines.push(`\nDEMANDE : ${request}`)
  return lines.join('\n')
}

/** Un échange avec l'assistant (opération `edit_agent`). */
export async function askAgent(
  ai: AiApi,
  org: Pick<OrgSettings, 'standard' | 'learnings'>,
  content: InstructionContent,
  focusStepId: string | null,
  request: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  opts: {
    /** Les sources d'origine de l'instruction, dans leur ordre (S1, S2…). */
    sources?: Source[]
    /** Le deuxième tour : les sources demandées, jointes, et la question posée. */
    look?: { operation: AiOperation; files: AskFile[]; lines: string[]; question: string }
    /** Faux : la traduction n'est pas offerte (toggle coupé, ou pas dans le plan). */
    canTranslate?: boolean
  } = {},
): Promise<AgentTurn> {
  const ui = getLang()
  const look = opts.look
  const system = agentSystem(org, { ui, content: contentLang(content) }, { translate: opts.canTranslate })
  const res = await ai.ask<AgentTurn>(
    look ? look.operation : 'edit_agent',
    {
      provider: 'google',
      level: 'mid',
      thinking: 'enabled',
      effort: 'low',
      system_instruction: look ? `${system}\n\nLES SOURCES DEMANDÉES SONT JOINTES : appuie-toi sur ce que tu vois et entends pour faire la demande. N’utilise plus look.` : system,
      prompt: look ? `${agentPrompt(content, focusStepId, request, opts.sources)}\n\nSOURCES JOINTES :\n${look.lines.join('\n')}\nCE QU’IL FAUT Y TROUVER : ${look.question}` : agentPrompt(content, focusStepId, request, opts.sources),
      json_schema: agentSchema(ui),
      history: history.slice(-8),
      maxOutputTokens: 16000,
      ...(look ? { files: look.files, mediaResolution: 'low' as const } : {}),
    },
    { scope: look ? 'agent-look' : 'agent', timeoutMs: look ? 240_000 : 120_000 },
  )
  const j = res.json
  if (!j || typeof j.reply !== 'string') throw new ApiError(messages().editorTools.agent.errors.noAnswer, 502)
  return {
    reply: j.reply.trim(),
    operations: (Array.isArray(j.operations) ? j.operations : [])
      .filter((o) => o && (AGENT_OPS as readonly string[]).includes(o.op))
      // Au deuxième tour, plus de look : les médias sont déjà là.
      .filter((o) => !look || o.op !== 'look')
      .slice(0, 40),
    suggestions: (Array.isArray(j.suggestions) ? j.suggestions : []).map((s) => String(s).trim()).filter(Boolean).slice(0, 4),
  }
}

/** La taille de ce qu'on revoit décide du prix, comme pour une génération (mêmes seuils). */
export function lookTier(sources: Source[]): { op: 'look_s' | 'look_m' | 'look_l'; tooBig: boolean } {
  const g = generationTier(sources)
  return { op: g.op === 'generate_s' ? 'look_s' : g.op === 'generate_m' ? 'look_m' : 'look_l', tooBig: g.tooBig }
}

/** Ce qu'un tour avec revue des médias annonce à l'écran : les sources revues et leur taille. */
export interface LookInfo {
  sourceIds: string[]
  operation: AiOperation
  videoSec: number
}

/**
 * Un tour de l'assistant, avec revue des médias seulement s'il la demande. Le premier tour lit le
 * texte (`edit_agent`). S'il rend une opération `look`, l'app prépare les sources demandées (URI
 * Gemini encore valides réutilisées, sinon téléversées de nouveau) et fait un deuxième tour avec
 * elles, facturé selon leur taille. Les sources rafraîchies remontent par `onSources`.
 */
export async function agentTurn(input: {
  ai: AiApi
  files: FilesApi
  org: Pick<OrgSettings, 'standard' | 'learnings'>
  content: InstructionContent
  focusStepId: string | null
  request: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
  sources?: Source[]
  onLook?: (info: LookInfo) => void
  onSources?: (sources: Source[]) => void
  canTranslate?: boolean
}): Promise<AgentTurn> {
  const sources = input.sources ?? []
  const first = await askAgent(input.ai, input.org, input.content, input.focusStepId, input.request, input.history, { sources, canTranslate: input.canTranslate })
  const lookOp = first.operations.find((o) => o.op === 'look')
  const operations = first.operations.filter((o) => o.op !== 'look')
  if (!lookOp) return first
  // Les sources demandées, dans l'ordre de l'instruction ; une demande sans source valable ne revoit rien.
  const wanted = new Set((lookOp.sources ?? []).map((x) => String(x).trim().toUpperCase()))
  const picked = sources.map((src, i) => ({ src, id: `S${i + 1}` })).filter((x) => wanted.has(x.id) && (x.src.url || x.src.text))
  if (!picked.length) return { ...first, operations }
  const tier = lookTier(picked.map((x) => x.src))
  if (tier.tooBig) return { reply: messages().editorTools.agent.lookTooBig, operations: [], suggestions: first.suggestions }
  input.onLook?.({ sourceIds: picked.map((x) => x.id), operation: tier.op, videoSec: measureSources(picked.map((x) => x.src)).videoSec })
  const prepared = await prepareForAi(
    picked.map((x) => x.src),
    input.files,
  )
  // Les URI Gemini neuves se gardent : une autre revue dans les 48 h ne téléverse rien.
  if (prepared.sources.some((src, k) => src.geminiFileUri !== picked[k].src.geminiFileUri)) {
    const byId = new Map(prepared.sources.map((src, k) => [picked[k].src.id, src]))
    input.onSources?.(sources.map((src) => byId.get(src.id) ?? src))
  }
  // prepareForAi numérote S1, S2… dans le sous-ensemble : on remet les numéros de l'instruction.
  const lines = prepared.lines.map((l) => {
    const k = Number(l.id.slice(1)) - 1
    return l.line.replace(/^S\d+/, picked[k]?.id ?? l.id)
  })
  return askAgent(input.ai, input.org, input.content, input.focusStepId, input.request, input.history, {
    sources,
    canTranslate: input.canTranslate,
    look: { operation: tier.op, files: prepared.askFiles, lines, question: lookOp.question?.trim() || input.request },
  })
}

// ——— Appliquer les opérations ———

export interface OpResult {
  content: InstructionContent
  label: string
  stepId: string | null
}

export class AgentOpError extends Error {}

/** Les identifiants choisis par l'IA pour les étapes qu'elle ajoute, vers les vrais. */
export type IdMap = Map<string, string>

export function stepOf(content: InstructionContent, ids: IdMap, ref?: string): { step: Step; index: number } {
  const id = ref ? (ids.get(ref) ?? ref) : ''
  const index = content.steps.findIndex((s) => s.id === id)
  if (index < 0) throw new AgentOpError(messages().editorTools.agent.errors.stepNotFound(ref ?? '?'))
  return { step: content.steps[index], index }
}

const withStep = (content: InstructionContent, index: number, step: Step): InstructionContent => ({ ...content, steps: content.steps.map((s, i) => (i === index ? step : s)) })

function mediaIndexOf(step: Step, n: number | undefined, wantImage = false): number {
  if (n && n >= 1 && n <= step.media.length) return n - 1
  if (wantImage) {
    const i = step.media.findIndex((m) => m.kind === 'image')
    if (i >= 0) return i
  }
  if (!step.media.length) throw new AgentOpError(messages().editorTools.agent.errors.noMedia)
  return 0
}

const cleanList = (l: string[] | undefined) => (l ?? []).map((x) => String(x).trim()).filter(Boolean)

/** Les opérations qui ne demandent pas d'IA : pures, testées. */
export function applyOp(content: InstructionContent, op: AgentOp, ids: IdMap): OpResult {
  const t = messages().editorTools.agent
  const part = t.parts
  switch (op.op) {
    case 'set_instruction': {
      const next: InstructionContent = { ...content }
      const changed: string[] = []
      if (op.title?.trim()) (next.title = op.title.trim()), changed.push(part.title)
      if (op.summary !== undefined) (next.summary = op.summary.trim()), changed.push(part.summary)
      if (op.ppe) (next.ppe = cleanList(op.ppe).filter((p) => p in PPE)), changed.push(part.ppe)
      if (op.tools) (next.tools = cleanList(op.tools)), changed.push(part.tools)
      if (op.safety) (next.safety = cleanList(op.safety)), changed.push(part.safety)
      return { content: next, label: t.done.instruction(changed), stepId: null }
    }
    case 'add_step': {
      if (!op.title?.trim()) throw new AgentOpError(t.errors.newStepNoTitle)
      const step: Step = { id: uid('st_'), title: op.title.trim(), text: (op.text ?? '').trim(), keyPoints: cleanList(op.keyPoints).slice(0, 3), warning: warningFrom(op.warningLevel, op.warningText), media: [] }
      if (op.id) ids.set(op.id, step.id)
      let at = content.steps.length
      if (op.after === 'start') at = 0
      else if (op.after) {
        const i = content.steps.findIndex((s) => s.id === (ids.get(op.after!) ?? op.after))
        if (i >= 0) at = i + 1
      }
      const steps = [...content.steps.slice(0, at), step, ...content.steps.slice(at)]
      return { content: { ...content, steps }, label: t.done.stepAdded(at + 1, step.title), stepId: step.id }
    }
    case 'update_step': {
      const { step, index } = stepOf(content, ids, op.step)
      const next: Step = { ...step }
      const changed: string[] = []
      if (op.title?.trim()) (next.title = op.title.trim()), changed.push(part.title)
      if (op.text !== undefined) (next.text = op.text.trim()), changed.push(part.text)
      if (op.keyPoints) (next.keyPoints = cleanList(op.keyPoints).slice(0, 3)), changed.push(part.keyPoints)
      if (op.warningLevel === 'none') (next.warning = null), changed.push(part.warningRemoved)
      else if (op.warningLevel || op.warningText) {
        const w = warningFrom(op.warningLevel ?? step.warning?.level ?? 'caution', op.warningText ?? step.warning?.text)
        next.warning = w
        changed.push(part.warning)
      }
      return { content: withStep(content, index, next), label: t.done.step(index + 1, changed), stepId: step.id }
    }
    case 'delete_step': {
      const { step, index } = stepOf(content, ids, op.step)
      return { content: { ...content, steps: content.steps.filter((s) => s.id !== step.id) }, label: t.done.stepRemoved(index + 1, step.title), stepId: content.steps[index + 1]?.id ?? content.steps[index - 1]?.id ?? null }
    }
    case 'move_step': {
      const { step, index } = stepOf(content, ids, op.step)
      const rest = content.steps.filter((s) => s.id !== step.id)
      let at = rest.length
      if (op.after === 'start') at = 0
      else if (op.after) {
        const i = rest.findIndex((s) => s.id === (ids.get(op.after!) ?? op.after))
        if (i >= 0) at = i + 1
      }
      const steps = [...rest.slice(0, at), step, ...rest.slice(at)]
      return { content: { ...content, steps }, label: t.done.stepMoved(step.title, at + 1, index + 1), stepId: step.id }
    }
    case 'set_layout': {
      const { step, index } = stepOf(content, ids, op.step)
      const layout = op.layout === 'compare' || op.layout === 'grid' ? op.layout : undefined
      if (layout && step.media.length < 2) throw new AgentOpError(t.errors.needTwoMedia)
      return { content: withStep(content, index, { ...step, layout }), label: layout === 'compare' ? t.done.layoutCompare(index + 1) : layout === 'grid' ? t.done.layoutGrid(index + 1) : t.done.layoutFocus(index + 1), stepId: step.id }
    }
    case 'set_media': {
      const { step, index } = stepOf(content, ids, op.step)
      const i = mediaIndexOf(step, op.media)
      const patch: Partial<StepMedia> = {}
      if (op.caption !== undefined) patch.caption = op.caption.trim() || undefined
      if (op.verdict) patch.verdict = op.verdict === 'none' ? undefined : op.verdict
      const media = step.media.map((m, j) => (j === i ? ({ ...m, ...patch } as StepMedia) : m))
      const what = [op.verdict && op.verdict !== 'none' ? (op.verdict === 'do' ? part.verdictDo : part.verdictDont) : '', op.caption ? part.caption(op.caption.trim()) : ''].filter(Boolean)
      return { content: withStep(content, index, { ...step, media }), label: t.done.media(index + 1, i + 1, what), stepId: step.id }
    }
    case 'remove_media': {
      const { step, index } = stepOf(content, ids, op.step)
      const i = mediaIndexOf(step, op.media)
      const media = step.media.filter((_, j) => j !== i)
      return { content: withStep(content, index, { ...step, media, layout: media.length < 2 ? undefined : step.layout }), label: t.done.mediaRemoved(index + 1, i + 1), stepId: step.id }
    }
    case 'clear_annotations': {
      const { step, index } = stepOf(content, ids, op.step)
      const i = mediaIndexOf(step, op.media, true)
      const media = step.media.map((m, j) => (j === i && m.kind === 'image' ? { ...m, annotations: [] } : m))
      return { content: withStep(content, index, { ...step, media }), label: t.done.marksCleared(index + 1), stepId: step.id }
    }
    default:
      throw new AgentOpError(t.errors.needsAi)
  }
}

/** Ce que l'app annonce pendant qu'elle travaille sur une opération. */
export function describeOp(content: InstructionContent, op: AgentOp, ids: IdMap): { label: string; stepId: string | null } {
  const w = messages().editorTools.agent.working
  let n = ''
  let stepId: string | null = null
  try {
    if (op.step) {
      const r = stepOf(content, ids, op.step)
      n = w.step(r.index + 1)
      stepId = r.step.id
    }
  } catch {
    /* étape ajoutée plus loin ou introuvable */
  }
  const text: Record<AgentOpName, string> = {
    set_instruction: w.instruction,
    add_step: w.addStep(op.title ?? ''),
    update_step: w.updateStep(n),
    delete_step: w.deleteStep(n),
    move_step: w.moveStep(n),
    annotate: w.annotate(n),
    clear_annotations: w.clearAnnotations(n),
    illustrate: w.illustrate(n),
    visual: w.visual(n),
    set_layout: w.setLayout(n),
    set_media: w.setMedia(n),
    remove_media: w.removeMedia(n),
    use_media: w.useMedia(n),
    look: w.look,
    translate: w.translate([...(op.languages ?? []), ...(op.language ? [op.language] : [])].map((c) => LANGUAGES[languageCode(c) ?? '']?.label ?? c).join(', ')),
    translate_media: w.translateMedia(n),
    translate_image: w.translateImage(n),
  }
  return { label: text[op.op], stepId }
}

export interface AgentLogEntry {
  key: number
  label: string
  stepId: string | null
  state: 'working' | 'done' | 'error'
}

export interface AgentRunContext {
  ai: AiApi
  get: () => InstructionContent
  set: (c: InstructionContent) => void
  /** Amène l'écran à l'étape qui change (null : le haut de l'instruction). */
  focus: (stepId: string | null) => void
  log: (entry: AgentLogEntry) => void
  /** Un temps pour voir chaque changement ; nul dans les tests. */
  pause?: (ms: number) => Promise<void>
  /** Les sources d'origine (S1, S2…), pour use_media. */
  sources?: Source[]
  /** Pour tirer une image figée d'une vidéo (use_media avec at). */
  files?: FilesApi
  /** Faux : la traduction n'est pas offerte (toggle coupé, ou pas dans le plan) ; `onLocked` montre le refus. */
  canTranslate?: boolean
  onLocked?: (feature: 'translations') => void
}

const MAX_MEDIA = 6

/** Les opérations qui demandent une IA spécialisée : voir la photo, dessiner, illustrer. */
async function applyAiOp(ctx: AgentRunContext, op: AgentOp, ids: IdMap): Promise<OpResult> {
  const content = ctx.get()
  const { step, index } = stepOf(content, ids, op.step)
  if (op.op === 'annotate') {
    const i = mediaIndexOf(step, op.media, true)
    const m = step.media[i]
    if (m.kind !== 'image') throw new AgentOpError(messages().editorTools.agent.errors.marksOnImage)
    const marks: Annotation[] = await annotateImage(ctx.ai, m.url, step, op.request || undefined)
    const latest = ctx.get()
    const at = stepOf(latest, ids, op.step)
    const media = at.step.media.map((x, j) => (j === i && x.kind === 'image' ? { ...x, annotations: [...(x.annotations ?? []), ...marks] } : x))
    return { content: withStep(latest, at.index, { ...at.step, media }), label: messages().editorTools.agent.done.marksAdded(at.index + 1, marks.length), stepId: step.id }
  }
  if (op.op === 'visual') {
    const v = await createVisual(ctx.ai, content, step, op.request ?? '')
    const latest = ctx.get()
    const at = stepOf(latest, ids, op.step)
    return { content: withStep(latest, at.index, { ...at.step, media: [...at.step.media, v].slice(-MAX_MEDIA) }), label: messages().editorTools.agent.done.visualAdded(at.index + 1, v.title ?? ''), stepId: step.id }
  }
  // illustrate
  const i = mediaIndexOf(step, op.media, true)
  const ref = step.media[i]
  if (ref.kind !== 'image') throw new AgentOpError(messages().editorTools.agent.errors.noReferencePhoto)
  const prompt = await illustrationPrompt(ctx.ai, ref.url, step)
  const url = await ctx.ai.generateImage(op.request ? `${prompt} ${op.request}` : prompt, [ref.url])
  const latest = ctx.get()
  const at = stepOf(latest, ids, op.step)
  return { content: withStep(latest, at.index, { ...at.step, media: [...at.step.media, { kind: 'image' as const, url, generated: true }].slice(-MAX_MEDIA) }), label: messages().editorTools.agent.done.illustrationAdded(at.index + 1), stepId: step.id }
}

/**
 * use_media : met à une étape un média tiré d'une source d'origine — un extrait ou une image figée
 * d'une vidéo, une photo, la page d'un document. Avec `media`, il remplace ce média de l'étape.
 */
async function applyUseMedia(ctx: AgentRunContext, op: AgentOp, ids: IdMap): Promise<OpResult> {
  const t = messages().editorTools.agent
  const sources = ctx.sources ?? []
  const byId = new Map(sources.map((src, i) => [`S${i + 1}`, src]))
  let media = resolveMedia({ source: op.source, start: op.start, end: op.end, at: op.at, page: op.page }, byId)
  if (!media) throw new AgentOpError(t.errors.sourceNotFound(op.source ?? '?'))
  // Une image figée se tire de la vidéo ; sans moyen de la tirer, l'extrait autour de l'instant.
  if (media.kind === 'image' && media.frame && !media.url) {
    const f = media.frame
    const fallback: StepMedia = { kind: 'video', url: f.videoUrl, sourceId: media.sourceId, start: f.start, end: f.end }
    if (ctx.files) {
      const files = ctx.files
      const draft: InstructionContent = { ...ctx.get(), steps: [{ id: 'tmp', title: '', text: '', keyPoints: [], warning: null, media: [media] }] }
      const done = await enrichMedia(draft, files, async (png, name) => (await files.upload(png, name, 'pages')).url).catch(() => null)
      media = done?.steps[0]?.media[0] ?? fallback
    } else media = fallback
  }
  const latest = ctx.get()
  const { step, index } = stepOf(latest, ids, op.step)
  const replace = op.media && op.media >= 1 && op.media <= step.media.length ? op.media - 1 : -1
  const list = replace >= 0 ? step.media.map((m, j) => (j === replace ? media! : m)) : [...step.media, media].slice(-MAX_MEDIA)
  return { content: withStep(latest, index, { ...step, media: list }), label: t.done.mediaUsed(index + 1, mediaLabel(media)), stepId: step.id }
}

const AI_OPS = new Set<AgentOpName>(['annotate', 'visual', 'illustrate'])
const TRANSLATE_OPS = new Set<AgentOpName>(['translate', 'translate_media', 'translate_image'])

/**
 * Traduire : toute l'instruction dans une ou plusieurs langues (`translate`, images en option), les
 * textes d'un seul média (`translate_media`) ou une image refaite avec son texte traduit
 * (`translate_image`). Vers la langue de l'instruction, le média lui-même change ; vers une autre
 * langue, sa traduction se range dans celle de l'instruction, qui doit déjà exister.
 */
async function applyTranslateOp(ctx: AgentRunContext, op: AgentOp, ids: IdMap): Promise<OpResult> {
  const t = messages().editorTools.agent
  const label = (code: string) => LANGUAGES[code]?.label ?? code
  // Le même droit que le menu « Traduire » : la feature `translations` du plan.
  if (ctx.canTranslate === false) {
    ctx.onLocked?.('translations')
    throw new AgentOpError(t.errors.translationsLocked)
  }
  if (op.op === 'translate') {
    const codes: string[] = []
    for (const raw of [...(op.languages ?? []), ...(op.language ? [op.language] : [])]) {
      const code = languageCode(raw)
      if (!code) throw new AgentOpError(t.errors.unknownLanguage(raw))
      if (code !== contentLang(ctx.get()) && !codes.includes(code)) codes.push(code)
    }
    if (!codes.length) throw new AgentOpError(t.errors.noLanguage)
    let redone = 0
    for (const code of codes) {
      const r = await translateContent(ctx.ai, ctx.get(), { language: code, images: !!op.images })
      const latest = ctx.get()
      ctx.set({ ...latest, translations: { ...(latest.translations ?? {}), [code]: r.translation } })
      redone += r.images.redone
    }
    return { content: ctx.get(), label: t.done.translated(codes.map(label).join(', '), redone), stepId: null }
  }
  const content = ctx.get()
  const { step } = stepOf(content, ids, op.step)
  const i = mediaIndexOf(step, op.media, op.op === 'translate_image')
  const m = step.media[i]
  const code = op.language?.trim() ? languageCode(op.language) : contentLang(content)
  if (!code) throw new AgentOpError(t.errors.unknownLanguage(op.language ?? ''))
  const source = code === contentLang(content)
  if (!source && !content.translations?.[code]) throw new AgentOpError(t.errors.translateFirst(label(code)))
  if (op.op === 'translate_image') {
    if (m.kind !== 'image') throw new AgentOpError(t.errors.imageOnly)
    const url = await translateImage(ctx.ai, m.url, code)
    if (!url) throw new AgentOpError(t.errors.noTextInImage)
    const latest = ctx.get()
    const at = stepOf(latest, ids, op.step)
    const next = source
      ? withStep(latest, at.index, { ...at.step, media: at.step.media.map((x, j) => (j === i && x.kind === 'image' ? { ...x, url, generated: true } : x)) })
      : withMediaTranslation(latest, code, at.step.id, i, { of: mediaKey(m), url })
    return { content: next, label: t.done.imageTranslated(at.index + 1, i + 1, label(code)), stepId: step.id }
  }
  const tr = await translateMediaTexts(ctx.ai, step.id, i, m, code)
  if (!tr) throw new AgentOpError(t.errors.nothingToTranslate)
  const latest = ctx.get()
  const at = stepOf(latest, ids, op.step)
  const next = source
    ? withStep(latest, at.index, { ...at.step, media: at.step.media.map((x, j) => (j === i ? localizeMedia(x, { ...tr, of: mediaKey(x) }) : x)) })
    : withMediaTranslation(latest, code, at.step.id, i, tr)
  return { content: next, label: t.done.mediaTranslated(at.index + 1, i + 1, label(code)), stepId: step.id }
}

/** Applique les opérations une à une, en montrant chacune. Une opération ratée n'arrête pas les autres. */
export async function runAgentOps(ops: AgentOp[], ctx: AgentRunContext): Promise<{ done: number; failed: number }> {
  const pause = ctx.pause ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const ids: IdMap = new Map()
  let done = 0
  let failed = 0
  for (const [key, op] of ops.entries()) {
    const before = describeOp(ctx.get(), op, ids)
    ctx.focus(before.stepId)
    ctx.log({ key, label: before.label, stepId: before.stepId, state: 'working' })
    await pause(250)
    try {
      const r =
        op.op === 'use_media' ? await applyUseMedia(ctx, op, ids) : TRANSLATE_OPS.has(op.op) ? await applyTranslateOp(ctx, op, ids) : AI_OPS.has(op.op) ? await applyAiOp(ctx, op, ids) : applyOp(ctx.get(), op, ids)
      ctx.set(r.content)
      ctx.focus(r.stepId)
      ctx.log({ key, label: r.label, stepId: r.stepId, state: 'done' })
      done++
    } catch (e) {
      const t = messages().editorTools.agent
      const why = e instanceof Error && e.message ? e.message : t.errors.unknown
      ctx.log({ key, label: t.opFailed(before.label.replace(/…$/, ''), why), stepId: before.stepId, state: 'error' })
      failed++
    }
    await pause(350)
  }
  return { done, failed }
}

// ——— À la voix, en direct (`LiveEditVoice`) ———
// Les consignes et les réponses données au modèle restent en français. Il parle à la personne dans
// la langue de l'outil, et chaque changement passe par le même moteur que le clavardage (`modifier`).

/** Ce qu'un tour de modification rend à la voix : la réponse de l'assistant, ce qui est fait, ce qui a échoué. */
export interface VoiceTurnResult {
  reply: string
  done: string[]
  failed: string[]
}

/** Les fonctions offertes au modèle (déclarations à la manière de Gemini). */
export const LIVE_EDIT_TOOLS: LiveTool[] = [
  {
    name: 'modifier',
    description:
      "Fait un changement dans l'instruction : textes, étapes (ajouter, retirer, déplacer), mises en garde, marques précises sur une photo, schéma, illustration, à faire / à éviter, traductions (toute l'instruction, ou le texte d'une image). Rend ce qui a été fait. La demande doit être complète : l'étape visée (numéro ET titre), ce qu'il faut faire, les textes exacts.",
    parameters: { type: 'OBJECT', properties: { demande: { type: 'STRING', description: 'La demande complète, comme on l’écrirait à un rédacteur' } }, required: ['demande'] },
  },
  {
    name: 'aller_a_etape',
    description: "Montre l'étape demandée à l'écran (1 = première).",
    parameters: { type: 'OBJECT', properties: { numero: { type: 'NUMBER', description: "Numéro de l'étape, 1 = première" } }, required: ['numero'] },
  },
  { name: 'lire_instruction', description: "Rend l'instruction telle qu'elle est maintenant : titre et étapes numérotées.", parameters: { type: 'OBJECT', properties: {} } },
  { name: 'annuler_dernier_changement', description: 'Annule le dernier changement fait par l’assistant.', parameters: { type: 'OBJECT', properties: {} } },
]

/** L'instruction telle que le modèle la lit. */
export function liveEditOutline(content: InstructionContent) {
  return { titre: content.title, etapes: content.steps.map((s, i) => ({ numero: i + 1, titre: s.title, texte: s.text, medias: s.media.length, mise_en_garde: s.warning?.text ?? null })) }
}

/** La consigne de la voix ; `ui` : la langue de la personne, celle de l'outil. */
export function liveEditSystem(content: InstructionContent, ui: string = getLang()): string {
  const steps = content.steps.map((s, i) => `${i + 1}. ${s.title} — ${s.text}`).join('\n')
  return `Tu es l’assistant vocal d’édition de CLIP. La personne modifie une instruction de travail d’usine en te parlant, souvent les mains occupées. Parle ${languageName(ui)}, phrases très courtes, ton calme.
- Pour TOUT changement, appelle VRAIMENT la fonction modifier, avec une demande complète et précise (étape visée par son numéro et son titre, ce qu’il faut faire, les textes exacts). Ne dis jamais qu’un changement est fait avant la réponse de modifier ; ensuite, résume en une phrase ce qui a été fait.
- Tu ne vois pas les photos : décris précisément ce qu’il faut marquer (objet, forme, couleur, texte) ; l’outil s’en charge.
- Pour montrer une étape, appelle aller_a_etape. Après plusieurs changements, appelle lire_instruction avant de citer un numéro d’étape.
- « Annule », « reviens en arrière » : appelle annuler_dernier_changement.
- Demande floue : pose UNE question courte. N’invente aucune valeur (couple, pression, cote).
- L’instruction est écrite ${inLanguage(contentLang(content))} : les textes exacts que tu passes à modifier sont dans cette langue.

INSTRUCTION « ${content.title} » :
${steps}`
}

/** Ce qu'on demande au modèle de dire en premier. */
export const liveEditGreeting = (ui: string = getLang()) => `Bonjour. Dis en une phrase, ${inLanguage(ui)}, que tu peux modifier l’instruction à la voix, et demande ce qu’il faut changer.`

/** La réponse au modèle quand une modification est déjà en cours. */
export const agentBusy = (): VoiceTurnResult => ({ reply: 'Une modification est déjà en cours. Réessayez dans un instant.', done: [], failed: ['occupé'] })

export interface LiveEditHandlers {
  /** L'instruction telle qu'elle est maintenant. */
  content: () => InstructionContent
  /** Un tour de modification, visible dans la conversation et annulable. */
  modify: (request: string) => Promise<VoiceTurnResult>
  goTo: (stepId: string) => void
  /** Annule le dernier tour qui a changé quelque chose ; faux s'il n'y en a pas. */
  undo: () => boolean
}

/** Répond à une fonction appelée par le modèle. */
export async function answerLiveEditTool(name: string, args: Record<string, unknown>, h: LiveEditHandlers): Promise<Record<string, unknown>> {
  if (name === 'modifier') {
    const demande = String(args.demande ?? '').trim()
    if (!demande) return { ok: false, motif: 'Demande vide' }
    const r = await h.modify(demande)
    return { ok: r.failed.length === 0, reponse: r.reply, fait: r.done, echecs: r.failed, instruction: liveEditOutline(h.content()) }
  }
  if (name === 'aller_a_etape') {
    const k = Math.round(Number(args.numero))
    const step = h.content().steps[k - 1]
    if (!step) return { ok: false, motif: `Il y a ${h.content().steps.length} étapes.` }
    h.goTo(step.id)
    return { ok: true, etape: k, titre: step.title }
  }
  if (name === 'lire_instruction') return liveEditOutline(h.content())
  if (name === 'annuler_dernier_changement') return { ok: true, message: h.undo() ? 'Le dernier changement est annulé.' : 'Il n’y a rien à annuler.' }
  return { ok: false, motif: 'Fonction inconnue' }
}

/**
 * L'assistant d'édition : la personne demande (texte, dictée ou voix), l'IA rend une liste
 * d'opérations (opération `edit_agent`), et l'app les applique une à une, sous ses yeux : elle va
 * à l'étape, la modifie, passe à la suivante. Ce qui demande de voir une photo ou de dessiner part
 * à une IA spécialisée (annotate, illustrate, visual), chacune facturée à son prix.
 *
 * Les étapes se désignent par leur identifiant, jamais par leur numéro : une étape ajoutée,
 * retirée ou déplacée plus haut dans la liste ne fait pas viser la mauvaise.
 */
import type { AiApi } from '../gateway/ai'
import { ApiError } from '../gateway/client'
import { PPE } from '../model/catalog'
import { layoutOf, mediaLabel } from '../model/media'
import { uid } from '../model/repo'
import type { Annotation, InstructionContent, OrgSettings, Step, StepLayout, StepMedia, WarningLevel } from '../model/types'
import { annotateImage, createVisual, illustrationPrompt } from './assist'
import { warningFrom } from './normalize'
import { standardBlock } from './prompts'

export const AGENT_OPS = ['set_instruction', 'add_step', 'update_step', 'delete_step', 'move_step', 'annotate', 'clear_annotations', 'illustrate', 'visual', 'set_layout', 'set_media', 'remove_media'] as const
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
}

export interface AgentTurn {
  reply: string
  operations: AgentOp[]
  suggestions: string[]
}

const str = (description: string) => ({ type: 'string', description })
const strList = (description: string) => ({ type: 'array', items: { type: 'string' }, description })

export const agentSchema = {
  type: 'object',
  properties: {
    reply: str('Ta réponse à la personne : 1 à 3 phrases simples, en français du Québec'),
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
        },
        required: ['op'],
      },
    },
    suggestions: strList('2 à 4 prochaines demandes utiles pour CETTE instruction, courtes (8 mots au plus), à l’impératif'),
  },
  required: ['reply', 'operations', 'suggestions'],
}

export function agentSystem(org: Pick<OrgSettings, 'standard' | 'learnings'>): string {
  return `Tu es l’assistant d’édition de CLIP. Tu modifies une instruction de travail d’usine à la demande de la personne qui la rédige. Tu rends une liste d’opérations que l’app applique une à une, sous ses yeux.
- Fais exactement ce qui est demandé ; ne touche à rien d’autre et garde le texte existant qu’on ne te demande pas de changer.
- Une étape = une action. Respecte le standard de l’usine ci-dessous (ton, nombre de mots).
- Désigne une étape par son identifiant entre crochets. Une étape que tu ajoutes reçoit un id (n1, n2…) que tu réutilises plus bas. Les opérations s’appliquent dans l’ordre donné.
- Tu ne vois pas les photos. Pour marquer quelque chose sur une photo : annotate, avec une demande précise (quoi, cercle, cadre ou flèche, couleur, texte à écrire) ; un autre modèle, qui voit la photo, place les marques. annotate ne vise qu’un média photo ou image.
- Un dessin explicatif (vue de face, coupe, plan, 3D) : visual. Une illustration à partir de la photo de l’étape : illustrate (seulement si l’étape a une photo).
- Montrer ce qu’il faut faire et ne pas faire : set_media avec verdict do ou dont, puis set_layout compare.
- Mise en garde : danger (blessure possible), caution (erreur ou bris possible), info.
- N’invente aucune valeur (couple, pression, cote, référence) : si elle manque, demande-la dans reply, sans opération.
- Demande floue : UNE question courte dans reply, sans opération.
- reply dit ce que tu as fait ; ne prétends jamais avoir fait une chose absente des opérations.

${standardBlock(org)}`
}

function mediaLine(m: StepMedia, i: number): string {
  const bits = [`${i + 1} ${mediaLabel(m).toLowerCase()}`]
  if (m.kind === 'image' && m.annotations?.length) bits.push(`${m.annotations.length} marque(s)`)
  if (m.kind === 'html' && m.title) bits.push(`« ${m.title} »`)
  if (m.verdict) bits.push(m.verdict === 'do' ? 'à faire' : 'à éviter')
  if (m.caption) bits.push(`légende « ${m.caption} »`)
  return bits.join(', ')
}

export function agentPrompt(content: InstructionContent, focusStepId: string | null, request: string): string {
  const lines = [`TITRE : ${content.title}`, `RÉSUMÉ : ${content.summary}`]
  if (content.equipment) lines.push(`ÉQUIPEMENT : ${content.equipment}`)
  lines.push(`EPI : ${content.ppe.join(', ') || 'aucun'}`)
  if (content.tools.length) lines.push(`OUTILS : ${content.tools.join(', ')}`)
  if (content.safety.length) lines.push(`MISES EN GARDE GÉNÉRALES : ${content.safety.join(' | ')}`)
  lines.push('ÉTAPES :')
  content.steps.forEach((s, i) => {
    lines.push(`${i + 1}. [${s.id}] ${s.title} — ${s.text}${s.keyPoints?.length ? ` (points clés : ${s.keyPoints.join(' ; ')})` : ''}${s.warning ? ` (${s.warning.level} : ${s.warning.text})` : ''}`)
    lines.push(`   médias : ${s.media.length ? s.media.map(mediaLine).join(' ; ') : 'aucun'}${s.media.length > 1 ? ` ; disposition : ${layoutOf(s)}` : ''}`)
  })
  const focus = focusStepId ? content.steps.findIndex((s) => s.id === focusStepId) : -1
  if (focus >= 0) lines.push(`\nLa personne regarde l’étape ${focus + 1} [${focusStepId}] : « cette étape » désigne celle-là.`)
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
): Promise<AgentTurn> {
  const res = await ai.ask<AgentTurn>(
    'edit_agent',
    {
      provider: 'google',
      level: 'mid',
      thinking: 'enabled',
      effort: 'low',
      system_instruction: agentSystem(org),
      prompt: agentPrompt(content, focusStepId, request),
      json_schema: agentSchema,
      history: history.slice(-8),
      maxOutputTokens: 16000,
    },
    { scope: 'agent', timeoutMs: 120_000 },
  )
  const j = res.json
  if (!j || typeof j.reply !== 'string') throw new ApiError('L’assistant n’a pas pu répondre. Réessayez.', 502)
  return {
    reply: j.reply.trim(),
    operations: (Array.isArray(j.operations) ? j.operations : []).filter((o) => o && (AGENT_OPS as readonly string[]).includes(o.op)).slice(0, 40),
    suggestions: (Array.isArray(j.suggestions) ? j.suggestions : []).map((s) => String(s).trim()).filter(Boolean).slice(0, 4),
  }
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
  if (index < 0) throw new AgentOpError(`Étape introuvable (${ref ?? '?'})`)
  return { step: content.steps[index], index }
}

const withStep = (content: InstructionContent, index: number, step: Step): InstructionContent => ({ ...content, steps: content.steps.map((s, i) => (i === index ? step : s)) })

function mediaIndexOf(step: Step, n: number | undefined, wantImage = false): number {
  if (n && n >= 1 && n <= step.media.length) return n - 1
  if (wantImage) {
    const i = step.media.findIndex((m) => m.kind === 'image')
    if (i >= 0) return i
  }
  if (!step.media.length) throw new AgentOpError('Cette étape n’a pas de média')
  return 0
}

const cleanList = (l: string[] | undefined) => (l ?? []).map((x) => String(x).trim()).filter(Boolean)

/** Les opérations qui ne demandent pas d'IA : pures, testées. */
export function applyOp(content: InstructionContent, op: AgentOp, ids: IdMap): OpResult {
  switch (op.op) {
    case 'set_instruction': {
      const next: InstructionContent = { ...content }
      const changed: string[] = []
      if (op.title?.trim()) (next.title = op.title.trim()), changed.push('titre')
      if (op.summary !== undefined) (next.summary = op.summary.trim()), changed.push('résumé')
      if (op.ppe) (next.ppe = cleanList(op.ppe).filter((p) => p in PPE)), changed.push('EPI')
      if (op.tools) (next.tools = cleanList(op.tools)), changed.push('outils')
      if (op.safety) (next.safety = cleanList(op.safety)), changed.push('mises en garde')
      return { content: next, label: `Instruction : ${changed.join(', ') || 'rien à changer'}`, stepId: null }
    }
    case 'add_step': {
      if (!op.title?.trim()) throw new AgentOpError('Nouvelle étape sans titre')
      const step: Step = { id: uid('st_'), title: op.title.trim(), text: (op.text ?? '').trim(), keyPoints: cleanList(op.keyPoints).slice(0, 3), warning: warningFrom(op.warningLevel, op.warningText), media: [] }
      if (op.id) ids.set(op.id, step.id)
      let at = content.steps.length
      if (op.after === 'start') at = 0
      else if (op.after) {
        const i = content.steps.findIndex((s) => s.id === (ids.get(op.after!) ?? op.after))
        if (i >= 0) at = i + 1
      }
      const steps = [...content.steps.slice(0, at), step, ...content.steps.slice(at)]
      return { content: { ...content, steps }, label: `Nouvelle étape ${at + 1} : « ${step.title} »`, stepId: step.id }
    }
    case 'update_step': {
      const { step, index } = stepOf(content, ids, op.step)
      const next: Step = { ...step }
      const changed: string[] = []
      if (op.title?.trim()) (next.title = op.title.trim()), changed.push('titre')
      if (op.text !== undefined) (next.text = op.text.trim()), changed.push('texte')
      if (op.keyPoints) (next.keyPoints = cleanList(op.keyPoints).slice(0, 3)), changed.push('points clés')
      if (op.warningLevel === 'none') (next.warning = null), changed.push('mise en garde retirée')
      else if (op.warningLevel || op.warningText) {
        const w = warningFrom(op.warningLevel ?? step.warning?.level ?? 'caution', op.warningText ?? step.warning?.text)
        next.warning = w
        changed.push('mise en garde')
      }
      return { content: withStep(content, index, next), label: `Étape ${index + 1} : ${changed.join(', ') || 'rien à changer'}`, stepId: step.id }
    }
    case 'delete_step': {
      const { step, index } = stepOf(content, ids, op.step)
      return { content: { ...content, steps: content.steps.filter((s) => s.id !== step.id) }, label: `Étape ${index + 1} retirée : « ${step.title} »`, stepId: content.steps[index + 1]?.id ?? content.steps[index - 1]?.id ?? null }
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
      return { content: { ...content, steps }, label: `Étape « ${step.title} » déplacée en ${at + 1} (était ${index + 1})`, stepId: step.id }
    }
    case 'set_layout': {
      const { step, index } = stepOf(content, ids, op.step)
      const layout = op.layout === 'compare' || op.layout === 'grid' ? op.layout : undefined
      if (layout && step.media.length < 2) throw new AgentOpError('Il faut au moins deux médias pour comparer ou faire une grille')
      return { content: withStep(content, index, { ...step, layout }), label: `Étape ${index + 1} : ${layout === 'compare' ? 'à faire / à éviter côte à côte' : layout === 'grid' ? 'médias en grille' : 'un média à la fois'}`, stepId: step.id }
    }
    case 'set_media': {
      const { step, index } = stepOf(content, ids, op.step)
      const i = mediaIndexOf(step, op.media)
      const patch: Partial<StepMedia> = {}
      if (op.caption !== undefined) patch.caption = op.caption.trim() || undefined
      if (op.verdict) patch.verdict = op.verdict === 'none' ? undefined : op.verdict
      const media = step.media.map((m, j) => (j === i ? ({ ...m, ...patch } as StepMedia) : m))
      const what = [op.verdict && op.verdict !== 'none' ? (op.verdict === 'do' ? '« à faire »' : '« à éviter »') : '', op.caption ? `légende « ${op.caption.trim()} »` : ''].filter(Boolean).join(', ')
      return { content: withStep(content, index, { ...step, media }), label: `Étape ${index + 1}, média ${i + 1} : ${what || 'mis à jour'}`, stepId: step.id }
    }
    case 'remove_media': {
      const { step, index } = stepOf(content, ids, op.step)
      const i = mediaIndexOf(step, op.media)
      const media = step.media.filter((_, j) => j !== i)
      return { content: withStep(content, index, { ...step, media, layout: media.length < 2 ? undefined : step.layout }), label: `Étape ${index + 1} : média ${i + 1} retiré`, stepId: step.id }
    }
    case 'clear_annotations': {
      const { step, index } = stepOf(content, ids, op.step)
      const i = mediaIndexOf(step, op.media, true)
      const media = step.media.map((m, j) => (j === i && m.kind === 'image' ? { ...m, annotations: [] } : m))
      return { content: withStep(content, index, { ...step, media }), label: `Étape ${index + 1} : marques retirées de la photo`, stepId: step.id }
    }
    default:
      throw new AgentOpError('Cette opération demande l’IA')
  }
}

/** Ce que l'app annonce pendant qu'elle travaille sur une opération. */
export function describeOp(content: InstructionContent, op: AgentOp, ids: IdMap): { label: string; stepId: string | null } {
  let n = ''
  let stepId: string | null = null
  try {
    if (op.step) {
      const r = stepOf(content, ids, op.step)
      n = `Étape ${r.index + 1}`
      stepId = r.step.id
    }
  } catch {
    /* étape ajoutée plus loin ou introuvable */
  }
  const text: Record<AgentOpName, string> = {
    set_instruction: 'Instruction : mise à jour…',
    add_step: `Nouvelle étape : « ${op.title ?? ''} »…`,
    update_step: `${n} : je réécris…`,
    delete_step: `${n} : je retire…`,
    move_step: `${n} : je déplace…`,
    annotate: `${n} : je place les marques sur la photo…`,
    clear_annotations: `${n} : je retire les marques…`,
    illustrate: `${n} : je crée une illustration…`,
    visual: `${n} : je dessine un schéma…`,
    set_layout: `${n} : je change la disposition…`,
    set_media: `${n} : je qualifie le média…`,
    remove_media: `${n} : je retire un média…`,
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
}

const MAX_MEDIA = 6

/** Les opérations qui demandent une IA spécialisée : voir la photo, dessiner, illustrer. */
async function applyAiOp(ctx: AgentRunContext, op: AgentOp, ids: IdMap): Promise<OpResult> {
  const content = ctx.get()
  const { step, index } = stepOf(content, ids, op.step)
  if (op.op === 'annotate') {
    const i = mediaIndexOf(step, op.media, true)
    const m = step.media[i]
    if (m.kind !== 'image') throw new AgentOpError('Les marques se posent sur une photo ou une image')
    const marks: Annotation[] = await annotateImage(ctx.ai, m.url, step, op.request || undefined)
    const latest = ctx.get()
    const at = stepOf(latest, ids, op.step)
    const media = at.step.media.map((x, j) => (j === i && x.kind === 'image' ? { ...x, annotations: [...(x.annotations ?? []), ...marks] } : x))
    return { content: withStep(latest, at.index, { ...at.step, media }), label: `Étape ${at.index + 1} : ${marks.length} marque${marks.length > 1 ? 's' : ''} sur la photo`, stepId: step.id }
  }
  if (op.op === 'visual') {
    const v = await createVisual(ctx.ai, content, step, op.request ?? '')
    const latest = ctx.get()
    const at = stepOf(latest, ids, op.step)
    return { content: withStep(latest, at.index, { ...at.step, media: [...at.step.media, v].slice(-MAX_MEDIA) }), label: `Étape ${at.index + 1} : schéma « ${v.title} » ajouté`, stepId: step.id }
  }
  // illustrate
  const i = mediaIndexOf(step, op.media, true)
  const ref = step.media[i]
  if (ref.kind !== 'image') throw new AgentOpError('Pas de photo de référence : demandez plutôt un schéma')
  const prompt = await illustrationPrompt(ctx.ai, ref.url, step)
  const url = await ctx.ai.generateImage(op.request ? `${prompt} ${op.request}` : prompt, [ref.url])
  const latest = ctx.get()
  const at = stepOf(latest, ids, op.step)
  return { content: withStep(latest, at.index, { ...at.step, media: [...at.step.media, { kind: 'image' as const, url, generated: true }].slice(-MAX_MEDIA) }), label: `Étape ${at.index + 1} : illustration ajoutée`, stepId: step.id }
}

const AI_OPS = new Set<AgentOpName>(['annotate', 'visual', 'illustrate'])

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
      const r = AI_OPS.has(op.op) ? await applyAiOp(ctx, op, ids) : applyOp(ctx.get(), op, ids)
      ctx.set(r.content)
      ctx.focus(r.stepId)
      ctx.log({ key, label: r.label, stepId: r.stepId, state: 'done' })
      done++
    } catch (e) {
      const why = e instanceof Error && e.message ? e.message : 'échec'
      ctx.log({ key, label: `${before.label.replace(/…$/, '')} — ${why}`, stepId: before.stepId, state: 'error' })
      failed++
    }
    await pause(350)
  }
  return { done, failed }
}

/**
 * L'IA qui apprend des corrections (toggle `learnFromEdits`), à la demande, au coût réel (`learn_rules`) :
 * - d'une instruction prise comme modèle, et de ce qui la rend bonne, les règles de style qu'elle suit ;
 * - des dernières corrections de l'équipe (avant → après), les règles qui les auraient évitées.
 * Des règles de style seulement, jamais de contenu technique ; jamais une règle déjà écrite.
 */
import { ApiError } from '../gateway/client'
import type { AiApi } from '../gateway/ai'
import { messages } from '../i18n'
import type { InstructionContent } from '../model/types'

/** La langue des règles : celle de l'outil de la personne. */
const inLanguage = (lang: string) => (lang === 'en' ? 'in clear North American English' : 'en français québécois clair')

const rulesSchema = {
  type: 'object',
  properties: {
    rules: { type: 'array', items: { type: 'string' }, description: '0 à 4 règles nouvelles, courtes (6 à 18 mots), applicables à toute instruction de l’usine' },
    explanation: { type: 'string', description: 'Une phrase : ce que tu as retenu' },
  },
  required: ['rules', 'explanation'],
}

const SYSTEM = (language: string) => `Tu aides une usine à améliorer le standard de rédaction de ses instructions de travail, que l’IA suit à chaque génération.
- Tu proposes des RÈGLES DE STYLE générales : longueur des textes, découpage en étapes, titres, ton, points clés, mises en garde, vocabulaire.
- Jamais une règle sur le contenu technique d’une instruction (pas de pièce, de valeur, de machine, de produit).
- Jamais une règle déjà écrite dans les règles actuelles, ni une qui les contredit.
- Chaque règle : une phrase courte et concrète, qu’une IA peut appliquer telle quelle, ${inLanguage(language)}.
- Rien de clair à en tirer : aucune règle.`

const clean = (rules: unknown, current: string[]) => {
  const known = new Set(current.map((r) => r.trim().toLocaleLowerCase()))
  return (Array.isArray(rules) ? rules : [])
    .map((r) => (typeof r === 'string' ? r.replace(/\s+/g, ' ').trim() : ''))
    .filter((r) => r && r.length <= 200 && !known.has(r.toLocaleLowerCase()))
    .slice(0, 4)
}

/** Les règles de style d'une instruction jugée exemplaire, et de ce qui la rend bonne. */
export async function rulesFromModel(ai: AiApi, content: Pick<InstructionContent, 'title' | 'steps'>, opts: { qualities: string[]; why: string; current: string[]; language: string }): Promise<{ rules: string[]; explanation: string }> {
  const steps = content.steps
    .filter((s) => !s.fromBlock)
    .slice(0, 40)
    .map((s, i) => `${i + 1}. ${s.title}${s.text ? ` — ${s.text}` : ''}${s.keyPoints?.length ? ` [points clés : ${s.keyPoints.join(' ; ')}]` : ''}${s.warning ? ` [mise en garde (${s.warning.level}) : ${s.warning.text}]` : ''}${s.section ? ` {phase : ${s.section}}` : ''}`)
  const res = await ai.ask<{ rules: string[]; explanation: string }>(
    'learn_rules',
    {
      provider: 'google',
      level: 'mid',
      thinking: 'disabled',
      system_instruction: SYSTEM(opts.language),
      prompt: `RÈGLES ACTUELLES :\n${opts.current.map((r) => `- ${r}`).join('\n') || '(aucune)'}\n\nCE QUI REND CETTE INSTRUCTION BONNE, selon la personne : ${[...opts.qualities, opts.why.trim()].filter(Boolean).join(' ; ') || '(non précisé : à toi de le voir)'}\n\nL’INSTRUCTION MODÈLE « ${content.title} » :\n${steps.join('\n')}\n\nDonne les règles de style qui décrivent ce qui la rend bonne.`,
      json_schema: rulesSchema,
    },
    { scope: 'learn_model', timeoutMs: 60_000 },
  )
  if (!res.json) throw new ApiError(messages().learning.model.failed, 502)
  return { rules: clean(res.json.rules, opts.current), explanation: (res.json.explanation ?? '').trim() }
}

/** Les règles qui expliquent les corrections récurrentes de l'équipe (étapes avant → après). */
export async function rulesFromEdits(ai: AiApi, examples: Array<{ before: string; after: string }>, opts: { current: string[]; language: string }): Promise<{ rules: string[]; explanation: string }> {
  const pairs = examples.slice(0, 24).map((e, i) => `${i + 1}. AVANT : ${e.before}\n   APRÈS : ${e.after}`)
  const res = await ai.ask<{ rules: string[]; explanation: string }>(
    'learn_rules',
    {
      provider: 'google',
      level: 'mid',
      thinking: 'enabled',
      effort: 'low',
      system_instruction: SYSTEM(opts.language),
      prompt: `RÈGLES ACTUELLES :\n${opts.current.map((r) => `- ${r}`).join('\n') || '(aucune)'}\n\nDES ÉTAPES ÉCRITES PAR L’IA (AVANT) ET CE QUE LES RÉDACTEURS DE L’USINE EN ONT FAIT (APRÈS) :\n${pairs.join('\n')}\n\nDonne 0 à 3 règles générales qui auraient évité ces corrections, seulement pour ce qui revient dans plusieurs exemples.`,
      json_schema: rulesSchema,
    },
    { scope: 'learn_edits', timeoutMs: 90_000 },
  )
  if (!res.json) throw new ApiError(messages().learning.proposals.analyzeFailed, 502)
  return { rules: clean(res.json.rules, opts.current).slice(0, 3), explanation: (res.json.explanation ?? '').trim() }
}

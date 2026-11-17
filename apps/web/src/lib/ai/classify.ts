/**
 * Le classement proposé à la demande (opération `classify`, toggle `nomenclature`) : pour une
 * instruction déjà écrite (importée, d'avant la nomenclature, ou reclassée), l'IA lit son titre, son
 * résumé, ses étapes, ce que la personne en a dit et le nom de ses fichiers, puis propose ses valeurs
 * dans chaque famille de l'usine. Dans une liste, rien d'inventé (`labelsFromAi`) ; la personne garde
 * ou retire, d'un toucher.
 */
import type { AiApi } from '../gateway/ai'
import { labelsFromAi, type Labels, type Nomenclature } from '../model/nomenclature'
import type { Instruction, InstructionContent } from '../model/types'
import { nomenclatureBlock } from './prompts'

const str = (description: string) => ({ type: 'string', description })

export const classifySchema = {
  type: 'object',
  properties: {
    labels: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          family: str('La famille, écrite comme dans la liste'),
          values: { type: 'array', items: { type: 'string' }, description: 'Ses valeurs pour cette instruction' },
        },
        required: ['family', 'values'],
      },
    },
  },
  required: ['labels'],
}

export function classifySystem(nomenclature: Nomenclature): string {
  return `Tu classes une instruction de travail d'usine selon la nomenclature de l'usine. Tu ne réécris rien : tu choisis seulement, pour chaque famille, ce qui s'applique.
${nomenclatureBlock(nomenclature)}`
}

/** Ce que l'IA lit d'une instruction pour la classer : peu de mots, l'essentiel. */
export function classifyPrompt(instr: Pick<Instruction, 'intent' | 'sources' | 'number'>, c: InstructionContent): string {
  const lines = [
    `TITRE : ${c.title}`,
    instr.number ? `NUMÉRO DE DOCUMENT : ${instr.number}` : '',
    c.summary ? `RÉSUMÉ : ${c.summary}` : '',
    c.equipment ? `ÉQUIPEMENT : ${c.equipment}` : '',
    instr.intent?.trim() ? `CE QUE LA PERSONNE EN A DIT : « ${instr.intent.trim()} »` : '',
    c.tags.length ? `MOTS-CLÉS : ${c.tags.join(', ')}` : '',
    instr.sources.length ? `FICHIERS : ${instr.sources.map((s) => s.originalName ?? s.name).filter(Boolean).slice(0, 20).join(' ; ')}` : '',
    'ÉTAPES :',
    ...c.steps.slice(0, 40).map((s, i) => `${i + 1}. ${s.title}${s.text ? ` — ${s.text}` : ''}`),
  ]
  return lines.filter(Boolean).join('\n')
}

/** Le classement proposé, ramené aux familles et aux valeurs de l'usine. */
export async function suggestLabels(ai: AiApi, instr: Pick<Instruction, 'intent' | 'sources' | 'number'>, content: InstructionContent, nomenclature: Nomenclature): Promise<Labels> {
  const res = await ai.ask<{ labels: unknown }>(
    'classify',
    { provider: 'google', level: 'low', thinking: 'disabled', system_instruction: classifySystem(nomenclature), prompt: classifyPrompt(instr, content), json_schema: classifySchema },
    { scope: 'classify', timeoutMs: 60_000 },
  )
  return labelsFromAi(res.json?.labels, nomenclature)
}

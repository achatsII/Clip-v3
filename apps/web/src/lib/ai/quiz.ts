/**
 * Les questions de formation d'une instruction (opération `quiz`, toggle `training`) : 3 à 5
 * questions à choix, sur ce qui compte vraiment (sécurité, valeurs, ordre des gestes, points
 * clés), dans la langue de l'instruction. L'auteur les retouche avant de publier.
 */
import { ApiError } from '../gateway/client'
import type { AiApi } from '../gateway/ai'
import { messages } from '../i18n/core'
import { cleanQuiz } from '../model/training'
import type { InstructionContent, QuizQuestion } from '../model/types'

const str = (description: string) => ({ type: 'string', description })

export const quizSchema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      description: '3 à 5 questions',
      items: {
        type: 'object',
        properties: {
          question: str('La question, courte et concrète, sans piège'),
          choices: { type: 'array', items: { type: 'string' }, description: '3 choix courts, un seul bon ; les autres plausibles' },
          answer: { type: 'number', description: 'Le rang du bon choix, 0 = premier' },
          why: str('Une phrase qui dit pourquoi c’est la bonne réponse'),
          step: { type: 'number', description: 'Le numéro de l’étape dont parle la question (1 = première)' },
        },
        required: ['question', 'choices', 'answer', 'why', 'step'],
      },
    },
  },
  required: ['questions'],
}

const inLanguage = (lang: string) => (lang === 'fr' ? 'en français québécois clair' : lang === 'en' ? 'in clear North American English' : `dans la langue « ${lang} »`)

export function quizSystem(lang: string): string {
  return `Tu prépares la courte vérification qui suit la formation d'un opérateur d'usine sur une instruction de travail. Tu écris 3 à 5 questions à choix qui vérifient ce qui compte vraiment au poste : les mises en garde et la sécurité, les valeurs à respecter (couple, pression, quantité), l'ordre des gestes qui ne se change pas, les points clés. Jamais une question de détail inutile, de mémoire de mots ou de piège.
- Une question courte et concrète, 3 choix courts ; un seul est bon, les autres sont des erreurs plausibles du plancher.
- Tout vient de l'instruction : n'invente aucune valeur, aucun geste.
- why : une phrase simple qui dit pourquoi c'est la bonne réponse.
- step : le numéro de l'étape dont parle la question.
- Langue : ${inLanguage(lang)}, celle de l'instruction.`
}

export function quizPrompt(c: InstructionContent): string {
  const lines = [`INSTRUCTION : ${c.title}`, c.summary ? `RÉSUMÉ : ${c.summary}` : '', c.safety.length ? `MISES EN GARDE GÉNÉRALES : ${c.safety.join(' | ')}` : '', 'ÉTAPES :']
  c.steps.forEach((s, i) => {
    const bits = [s.text, s.warning ? `(${s.warning.level} : ${s.warning.text})` : '', s.keyPoints?.length ? `(points clés : ${s.keyPoints.join(' ; ')})` : '']
    lines.push(`${i + 1}. ${s.title} — ${bits.filter(Boolean).join(' ')}`)
  })
  return lines.filter(Boolean).join('\n')
}

/** Les questions préparées par l'IA, rendues sûres. */
export async function makeQuiz(ai: AiApi, content: InstructionContent): Promise<QuizQuestion[]> {
  const res = await ai.ask<{ questions: unknown[] }>(
    'quiz',
    { provider: 'google', level: 'mid', thinking: 'disabled', system_instruction: quizSystem(content.language || 'fr'), prompt: quizPrompt(content), json_schema: quizSchema },
    { scope: 'quiz', timeoutMs: 90_000 },
  )
  const quiz = cleanQuiz(res.json?.questions, content.steps.map((s) => s.id))
  if (!quiz.length) throw new ApiError(messages().training.errors.empty, 502)
  return quiz
}

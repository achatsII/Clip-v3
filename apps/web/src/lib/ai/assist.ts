/**
 * L'IA dans l'éditeur, le lecteur et les réglages : chaque fonction est une opération d'IA
 * nommée, avec son prix au manifeste.
 */
import type { AiApi } from '../gateway/ai'
import { ApiError } from '../gateway/client'
import { getLang, messages, messagesIn } from '../i18n'
import { PPE } from '../model/catalog'
import { uid } from '../model/repo'
import { MAX_HTML_BYTES } from '../model/media'
import type { Annotation, AnnotationColor, InstructionContent, OrgSettings, Step, StepMedia, TranslatedContent, WritingStandard } from '../model/types'
import { AiStep, normalizeSteps, warningFrom } from './normalize'
import {
  annotatePrompt,
  annotateSystem,
  illustratePrompt,
  illustrateSystem,
  questionPrompt,
  questionSystem,
  standardAgentSystem,
  stepAssistPrompt,
  stepAssistSystem,
  translatePrompt,
  translateSystem,
  visualPrompt,
  visualSystem,
} from './prompts'
import {
  annotationSchema,
  answerSchema,
  illustrationSchema,
  standardSchema,
  stepEditSchema,
  translationSchema,
  visualSchema,
} from './schemas'

type OrgAi = Pick<OrgSettings, 'standard' | 'learnings'>

const COLORS: AnnotationColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'white', 'black']

/**
 * Une retouche d'étape : l'étape revient dans la langue de l'instruction (une instruction anglaise
 * retouchée reste anglaise), l'explication dans celle de l'outil, qui la montre.
 */
export async function assistStep(ai: AiApi, org: OrgAi, content: InstructionContent, step: Step, request: string) {
  const res = await ai.ask<{ title: string; text: string; keyPoints: string[]; warningLevel: string; warningText: string; explanation: string }>(
    'step_assist',
    {
      provider: 'google',
      level: 'mid',
      thinking: 'disabled',
      system_instruction: stepAssistSystem(org, content.language || 'fr', getLang()),
      prompt: stepAssistPrompt(content, step, request),
      json_schema: stepEditSchema,
    },
    { scope: step.id, timeoutMs: 60_000 },
  )
  const j = res.json
  if (!j?.title) throw new ApiError(messages().editor.ai.stepFailed, 502)
  const next: Step = {
    ...step,
    title: j.title.trim(),
    text: (j.text ?? '').trim(),
    keyPoints: (j.keyPoints ?? []).map((k) => k.trim()).filter(Boolean).slice(0, 3),
    warning: warningFrom(j.warningLevel, j.warningText),
  }
  return { step: next, explanation: (j.explanation ?? '').trim() }
}

export async function translateInstruction(ai: AiApi, content: InstructionContent, language: string): Promise<TranslatedContent> {
  const res = await ai.ask<{ title: string; summary: string; safety: string[]; steps: Array<{ id: string; title: string; text: string; keyPoints: string[]; warning: string }> }>(
    'translate',
    {
      provider: 'google',
      level: 'mid',
      thinking: 'disabled',
      system_instruction: translateSystem(language),
      prompt: translatePrompt(content),
      json_schema: translationSchema,
      maxOutputTokens: 16000,
    },
    { scope: `translate-${language}`, timeoutMs: 120_000 },
  )
  const j = res.json
  if (!j?.steps?.length) throw new ApiError(messages().editor.ai.translateFailed, 502)
  const ids = new Set(content.steps.map((s) => s.id))
  return {
    title: j.title,
    summary: j.summary,
    safety: j.safety ?? [],
    steps: j.steps
      .filter((s) => ids.has(s.id))
      .map((s) => ({ id: s.id, title: s.title, text: s.text, keyPoints: s.keyPoints ?? [], warning: s.warning?.trim() || null })),
  }
}

/**
 * Des marques sur une photo : ce que le geste de l'étape touche, ou exactement ce que la personne
 * demande (« encercle le bouton vert et écris Démarrer »).
 */
export async function annotateImage(ai: AiApi, imageUrl: string, step: Step, request?: string): Promise<Annotation[]> {
  const res = await ai.ask<{ marks: Array<{ label: string; shape: 'circle' | 'rect' | 'arrow'; box: number[]; color?: AnnotationColor }> }>(
    'annotate',
    {
      provider: 'google',
      level: 'mid',
      thinking: 'disabled',
      mediaResolution: 'high',
      system_instruction: annotateSystem(),
      prompt: annotatePrompt(step, request),
      files: [{ url: imageUrl, filename: 'photo.jpg', mimeType: 'image/jpeg' }],
      json_schema: annotationSchema,
    },
    { scope: request ? `${step.id}:${request}` : step.id, timeoutMs: 60_000 },
  )
  const marks = res.json?.marks ?? []
  const out: Annotation[] = []
  for (const m of marks.slice(0, request ? 5 : 3)) {
    const color: AnnotationColor = m.color && COLORS.includes(m.color) ? m.color : 'red'
    if (!Array.isArray(m.box) || m.box.length < 4) continue
    const [ymin, xmin, ymax, xmax] = m.box.map((v) => Math.min(1000, Math.max(0, Number(v) || 0)) / 1000)
    if (xmax <= xmin || ymax <= ymin) continue
    const cx = (xmin + xmax) / 2
    const cy = (ymin + ymax) / 2
    if (m.shape === 'arrow') {
      const fromX = cx > 0.5 ? Math.max(0.05, xmin - 0.18) : Math.min(0.95, xmax + 0.18)
      const fromY = cy > 0.5 ? Math.max(0.05, ymin - 0.14) : Math.min(0.95, ymax + 0.14)
      out.push({ id: uid('an_'), type: 'arrow', x: fromX, y: fromY, x2: cx, y2: cy, text: m.label, color })
    } else {
      out.push({ id: uid('an_'), type: m.shape === 'rect' ? 'rect' : 'circle', x: xmin, y: ymin, w: xmax - xmin, h: ymax - ymin, text: m.label, color })
    }
  }
  if (!out.length) throw new ApiError(messages().editor.ai.nothingToMark, 422)
  return out
}

export async function illustrationPrompt(ai: AiApi, imageUrl: string, step: Step): Promise<string> {
  const res = await ai.ask<{ prompt: string }>(
    'illustrate',
    {
      provider: 'google',
      level: 'mid',
      thinking: 'disabled',
      system_instruction: illustrateSystem(),
      prompt: illustratePrompt(step),
      files: [{ url: imageUrl, filename: 'photo.jpg', mimeType: 'image/jpeg' }],
      json_schema: illustrationSchema,
    },
    { scope: step.id, timeoutMs: 60_000 },
  )
  const p = res.json?.prompt?.trim()
  if (!p) throw new ApiError(messages().editor.ai.illustrationFailed, 502)
  return p
}

export async function answerQuestion(ai: AiApi, content: InstructionContent, stepIndex: number, question: string, language: string) {
  const res = await ai.ask<{ answer: string; stepNumber: number; confident: boolean }>(
    'ask_question',
    {
      provider: 'google',
      level: 'low',
      thinking: 'disabled',
      system_instruction: questionSystem(language),
      prompt: questionPrompt(content, stepIndex, question),
      json_schema: answerSchema,
    },
    { scope: 'question', timeoutMs: 45_000 },
  )
  const j = res.json
  if (!j?.answer) throw new ApiError(messages().editor.ai.noAnswer, 502)
  return { answer: j.answer.trim(), stepNumber: Math.round(j.stepNumber || 0), confident: !!j.confident }
}

export async function suggestStandard(ai: AiApi, description: string, current: WritingStandard) {
  const res = await ai.ask<Omit<WritingStandard, 'version' | 'updatedAt'> & { explanation: string }>(
    'standard_agent',
    {
      provider: 'google',
      level: 'mid',
      thinking: 'disabled',
      system_instruction: standardAgentSystem(getLang()),
      prompt: `STANDARD ACTUEL : ${JSON.stringify({ rules: current.rules, startWithSafety: current.startWithSafety, maxWordsPerStep: current.maxWordsPerStep, tone: current.tone, glossary: current.glossary })}\n\nCE QUE LA PERSONNE DÉCRIT : ${description}`,
      json_schema: standardSchema,
    },
    { scope: 'standard', timeoutMs: 60_000 },
  )
  const j = res.json
  if (!j?.rules?.length) throw new ApiError(messages().editor.ai.standardFailed, 502)
  return {
    proposal: {
      rules: j.rules.map((r) => r.trim()).filter(Boolean).slice(0, 12),
      startWithSafety: !!j.startWithSafety,
      maxWordsPerStep: Math.min(60, Math.max(10, Math.round(j.maxWordsPerStep || current.maxWordsPerStep))),
      tone: (['tu', 'vous', 'infinitif'].includes(j.tone) ? j.tone : current.tone) as WritingStandard['tone'],
      glossary: (j.glossary ?? []).filter((g) => g.term?.trim()).map((g) => ({ term: g.term.trim(), meaning: g.meaning.trim() })),
    },
    explanation: (j.explanation ?? '').trim(),
  }
}

/**
 * Un schéma pour une étape (opération `visual`) : une page HTML autonome — SVG, dessin, vue 3D —
 * qui devient un média de l'étape, affiché dans un cadre isolé.
 */
export async function createVisual(ai: AiApi, content: InstructionContent, step: Step, request: string): Promise<Extract<StepMedia, { kind: 'html' }>> {
  const res = await ai.ask<{ title: string; html: string }>(
    'visual',
    {
      provider: 'google',
      level: 'mid',
      thinking: 'enabled',
      effort: 'low',
      system_instruction: visualSystem(content.language || 'fr'),
      prompt: visualPrompt(content, step, request),
      json_schema: visualSchema,
      maxOutputTokens: 24000,
    },
    { scope: `${step.id}:${request}`, timeoutMs: 150_000 },
  )
  let html = (res.json?.html ?? '').trim()
  if (!html.includes('<')) throw new ApiError(messages().editor.ai.visualFailed, 502)
  if (!/^<!doctype|^<html/i.test(html)) html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#fff}</style></head><body>${html}</body></html>`
  if (new Blob([html]).size > MAX_HTML_BYTES) throw new ApiError(messages().editor.ai.visualTooHeavy, 422)
  // Le titre fait partie de l'instruction : à défaut, il est dans sa langue.
  return { kind: 'html', url: '', html, title: (res.json?.title ?? '').trim().slice(0, 80) || messagesIn(content.language || 'fr').editor.ai.visualTitle }
}

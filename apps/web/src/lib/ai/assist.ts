/**
 * L'IA dans l'éditeur, le lecteur et les réglages : chaque fonction est une opération d'IA
 * nommée, avec son prix au manifeste.
 */
import type { AiApi } from '../gateway/ai'
import { ApiError } from '../gateway/client'
import { PPE } from '../model/catalog'
import { uid } from '../model/repo'
import type { Annotation, InstructionContent, OrgSettings, Step, TranslatedContent, WritingStandard } from '../model/types'
import { AiStep, normalizeSteps, warningFrom } from './normalize'
import {
  annotatePrompt,
  annotateSystem,
  illustratePrompt,
  illustrateSystem,
  instructionEditPrompt,
  instructionEditSystem,
  questionPrompt,
  questionSystem,
  standardAgentSystem,
  stepAssistPrompt,
  stepAssistSystem,
  translatePrompt,
  translateSystem,
} from './prompts'
import {
  annotationSchema,
  answerSchema,
  illustrationSchema,
  instructionEditSchema,
  standardSchema,
  stepEditSchema,
  translationSchema,
} from './schemas'

type OrgAi = Pick<OrgSettings, 'standard' | 'learnings'>

export async function assistStep(ai: AiApi, org: OrgAi, content: InstructionContent, step: Step, request: string) {
  const res = await ai.ask<{ title: string; text: string; keyPoints: string[]; warningLevel: string; warningText: string; explanation: string }>(
    'step_assist',
    {
      provider: 'google',
      level: 'mid',
      thinking: 'disabled',
      system_instruction: stepAssistSystem(org),
      prompt: stepAssistPrompt(content, step, request),
      json_schema: stepEditSchema,
    },
    { scope: step.id, timeoutMs: 60_000 },
  )
  const j = res.json
  if (!j?.title) throw new ApiError("L'IA n'a pas pu corriger cette étape. Réessayez.", 502)
  const next: Step = {
    ...step,
    title: j.title.trim(),
    text: (j.text ?? '').trim(),
    keyPoints: (j.keyPoints ?? []).map((k) => k.trim()).filter(Boolean).slice(0, 3),
    warning: warningFrom(j.warningLevel, j.warningText),
  }
  return { step: next, explanation: (j.explanation ?? '').trim() }
}

export async function editInstruction(ai: AiApi, org: OrgAi, content: InstructionContent, request: string) {
  const res = await ai.ask<{ title: string; summary: string; ppe: string[]; tools: string[]; safety: string[]; steps: AiStep[]; explanation: string }>(
    'instruction_edit',
    {
      provider: 'google',
      level: 'mid',
      thinking: 'enabled',
      effort: 'low',
      system_instruction: instructionEditSystem(org),
      prompt: instructionEditPrompt(content, request),
      json_schema: instructionEditSchema,
      maxOutputTokens: 16000,
    },
    { scope: 'edit', timeoutMs: 120_000 },
  )
  const j = res.json
  if (!j?.steps?.length) throw new ApiError("L'IA n'a pas pu appliquer cette demande. Reformulez-la.", 502)
  const oldById = new Map(content.steps.map((s) => [s.id, s]))
  const keep = new Set(content.steps.map((s) => s.id))
  const steps = normalizeSteps(
    j.steps.map((s) => ({ ...s, media: [] })),
    new Map(),
    keep,
  ).map((s) => {
    const old = oldById.get(s.id)
    return old ? { ...s, media: old.media, energyPointId: old.energyPointId ?? null } : s
  })
  const next: InstructionContent = {
    ...content,
    title: j.title?.trim() || content.title,
    summary: j.summary?.trim() ?? content.summary,
    ppe: (j.ppe ?? content.ppe).filter((p) => p in PPE),
    tools: (j.tools ?? content.tools).map((t) => t.trim()).filter(Boolean),
    safety: (j.safety ?? content.safety).map((t) => t.trim()).filter(Boolean),
    steps,
  }
  return { content: next, explanation: (j.explanation ?? '').trim() }
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
  if (!j?.steps?.length) throw new ApiError("La traduction n'a pas pu être faite. Réessayez.", 502)
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

export async function annotateImage(ai: AiApi, imageUrl: string, step: Step): Promise<Annotation[]> {
  const res = await ai.ask<{ marks: Array<{ label: string; shape: 'circle' | 'rect' | 'arrow'; box: number[] }> }>(
    'annotate',
    {
      provider: 'google',
      level: 'mid',
      thinking: 'disabled',
      mediaResolution: 'high',
      system_instruction: annotateSystem(),
      prompt: annotatePrompt(step),
      files: [{ url: imageUrl, filename: 'photo.jpg', mimeType: 'image/jpeg' }],
      json_schema: annotationSchema,
    },
    { scope: step.id, timeoutMs: 60_000 },
  )
  const marks = res.json?.marks ?? []
  const out: Annotation[] = []
  for (const m of marks.slice(0, 3)) {
    if (!Array.isArray(m.box) || m.box.length < 4) continue
    const [ymin, xmin, ymax, xmax] = m.box.map((v) => Math.min(1000, Math.max(0, Number(v) || 0)) / 1000)
    if (xmax <= xmin || ymax <= ymin) continue
    const cx = (xmin + xmax) / 2
    const cy = (ymin + ymax) / 2
    if (m.shape === 'arrow') {
      const fromX = cx > 0.5 ? Math.max(0.05, xmin - 0.18) : Math.min(0.95, xmax + 0.18)
      const fromY = cy > 0.5 ? Math.max(0.05, ymin - 0.14) : Math.min(0.95, ymax + 0.14)
      out.push({ id: uid('an_'), type: 'arrow', x: fromX, y: fromY, x2: cx, y2: cy, text: m.label, color: 'red' })
    } else {
      out.push({ id: uid('an_'), type: m.shape === 'rect' ? 'rect' : 'circle', x: xmin, y: ymin, w: xmax - xmin, h: ymax - ymin, text: m.label, color: 'red' })
    }
  }
  if (!out.length) throw new ApiError("L'IA n'a rien trouvé à marquer sur cette image.", 422)
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
  if (!p) throw new ApiError("L'illustration n'a pas pu être préparée.", 502)
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
  if (!j?.answer) throw new ApiError('Je n’ai pas de réponse pour le moment.', 502)
  return { answer: j.answer.trim(), stepNumber: Math.round(j.stepNumber || 0), confident: !!j.confident }
}

export async function suggestStandard(ai: AiApi, description: string, current: WritingStandard) {
  const res = await ai.ask<Omit<WritingStandard, 'version' | 'updatedAt'> & { explanation: string }>(
    'standard_agent',
    {
      provider: 'google',
      level: 'mid',
      thinking: 'disabled',
      system_instruction: standardAgentSystem(),
      prompt: `STANDARD ACTUEL : ${JSON.stringify({ rules: current.rules, startWithSafety: current.startWithSafety, maxWordsPerStep: current.maxWordsPerStep, tone: current.tone, glossary: current.glossary })}\n\nCE QUE LA PERSONNE DÉCRIT : ${description}`,
      json_schema: standardSchema,
    },
    { scope: 'standard', timeoutMs: 60_000 },
  )
  const j = res.json
  if (!j?.rules?.length) throw new ApiError("L'IA n'a pas pu proposer de standard. Décrivez-le autrement.", 502)
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

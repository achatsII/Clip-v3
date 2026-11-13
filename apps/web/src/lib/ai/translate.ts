/**
 * Traduire une instruction pour les opérateurs : tout ce qu'ils lisent, médias compris.
 *
 * - Un appel (`translate`) traduit les textes des étapes, et en `extras` tout le reste : outils,
 *   équipement, fiche de cadenassage, légendes et textes alternatifs des médias, texte des
 *   annotations, titre et texte des schémas de l'IA (`visualText.ts` : le dessin et le code ne
 *   changent pas).
 * - En option (non cochée par défaut), les images où du texte se lit sont refaites par l'IA avec ce
 *   texte traduit. Le même appel les repère, en basse définition, pour ne payer (`translate_image`,
 *   une par image refaite) que celles qui en ont ; les illustrations de l'IA n'ont pas de texte.
 *
 * La traduction se range à côté du contenu (`translations[langue]`). Un média traduit nomme le
 * média d'origine (`of`) : s'il change ensuite, sa traduction ne s'applique plus.
 */
import type { AiApi, AskFile } from '../gateway/ai'
import { ApiError } from '../gateway/client'
import { messages } from '../i18n'
import { LANGUAGES } from '../model/catalog'
import { nowIso } from '../model/repo'
import { mediaKey } from '../model/translation'
import type { Check, InstructionContent, LockoutTranslation, MediaTranslation, StepMedia, TranslatedContent } from '../model/types'
import { translateExtrasSystem, translatedImagePrompt, translateImageSystem, translatePrompt, translateSystem } from './prompts'
import { extrasSchema, imageTextSchema, translationSchema } from './schemas'
import { visualTexts, type VisualTexts } from './visualText'

/** Un texte à traduire, avec ce qui dit où le remettre. */
export interface Segment {
  id: string
  text: string
}

/** Au plus tant d'images jointes pour repérer celles qui ont du texte (basse définition). */
export const MAX_IMAGES = 24

const hasLetter = (s: string | undefined): s is string => !!s && /\p{L}/u.test(s)

/** La langue telle que le modèle la lit : « français du Québec », « Español (code es) ». */
export function languageForAi(code: string): string {
  if (code === 'fr') return 'français du Québec'
  if (code === 'en') return 'anglais nord-américain (English)'
  const info = LANGUAGES[code]
  return info ? `${info.native} (code ${code})` : `la langue « ${code} »`
}

/** Un code de langue de la liste, à partir d'un code ou d'un nom (« es », « Español », « espagnol »). */
export function languageCode(input: string | undefined): string | null {
  const v = (input ?? '').trim().toLowerCase()
  if (!v) return null
  if (LANGUAGES[v]) return v
  const base = v.split(/[-_]/)[0]
  if (LANGUAGES[base]) return base
  const hit = Object.entries(LANGUAGES).find(([, info]) => info.native.toLowerCase() === v || info.label.toLowerCase() === v)
  return hit?.[0] ?? null
}

const mediaBase = (stepId: string, index: number) => `m:${stepId}:${index}`

/** Les textes d'un média : légende, texte alternatif, annotations, titre et texte d'un schéma. */
export function mediaSegments(stepId: string, index: number, m: StepMedia): { segments: Segment[]; visual: VisualTexts | null } {
  const base = mediaBase(stepId, index)
  const segments: Segment[] = []
  if (hasLetter(m.caption)) segments.push({ id: `${base}:caption`, text: m.caption })
  let visual: VisualTexts | null = null
  if (m.kind === 'image') {
    if (hasLetter(m.alt)) segments.push({ id: `${base}:alt`, text: m.alt })
    for (const a of m.annotations ?? []) if (hasLetter(a.text)) segments.push({ id: `${base}:a:${a.id}`, text: a.text })
  }
  if (m.kind === 'html') {
    if (hasLetter(m.title)) segments.push({ id: `${base}:title`, text: m.title })
    visual = visualTexts(m.html)
    visual?.items.forEach((it, k) => segments.push({ id: `${base}:${it.code ? 'code' : 'v'}:${k}`, text: it.text }))
  }
  return { segments, visual }
}

/** La traduction d'un média, à partir des textes traduits ; null s'il n'y a rien de traduit. */
export function mediaTranslationFrom(stepId: string, index: number, m: StepMedia, map: Map<string, string>, visual: VisualTexts | null): MediaTranslation | null {
  const base = mediaBase(stepId, index)
  const t: MediaTranslation = { of: mediaKey(m) }
  let any = false
  const caption = map.get(`${base}:caption`)
  if (caption) {
    t.caption = caption
    any = true
  }
  if (m.kind === 'image') {
    const alt = map.get(`${base}:alt`)
    if (alt) {
      t.alt = alt
      any = true
    }
    const labels: Record<string, string> = {}
    for (const a of m.annotations ?? []) {
      const v = map.get(`${base}:a:${a.id}`)
      if (v) labels[a.id] = v
    }
    if (Object.keys(labels).length) {
      t.labels = labels
      any = true
    }
  }
  if (m.kind === 'html') {
    const title = map.get(`${base}:title`)
    if (title) {
      t.title = title
      any = true
    }
    if (visual) {
      const translated = visual.items.map((it, k) => map.get(`${base}:${it.code ? 'code' : 'v'}:${k}`) ?? it.text)
      const html = visual.apply(translated)
      if (html !== m.html) {
        t.html = html
        any = true
      }
    }
  }
  return any ? t : null
}

/** Tout ce que l'opérateur lit en dehors des étapes et dans leurs médias, avec un id chacun. */
/** Les noms de sections, chacun une fois, dans l'ordre : traduits comme des textes à part. */
const sectionNames = (content: InstructionContent): string[] => [...new Set(content.steps.map((s) => s.section?.trim()).filter((x): x is string => !!x))]

export function contentSegments(content: InstructionContent): { segments: Segment[]; visuals: Map<string, VisualTexts | null> } {
  const segments: Segment[] = []
  const visuals = new Map<string, VisualTexts | null>()
  sectionNames(content).forEach((x, i) => hasLetter(x) && segments.push({ id: `section:${i}`, text: x }))
  content.tools.forEach((x, i) => hasLetter(x) && segments.push({ id: `tool:${i}`, text: x }))
  if (hasLetter(content.equipment)) segments.push({ id: 'equipment', text: content.equipment })
  const lo = content.lockout
  if (lo) {
    if (hasLetter(lo.equipment)) segments.push({ id: 'lo:equipment', text: lo.equipment })
    if (hasLetter(lo.location)) segments.push({ id: 'lo:location', text: lo.location })
    lo.material?.forEach((x, i) => hasLetter(x) && segments.push({ id: `lo:material:${i}`, text: x }))
    lo.restartSteps?.forEach((x, i) => hasLetter(x) && segments.push({ id: `lo:restart:${i}`, text: x }))
    for (const e of lo.energyPoints)
      for (const f of ['description', 'magnitude', 'isolationDevice', 'location', 'lockingMethod', 'verification'] as const) if (hasLetter(e[f])) segments.push({ id: `lo:ep:${e.id}:${f}`, text: e[f]! })
  }
  for (const s of content.steps)
    s.media.forEach((m, i) => {
      const r = mediaSegments(s.id, i, m)
      segments.push(...r.segments)
      if (r.visual) visuals.set(mediaBase(s.id, i), r.visual)
    })
  // Les relevés : leur libellé et leurs choix (les unités et les nombres ne se traduisent pas).
  for (const s of content.steps)
    for (const c of s.checks ?? []) {
      if (hasLetter(c.label)) segments.push({ id: `check:${s.id}:${c.id}`, text: c.label })
      for (const o of c.options ?? []) if (hasLetter(o.label)) segments.push({ id: `check:${s.id}:${c.id}:${o.id}`, text: o.label })
    }
  // Les questions de formation : l'énoncé, chaque choix (le bon garde son rang) et le pourquoi.
  for (const q of content.quiz ?? []) {
    if (hasLetter(q.question)) segments.push({ id: `quiz:${q.id}:q`, text: q.question })
    q.choices.forEach((c, i) => hasLetter(c) && segments.push({ id: `quiz:${q.id}:c:${i}`, text: c }))
    if (hasLetter(q.why)) segments.push({ id: `quiz:${q.id}:why`, text: q.why })
  }
  return { segments, visuals }
}

/** Les questions de formation dans la langue traduite ; rien si aucun texte n'a été traduit. */
export function quizFrom(quiz: InstructionContent['quiz'], map: Map<string, string>): TranslatedContent['quiz'] {
  const out = (quiz ?? []).flatMap((q) => {
    const question = map.get(`quiz:${q.id}:q`)
    const choices = q.choices.map((c, i) => map.get(`quiz:${q.id}:c:${i}`) ?? c)
    const anyChoice = q.choices.some((_, i) => map.has(`quiz:${q.id}:c:${i}`))
    const why = map.get(`quiz:${q.id}:why`)
    if (!question && !anyChoice && !why) return []
    return [{ id: q.id, ...(question ? { question } : {}), ...(anyChoice ? { choices } : {}), ...(why ? { why } : {}) }]
  })
  return out.length ? out : undefined
}

/** Les relevés d'une étape dans la langue traduite ; rien si aucun texte n'a été traduit. */
function checksFrom(stepId: string, checks: Check[] | undefined, map: Map<string, string>): NonNullable<TranslatedContent['steps'][number]['checks']> | undefined {
  const out = (checks ?? []).flatMap((c) => {
    const label = map.get(`check:${stepId}:${c.id}`)
    const options = Object.fromEntries((c.options ?? []).flatMap((o) => {
      const x = map.get(`check:${stepId}:${c.id}:${o.id}`)
      return x ? [[o.id, x]] : []
    }))
    if (!label && !Object.keys(options).length) return []
    return [{ id: c.id, ...(label ? { label } : {}), ...(Object.keys(options).length ? { options } : {}) }]
  })
  return out.length ? out : undefined
}

type TranslationJson = {
  title: string
  summary: string
  safety: string[]
  steps: Array<{ id: string; title: string; text: string; keyPoints: string[]; warning: string }>
  extras?: Array<{ id: string; text: string }>
  imagesWithText?: string[]
}

/** Les textes traduits, par id ; un texte vide ne remplace rien. */
const extrasMap = (extras: unknown): Map<string, string> =>
  new Map(
    (Array.isArray(extras) ? extras : [])
      .filter((e): e is { id: string; text: string } => !!e && typeof e.id === 'string' && typeof e.text === 'string' && !!e.text.trim())
      .map((e) => [e.id, e.text.trim()]),
  )

/** La traduction rangée, à partir de la réponse du modèle. */
export function buildTranslation(content: InstructionContent, j: TranslationJson, visuals: Map<string, VisualTexts | null>): TranslatedContent {
  const map = extrasMap(j.extras)
  const core = new Map((j.steps ?? []).filter((s) => s && typeof s.id === 'string').map((s) => [s.id, s]))
  const names = sectionNames(content)
  const steps = content.steps.flatMap((s) => {
    const x = core.get(s.id)
    const media = s.media.map((m, i) => mediaTranslationFrom(s.id, i, m, map, visuals.get(mediaBase(s.id, i)) ?? null))
    const withMedia = media.some(Boolean)
    const section = s.section?.trim() ? map.get(`section:${names.indexOf(s.section.trim())}`) : undefined
    const checks = checksFrom(s.id, s.checks, map)
    if (!x && !withMedia && !section && !checks) return []
    return [{ id: s.id, title: x?.title ?? '', text: x?.text ?? '', keyPoints: x?.keyPoints ?? [], warning: x?.warning?.trim() || null, ...(section ? { section } : {}), ...(withMedia ? { media } : {}), ...(checks ? { checks } : {}) }]
  })
  const lo = content.lockout
  const lockout: LockoutTranslation | undefined = lo
    ? {
        equipment: map.get('lo:equipment'),
        location: map.get('lo:location'),
        material: lo.material?.map((x, i) => map.get(`lo:material:${i}`) ?? x),
        restartSteps: lo.restartSteps?.map((x, i) => map.get(`lo:restart:${i}`) ?? x),
        energyPoints: lo.energyPoints.map((e) => ({
          id: e.id,
          description: map.get(`lo:ep:${e.id}:description`),
          magnitude: map.get(`lo:ep:${e.id}:magnitude`),
          isolationDevice: map.get(`lo:ep:${e.id}:isolationDevice`),
          location: map.get(`lo:ep:${e.id}:location`),
          lockingMethod: map.get(`lo:ep:${e.id}:lockingMethod`),
          verification: map.get(`lo:ep:${e.id}:verification`),
        })),
      }
    : undefined
  const quiz = quizFrom(content.quiz, map)
  return {
    title: j.title,
    summary: j.summary,
    safety: j.safety ?? [],
    steps,
    ...(content.tools.length ? { tools: content.tools.map((x, i) => map.get(`tool:${i}`) ?? x) } : {}),
    ...(map.get('equipment') ? { equipment: map.get('equipment') } : {}),
    ...(lockout ? { lockout } : {}),
    ...(quiz ? { quiz } : {}),
    translatedAt: nowIso(),
  }
}

/** Une image refaite, rangée dans la traduction (la traduction de l'étape se crée au besoin). */
function putImage(t: TranslatedContent, content: InstructionContent, stepId: string, index: number, m: StepMedia, url: string) {
  const step = content.steps.find((s) => s.id === stepId)
  if (!step) return
  let entry = t.steps.find((s) => s.id === stepId)
  if (!entry) {
    entry = { id: stepId, title: '', text: '' }
    t.steps.push(entry)
  }
  const media = Array.from({ length: step.media.length }, (_, i) => entry!.media?.[i] ?? null)
  media[index] = { ...(media[index] ?? { of: mediaKey(m) }), url }
  entry.media = media
}

/** Les images qu'on peut refaire : les photos et images figées (pas les illustrations de l'IA, sans texte). */
export function imageCandidates(content: InstructionContent) {
  return content.steps.flatMap((s, stepIndex) =>
    s.media.flatMap((m, index) => (m.kind === 'image' && m.url && !m.generated ? [{ stepId: s.id, stepIndex, index, media: m }] : [])),
  )
}

export interface TranslateProgress {
  phase: 'text' | 'images'
  done: number
  total: number
}

export interface TranslateResult {
  translation: TranslatedContent
  /** Les images refaites, ratées, et si la facturation a refusé (on s'arrête alors). */
  images: { redone: number; failed: number; refused: boolean }
}

/** Traduit toute l'instruction dans une langue (code de la liste) ; `images` : refaire les images avec du texte. */
export async function translateContent(ai: AiApi, content: InstructionContent, opts: { language: string; images?: boolean; onProgress?: (p: TranslateProgress) => void }): Promise<TranslateResult> {
  const name = languageForAi(opts.language)
  const { segments, visuals } = contentSegments(content)
  const candidates = opts.images ? imageCandidates(content).slice(0, MAX_IMAGES) : []
  const files: AskFile[] = candidates.map((c, i) => ({ url: c.media.url, filename: `I${i + 1}.jpg`, mimeType: 'image/jpeg' }))
  opts.onProgress?.({ phase: 'text', done: 0, total: 1 })
  const res = await ai.ask<TranslationJson>(
    'translate',
    {
      provider: 'google',
      level: 'mid',
      thinking: 'disabled',
      system_instruction: translateSystem(name, files.length > 0),
      prompt: translatePrompt(content, segments, candidates.map((c, i) => `I${i + 1} = étape ${c.stepIndex + 1}, média ${c.index + 1}`)),
      json_schema: translationSchema(files.length > 0),
      maxOutputTokens: 24000,
      ...(files.length ? { files, mediaResolution: 'low' as const } : {}),
    },
    { scope: `translate-${opts.language}`, timeoutMs: 180_000 },
  )
  const j = res.json
  if (!j?.steps?.length) throw new ApiError(messages().editor.ai.translateFailed, 502)
  const translation = buildTranslation(content, j, visuals)
  const images = { redone: 0, failed: 0, refused: false }
  if (candidates.length) {
    const wanted = new Set((Array.isArray(j.imagesWithText) ? j.imagesWithText : []).map((s) => String(s).trim().toUpperCase()))
    const todo = candidates.filter((_, i) => wanted.has(`I${i + 1}`))
    let done = 0
    opts.onProgress?.({ phase: 'images', done, total: todo.length })
    // Deux à la fois : chaque image prend de 20 à 60 s ; un refus de facturation arrête la suite.
    const queue = [...todo]
    const worker = async () => {
      for (let c = queue.shift(); c && !images.refused; c = queue.shift()) {
        try {
          const url = await translateImage(ai, c.media.url, opts.language)
          if (url) {
            putImage(translation, content, c.stepId, c.index, c.media, url)
            images.redone++
          }
        } catch (e) {
          images.failed++
          if (e instanceof ApiError && (e.status === 402 || e.status === 403)) images.refused = true
        }
        opts.onProgress?.({ phase: 'images', done: ++done, total: todo.length })
      }
    }
    await Promise.all([worker(), worker()])
  }
  if (opts.images) translation.images = true
  return { translation, images }
}

/** Les textes d'un seul média traduits (l'assistant) : légende, annotations, schéma. Null s'il n'y a rien à traduire. */
export async function translateMediaTexts(ai: AiApi, stepId: string, index: number, m: StepMedia, language: string): Promise<MediaTranslation | null> {
  const { segments, visual } = mediaSegments(stepId, index, m)
  if (!segments.length) return null
  const res = await ai.ask<{ extras: Array<{ id: string; text: string }> }>(
    'step_assist',
    {
      provider: 'google',
      level: 'mid',
      thinking: 'disabled',
      system_instruction: translateExtrasSystem(languageForAi(language)),
      prompt: JSON.stringify({ extras: segments }),
      json_schema: extrasSchema,
      maxOutputTokens: 12000,
    },
    { scope: `translate-media-${language}`, timeoutMs: 120_000 },
  )
  const map = extrasMap(res.json?.extras)
  if (!map.size) throw new ApiError(messages().editor.ai.translateFailed, 502)
  return mediaTranslationFrom(stepId, index, m, map, visual)
}

/** La taille d'une image, lue par le navigateur ; null sans navigateur ou si elle ne se charge pas. */
function naturalSize(url: string): Promise<{ width: number; height: number } | null> {
  if (typeof Image === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    const timer = setTimeout(() => resolve(null), 8000)
    img.onload = () => {
      clearTimeout(timer)
      resolve(img.naturalWidth && img.naturalHeight ? { width: img.naturalWidth, height: img.naturalHeight } : null)
    }
    img.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
    img.src = url
  })
}

/** Le format de l'image refaite : le plus proche de l'original parmi ceux que le modèle d'image sait faire. */
export function outputSize(size: { width: number; height: number } | null): { width: number; height: number } {
  if (!size) return { width: 1024, height: 1024 }
  const r = size.width / size.height
  if (r >= 1.25) return { width: 1536, height: 1024 }
  if (r <= 0.8) return { width: 1024, height: 1536 }
  return { width: 1024, height: 1024 }
}

/**
 * L'image refaite avec son texte traduit (`translate_image`) : le modèle lit le texte et le traduit,
 * puis le modèle d'image refait la même image avec ce texte. Null s'il n'y a pas de texte à traduire.
 */
export async function translateImage(ai: AiApi, imageUrl: string, language: string): Promise<string | null> {
  const res = await ai.ask<{ texts: Array<{ from: string; to: string }> }>(
    'translate_image',
    {
      provider: 'google',
      level: 'mid',
      thinking: 'disabled',
      mediaResolution: 'high',
      system_instruction: translateImageSystem(languageForAi(language)),
      prompt: 'Lis le texte écrit sur cette image et traduis-le.',
      files: [{ url: imageUrl, filename: 'image.jpg', mimeType: 'image/jpeg' }],
      json_schema: imageTextSchema,
    },
    { scope: `translate-image-${language}`, timeoutMs: 90_000 },
  )
  const texts = (Array.isArray(res.json?.texts) ? res.json!.texts : [])
    .filter((t) => typeof t?.from === 'string' && typeof t?.to === 'string' && t.from.trim() && t.to.trim() && t.from.trim() !== t.to.trim())
    .slice(0, 12)
  if (!texts.length) return null
  return ai.generateImage(translatedImagePrompt(texts), [imageUrl], outputSize(await naturalSize(imageUrl)))
}

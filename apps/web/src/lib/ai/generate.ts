/**
 * La génération d'une instruction à partir des sources capturées : un seul appel multimodal à
 * AskAI v4 (Gemini, seul fournisseur qui lit la vidéo), puis le post-traitement.
 */
import type { AiApi, AiOperation, AskBody, AskFile } from '../gateway/ai'
import { ApiError } from '../gateway/client'
import { contentLanguage, messages } from '../i18n'
import type { FilesApi } from '../gateway/files'
import { figureKey, figureMedia, figureRect, type FigureBox } from '../media/figures'
import { cropImage } from '../media/image'
import type { InstructionContent, OrgSettings, Source, StepMedia } from '../model/types'
import { sourceDetail } from './creation'
import { locateFigures } from './figures'
import { AiInstruction, normalizeInstruction, type MarkHint } from './normalize'
import { generationPrompt, generationSystem, importSystem, SourceLine } from './prompts'
import { instructionSchema } from './schemas'

export const GEMINI_MAX_BYTES = 100 * 1024 * 1024

export interface Tier {
  op: Extract<AiOperation, 'generate_s' | 'generate_m' | 'generate_l'>
  label: string
  tooBig: boolean
}

export function measureSources(sources: Source[]) {
  let videoSec = 0
  let audioSec = 0
  let photos = 0
  let pages = 0
  let notes = 0
  for (const s of sources) {
    if (s.kind === 'video') videoSec += s.durationSec ?? 60
    else if (s.kind === 'audio') audioSec += s.durationSec ?? 60
    else if (s.kind === 'photo') photos++
    else if (s.kind === 'document') pages += s.pageCount ?? 5
    else notes++
  }
  return { videoSec, audioSec, photos, pages, notes }
}

/**
 * Ce que l'IA lit en une fois pour une instruction, en autant de fichiers qu'il faut (dix vidéos de
 * trois minutes passent) : au-delà, on la sépare en plusieurs. Une vidéo trop lourde pour l'IA est
 * réduite toute seule (`prepareForAi`) : la taille d'un fichier ne bloque pas.
 */
export const GENERATION_LIMITS = { videoSec: 1800, audioSec: 2700, photos: 80, pages: 60 } as const
export type LimitKind = keyof typeof GENERATION_LIMITS
/** La limite la plus proche se montre dès 80 %, avant qu'elle bloque. */
export const NEAR_LIMIT = 0.8

export interface LimitUse {
  kind: LimitKind
  used: number
  max: number
  ratio: number
}

/** Où en est chaque limite utilisée, de la plus proche à la plus loin. */
export function limitUse(sources: Source[]): LimitUse[] {
  const m = measureSources(sources)
  return (Object.keys(GENERATION_LIMITS) as LimitKind[])
    .map((kind) => ({ kind, used: m[kind], max: GENERATION_LIMITS[kind], ratio: m[kind] / GENERATION_LIMITS[kind] }))
    .filter((u) => u.used > 0)
    .sort((a, b) => b.ratio - a.ratio)
}

/** Choisit l'opération selon la taille réelle des sources (une opération par taille de lot). */
export function generationTier(sources: Source[]): Tier {
  const m = measureSources(sources)
  const t = messages().capture.tiers
  if (m.videoSec <= 180 && m.audioSec <= 300 && m.photos <= 15 && m.pages <= 10) return { op: 'generate_s', label: t.short, tooBig: false }
  if (m.videoSec <= 600 && m.audioSec <= 900 && m.photos <= 40 && m.pages <= 30) return { op: 'generate_m', label: t.medium, tooBig: false }
  const tooBig = (Object.keys(GENERATION_LIMITS) as LimitKind[]).some((k) => m[k] > GENERATION_LIMITS[k])
  return { op: 'generate_l', label: t.long, tooBig }
}

function fmtDuration(sec?: number) {
  if (!sec || sec <= 0) return 'durée inconnue'
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return m ? `${m} min ${String(s).padStart(2, '0')} s` : `${s} s`
}

export type Stage = 'prepare' | 'analyze' | 'finish'

/** Gemini nomme la vidéo QuickTime `video/mov` (les iPhone filment en .mov). */
function geminiMime(s: Source): string {
  const m = (s.mimeType || (s.kind === 'video' ? 'video/mp4' : 'audio/mp4')).split(';')[0]
  if (m === 'video/quicktime') return 'video/mov'
  if (m === 'audio/x-m4a' || m === 'audio/m4a') return 'audio/mp4'
  return m
}

/** Un instant dans une note, comme on le lit : « 0:42 ». */
function clockOf(sec: number): string {
  const t = Math.max(0, Math.round(sec))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

/**
 * Les photos prises en parlant, par note de série : seulement celles dont la note fait partie des
 * sources données (une revue de quelques sources peut ne pas l'avoir).
 */
export function narratedPhotos(sources: Source[]): Map<string, Source[]> {
  const audio = new Set(sources.filter((s) => s.kind === 'audio').map((s) => s.id))
  const out = new Map<string, Source[]>()
  for (const s of sources) {
    if (s.kind !== 'photo' || !s.voice || !audio.has(s.voice.sourceId)) continue
    out.set(s.voice.sourceId, [...(out.get(s.voice.sourceId) ?? []), s])
  }
  return out
}

/**
 * Prépare les fichiers pour l'IA : vidéos (et notes vocales sans transcription) téléversées chez
 * Gemini, URI réutilisée tant qu'elle vit. Rend les sources mises à jour, à enregistrer.
 *
 * Une note dite pendant une série de photos part aussi en fichier, transcrite ou non : l'IA entend
 * à quel instant chaque chose est dite, et chaque photo dit le sien. `ids` : les numéros à donner
 * aux sources (S1, S2… par défaut), pour qu'une revue de quelques sources garde ceux de l'instruction.
 */
export async function prepareForAi(
  sources: Source[],
  files: FilesApi,
  onSource?: (index: number, total: number) => void,
  ids?: string[],
): Promise<{ sources: Source[]; askFiles: AskFile[]; lines: SourceLine[] }> {
  const updated: Source[] = []
  const askFiles: AskFile[] = []
  const lines: SourceLine[] = []
  const soon = Date.now() + 60 * 60 * 1000
  const idOf = new Map(sources.map((s, i) => [s.id, ids?.[i] ?? `S${i + 1}`]))
  const narrated = narratedPhotos(sources)

  for (let i = 0; i < sources.length; i++) {
    onSource?.(i, sources.length)
    let s = { ...sources[i] }
    const id = idOf.get(s.id) ?? `S${i + 1}`
    const series = s.kind === 'audio' ? narrated.get(s.id) : undefined
    if ((s.kind === 'video' || (s.kind === 'audio' && (!s.text || series))) && s.url) {
      const fresh = s.geminiFileUri && s.geminiExpiresAt && Date.parse(s.geminiExpiresAt) > soon
      if (!fresh) {
        if (s.kind === 'video' && (s.sizeBytes ?? 0) > GEMINI_MAX_BYTES) {
          // Une longue vidéo peut rester au-dessus de la limite en 720p : on refait en 480p pour l'IA
          // (la vidéo de l'instruction, elle, garde sa qualité).
          let processed = await files.processVideo(s.url)
          if ((processed.sizeBytes ?? 0) > GEMINI_MAX_BYTES) processed = await files.processVideo(s.url, '480p')
          s = { ...s, url: processed.url, sizeBytes: processed.sizeBytes ?? s.sizeBytes, durationSec: s.durationSec ?? processed.durationSec ?? undefined }
        }
        const g = await files.geminiUpload(s.url!, geminiMime(s), s.sizeBytes ?? 0, s.name ?? `${id}.${s.kind === 'video' ? 'mp4' : 'm4a'}`)
        s = { ...s, geminiFileUri: g.uri, geminiExpiresAt: g.expiresAt ?? new Date(Date.now() + 46 * 3600 * 1000).toISOString() }
      }
      askFiles.push({ geminiFileUri: s.geminiFileUri, filename: s.name ?? id, mimeType: geminiMime(s) })
      lines.push({
        id,
        line:
          s.kind === 'video'
            ? `${id} — vidéo, ${fmtDuration(s.durationSec)}, « ${s.name ?? 'vidéo'} » (fichier joint n° ${askFiles.length})`
            : series
              ? `${id} — commentaire dit à voix haute pendant la prise des photos ${series.map((p) => idOf.get(p.id)).join(', ')}, ${fmtDuration(s.durationSec)} (fichier joint n° ${askFiles.length})${s.text ? ` ; transcription : « ${s.text} »` : ''}. Chaque photo porte l’instant de sa prise dans ce commentaire : ce qui est dit juste avant et juste après cet instant décrit cette photo.`
              : `${id} — note vocale, ${fmtDuration(s.durationSec)} (fichier joint n° ${askFiles.length})`,
      })
    } else if (s.kind === 'audio') {
      lines.push({ id, line: `${id} — note vocale (transcription) : « ${s.text} »` })
    } else if (s.kind === 'photo' && s.url) {
      askFiles.push({ url: s.url, filename: s.name ?? `${id}.jpg`, mimeType: s.mimeType || 'image/jpeg', sizeBytes: s.sizeBytes })
      const said = s.voice && narrated.has(s.voice.sourceId) ? `, prise à ${clockOf(s.voice.at)} du commentaire ${idOf.get(s.voice.sourceId)}` : ''
      lines.push({ id, line: `${id} — photo « ${s.name ?? 'photo'} » (fichier joint n° ${askFiles.length})${said}${s.text ? ` — légende : « ${s.text} »` : ''}` })
    } else if (s.kind === 'document' && s.url) {
      askFiles.push({ url: s.url, filename: s.name ?? `${id}.pdf`, mimeType: 'application/pdf', sizeBytes: s.sizeBytes })
      lines.push({ id, line: `${id} — document PDF « ${s.originalName ?? s.name ?? 'document'} »${s.pageCount ? `, ${s.pageCount} pages` : ''} (fichier joint n° ${askFiles.length})` })
    } else if (s.kind === 'note' && s.text) {
      lines.push({ id, line: `${id} — note écrite : « ${s.text} »` })
    }
    updated.push(s)
  }
  return { sources: updated, askFiles, lines }
}

export interface GenerateInput {
  ai: AiApi
  files: FilesApi
  org: Pick<OrgSettings, 'standard' | 'learnings' | 'nomenclature'>
  sources: Source[]
  intent?: string
  title?: string
  stationNames: string[]
  forceKind?: 'procedure' | 'lockout'
  /** La langue d'écriture : celle de l'instruction qu'on régénère, sinon celle de l'outil de l'auteur. */
  language?: string
  /** Proposer des relevés (`proposeChecks`) ; non : aucun. Oui par défaut. */
  checks?: boolean
  onStage?: (stage: Stage, detail?: string) => void
  signal?: AbortSignal
}

export interface GenerateOutput {
  content: InstructionContent
  /** Les images où l'IA veut un repère : annotées ensuite sur l'image elle-même (`annotateMarks`). */
  marks: MarkHint[]
  sources: Source[]
  stationGuess: string | null
  questions: string[]
  /** Les réponses proposées aux questions qui en ont (clé : la question). */
  choices: Record<string, string[]>
  model: string | null
  operation: AiOperation
  /** Le classement proposé par l'IA, tel quel (`labelsFromAi` le ramène aux familles de l'usine). */
  aiLabels: unknown
}

/** La génération prête à partir : la même requête, qu'elle tourne sur l'appareil ou au serveur. */
export interface PreparedGeneration {
  operation: Tier['op']
  language: string
  /** Les sources envoyées à l'IA, mises à jour (URI Gemini), dans l'ordre : S1 = la première. */
  sources: Source[]
  /** Toutes les sources de l'instruction, avec ces mises à jour (à enregistrer). */
  allSources: Source[]
  ask: AskBody
}

/**
 * Prépare la génération : les vidéos chez Gemini, puis la requête AskAI v4 (consignes, sources,
 * schéma). Un seul endroit pour les deux chemins : sur l'appareil (`generateInstruction`) et au
 * serveur (Job_start, branche clip-v3, qui roule cette requête telle quelle).
 */
export async function prepareGeneration(input: Omit<GenerateInput, 'ai' | 'signal'>): Promise<PreparedGeneration> {
  const language = input.language ?? contentLanguage()
  const t = messages().capture.generate
  const usable = input.sources.filter((s) => s.url || s.text)
  if (!usable.length) throw new ApiError(t.noSources, 400)
  const tier = generationTier(usable)
  if (tier.tooBig) {
    // Laquelle des limites : une régénération depuis l'éditeur le dit aussi précisément que la capture.
    const over = limitUse(usable)[0]
    const board = messages().capture.board
    throw new ApiError(over && over.ratio > 1 ? board.overLimit(board.limit[over.kind](over.used, over.max)) : t.tooBig, 400)
  }

  input.onStage?.('prepare')
  // Le détail s'écrit sans mots (« 2/5 ») : chaque appareil le lit dans sa langue.
  const prepared = await prepareForAi(usable, input.files, (i, n) => input.onStage?.('prepare', sourceDetail(i + 1, n)))
  const m = measureSources(prepared.sources)
  return {
    operation: tier.op,
    language,
    sources: prepared.sources,
    allSources: mergeSources(input.sources, prepared.sources),
    ask: {
      provider: 'google',
      level: 'mid',
      thinking: 'enabled',
      effort: 'low',
      mediaResolution: m.videoSec > 300 ? 'low' : 'medium',
      maxOutputTokens: 24000,
      system_instruction: generationSystem(input.org, { language, forceKind: input.forceKind, checks: input.checks !== false }),
      prompt: generationPrompt({ intent: input.intent, title: input.title, stations: input.stationNames, sources: prepared.lines }),
      files: prepared.askFiles,
      json_schema: instructionSchema,
    },
  }
}

/**
 * Ce que l'IA a rendu, mis en forme ; le même traitement que la réponse vienne de l'appareil ou du
 * serveur. Les sources gardent leur ordre : S1 = la première source envoyée.
 */
export function finishGeneration(json: AiInstruction | null | undefined, sources: Source[], language: string, opts: { checks?: boolean } = {}) {
  if (!json) throw new ApiError(messages().capture.generate.noInstruction, 502)
  const out = normalizeInstruction(json, sources, language)
  if (!out.content.steps.length) throw new ApiError(messages().capture.generate.noSteps, 422)
  // Pas de relevés demandés : ceux que l'IA aurait proposés quand même ne restent pas.
  if (opts.checks === false) out.content = { ...out.content, steps: out.content.steps.map(({ checks: _c, ...step }) => step) }
  return out
}

export async function generateInstruction(input: GenerateInput): Promise<GenerateOutput> {
  const p = await prepareGeneration(input)
  input.onStage?.('analyze')
  const result = await input.ai.ask<AiInstruction>(p.operation, p.ask, { scope: 'generation', timeoutMs: 300_000, signal: input.signal })
  if (!result.json) throw new ApiError(messages().capture.generate.noInstruction, 502)

  input.onStage?.('finish')
  const { content, stationGuess, questions, choices, marks, aiLabels } = finishGeneration(result.json, p.sources, p.language, { checks: input.checks })
  return { content, marks, sources: p.allSources, stationGuess, questions, choices, model: result.model, operation: p.operation, aiLabels }
}

function mergeSources(all: Source[], updated: Source[]): Source[] {
  const byId = new Map(updated.map((s) => [s.id, s]))
  return all.map((s) => byId.get(s.id) ?? s)
}

/**
 * La requête d'un import (une ancienne instruction en PDF) : la même pour l'appareil et le serveur
 * (Job_start, branche clip-v3). Le document est S1. Une présentation PowerPoint lue dans l'app
 * (`sources` : sa note, puis ses images) part avec son texte dans la demande et ses images jointes.
 */
export function importAsk(input: { org: Pick<OrgSettings, 'standard' | 'learnings' | 'nomenclature'>; source: Source; sources?: Source[]; stationNames: string[]; language?: string }): { operation: AiOperation; language: string; ask: AskBody } {
  const language = input.language ?? contentLanguage()
  // Une présentation lue dans l'app commence par sa note (même sans image).
  if (input.sources?.[0]?.kind === 'note') return slidesImportAsk(input.org, input.sources, input.stationNames, language)
  const pages = input.source.pageCount ?? 5
  const operation: AiOperation = pages > 12 ? 'import_l' : 'import_s'
  return {
    operation,
    language,
    ask: {
      provider: 'google',
      level: 'mid',
      thinking: 'enabled',
      effort: 'low',
      maxOutputTokens: 24000,
      system_instruction: importSystem(input.org, language),
      prompt: generationPrompt({
        stations: input.stationNames,
        sources: [{ id: 'S1', line: `S1 — ancienne instruction PDF « ${input.source.originalName ?? input.source.name ?? 'document'} »${input.source.pageCount ? `, ${input.source.pageCount} pages` : ''} (fichier joint n° 1)` }],
      }),
      files: [{ url: input.source.url, filename: input.source.name ?? 'document.pdf', mimeType: 'application/pdf', sizeBytes: input.source.sizeBytes }],
      json_schema: instructionSchema,
    },
  }
}

/**
 * L'import d'une présentation lue dans l'app : S1 est sa note (le texte de chaque diapositive, dans la
 * demande), les suivantes ses images (jointes). Sa taille se compte en diapositives, comme les pages.
 */
function slidesImportAsk(org: Pick<OrgSettings, 'standard' | 'learnings' | 'nomenclature'>, sources: Source[], stationNames: string[], language: string): { operation: AiOperation; language: string; ask: AskBody } {
  const [note, ...images] = sources
  const photos = images.filter((s) => s.kind === 'photo' && s.url)
  const slides = note.pageCount ?? 5
  const lines = [
    { id: 'S1', line: `S1 — texte de la présentation « ${note.originalName ?? note.name ?? 'presentation.pptx'} » :\n${note.text ?? ''}` },
    ...images.map((s, i) => ({ id: `S${i + 2}`, line: `S${i + 2} — image « ${s.name ?? ''} »${photos.includes(s) ? ` (fichier joint n° ${photos.indexOf(s) + 1})` : ''}` })),
  ]
  return {
    operation: slides > 12 || photos.length > 20 ? 'import_l' : 'import_s',
    language,
    ask: {
      provider: 'google',
      level: 'mid',
      thinking: 'enabled',
      effort: 'low',
      maxOutputTokens: 24000,
      system_instruction: importSystem(org, language, 'slides'),
      prompt: generationPrompt({ stations: stationNames, sources: lines }),
      files: photos.map((s) => ({ url: s.url!, filename: s.name ?? 'image.jpg', mimeType: s.mimeType ?? 'image/jpeg', sizeBytes: s.sizeBytes })),
      json_schema: instructionSchema,
    },
  }
}

/** Import d'une ancienne instruction (PDF, ou présentation lue dans l'app) : même résultat qu'une génération. */
export async function importDocument(input: {
  ai: AiApi
  org: Pick<OrgSettings, 'standard' | 'learnings' | 'nomenclature'>
  source: Source
  /** Une présentation lue dans l'app : sa note, puis ses images (S1, S2…). */
  sources?: Source[]
  stationNames: string[]
}): Promise<{ content: InstructionContent; stationGuess: string | null; questions: string[]; choices: Record<string, string[]>; model: string | null; operation: AiOperation; aiLabels: unknown }> {
  const { operation, language, ask } = importAsk(input)
  const result = await input.ai.ask<AiInstruction>(operation, ask, { scope: 'import', timeoutMs: 300_000 })
  if (!result.json) throw new ApiError(messages().capture.generate.unreadableDocument, 502)
  const n = normalizeInstruction(result.json, input.sources?.length ? input.sources : [input.source], language)
  return { ...n, model: result.model, operation }
}

/** Les figures des documents (toggle `documentFigures`) : l'IA qui les trouve, et le recadrage. */
export interface FigureOptions {
  ai: AiApi
  /** Rend la figure recadrée en JPEG, ou null ; par défaut dans le navigateur (`cropImage`). */
  crop?: (png: Blob, box: FigureBox) => Promise<Blob | null>
  /** Le recadrage commence (il peut prendre quelques secondes par page). */
  onStart?: () => void
}

/** Une page qui a des figures à recadrer se rend plus fine : la figure garde ses détails. */
const FIGURE_DPI = 200
/** Les pages se traitent trois à la fois. */
const PAGES_AT_ONCE = 3

const cropFigure = (png: Blob, box: FigureBox) => cropImage(png, (w, h) => figureRect(box, w, h))

/**
 * Vignettes des extraits vidéo (une capture par extrait) et images des pages de documents ; avec
 * `figures`, la figure d'une page qu'une étape demande se recadre et devient son image.
 * Ne bloque jamais : un média sans vignette reste utilisable, une figure introuvable laisse la page.
 */
export async function enrichMedia(content: InstructionContent, files: FilesApi, uploadPng: (png: Blob, name: string) => Promise<string>, opts: { figures?: FigureOptions | null } = {}): Promise<InstructionContent> {
  const next: InstructionContent = { ...content, steps: content.steps.map((s) => ({ ...s, media: s.media.map((m) => ({ ...m })) as StepMedia[] })) }
  const byVideo = new Map<string, Array<{ stepIndex: number; mediaIndex: number; at: number }>>()
  const docs: Array<{ stepIndex: number; mediaIndex: number; url: string; page: number; figure?: string }> = []
  next.steps.forEach((s, si) =>
    s.media.forEach((m, mi) => {
      if (m.kind === 'video' && !m.posterUrl) {
        const list = byVideo.get(m.url) ?? []
        list.push({ stepIndex: si, mediaIndex: mi, at: m.start + Math.min(1.5, (m.end - m.start) / 3) })
        byVideo.set(m.url, list)
      } else if (m.kind === 'image' && m.frame && !m.url) {
        // Image figée choisie par l'IA : tirée de la vidéo à l'instant dit.
        const list = byVideo.get(m.frame.videoUrl) ?? []
        list.push({ stepIndex: si, mediaIndex: mi, at: m.frame.at })
        byVideo.set(m.frame.videoUrl, list)
      } else if (m.kind === 'document' && !m.pageImageUrl && /ii-file\.tor1\.digitaloceanspaces\.com/.test(m.url)) {
        docs.push({ stepIndex: si, mediaIndex: mi, url: m.url, page: m.page ?? 1, ...(m.figure ? { figure: m.figure } : {}) })
      }
    }),
  )
  for (const [videoUrl, shots] of byVideo) {
    try {
      const urls = await files.screenshots(
        videoUrl,
        shots.map((s, i) => ({ name: `shot-${i}`, atSec: s.at })),
      )
      shots.forEach((s, i) => {
        const url = urls[`shot-${i}`]
        const media = next.steps[s.stepIndex].media[s.mediaIndex]
        if (url && media.kind === 'video') media.posterUrl = url
        if (url && media.kind === 'image' && media.frame) media.url = url
      })
    } catch {
      /* vignettes facultatives ; une image figée manquante redevient l'extrait (plus bas) */
    }
  }
  // Une image figée qu'on n'a pas pu tirer redevient son extrait vidéo : l'étape garde un média.
  next.steps.forEach((s) => {
    s.media = s.media.map((m) => (m.kind === 'image' && m.frame && !m.url ? { kind: 'video', url: m.frame.videoUrl, sourceId: m.sourceId, start: m.frame.start, end: m.frame.end } : m))
  })
  // Chaque page citée se rend une fois ; ses figures demandées se trouvent en une seule question.
  const pages = new Map<string, typeof docs>()
  for (const d of docs) pages.set(`${d.url}#${d.page}`, [...(pages.get(`${d.url}#${d.page}`) ?? []), d])
  const figures = opts.figures ?? null
  if (figures && docs.some((d) => d.figure)) figures.onStart?.()
  const entries = [...pages.entries()]
  for (let i = 0; i < entries.length; i += PAGES_AT_ONCE) {
    await Promise.all(entries.slice(i, i + PAGES_AT_ONCE).map(([key, list]) => enrichPage(next, key, list, files, uploadPng, figures)))
  }
  // Ce que l'IA voulait prendre n'a plus à voyager avec l'instruction.
  for (const s of next.steps) for (const m of s.media) if (m.kind === 'document' && 'figure' in m) delete m.figure
  return next
}

async function enrichPage(
  next: InstructionContent,
  key: string,
  list: Array<{ stepIndex: number; mediaIndex: number; url: string; page: number; figure?: string }>,
  files: FilesApi,
  uploadPng: (png: Blob, name: string) => Promise<string>,
  figures: FigureOptions | null,
): Promise<void> {
  const { url, page } = list[0]
  // Les figures demandées sur cette page, une fois chacune (deux étapes peuvent montrer la même) :
  // la première façon de la nommer est celle qu'on garde.
  const byKey = new Map<string, string>()
  if (figures) for (const d of list) if (d.figure && !byKey.has(figureKey(d.figure))) byKey.set(figureKey(d.figure), d.figure)
  const wanted = [...byKey.entries()]
  let png: Blob | null = null
  let pageUrl: string | undefined
  try {
    png = (await files.pdfPageImage(url, page, wanted.length ? FIGURE_DPI : undefined)).png
    pageUrl = await uploadPng(png, `page-${page}.png`)
  } catch {
    /* l'aperçu de page est facultatif */
  }
  const crops = new Map<string, string>()
  if (figures && wanted.length && png && pageUrl) {
    const boxes = await locateFigures(figures.ai, pageUrl, wanted.map(([, f]) => f), key).catch(() => [] as Array<FigureBox | null>)
    for (let j = 0; j < wanted.length; j++) {
      const box = boxes[j]
      if (!box) continue
      try {
        const blob = await (figures.crop ?? cropFigure)(png, box)
        if (blob) crops.set(wanted[j][0], (await files.upload(blob, `figure-${page}-${j + 1}.jpg`, 'figures')).url)
      } catch {
        /* cette figure-là garde la page entière */
      }
    }
  }
  for (const d of list) {
    const media = next.steps[d.stepIndex].media[d.mediaIndex]
    if (media.kind !== 'document') continue
    const crop = d.figure ? crops.get(figureKey(d.figure)) : undefined
    if (crop) next.steps[d.stepIndex].media[d.mediaIndex] = figureMedia(media, crop, pageUrl, d.figure!)
    else if (pageUrl) media.pageImageUrl = pageUrl
  }
}

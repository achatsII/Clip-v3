/**
 * La génération d'une instruction à partir des sources capturées : un seul appel multimodal à
 * AskAI v4 (Gemini, seul fournisseur qui lit la vidéo), puis le post-traitement.
 */
import type { AiApi, AiOperation, AskFile } from '../gateway/ai'
import { ApiError } from '../gateway/client'
import type { FilesApi } from '../gateway/files'
import type { InstructionContent, OrgSettings, Source, StepMedia } from '../model/types'
import { AiInstruction, normalizeInstruction } from './normalize'
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

/** Choisit l'opération selon la taille réelle des sources (une opération par taille de lot). */
export function generationTier(sources: Source[]): Tier {
  const m = measureSources(sources)
  if (m.videoSec <= 180 && m.audioSec <= 300 && m.photos <= 15 && m.pages <= 10) return { op: 'generate_s', label: 'courte', tooBig: false }
  if (m.videoSec <= 600 && m.audioSec <= 900 && m.photos <= 40 && m.pages <= 30) return { op: 'generate_m', label: 'moyenne', tooBig: false }
  const tooBig = m.videoSec > 1800 || m.photos > 80 || m.pages > 60 || m.audioSec > 2700
  return { op: 'generate_l', label: 'longue', tooBig }
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

/**
 * Prépare les fichiers pour l'IA : vidéos (et notes vocales sans transcription) téléversées chez
 * Gemini, URI réutilisée tant qu'elle vit. Rend les sources mises à jour, à enregistrer.
 */
export async function prepareForAi(
  sources: Source[],
  files: FilesApi,
  onSource?: (index: number, total: number) => void,
): Promise<{ sources: Source[]; askFiles: AskFile[]; lines: SourceLine[] }> {
  const updated: Source[] = []
  const askFiles: AskFile[] = []
  const lines: SourceLine[] = []
  const soon = Date.now() + 60 * 60 * 1000

  for (let i = 0; i < sources.length; i++) {
    onSource?.(i, sources.length)
    let s = { ...sources[i] }
    const id = `S${i + 1}`
    if ((s.kind === 'video' || (s.kind === 'audio' && !s.text)) && s.url) {
      const fresh = s.geminiFileUri && s.geminiExpiresAt && Date.parse(s.geminiExpiresAt) > soon
      if (!fresh) {
        if (s.kind === 'video' && (s.sizeBytes ?? 0) > GEMINI_MAX_BYTES) {
          const processed = await files.processVideo(s.url)
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
            : `${id} — note vocale, ${fmtDuration(s.durationSec)} (fichier joint n° ${askFiles.length})`,
      })
    } else if (s.kind === 'audio') {
      lines.push({ id, line: `${id} — note vocale (transcription) : « ${s.text} »` })
    } else if (s.kind === 'photo' && s.url) {
      askFiles.push({ url: s.url, filename: s.name ?? `${id}.jpg`, mimeType: s.mimeType || 'image/jpeg', sizeBytes: s.sizeBytes })
      lines.push({ id, line: `${id} — photo « ${s.name ?? 'photo'} » (fichier joint n° ${askFiles.length})${s.text ? ` — légende : « ${s.text} »` : ''}` })
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
  org: Pick<OrgSettings, 'standard' | 'learnings'>
  sources: Source[]
  intent?: string
  title?: string
  stationNames: string[]
  forceKind?: 'procedure' | 'lockout'
  onStage?: (stage: Stage, detail?: string) => void
  signal?: AbortSignal
}

export interface GenerateOutput {
  content: InstructionContent
  sources: Source[]
  stationGuess: string | null
  questions: string[]
  model: string | null
  operation: AiOperation
}

export async function generateInstruction(input: GenerateInput): Promise<GenerateOutput> {
  const usable = input.sources.filter((s) => s.url || s.text)
  if (!usable.length) throw new ApiError('Ajoutez au moins une photo, une vidéo, une note ou un document.', 400)
  const tier = generationTier(usable)
  if (tier.tooBig) throw new ApiError('C’est beaucoup pour une seule instruction : gardez au plus 30 minutes de vidéo, ou séparez-la en plusieurs instructions.', 400)

  input.onStage?.('prepare')
  const prepared = await prepareForAi(usable, input.files, (i, n) => input.onStage?.('prepare', `${i + 1} sur ${n}`))
  const m = measureSources(prepared.sources)

  input.onStage?.('analyze')
  const result = await input.ai.ask<AiInstruction>(
    tier.op,
    {
      provider: 'google',
      level: 'mid',
      thinking: 'enabled',
      effort: 'low',
      mediaResolution: m.videoSec > 300 ? 'low' : 'medium',
      maxOutputTokens: 24000,
      system_instruction: generationSystem(input.org, { language: 'fr', forceKind: input.forceKind }),
      prompt: generationPrompt({ intent: input.intent, title: input.title, stations: input.stationNames, sources: prepared.lines }),
      files: prepared.askFiles,
      json_schema: instructionSchema,
    },
    { scope: 'generation', timeoutMs: 300_000, signal: input.signal },
  )
  if (!result.json) throw new ApiError("L'IA n'a pas rendu d'instruction. Réessayez ; rien n'a été perdu.", 502)

  input.onStage?.('finish')
  // Les sources gardent leur ordre : S1 = première source utilisable.
  const { content, stationGuess, questions } = normalizeInstruction(result.json, prepared.sources)
  if (!content.steps.length) throw new ApiError("L'IA n'a trouvé aucune étape dans ces sources. Ajoutez une vidéo ou une note qui décrit les gestes.", 422)
  return { content, sources: mergeSources(input.sources, prepared.sources), stationGuess, questions, model: result.model, operation: tier.op }
}

function mergeSources(all: Source[], updated: Source[]): Source[] {
  const byId = new Map(updated.map((s) => [s.id, s]))
  return all.map((s) => byId.get(s.id) ?? s)
}

/** Import d'une ancienne instruction (PDF) : même résultat qu'une génération. */
export async function importDocument(input: {
  ai: AiApi
  org: Pick<OrgSettings, 'standard' | 'learnings'>
  source: Source
  stationNames: string[]
}): Promise<{ content: InstructionContent; stationGuess: string | null; questions: string[]; model: string | null; operation: AiOperation }> {
  const pages = input.source.pageCount ?? 5
  const operation: AiOperation = pages > 12 ? 'import_l' : 'import_s'
  const result = await input.ai.ask<AiInstruction>(
    operation,
    {
      provider: 'google',
      level: 'mid',
      thinking: 'enabled',
      effort: 'low',
      maxOutputTokens: 24000,
      system_instruction: importSystem(input.org),
      prompt: generationPrompt({
        stations: input.stationNames,
        sources: [{ id: 'S1', line: `S1 — ancienne instruction PDF « ${input.source.originalName ?? input.source.name ?? 'document'} »${input.source.pageCount ? `, ${input.source.pageCount} pages` : ''} (fichier joint n° 1)` }],
      }),
      files: [{ url: input.source.url, filename: input.source.name ?? 'document.pdf', mimeType: 'application/pdf', sizeBytes: input.source.sizeBytes }],
      json_schema: instructionSchema,
    },
    { scope: 'import', timeoutMs: 300_000 },
  )
  if (!result.json) throw new ApiError("L'IA n'a pas pu lire ce document.", 502)
  const n = normalizeInstruction(result.json, [input.source])
  return { ...n, model: result.model, operation }
}

/**
 * Vignettes des extraits vidéo (une capture par extrait) et images des pages de documents.
 * Ne bloque jamais : un média sans vignette reste utilisable.
 */
export async function enrichMedia(content: InstructionContent, files: FilesApi, uploadPng: (png: Blob, name: string) => Promise<string>): Promise<InstructionContent> {
  const next: InstructionContent = { ...content, steps: content.steps.map((s) => ({ ...s, media: s.media.map((m) => ({ ...m })) as StepMedia[] })) }
  const byVideo = new Map<string, Array<{ stepIndex: number; mediaIndex: number; at: number }>>()
  const docs: Array<{ stepIndex: number; mediaIndex: number; url: string; page: number }> = []
  next.steps.forEach((s, si) =>
    s.media.forEach((m, mi) => {
      if (m.kind === 'video' && !m.posterUrl) {
        const list = byVideo.get(m.url) ?? []
        list.push({ stepIndex: si, mediaIndex: mi, at: m.start + Math.min(1.5, (m.end - m.start) / 3) })
        byVideo.set(m.url, list)
      } else if (m.kind === 'document' && !m.pageImageUrl && /ii-file\.tor1\.digitaloceanspaces\.com/.test(m.url)) {
        docs.push({ stepIndex: si, mediaIndex: mi, url: m.url, page: m.page ?? 1 })
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
      })
    } catch {
      /* vignettes facultatives */
    }
  }
  const pageCache = new Map<string, string>()
  for (const d of docs) {
    const key = `${d.url}#${d.page}`
    try {
      let url = pageCache.get(key)
      if (!url) {
        const { png } = await files.pdfPageImage(d.url, d.page)
        url = await uploadPng(png, `page-${d.page}.png`)
        pageCache.set(key, url)
      }
      const media = next.steps[d.stepIndex].media[d.mediaIndex]
      if (media.kind === 'document') media.pageImageUrl = url
    } catch {
      /* l'aperçu de page est facultatif */
    }
  }
  return next
}

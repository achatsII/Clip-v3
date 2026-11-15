import { callNative, hasCapability, inNativeShell } from '../bridge/native'
import { ApiError } from '../gateway/client'
import { jobDebitKey, type AiApi, type AiOperation } from '../gateway/ai'
import type { DataApi, Doc } from '../gateway/data'
import type { FilesApi } from '../gateway/files'
import { messages } from '../i18n'
import { recordCheckpoint } from '../model/checkpoints'
import { nowIso, T } from '../model/repo'
import { createInstruction, saveDraft, type Actor } from '../model/service'
import type { GeneratingInfo, Instruction, InstructionContent, OrgSettings, ServerJob, ServerJobContext, Source, Station } from '../model/types'
import { publishRealtime } from '../realtime/client'
import { annotateMarks } from './autoAnnotate'
import { creationReporter, DETAIL_THUMBNAILS, sourceDetail } from './creation'
import { enrichMedia, finishGeneration, generateInstruction, importAsk, prepareGeneration } from './generate'
import { runJob } from './jobs'
import type { AiInstruction, MarkHint } from './normalize'
import { matchStation } from './normalize'
import { DEVICE_ID, jobOutcome, lockedByOther } from './serverJob'

/** Dans la coquille, l'écran reste allumé pendant la génération : un téléphone en veille l'arrêterait. */
function keepAwake(on: boolean) {
  if (hasCapability('keepAwake')) void callNative('keepAwake', { on }).catch(() => undefined)
}

const tellFor = (doc: Doc<Instruction>) => (phase: 'start' | 'stage' | 'done' | 'failed', stage?: string) =>
  publishRealtime({ type: 'creation', id: doc._id, phase, title: doc.json_data.title, stage })

/** Un refus de facturation se montre tel quel, sans repli sur l'appareil. */
const billingRefusal = (e: unknown) => e instanceof ApiError && (e.status === 402 || e.status === 403 || e.code === 'insufficient_credits' || e.code === 'not_entitled')

const stationLabels = (stations: Doc<Station>[]) => stations.map((s) => [s.json_data.name, s.json_data.code].filter(Boolean).join(' — '))

/**
 * La fin commune d'une génération, qu'elle ait tourné sur l'appareil ou au serveur : vignettes des
 * extraits, repères posés sur les images (deuxième temps), poste rapproché, brouillon enregistré.
 */
async function completeGeneration(c: {
  doc: Doc<Instruction>
  data: DataApi
  files: FilesApi
  ai: AiApi
  stations: Doc<Station>[]
  actor: Actor
  content: InstructionContent
  marks: MarkHint[]
  stationGuess: string | null
  questions: string[]
  choices: Record<string, string[]>
  model: string | null
  operation: string
  mode: 'device' | 'server'
  autoAnnotate: boolean
  checkpoints: boolean
  stage: (key: string, detail?: string) => void
  /** Juste avant l'enregistrement (l'appareil arrête ses signes de vie). */
  beforeSave?: () => Promise<void>
}) {
  const instr = c.doc.json_data
  c.stage('finish', DETAIL_THUMBNAILS)
  let content = await enrichMedia(c.content, c.files, async (png, name) => (await c.files.upload(png, name, 'pages')).url)

  // Deuxième temps : les repères se posent sur les images elles-mêmes, en haute définition.
  if (c.autoAnnotate && c.marks.length) {
    const annotated = await annotateMarks(c.ai, content, c.marks, { onProgress: (done, total) => c.stage('annotate', sourceDetail(Math.min(done + 1, total), total)) })
    content = annotated.content
  }

  const matched = matchStation(c.stationGuess, c.stations.map((s) => ({ id: s._id, name: s.json_data.name, code: s.json_data.code })))
  const stationIds = instr.stationIds.length ? instr.stationIds : matched ? [matched] : []
  await c.beforeSave?.()
  await saveDraft(c.data, c.doc._id, instr, content, c.actor, {
    stationIds,
    generating: null,
    generationError: null,
    generation: {
      at: nowIso(),
      model: c.model,
      operation: c.operation,
      rating: null,
      comment: null,
      questions: c.questions,
      choices: c.choices,
      stationGuess: c.stationGuess,
      ...(c.mode === 'server' ? { mode: 'server' as const } : {}),
    },
  })
  // La version de l'IA, gardée pour y revenir après des modifications.
  if (c.checkpoints) void recordCheckpoint(c.data, c.doc._id, content, 'generated', c.actor)
}

export function startGeneration(input: {
  doc: Doc<Instruction>
  data: DataApi
  files: FilesApi
  ai: AiApi
  org: OrgSettings
  stations: Doc<Station>[]
  actor: Actor
  forceKind?: 'procedure' | 'lockout'
  /** Annoter les images au deuxième temps, sur l'image elle-même (choix de la personne ; oui par défaut). */
  autoAnnotate?: boolean
  /**
   * Les points de retour du brouillon (feature toggle `draftHistory`) : le brouillon remplacé par une
   * régénération en garde un, et la version de l'IA aussi.
   */
  checkpoints?: boolean
  /**
   * L'analyse au serveur (toggle `serverGeneration` et réglage de l'usine) : une fois la requête
   * confiée à Job_start, l'appareil peut se fermer. Si le serveur ne la prend pas, elle tourne ici.
   */
  server?: boolean
  onDone?: () => void
}): Promise<void> {
  const { doc, data, files, ai, org, stations, actor } = input
  return runJob(doc._id, async (setStage) => {
    // L'état s'écrit dans l'instruction : les autres appareils voient la création en cours.
    const report = creationReporter(data, doc._id, { name: actor.name, device: inNativeShell() ? 'app' : 'web' })
    // Les autres appareils de l'usine l'apprennent aussitôt (temps réel), une fois l'état écrit.
    const tell = tellFor(doc)
    const stage = (key: string, detail?: string) => {
      setStage(key, detail)
      if (report.stage(key, detail)) void report.settle().then(() => tell('stage', key))
    }
    report.start()
    void report.settle().then(() => tell('start'))
    keepAwake(true)
    try {
      const instr = doc.json_data
      // Une régénération remplace le brouillon : il reste dans l'historique (sans retarder la génération).
      if (input.checkpoints && instr.draft) await Promise.race([recordCheckpoint(data, doc._id, instr.draft, 'regenerate', actor), new Promise((r) => setTimeout(r, 4000))])
      const common = {
        files,
        org,
        sources: instr.sources,
        intent: instr.intent,
        title: instr.title,
        stationNames: stationLabels(stations),
        forceKind: input.forceKind,
        // Une régénération garde la langue de l'instruction déjà écrite.
        language: instr.draft?.language,
        onStage: stage,
      }
      let out: Awaited<ReturnType<typeof generateInstruction>>
      if (input.server) {
        // La même requête que sur l'appareil, préparée ici, puis confiée au serveur.
        const p = await prepareGeneration(common)
        // Les URI Gemini sont gardées : une régénération dans les 48 h ne retéléverse rien.
        await data.patch(T.instruction, doc._id, { sources: p.allSources })
        const jobId = await ai.startJob({ operation: p.operation, instructionId: doc._id, ask: p.ask }).catch((e: unknown) => {
          // Un refus de facturation se montre tel quel ; un serveur qui ne prend pas la génération la laisse tourner ici.
          if (billingRefusal(e)) throw e
          console.warn('clip:server-generation-fallback', e)
          return null
        })
        if (jobId) {
          const context: ServerJobContext = {
            sourceIds: p.sources.map((s) => s.id),
            language: p.language,
            operation: p.operation,
            forceKind: input.forceKind ?? null,
            autoAnnotate: input.autoAnnotate !== false,
            checkpoints: !!input.checkpoints,
          }
          // Le relais au serveur : plus de signe de vie à donner, l'appareil peut se fermer.
          report.stop()
          await report.settle()
          await data.patch(T.instruction, doc._id, {
            'generating.mode': 'server',
            'generating.jobId': jobId,
            'generating.job': context,
            'generating.stage': 'analyze',
            'generating.detail': null,
            'generating.heartbeatAt': nowIso(),
          })
          tell('stage', 'analyze')
          return
        }
        // Le serveur ne l'a pas prise : elle tourne ici, avec la requête déjà prête.
        stage('analyze')
        const result = await ai.ask<AiInstruction>(p.operation, p.ask, { scope: 'generation', timeoutMs: 300_000 })
        if (!result.json) throw new ApiError(messages().capture.generate.noInstruction, 502)
        stage('finish')
        out = { ...finishGeneration(result.json, p.sources, p.language), sources: p.allSources, model: result.model, operation: p.operation }
      } else {
        out = await generateInstruction({ ai, ...common })
        // Les URI Gemini sont gardées : une régénération dans les 48 h ne retéléverse rien.
        await data.patch(T.instruction, doc._id, { sources: out.sources })
      }

      await completeGeneration({
        doc,
        data,
        files,
        ai,
        stations,
        actor,
        content: out.content,
        marks: out.marks,
        stationGuess: out.stationGuess,
        questions: out.questions,
        choices: out.choices,
        model: out.model,
        operation: out.operation,
        mode: 'device',
        autoAnnotate: input.autoAnnotate !== false,
        checkpoints: !!input.checkpoints,
        stage,
        beforeSave: async () => {
          report.stop()
          await report.settle()
        },
      })
      tell('done')
    } catch (e) {
      await report.fail(e instanceof Error ? e.message : messages().capture.progress.failed)
      tell('failed')
      throw e
    } finally {
      report.stop()
      keepAwake(false)
    }
    input.onDone?.()
  })
}

/**
 * Termine sur cet appareil une génération faite au serveur : le travail est fini (ou a échoué), et
 * l'appareil qui l'a lancée est peut-être fermé. Un seul appareil la termine (verrou dans
 * `generating.finishing`) ; le coût réel se débite avec la clé du travail, donc une seule fois.
 */
export function finishServerGeneration(input: {
  doc: Doc<Instruction>
  job: Doc<ServerJob> | null
  data: DataApi
  files: FilesApi
  ai: AiApi
  stations: Doc<Station>[]
  actor: Actor
  onDone?: () => void
}): Promise<void> {
  const { doc, data, files, ai, stations, actor } = input
  const g = doc.json_data.generating
  const jobId = g?.jobId
  if (g?.mode !== 'server' || !jobId || !g.job) return Promise.resolve()
  const outcome = jobOutcome(input.job?.json_data)
  if (outcome.kind === 'running') return Promise.resolve()
  return runJob(doc._id, async (setStage) => {
    if (outcome.kind === 'done') return
    if (lockedByOther(g, DEVICE_ID)) return
    const tell = tellFor(doc)
    const at = nowIso()
    await data.patch(T.instruction, doc._id, { 'generating.finishing': { at, by: DEVICE_ID }, 'generating.stage': 'finish', 'generating.detail': null, 'generating.heartbeatAt': at })
    // Deux appareils ont pu poser le verrou en même temps : le dernier écrit l'emporte.
    const fresh = await data.get<Instruction>(T.instruction, doc._id)
    const fg = fresh?.json_data.generating
    if (!fresh || fg?.jobId !== jobId || fg.finishing?.by !== DEVICE_ID || !fg.job) return
    const context = fg.job
    const operation = context.operation as AiOperation
    const settleJob = () => data.patch(T.serverJob, jobId, { finalizedAt: nowIso() }).catch(() => undefined)
    setStage('finish')
    tell('stage', 'finish')

    // Le coût réel, débité une fois (la clé est celle du travail), que la réponse ait abouti ou non.
    await ai.chargeCost(operation, outcome.costCad, jobDebitKey(operation, jobId), { model: outcome.kind === 'completed' ? outcome.model : null, ok: outcome.kind === 'completed' })

    if (outcome.kind === 'failed') {
      await data.patch(T.instruction, doc._id, { generating: null, generationError: { at: nowIso(), message: outcome.message, server: true } })
      await settleJob()
      tell('failed')
      input.onDone?.()
      return
    }
    try {
      const sources = context.sourceIds.map((id) => fresh.json_data.sources.find((s) => s.id === id)).filter((s): s is Source => !!s)
      const out = finishGeneration(outcome.json as AiInstruction, sources, context.language)
      await completeGeneration({
        doc: fresh,
        data,
        files,
        ai,
        stations,
        actor,
        ...out,
        model: outcome.model,
        operation,
        mode: 'server',
        autoAnnotate: context.autoAnnotate,
        checkpoints: context.checkpoints,
        stage: (key, detail) => setStage(key, detail),
      })
      await settleJob()
      tell('done')
    } catch (e) {
      await data.patch(T.instruction, doc._id, { generating: null, generationError: { at: nowIso(), message: e instanceof Error ? e.message : messages().capture.progress.failed, server: true } })
      await settleJob()
      tell('failed')
      throw e
    }
    input.onDone?.()
  })
}

/**
 * L'import d'un document au serveur (import en lot, toggle `serverGeneration`) : l'instruction est
 * créée tout de suite avec son document, son analyse part au serveur (Job_start), et le premier
 * appareil ouvert la termine (`finishServerGeneration`). `jobId` null : le serveur ne l'a pas prise ;
 * l'analyse se fait alors ici, dans la même instruction.
 */
export async function startServerImport(input: {
  data: DataApi
  ai: AiApi
  org: OrgSettings
  source: Source
  stations: Doc<Station>[]
  actor: Actor
  title: string
}): Promise<{ doc: Doc<Instruction>; jobId: string | null }> {
  const { operation, language, ask } = importAsk({ org: input.org, source: input.source, stationNames: stationLabels(input.stations) })
  const doc = await createInstruction(input.data, input.actor, { title: input.title, origin: 'import', sources: [input.source] })
  let jobId: string | null
  try {
    jobId = await input.ai.startJob({ operation, instructionId: doc._id, ask })
  } catch (e) {
    if (billingRefusal(e)) {
      // Rien n'est parti : l'instruction vide ne reste pas.
      await input.data.remove(T.instruction, doc._id).catch(() => undefined)
      throw e
    }
    console.warn('clip:server-import-fallback', e)
    jobId = null
  }
  if (!jobId) return { doc, jobId: null }
  const at = nowIso()
  const generating: GeneratingInfo = {
    startedAt: at,
    heartbeatAt: at,
    stage: 'analyze',
    detail: null,
    byName: input.actor.name,
    device: inNativeShell() ? 'app' : 'web',
    mode: 'server',
    jobId,
    job: { sourceIds: [input.source.id], language, operation, forceKind: null, autoAnnotate: false, checkpoints: false },
    finishing: null,
  }
  await input.data.patch(T.instruction, doc._id, { generating, generationError: null })
  publishRealtime({ type: 'creation', id: doc._id, phase: 'start', title: input.title, stage: 'analyze' })
  return { doc: { ...doc, json_data: { ...doc.json_data, generating } }, jobId }
}

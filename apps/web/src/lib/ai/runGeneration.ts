import { callNative, hasCapability, inNativeShell } from '../bridge/native'
import type { AiApi } from '../gateway/ai'
import type { DataApi, Doc } from '../gateway/data'
import type { FilesApi } from '../gateway/files'
import { nowIso, T } from '../model/repo'
import { saveDraft, type Actor } from '../model/service'
import type { Instruction, OrgSettings, Station } from '../model/types'
import { creationReporter } from './creation'
import { enrichMedia, generateInstruction } from './generate'
import { runJob } from './jobs'
import { matchStation } from './normalize'

/** Dans la coquille, l'écran reste allumé pendant la génération : un téléphone en veille l'arrêterait. */
function keepAwake(on: boolean) {
  if (hasCapability('keepAwake')) void callNative('keepAwake', { on }).catch(() => undefined)
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
  onDone?: () => void
}): Promise<void> {
  const { doc, data, files, ai, org, stations, actor } = input
  return runJob(doc._id, async (setStage) => {
    // L'état s'écrit dans l'instruction : les autres appareils voient la création en cours.
    const report = creationReporter(data, doc._id, { name: actor.name, device: inNativeShell() ? 'app' : 'web' })
    const stage = (key: string, detail?: string) => {
      setStage(key, detail)
      report.stage(key, detail)
    }
    report.start()
    keepAwake(true)
    try {
      const instr = doc.json_data
      const out = await generateInstruction({
        ai,
        files,
        org,
        sources: instr.sources,
        intent: instr.intent,
        title: instr.title,
        stationNames: stations.map((s) => [s.json_data.name, s.json_data.code].filter(Boolean).join(' — ')),
        forceKind: input.forceKind,
        onStage: stage,
      })
      // Les URI Gemini sont gardées : une régénération dans les 48 h ne retéléverse rien.
      await data.patch(T.instruction, doc._id, { sources: out.sources })

      stage('finish', 'Vignettes des extraits')
      const content = await enrichMedia(out.content, files, async (png, name) => (await files.upload(png, name, 'pages')).url)

      const matched = matchStation(out.stationGuess, stations.map((s) => ({ id: s._id, name: s.json_data.name, code: s.json_data.code })))
      const stationIds = instr.stationIds.length ? instr.stationIds : matched ? [matched] : []
      report.stop()
      await report.settle()
      await saveDraft(data, doc._id, instr, content, actor, {
        stationIds,
        generating: null,
        generationError: null,
        generation: {
          at: nowIso(),
          model: out.model,
          operation: out.operation,
          rating: null,
          comment: null,
          questions: out.questions,
          stationGuess: out.stationGuess,
        },
      })
    } catch (e) {
      await report.fail(e instanceof Error ? e.message : 'La génération a échoué.')
      throw e
    } finally {
      report.stop()
      keepAwake(false)
    }
    input.onDone?.()
  })
}

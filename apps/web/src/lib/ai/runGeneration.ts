import type { AiApi } from '../gateway/ai'
import type { DataApi, Doc } from '../gateway/data'
import type { FilesApi } from '../gateway/files'
import { nowIso, T } from '../model/repo'
import { saveDraft, type Actor } from '../model/service'
import type { Instruction, OrgSettings, Station } from '../model/types'
import { enrichMedia, generateInstruction } from './generate'
import { runJob } from './jobs'
import { matchStation } from './normalize'

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
      onStage: (stage, detail) => setStage(stage, detail),
    })
    // Les URI Gemini sont gardées : une régénération dans les 48 h ne retéléverse rien.
    await data.patch(T.instruction, doc._id, { sources: out.sources })

    setStage('finish', 'Vignettes des extraits')
    const content = await enrichMedia(out.content, files, async (png, name) => (await files.upload(png, name, 'pages')).url)

    const matched = matchStation(out.stationGuess, stations.map((s) => ({ id: s._id, name: s.json_data.name, code: s.json_data.code })))
    const stationIds = instr.stationIds.length ? instr.stationIds : matched ? [matched] : []
    await saveDraft(data, doc._id, instr, content, actor, {
      stationIds,
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
    input.onDone?.()
  })
}

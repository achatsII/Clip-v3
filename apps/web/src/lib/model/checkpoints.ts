/**
 * Les points de retour du brouillon : des états enregistrés de l'instruction, pour revenir en arrière
 * même après avoir fermé l'app. Ils s'écrivent avec retenue, pour ne remplir la base ni trop souvent
 * ni trop vite :
 * - pendant qu'on modifie, au plus un toutes les 10 minutes par instruction (l'état juste avant la
 *   modification qui suit ce délai) ; regarder sans rien changer n'écrit rien ;
 * - avant un passage de l'assistant qui change quelque chose, avant de régénérer, avant de revenir à
 *   une autre version, et tel que l'IA vient de le créer ;
 * - jamais deux fois de suite le même contenu, ni une copie de la version publiée (déjà gardée) ;
 * - au plus 20 par instruction : les plus anciens s'effacent, sauf la dernière version de l'IA.
 */
import type { DataApi, Doc } from '../gateway/data'
import { hashText } from '../util/hash'
import { T } from './repo'
import type { CheckpointReason, DraftCheckpoint, InstructionContent } from './types'

export const CHECKPOINT_CAP = 20
export const CHECKPOINT_EVERY_MS = 10 * 60_000

/** Un point de retour sans son contenu : ce que la liste de l'historique lit. */
export type CheckpointMeta = Omit<DraftCheckpoint, 'content'>

/** Qui pose le point de retour. */
interface By {
  id: string
  name: string
}

/** Le JSON d'une valeur, clés triées : deux contenus égaux ont la même empreinte, quel que soit l'ordre des clés. */
function stable(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null'
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`
  const o = v as Record<string, unknown>
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
    .join(',')}}`
}

export function contentHash(content: InstructionContent): string {
  const s = stable(content)
  return `${s.length.toString(36)}-${hashText(s)}`
}

/** Les points de retour d'une instruction, du plus récent au plus ancien, sans leur contenu. */
export async function listCheckpoints(data: DataApi, instructionId: string, limit = 50): Promise<Doc<CheckpointMeta>[]> {
  return data.filter<CheckpointMeta>(T.checkpoint, {
    filter: { 'json_data.instructionId': { $eq: instructionId } },
    projection: { 'json_data.content': 0 },
    sort: { 'json_data.at': -1 },
    limit,
  })
}

export async function getCheckpoint(data: DataApi, id: string): Promise<Doc<DraftCheckpoint> | null> {
  return data.get<DraftCheckpoint>(T.checkpoint, id)
}

export interface Checkpointer {
  /**
   * Une modification commence : l'état d'avant devient un point de retour si le dernier date de plus
   * de 10 minutes. Appelé à chaque modification ; ne fait presque rien entre deux délais.
   */
  beforeChange(before: InstructionContent): void
  /** Un point de retour tout de suite (assistant, régénération, retour en arrière), sauf s'il répète le dernier. */
  mark(content: InstructionContent, reason: CheckpointReason, note?: string | null): Promise<void>
}

export interface CheckpointerOptions {
  /** Le contenu publié : un point de retour identique ne sert à rien (la version est déjà gardée). */
  skip?: () => InstructionContent | null | undefined
  /** Après chaque écriture : relire la liste de l'historique. */
  onWritten?: () => void
  now?: () => number
}

/**
 * Le gardien des points de retour d'une instruction, pour une séance de modification. Il lit une fois
 * les points existants (au premier besoin), puis tient sa liste à jour lui-même : un point de retour
 * coûte une écriture, et au plus un effacement quand le plafond est atteint. Il ne lève jamais
 * d'erreur : un point de retour manqué ne doit pas gêner la modification.
 */
export function createCheckpointer(data: DataApi, instructionId: string, by: By, opts: CheckpointerOptions = {}): Checkpointer {
  const now = opts.now ?? Date.now
  let known: Array<{ _id: string; at: number; reason: CheckpointReason; hash: string }> | null = null
  let lastTry = 0
  let chain: Promise<void> = Promise.resolve()
  let skipped: { of: InstructionContent; hash: string } | null = null

  const isSkipped = (hash: string) => {
    const c = opts.skip?.()
    if (!c) return false
    if (skipped?.of !== c) skipped = { of: c, hash: contentHash(c) }
    return skipped.hash === hash
  }

  async function load() {
    if (known) return
    const docs = await listCheckpoints(data, instructionId, CHECKPOINT_CAP * 3)
    known = docs.map((d) => ({ _id: d._id, at: Date.parse(d.json_data.at) || 0, reason: d.json_data.reason, hash: d.json_data.hash }))
  }

  /** Au-delà du plafond, les plus anciens s'effacent ; la dernière version de l'IA reste. */
  async function prune() {
    if (!known || known.length <= CHECKPOINT_CAP) return
    const keep = new Set<string>()
    const generated = known.find((k) => k.reason === 'generated')
    if (generated) keep.add(generated._id)
    for (const k of known) {
      if (keep.size >= CHECKPOINT_CAP) break
      keep.add(k._id)
    }
    const drop = known.filter((k) => !keep.has(k._id))
    known = known.filter((k) => keep.has(k._id))
    for (const d of drop) await data.remove(T.checkpoint, d._id).catch(() => undefined)
  }

  function write(content: InstructionContent, reason: CheckpointReason, note: string | null, periodic: boolean): Promise<void> {
    const run = async () => {
      await load()
      const list = known!
      const t = now()
      // Un autre appareil, ou une séance d'avant, vient d'en poser un : celui-ci attendra son tour.
      if (periodic && list[0] && t - list[0].at < CHECKPOINT_EVERY_MS) return
      const hash = contentHash(content)
      if (list[0]?.hash === hash || isSkipped(hash)) return
      const json: DraftCheckpoint = {
        instructionId,
        content,
        reason,
        note: note?.trim().slice(0, 200) || null,
        hash,
        title: content.title,
        stepCount: content.steps.length,
        at: new Date(t).toISOString(),
        byId: by.id,
        byName: by.name,
      }
      const doc = await data.insert<DraftCheckpoint>(T.checkpoint, json, content.title)
      list.unshift({ _id: doc._id, at: t, reason, hash })
      await prune()
      opts.onWritten?.()
    }
    chain = chain.then(run).catch(() => {
      // La liste sera relue au prochain besoin.
      known = null
    })
    return chain
  }

  return {
    beforeChange(before) {
      const t = now()
      if (t - lastTry < CHECKPOINT_EVERY_MS) return
      lastTry = t
      void write(before, 'auto', null, true)
    },
    mark(content, reason, note) {
      // Un point de retour posé à la main compte aussi pour le délai des points automatiques.
      lastTry = now()
      return write(content, reason, note ?? null, false)
    },
  }
}

/** Un point de retour d'un coup (fin d'une génération, avant une régénération). Ne lève jamais d'erreur. */
export function recordCheckpoint(data: DataApi, instructionId: string, content: InstructionContent, reason: CheckpointReason, by: By, note?: string | null): Promise<void> {
  return createCheckpointer(data, instructionId, by).mark(content, reason, note)
}

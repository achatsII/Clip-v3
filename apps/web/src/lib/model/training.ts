/**
 * La formation (toggle `training`) : quelques questions sur une instruction, la validation au poste
 * par une personne nommée, et la matrice de compétences (qui est formé, à quel poste). Ce n'est pas
 * un examen certifiant : la note se calcule sur l'appareil, et la trace dit qui a validé quoi.
 */
import type { DataApi, Doc } from '../gateway/data'
import { outbox } from '../util/outbox'
import { nowIso, T, uid } from './repo'
import type { Instruction, Operator, QuizQuestion, Station, Training } from './types'

/** La part de bonnes réponses qu'il faut pour valider. */
export const PASS_RATIO = 0.8
export const MAX_QUESTIONS = 6
export const MAX_CHOICES = 4

const clean = (s: unknown): string => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '')

/**
 * Les questions, rendues sûres : un énoncé, 2 à 4 choix distincts, un bon choix qui existe. Les ids
 * restent (traductions et réponses s'y rattachent). `step` (de l'IA, à partir de 1) devient l'id de
 * l'étape.
 */
export function cleanQuiz(raw: unknown, stepIds: string[] = []): QuizQuestion[] {
  if (!Array.isArray(raw)) return []
  const out: QuizQuestion[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const x = r as Record<string, unknown>
    const question = clean(x.question).slice(0, 200)
    // Un choix vide ou en double part ; le bon choix suit son texte, pas son ancien rang.
    const given = typeof x.answer === 'number' ? Math.round(x.answer) : -1
    const choices: string[] = []
    let answer = -1
    ;(Array.isArray(x.choices) ? x.choices : []).forEach((c, i) => {
      const v = clean(c).slice(0, 120)
      if (!v) return
      const same = choices.findIndex((y) => y.toLowerCase() === v.toLowerCase())
      if (i === given) answer = same >= 0 ? same : choices.length
      if (same < 0) choices.push(v)
    })
    if (!question || choices.length < 2 || answer < 0 || answer >= MAX_CHOICES) continue
    choices.length = Math.min(choices.length, MAX_CHOICES)
    const why = clean(x.why).slice(0, 240)
    const step = typeof x.step === 'number' ? stepIds[Math.round(x.step) - 1] : typeof x.stepId === 'string' ? x.stepId : null
    out.push({ id: typeof x.id === 'string' && x.id ? x.id : uid('qz_'), question, choices, answer, ...(why ? { why } : {}), ...(step ? { stepId: step } : {}) })
    if (out.length >= MAX_QUESTIONS) break
  }
  return out
}

/** La note : les bonnes réponses sur le nombre de questions ; validée à 80 %. */
export function grade(quiz: QuizQuestion[], choices: Record<string, number>): { score: number; passed: boolean; answers: Training['answers'] } {
  const answers = quiz.map((q) => ({ questionId: q.id, choice: choices[q.id] ?? -1, correct: choices[q.id] === q.answer }))
  const score = quiz.length ? answers.filter((a) => a.correct).length / quiz.length : 0
  return { score, passed: quiz.length > 0 && score >= PASS_RATIO - 1e-9, answers }
}

/** Une formation validée sans réseau attend dans l'appareil (50 au plus, 30 jours), comme le travail fait. */
const queue = outbox<Training, DataApi>({
  storageKey: 'clip_training_queue',
  send: (t, data) => data.insert<Training>(T.training, t, t.instructionTitle),
  at: (t) => t.at,
  keyOf: (t) => `${t.instructionId}|${t.operatorId ?? t.userId ?? ''}|${t.at}`,
})

/** Écrit la formation validée ; si elle ne part pas, elle attend dans l'appareil. */
export const saveTraining = (data: DataApi, t: Training): Promise<'saved' | 'queued'> => queue.save(t, data)
export const flushTrainings = (data: DataApi): Promise<number> => queue.flush(data)

export function buildTraining(quiz: QuizQuestion[], choices: Record<string, number>, meta: Omit<Training, 'score' | 'passed' | 'answers' | 'at'>): Training {
  return { ...meta, ...grade(quiz, choices), at: nowIso() }
}

/** Les formations validées, de la plus récente à la plus ancienne. */
export async function listTrainings(data: DataApi, limit = 3000): Promise<Doc<Training>[]> {
  return data.filter<Training>(T.training, { filter: { 'json_data.passed': { $eq: true } }, sort: { 'json_data.at': -1 }, limit })
}

/* ───────────────────────── La matrice ───────────────────────── */

export type CellState = 'done' | 'partial' | 'none' | 'outdated'

export interface MatrixCell {
  /** Les instructions à connaître à ce poste (publiées, avec des questions). */
  required: Array<{ id: string; title: string; state: 'done' | 'missing' | 'outdated' }>
  done: number
  state: CellState
}

export interface Matrix {
  stations: Array<{ id: string; name: string }>
  people: Array<{ id: string; name: string }>
  cells: Record<string, Record<string, MatrixCell>>
  /** Les formations à faire (manquantes ou à refaire) dans toute la matrice. */
  gaps: number
}

/**
 * Qui est formé à quoi, par poste. Une instruction compte à un poste quand elle y est publiée et
 * qu'elle a des questions ; une formation compte si elle est réussie et pas d'avant la version qui
 * demande de se re-former. Seuls les postes qui ont quelque chose à apprendre sont des colonnes.
 */
export function buildMatrix(operators: Doc<Operator>[], stations: Doc<Station>[], instructions: Doc<Instruction>[], trainings: Doc<Training>[]): Matrix {
  const learn = instructions.filter((d) => d.json_data.publishedVersion && (d.json_data.publishedQuiz ?? 0) > 0 && d.json_data.status !== 'archived')
  const byStation = new Map<string, Doc<Instruction>[]>()
  for (const d of learn) for (const s of d.json_data.stationIds) byStation.set(s, [...(byStation.get(s) ?? []), d])
  const cols = stations.filter((s) => byStation.has(s._id)).map((s) => ({ id: s._id, name: s.json_data.name }))
  // La meilleure version validée par personne et par instruction.
  const best = new Map<string, number>()
  for (const t of trainings) {
    const j = t.json_data
    if (!j.passed || !j.operatorId) continue
    const key = `${j.operatorId}:${j.instructionId}`
    best.set(key, Math.max(best.get(key) ?? 0, j.version ?? 0))
  }
  const cells: Matrix['cells'] = {}
  let gaps = 0
  for (const op of operators) {
    cells[op._id] = {}
    for (const col of cols) {
      const required = (byStation.get(col.id) ?? []).map((d) => {
        const v = best.get(`${op._id}:${d._id}`)
        const state: 'done' | 'missing' | 'outdated' = v === undefined ? 'missing' : v >= (d.json_data.trainingVersion ?? 0) ? 'done' : 'outdated'
        return { id: d._id, title: d.json_data.title, state }
      })
      const done = required.filter((r) => r.state === 'done').length
      const state: CellState = done === required.length ? 'done' : required.some((r) => r.state === 'outdated') ? 'outdated' : done ? 'partial' : 'none'
      gaps += required.length - done
      cells[op._id][col.id] = { required, done, state }
    }
  }
  return { stations: cols, people: operators.map((o) => ({ id: o._id, name: o.json_data.name })), cells, gaps }
}

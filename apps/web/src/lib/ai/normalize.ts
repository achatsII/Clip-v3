/**
 * Transforme la sortie de l'IA en contenu sûr : identifiants stables, références de médias
 * vérifiées, temps bornés à la durée réelle, valeurs inconnues écartées.
 */
import { CATEGORY_KEYS, ENERGY, PPE } from '../model/catalog'
import { uid } from '../model/repo'
import type { Annotation, CategoryKey, EnergyPoint, InstructionContent, LockoutData, Source, Step, StepMedia, WarningLevel } from '../model/types'

export interface AiMediaRef {
  source?: string
  start?: number
  end?: number
  page?: number
  /** Image fixe : l'instant à figer. */
  at?: number
  /** Image fixe : [ymin, xmin, ymax, xmax] de 0 à 1000 autour de ce qu'il faut regarder. */
  focus?: number[]
  focusLabel?: string
}

/** Le cercle que l'IA pose sur une image figée, autour de ce qu'il faut regarder (ou rien si la boîte est douteuse). */
export function focusAnnotation(box: unknown, label: unknown): Annotation[] {
  if (!Array.isArray(box) || box.length < 4) return []
  const [ymin, xmin, ymax, xmax] = box.slice(0, 4).map((v) => Math.min(1000, Math.max(0, Number(v) || 0)) / 1000)
  const r3 = (v: number) => Math.round(v * 1000) / 1000
  const w = r3(xmax - xmin)
  const h = r3(ymax - ymin)
  // Trop petite (bruit) ou presque toute l'image (rien de précis à montrer) : on s'abstient.
  if (w < 0.02 || h < 0.02 || w * h > 0.6) return []
  const text = typeof label === 'string' ? label.trim().slice(0, 40) : ''
  return [{ id: uid('an_'), type: 'circle', x: r3(xmin), y: r3(ymin), w, h, color: 'red', ...(text ? { text } : {}) }]
}

export interface AiStep {
  id?: string
  title?: string
  text?: string
  keyPoints?: string[]
  warningLevel?: string
  warningText?: string
  media?: AiMediaRef[]
  durationSec?: number
  energyTag?: string
}

export interface AiInstruction {
  title?: string
  summary?: string
  kind?: string
  category?: string
  tags?: string[]
  station?: string
  equipment?: string
  frequency?: string
  durationMin?: number
  ppe?: string[]
  tools?: string[]
  safety?: string[]
  steps?: AiStep[]
  lockout?: {
    equipment?: string
    location?: string
    locksRequired?: number
    material?: string[]
    energyPoints?: Array<Partial<EnergyPoint> & { photoSource?: string }>
    restartSteps?: string[]
  }
  questions?: string[]
}

const clean = (s: unknown): string => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '')
const cleanList = (l: unknown, max = 20): string[] =>
  Array.isArray(l) ? l.map(clean).filter(Boolean).slice(0, max) : []

export function warningFrom(level: unknown, text: unknown): Step['warning'] {
  const t = clean(text)
  const l = clean(level) as WarningLevel | 'none'
  if (!t || l === 'none' || !['danger', 'caution', 'info'].includes(l)) return null
  return { level: l as WarningLevel, text: t }
}

/** Résout une référence de média vers un média d'étape, ou `null` si elle ne tient pas. */
export function resolveMedia(ref: AiMediaRef, sourcesById: Map<string, Source>): StepMedia | null {
  const src = ref.source ? sourcesById.get(ref.source.trim().toUpperCase()) : undefined
  if (!src || !src.url) return null
  if (src.kind === 'photo') return { kind: 'image', url: src.url, sourceId: src.id }
  if (src.kind === 'video') {
    const dur = src.durationSec && src.durationSec > 0 ? src.durationSec : Number.POSITIVE_INFINITY
    if (Number.isFinite(ref.at)) {
      // Image fixe : l'image elle-même se tire de la vidéo après la génération (enrichMedia).
      const at = Math.max(0, Math.min(Number(ref.at), Number.isFinite(dur) ? Math.max(0, dur - 0.2) : Number(ref.at)))
      let start = Number.isFinite(ref.start) && Number(ref.start) <= at ? Number(ref.start) : Math.max(0, at - 3)
      let end = Number.isFinite(ref.end) && Number(ref.end) > at ? Number(ref.end) : at + 3
      if (Number.isFinite(dur)) end = Math.min(end, dur)
      if (end - start > 45) start = Math.max(0, end - 45)
      const annotations = focusAnnotation(ref.focus, ref.focusLabel)
      const round = (v: number) => Math.round(v * 10) / 10
      return { kind: 'image', url: '', sourceId: src.id, frame: { videoUrl: src.url, at: round(at), start: round(start), end: round(end) }, ...(annotations.length ? { annotations } : {}) }
    }
    let start = Number.isFinite(ref.start) ? Math.max(0, Number(ref.start)) : 0
    let end = Number.isFinite(ref.end) ? Number(ref.end) : start + 8
    if (start >= dur) start = Math.max(0, (Number.isFinite(dur) ? dur : 8) - 8)
    if (end <= start) end = start + 6
    if (Number.isFinite(dur)) end = Math.min(end, dur)
    if (end - start > 45) end = start + 45
    return { kind: 'video', url: src.url, sourceId: src.id, start: Math.round(start * 10) / 10, end: Math.round(end * 10) / 10 }
  }
  if (src.kind === 'document') {
    const page = Number.isFinite(ref.page) && Number(ref.page) >= 1 ? Math.round(Number(ref.page)) : 1
    const max = src.pageCount && src.pageCount > 0 ? src.pageCount : page
    return { kind: 'document', url: src.url, sourceId: src.id, page: Math.min(page, max), name: src.originalName ?? src.name }
  }
  return null
}

/** Deux médias identiques : même fichier et même extrait, ou même vidéo et même instant figé. */
function mediaKey(m: StepMedia): string {
  if (m.kind === 'video') return `v:${m.url}#${m.start}`
  if (m.kind === 'image' && m.frame) return `f:${m.frame.videoUrl}@${m.frame.at}`
  if (m.kind === 'html') return `h:${m.html.length}:${m.html.slice(0, 64)}`
  return `${m.kind}:${m.url}${m.kind === 'document' ? `#${m.page ?? 1}` : ''}`
}

export function normalizeSteps(steps: AiStep[] | undefined, sourcesById: Map<string, Source>, keepIds?: Set<string>): Step[] {
  const out: Step[] = []
  for (const s of steps ?? []) {
    const title = clean(s.title)
    const text = clean(s.text)
    if (!title && !text) continue
    const id = s.id && keepIds?.has(s.id) ? s.id : uid('st_')
    const media: StepMedia[] = []
    for (const ref of s.media ?? []) {
      const m = resolveMedia(ref, sourcesById)
      if (m && !media.some((x) => mediaKey(x) === mediaKey(m))) media.push(m)
      if (media.length >= 2) break
    }
    out.push({
      id,
      title: title || text.split(' ').slice(0, 6).join(' '),
      text,
      keyPoints: cleanList(s.keyPoints, 3),
      warning: warningFrom(s.warningLevel, s.warningText),
      media,
      durationSec: Number.isFinite(s.durationSec) && Number(s.durationSec) > 0 ? Math.round(Number(s.durationSec)) : null,
      energyPointId: clean(s.energyTag) || null,
    })
  }
  return out
}

function normalizeLockout(raw: AiInstruction['lockout'], sourcesById: Map<string, Source>): LockoutData | null {
  if (!raw || !Array.isArray(raw.energyPoints) || !raw.energyPoints.length) return null
  const energyPoints: EnergyPoint[] = raw.energyPoints.map((p, i) => {
    const type = (Object.keys(ENERGY).includes(String(p.type)) ? p.type : 'autre') as EnergyPoint['type']
    const photo = p.photoSource ? sourcesById.get(p.photoSource.trim().toUpperCase()) : undefined
    return {
      id: uid('ep_'),
      tag: clean(p.tag) || `${ENERGY[type].prefix}${i + 1}`,
      type,
      description: clean(p.description),
      magnitude: clean(p.magnitude) || undefined,
      isolationDevice: clean(p.isolationDevice),
      location: clean(p.location),
      lockingMethod: clean(p.lockingMethod),
      verification: clean(p.verification),
      photoUrl: photo?.kind === 'photo' ? photo.url : undefined,
    }
  })
  return {
    equipment: clean(raw.equipment),
    location: clean(raw.location) || undefined,
    locksRequired: Number.isFinite(raw.locksRequired) && Number(raw.locksRequired) > 0 ? Math.round(Number(raw.locksRequired)) : energyPoints.length,
    material: cleanList(raw.material, 10),
    energyPoints,
    restartSteps: cleanList(raw.restartSteps, 20),
  }
}

export function normalizeInstruction(raw: AiInstruction, sources: Source[], language = 'fr'): {
  content: InstructionContent
  stationGuess: string | null
  questions: string[]
} {
  const sourcesById = new Map<string, Source>()
  sources.forEach((s, i) => sourcesById.set(`S${i + 1}`, s))
  const steps = normalizeSteps(raw.steps, sourcesById)
  const category = (CATEGORY_KEYS.includes(raw.category as CategoryKey) ? raw.category : 'production') as CategoryKey
  const lockout = normalizeLockout(raw.lockout, sourcesById)
  const kind = raw.kind === 'lockout' && lockout ? 'lockout' : 'procedure'
  // Rattache les étapes de cadenassage à leur point d'isolement par le repère.
  if (lockout) {
    const byTag = new Map(lockout.energyPoints.map((p) => [p.tag.toUpperCase(), p.id]))
    steps.forEach((s) => {
      s.energyPointId = s.energyPointId ? byTag.get(s.energyPointId.toUpperCase()) ?? null : null
    })
  } else {
    steps.forEach((s) => (s.energyPointId = null))
  }
  return {
    content: {
      title: clean(raw.title) || 'Instruction sans titre',
      summary: clean(raw.summary),
      kind,
      category,
      tags: cleanList(raw.tags, 8).map((t) => t.toLowerCase()),
      equipment: clean(raw.equipment) || undefined,
      frequency: clean(raw.frequency) || undefined,
      durationMin: Number.isFinite(raw.durationMin) && Number(raw.durationMin) > 0 ? Math.round(Number(raw.durationMin)) : null,
      ppe: cleanList(raw.ppe, 12).filter((p) => p in PPE),
      tools: cleanList(raw.tools, 15),
      safety: cleanList(raw.safety, 8),
      steps,
      lockout: kind === 'lockout' ? lockout : null,
      language,
    },
    stationGuess: clean(raw.station) || null,
    questions: cleanList(raw.questions, 4),
  }
}

/** Rapproche le poste deviné par l'IA des postes existants (code exact, puis nom). */
export function matchStation(guess: string | null, stations: Array<{ id: string; name: string; code?: string }>): string | null {
  if (!guess) return null
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const g = norm(guess)
  const digits = (s: string) => s.replace(/\D+/g, '')
  for (const s of stations) if (s.code && (norm(s.code) === g || g.includes(norm(s.code)))) return s.id
  for (const s of stations) if (norm(s.name) === g) return s.id
  const gd = digits(guess)
  if (gd.length >= 3) for (const s of stations) if (digits(s.name) === gd || (s.code && digits(s.code) === gd)) return s.id
  for (const s of stations) if (g.length >= 4 && (norm(s.name).includes(g) || g.includes(norm(s.name)))) return s.id
  return null
}

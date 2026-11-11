/**
 * Accès aux données de CLIP V3. Chaque fonction prend un `DataApi` : celui de l'utilisateur
 * connecté, ou celui d'un lien public (jeton guest à portée limitée).
 */
import type { DataApi, Doc } from '../gateway/data'
import { contentLanguage, messages, messagesIn } from '../i18n'
import type {
  Feedback,
  Instruction,
  InstructionContent,
  OrgSettings,
  Published,
  Station,
  UsageEvent,
  Version,
  WritingStandard,
} from './types'

export const T = {
  org: 'clip_org',
  station: 'clip_station',
  instruction: 'clip_instruction',
  version: 'clip_version',
  published: 'clip_published',
  feedback: 'clip_feedback',
  event: 'clip_event',
  importJob: 'clip_import',
} as const

export const nowIso = () => new Date().toISOString()

export function uid(prefix = ''): string {
  const raw = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).slice(2) + Date.now().toString(36)
  return `${prefix}${raw.slice(0, 12)}`
}

/* ───────────────────────── Organisation ───────────────────────── */

/** Les règles du standard de rédaction d'une usine neuve, dans la langue de la personne qui la crée. */
export const defaultRules = (): string[] => [...messages().instructions.defaults.rules]

export function defaultStandard(): WritingStandard {
  return {
    rules: defaultRules(),
    startWithSafety: true,
    maxWordsPerStep: 25,
    tone: 'infinitif',
    glossary: [],
    version: 1,
    updatedAt: nowIso(),
  }
}

export function defaultOrg(name: string): OrgSettings {
  return {
    name,
    logoUrl: null,
    color: null,
    approval: { mode: 'none', approverIds: [] },
    feedback: { notifyDanger: true },
    standard: defaultStandard(),
    standardHistory: [],
    learnings: [],
    members: {},
    goals: [],
    onboardedAt: null,
    roi: { hoursSavedPerInstruction: 3, hourlyRate: 45, minutesSavedPerCompletion: 4 },
    createdAt: nowIso(),
  }
}

/** Les réglages de l'organisation ; `null` si aucun n'existe encore (première ouverture). */
export async function readOrg(data: DataApi): Promise<Doc<OrgSettings> | null> {
  const docs = await data.filter<OrgSettings>(T.org, { sort: { _id: 1 }, limit: 1 })
  return docs[0] ?? null
}

/** Complète un document d'organisation écrit par une version plus ancienne. */
export function normalizeOrg(json: Partial<OrgSettings>, fallbackName = messages().instructions.defaults.orgName): OrgSettings {
  const base = defaultOrg(json.name || fallbackName)
  return {
    ...base,
    ...json,
    approval: { ...base.approval, ...(json.approval ?? {}) },
    feedback: { ...base.feedback, ...(json.feedback ?? {}) },
    standard: { ...base.standard, ...(json.standard ?? {}) },
    standardHistory: json.standardHistory ?? [],
    learnings: json.learnings ?? [],
    members: json.members ?? {},
    goals: json.goals ?? [],
    roi: { ...base.roi, ...(json.roi ?? {}) },
  }
}

export async function ensureOrg(data: DataApi, name: string): Promise<Doc<OrgSettings>> {
  const existing = await readOrg(data)
  if (existing) return { ...existing, json_data: normalizeOrg(existing.json_data, name) }
  return data.insert<OrgSettings>(T.org, defaultOrg(name), 'Réglages CLIP')
}

/* ───────────────────────── Postes ───────────────────────── */

export async function listStations(data: DataApi): Promise<Doc<Station>[]> {
  return data.filter<Station>(T.station, { sort: { 'json_data.name': 1 }, limit: 1000 })
}

/* ───────────────────────── Instructions ───────────────────────── */

const LIST_PROJECTION = { 'json_data.draft': 0, 'json_data.sources': 0 } as const

export async function listInstructions(data: DataApi, filter?: Record<string, unknown>, limit = 500): Promise<Doc<Instruction>[]> {
  return data.filter<Instruction>(T.instruction, {
    filter: { 'json_data.status': { $ne: 'archived' }, ...(filter ?? {}) },
    projection: LIST_PROJECTION,
    sort: { 'json_data.updatedAt': -1 },
    limit,
  })
}

export function emptyContent(partial: Partial<InstructionContent> = {}): InstructionContent {
  // Le titre par défaut s'écrit dans la langue du contenu.
  const language = partial.language ?? contentLanguage()
  return {
    title: messagesIn(language).instructions.defaults.title,
    summary: '',
    kind: 'procedure',
    category: 'production',
    tags: [],
    ppe: [],
    tools: [],
    safety: [],
    steps: [],
    lockout: null,
    language,
    ...partial,
  }
}

export function coverOf(content: InstructionContent | null): string | null {
  if (!content) return null
  for (const step of content.steps) {
    for (const m of step.media) {
      if (m.kind === 'image') return m.url
      if (m.kind === 'video' && m.posterUrl) return m.posterUrl
      if (m.kind === 'document' && m.pageImageUrl) return m.pageImageUrl
    }
  }
  return null
}

/* ───────────────────────── Versions et publication ───────────────────────── */

export async function listVersions(data: DataApi, instructionId: string): Promise<Doc<Version>[]> {
  return data.filter<Version>(T.version, {
    filter: { 'json_data.instructionId': { $eq: instructionId } },
    sort: { 'json_data.number': -1 },
    limit: 100,
  })
}

export async function findPublished(data: DataApi, instructionId: string): Promise<Doc<Published> | null> {
  const docs = await data.filter<Published>(T.published, { filter: { 'json_data.instructionId': { $eq: instructionId } }, limit: 1 })
  return docs[0] ?? null
}

export async function listPublishedForStation(data: DataApi, stationId: string): Promise<Doc<Published>[]> {
  return data.filter<Published>(T.published, {
    filter: { 'json_data.stationIds': { $eq: stationId } },
    projection: { 'json_data.content.translations': 0 },
    sort: { 'json_data.content.title': 1 },
    limit: 300,
  })
}

export async function listAllPublished(data: DataApi, limit = 500): Promise<Doc<Published>[]> {
  return data.filter<Published>(T.published, {
    projection: { 'json_data.content.translations': 0 },
    sort: { 'json_data.content.title': 1 },
    limit,
  })
}

/* ───────────────────────── Retours et événements ───────────────────────── */

export async function createFeedback(data: DataApi, feedback: Omit<Feedback, 'createdAt' | 'status'>): Promise<Doc<Feedback>> {
  return data.insert<Feedback>(T.feedback, { ...feedback, status: 'new', createdAt: nowIso() }, 'Retour opérateur')
}

export async function listFeedback(data: DataApi, filter?: Record<string, unknown>, limit = 300): Promise<Doc<Feedback>[]> {
  return data.filter<Feedback>(T.feedback, { filter, sort: { 'json_data.createdAt': -1 }, limit })
}

/** Journalise un usage ; ne casse jamais l'écran qui l'appelle. */
export function logUsage(data: DataApi, event: Omit<UsageEvent, 'at'>): void {
  void data.insert<UsageEvent>(T.event, { ...event, at: nowIso() }, 'Usage').catch(() => undefined)
}

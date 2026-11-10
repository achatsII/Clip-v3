/**
 * Modèle de données de CLIP V3 (contenu de `json_data` sur la Gateway).
 *
 * Ces formes sont partagées par toutes les versions de l'app qui tournent en même temps :
 * on ajoute des champs facultatifs, on ne renomme ni ne retire rien.
 */

export type InstructionKind = 'procedure' | 'lockout'

export type CategoryKey = 'production' | 'maintenance' | 'qualite' | 'sst' | 'nettoyage' | 'changement' | 'demarrage' | 'autre'

export type InstructionStatus = 'draft' | 'review' | 'published' | 'archived'

export type SourceKind = 'photo' | 'video' | 'audio' | 'note' | 'document'

/** Un média ou une note capturés : la matière première de la génération. */
export interface Source {
  id: string
  kind: SourceKind
  url?: string
  path?: string
  name?: string
  mimeType?: string
  sizeBytes?: number
  durationSec?: number
  width?: number
  height?: number
  thumbnailUrl?: string
  /** Texte d'une note, ou transcription d'une note vocale. */
  text?: string
  geminiFileUri?: string
  geminiExpiresAt?: string
  pageCount?: number
  /** Nom du fichier d'origine quand un document Word a été converti en PDF. */
  originalName?: string
  createdAt: string
  capturedOn?: 'web' | 'ios' | 'android'
}

export interface Annotation {
  id: string
  type: 'arrow' | 'circle' | 'rect' | 'number' | 'text'
  /** Coordonnées relatives (0 à 1) à l'image. */
  x: number
  y: number
  x2?: number
  y2?: number
  w?: number
  h?: number
  text?: string
  color: 'red' | 'yellow' | 'green' | 'blue' | 'white'
}

export type StepMedia =
  | { kind: 'image'; url: string; sourceId?: string; alt?: string; annotations?: Annotation[]; generated?: boolean }
  | { kind: 'video'; url: string; sourceId?: string; start: number; end: number; posterUrl?: string }
  | { kind: 'document'; url: string; sourceId?: string; page?: number; pageImageUrl?: string; name?: string }

export type WarningLevel = 'danger' | 'caution' | 'info'

export interface Step {
  id: string
  /** Verbe d'action à l'infinitif, court : « Retirer le garde de protection ». */
  title: string
  /** Une action, en une ou deux phrases courtes. */
  text: string
  keyPoints?: string[]
  warning?: { level: WarningLevel; text: string } | null
  media: StepMedia[]
  durationSec?: number | null
  /** Pour une fiche de cadenassage : le point d'isolement que l'étape traite. */
  energyPointId?: string | null
}

export type EnergyType = 'electrique' | 'pneumatique' | 'hydraulique' | 'mecanique' | 'gravite' | 'thermique' | 'chimique' | 'vapeur' | 'eau' | 'autre'

export interface EnergyPoint {
  id: string
  /** Repère affiché sur l'équipement : E1, P1, H1… */
  tag: string
  type: EnergyType
  description: string
  magnitude?: string
  isolationDevice: string
  location: string
  lockingMethod: string
  verification: string
  photoUrl?: string
}

export interface LockoutData {
  equipment: string
  location?: string
  locksRequired?: number
  /** Matériel requis : cadenas, moraillons, étiquettes… */
  material?: string[]
  energyPoints: EnergyPoint[]
  /** Remise en marche : étapes de retrait des cadenas. */
  restartSteps?: string[]
}

export interface InstructionContent {
  title: string
  summary: string
  kind: InstructionKind
  category: CategoryKey
  tags: string[]
  equipment?: string
  frequency?: string
  durationMin?: number | null
  ppe: string[]
  tools: string[]
  safety: string[]
  steps: Step[]
  lockout?: LockoutData | null
  language: string
  translations?: Record<string, TranslatedContent>
}

export interface TranslatedContent {
  title: string
  summary: string
  safety: string[]
  steps: Array<{ id: string; title: string; text: string; keyPoints?: string[]; warning?: string | null }>
}

export interface GenerationInfo {
  at: string
  model: string | null
  operation: string
  rating?: 'up' | 'down' | null
  comment?: string | null
  /** Ce que l'IA n'a pas pu trancher : affiché à la personne comme « À vérifier ». */
  questions?: string[]
  /** Poste deviné par l'IA (texte libre), avant rapprochement. */
  stationGuess?: string | null
}

export interface ReviewRequest {
  requestedBy: string
  requestedByName: string
  requestedAt: string
  approverIds: string[]
  note?: string | null
  /** Retour d'un approbateur qui demande des changements. */
  changesRequested?: { by: string; byName: string; at: string; comment: string } | null
}

export interface Instruction {
  title: string
  kind: InstructionKind
  category: CategoryKey
  tags: string[]
  stationIds: string[]
  status: InstructionStatus
  /** Une idée de départ dictée ou tapée par la personne (« nettoyage des rails, machine 1234 »). */
  intent?: string
  sources: Source[]
  /** La copie de travail. `null` tant que rien n'a été généré ni écrit. */
  draft: InstructionContent | null
  /** Le brouillon diffère-t-il de la version publiée ? */
  dirty?: boolean
  publishedVersion: number | null
  publishedId: string | null
  publishedAt?: string | null
  review?: ReviewRequest | null
  generation?: GenerationInfo | null
  origin?: 'capture' | 'import' | 'duplicate' | 'feedback'
  authorId: string
  authorName: string
  updatedBy?: string
  updatedByName?: string
  createdAt: string
  updatedAt: string
  /** Lien public direct (uuid d'un lien de redirection). */
  shareLinkId?: string | null
  /** Copies légères pour les listes (évite de lire le brouillon complet). */
  coverUrl?: string | null
  stepCount?: number
}

export interface Version {
  instructionId: string
  number: number
  content: InstructionContent
  stationIds: string[]
  publishedBy: string
  publishedByName: string
  approvedBy?: string | null
  approvedByName?: string | null
  changelog: string
  createdAt: string
}

export interface Branding {
  orgName: string
  logoUrl?: string | null
  color?: string | null
}

/** La version publiée courante d'une instruction, lisible par les liens publics. */
export interface Published {
  instructionId: string
  version: number
  content: InstructionContent
  stationIds: string[]
  branding: Branding
  publishedAt: string
  /** Lecture à voix haute déjà produite, par étape et par langue (`${stepId}:${lang}`). */
  audio?: Record<string, string>
}

export type StationKind = 'poste' | 'equipement' | 'zone'

export interface Station {
  name: string
  code?: string
  kind: StationKind
  area?: string
  description?: string
  /** Lien public du poste (tablette, code QR). */
  linkId?: string | null
  /** `focus` : ses instructions d'abord, les autres à un geste ; `only` : seulement les siennes. */
  linkMode?: 'focus' | 'only'
  linkCreatedAt?: string | null
  createdAt: string
}

export type FeedbackKind = 'unclear' | 'error' | 'danger' | 'idea' | 'praise'

export interface Feedback {
  instructionId: string
  publishedId?: string
  version?: number | null
  stepId?: string | null
  stepIndex?: number | null
  instructionTitle?: string
  kind: FeedbackKind
  comment?: string
  photoUrl?: string | null
  authorName?: string | null
  source: 'kiosk' | 'link' | 'app'
  stationId?: string | null
  status: 'new' | 'done' | 'dismissed'
  resolution?: string | null
  resolvedBy?: string | null
  resolvedAt?: string | null
  createdAt: string
}

export type EventType = 'view' | 'complete' | 'scan' | 'ai'

export interface UsageEvent {
  type: EventType
  instructionId?: string | null
  stationId?: string | null
  version?: number | null
  durationSec?: number | null
  source: 'kiosk' | 'link' | 'app'
  deviceId?: string | null
  operation?: string | null
  model?: string | null
  tokens?: number | null
  userId?: string | null
  at: string
}

export type MemberRole = 'admin' | 'author' | 'approver' | 'reader'

export interface MemberSettings {
  role: MemberRole
  categories: CategoryKey[]
  stationIds: string[]
  name?: string
  email?: string
}

export interface WritingStandard {
  /** Règles en mots simples, lues par l'IA à chaque génération. */
  rules: string[]
  startWithSafety: boolean
  maxWordsPerStep: number
  tone: 'tu' | 'vous' | 'infinitif'
  /** Vocabulaire propre à l'usine : terme → sens. */
  glossary: Array<{ term: string; meaning: string }>
  version: number
  updatedAt: string
  updatedByName?: string
}

export interface OrgSettings {
  name: string
  logoUrl?: string | null
  color?: string | null
  approval: { mode: 'none' | 'one'; approverIds: string[] }
  feedback: { notifyDanger: boolean }
  standard: WritingStandard
  standardHistory: WritingStandard[]
  /** Ce que la génération retient des avis donnés sur ses brouillons. */
  learnings: Array<{ text: string; at: string }>
  members: Record<string, MemberSettings>
  goals: CategoryKey[]
  onboardedAt?: string | null
  roi: { hoursSavedPerInstruction: number; hourlyRate: number; minutesSavedPerCompletion: number }
  /** Qui a ouvert CLIP le premier dans l'organisation : administrateur tant que personne d'autre ne l'est. */
  createdBy?: string
  createdAt: string
}

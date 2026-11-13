/**
 * Ce que l'app doit savoir du catalogue et que la plateforme ne rend pas : le prix de chaque
 * opération d'IA (copie de `ai_operations` du manifeste, comparée par un test) et les libellés
 * des features, dans l'ordre d'affichage. Aucun prix d'abonnement ici : ils se lisent à la plateforme.
 */
import { getLang, messages } from '@/lib/i18n'
import type { AiOperation } from '../gateway/ai'
import type { ToggleName } from '../toggleDefaults'

export const AI_COSTS: Record<AiOperation, number> = {
  generate_s: 150,
  generate_m: 300,
  generate_l: 750,
  import_s: 60,
  import_l: 120,
  step_assist: 5,
  translate: 30,
  translate_image: 70,
  annotate: 5,
  illustrate: 70,
  ask_question: 2,
  standard_agent: 5,
  edit_agent: 20,
  visual: 60,
  look_s: 60,
  look_m: 120,
  look_l: 300,
  quiz: 10,
}

export type FeatureKey =
  | 'ai_credits'
  | 'published_instructions'
  | 'stations'
  | 'editors'
  | 'approvals'
  | 'bulk_import'
  | 'translations'
  | 'voice_assistant'
  | 'adoption_stats'
  | 'brand_kit'
  | 'full_export'
  | 'shared_blocks'
  | 'academy'
  | 'records_plus'

/** Les features qui plafonnent une quantité détenue (`kind: limit` au manifeste) : l'app les compte. */
export const LIMIT_FEATURES = ['published_instructions', 'stations', 'editors'] as const satisfies readonly FeatureKey[]
export type LimitFeature = (typeof LIMIT_FEATURES)[number]
export const isLimitFeature = (key: string | null | undefined): key is LimitFeature => (LIMIT_FEATURES as readonly string[]).includes(key ?? '')

export interface FeatureLabel {
  fr: string
  en: string
  /** Comment dire la quantité : « 10 postes ». */
  unit?: { fr: [string, string]; en: [string, string] }
}

/** Libellés de chaque feature du manifeste (un test échoue s'il en manque un). */
export const FEATURE_LABELS: Record<FeatureKey, FeatureLabel> = {
  ai_credits: { fr: 'Crédits IA par mois', en: 'AI credits per month', unit: { fr: ['crédit', 'crédits'], en: ['credit', 'credits'] } },
  published_instructions: { fr: 'Instructions publiées', en: 'Published instructions', unit: { fr: ['instruction', 'instructions'], en: ['instruction', 'instructions'] } },
  stations: { fr: 'Postes avec code QR et tablette', en: 'Stations with QR code and tablet', unit: { fr: ['poste', 'postes'], en: ['station', 'stations'] } },
  editors: { fr: 'Rédacteurs et approbateurs', en: 'Editors and approvers', unit: { fr: ['rédacteur', 'rédacteurs'], en: ['editor', 'editors'] } },
  approvals: { fr: 'Approbation avant publication', en: 'Approval before publishing' },
  bulk_import: { fr: 'Import en lot des anciens PDF et Word', en: 'Bulk import of old PDF and Word files' },
  translations: { fr: 'Traduction pour les opérateurs', en: 'Translation for operators' },
  voice_assistant: { fr: 'Assistant vocal au poste', en: 'Voice assistant at the station' },
  adoption_stats: { fr: 'Statistiques d’adoption et retour sur investissement', en: 'Adoption statistics and ROI' },
  brand_kit: { fr: 'Logo et couleurs de l’usine, PDF sans mention CLIP', en: 'Plant logo and colors, PDFs without CLIP branding' },
  full_export: { fr: 'Export complet de toutes les instructions', en: 'Full export of all instructions' },
  shared_blocks: { fr: 'Blocs communs : des étapes rédigées une fois, à jour partout', en: 'Shared blocks: steps written once, up to date everywhere' },
  academy: { fr: 'Académie', en: 'Academy' },
  records_plus: { fr: 'Relevés avancés', en: 'Advanced records' },
}

/** Le libellé d'une feature dans la langue de l'outil ; l'anglais pour une langue que le catalogue n'a pas encore. */
export function featureLabel(key: FeatureKey): string {
  const label = FEATURE_LABELS[key]
  return getLang() === 'fr' ? label.fr : label.en
}

/** Les deux formes de l'unité d'une feature (« poste », « postes »), dans la langue de l'outil. */
export function featureUnit(key: FeatureKey): [string, string] | undefined {
  const unit = FEATURE_LABELS[key].unit
  return unit && (getLang() === 'fr' ? unit.fr : unit.en)
}

/** Ordre d'affichage dans les cartes de plans. */
export const FEATURE_ORDER: FeatureKey[] = [
  'ai_credits',
  'published_instructions',
  'stations',
  'editors',
  'translations',
  'adoption_stats',
  'approvals',
  'bulk_import',
  'voice_assistant',
  'brand_kit',
  'shared_blocks',
  'full_export',
  'academy',
  'records_plus',
]

/** Phrase de présentation de chaque plan (le manifeste n'a pas de champ de description). */
// Chaque phrase se lit dans le dictionnaire de la langue de l'outil, au moment où on l'affiche.
export const PLAN_PITCH: Record<string, string> = Object.defineProperties(
  {},
  Object.fromEntries((['free', 'solo', 'equipe', 'usine'] as const).map((code) => [code, { get: () => messages().billing.plans.pitch[code], enumerable: true }])),
)

/** Le plan mis en avant sur la page des plans. */
export const FEATURED_PLAN = 'equipe'

/* ───────────────────────── Les modules en option ───────────────────────── */

export type ModuleKey = 'academy' | 'records'

export interface ModuleDef {
  key: ModuleKey
  /** La feature que le module ouvre. */
  feature: FeatureKey
  /** Le feature toggle de l'app : un module se montre et se vend seulement une fois bâti. */
  toggle: ToggleName
  /** Le module à acheter selon le plan de base (le prix suit le plan) ; un plan absent ne le reçoit pas. */
  addons: Partial<Record<string, string>>
}

/** Les modules (`kind: addon` au manifeste, un par plan de base : un test les compare). */
export const MODULES: readonly ModuleDef[] = [
  { key: 'academy', feature: 'academy', toggle: 'academy', addons: { equipe: 'academie_equipe', usine: 'academie_usine' } },
  { key: 'records', feature: 'records_plus', toggle: 'recordsPlus', addons: { equipe: 'releves_equipe', usine: 'releves_usine' } },
]

/** Le module qui ouvre cette feature, s'il y en a un. */
export const moduleOf = (feature: string | null | undefined): ModuleDef | null => MODULES.find((m) => m.feature === feature) ?? null

/** Le code du module à acheter avec ce plan de base ; null si le plan ne le reçoit pas. */
export const addonFor = (m: ModuleDef, planCode: string | null | undefined): string | null => (planCode && m.addons[planCode]) || null

/** Les plans de base qui reçoivent ce module (« avec Équipe ou Usine »). */
export const plansFor = (m: ModuleDef): string[] => Object.keys(m.addons)


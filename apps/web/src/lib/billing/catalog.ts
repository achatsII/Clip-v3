/**
 * Ce que l'app doit savoir du catalogue et que la plateforme ne rend pas : le prix de chaque
 * opération d'IA (copie de `ai_operations` du manifeste, comparée par un test) et les libellés
 * des features, dans l'ordre d'affichage. Aucun prix d'abonnement ici : ils se lisent à la plateforme.
 */
import type { AiOperation } from '../gateway/ai'

export const AI_COSTS: Record<AiOperation, number> = {
  generate_s: 150,
  generate_m: 300,
  generate_l: 750,
  import_s: 60,
  import_l: 120,
  step_assist: 5,
  instruction_edit: 40,
  translate: 30,
  annotate: 5,
  illustrate: 70,
  ask_question: 2,
  standard_agent: 5,
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
  editors: { fr: 'Rédacteurs et approbateurs', en: 'Authors and approvers', unit: { fr: ['rédacteur', 'rédacteurs'], en: ['author', 'authors'] } },
  approvals: { fr: 'Approbation avant publication', en: 'Approval before publishing' },
  bulk_import: { fr: 'Import en lot des anciens PDF et Word', en: 'Bulk import of old PDF and Word files' },
  translations: { fr: 'Traduction pour les opérateurs', en: 'Translation for operators' },
  voice_assistant: { fr: 'Assistant vocal au poste', en: 'Voice assistant at the station' },
  adoption_stats: { fr: 'Statistiques d’adoption et retour sur investissement', en: 'Adoption statistics and ROI' },
  brand_kit: { fr: 'Logo et couleurs de l’usine, PDF sans mention CLIP', en: 'Plant logo and colors, PDF without CLIP mention' },
  full_export: { fr: 'Export complet de toutes les instructions', en: 'Full export of all instructions' },
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
  'full_export',
]

/** Phrase de présentation de chaque plan (le manifeste n'a pas de champ de description). */
export const PLAN_PITCH: Record<string, string> = {
  free: 'Pour essayer avec vos premières instructions.',
  solo: 'Pour la personne qui documente son travail et le partage par code QR.',
  usine: 'Pour toute l’usine : équipe de rédaction, approbation, postes et tablettes.',
}

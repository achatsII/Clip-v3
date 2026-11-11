/**
 * Libellés et couleurs du métier, réunis à un seul endroit.
 */
import type { CategoryKey, EnergyType, FeedbackKind, InstructionKind, MemberRole, WarningLevel } from './types'

export const CATEGORIES: Record<CategoryKey, { label: string; short: string; tile: string; soft: string; text: string }> = {
  production: { label: 'Production', short: 'Prod.', tile: 'from-sky-500 to-blue-600', soft: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', text: 'text-sky-600' },
  maintenance: { label: 'Maintenance', short: 'Maint.', tile: 'from-orange-500 to-rose-500', soft: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300', text: 'text-orange-600' },
  qualite: { label: 'Qualité', short: 'Qualité', tile: 'from-violet-500 to-indigo-600', soft: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', text: 'text-violet-600' },
  sst: { label: 'Santé et sécurité', short: 'SST', tile: 'from-rose-500 to-red-600', soft: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', text: 'text-rose-600' },
  nettoyage: { label: 'Nettoyage', short: 'Nettoyage', tile: 'from-teal-400 to-emerald-600', soft: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300', text: 'text-teal-600' },
  changement: { label: 'Changement de format', short: 'Format', tile: 'from-amber-400 to-orange-500', soft: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300', text: 'text-amber-600' },
  demarrage: { label: 'Démarrage et arrêt', short: 'Démarrage', tile: 'from-lime-500 to-green-600', soft: 'bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-300', text: 'text-lime-600' },
  autre: { label: 'Autre', short: 'Autre', tile: 'from-slate-500 to-slate-700', soft: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300', text: 'text-slate-600' },
}

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[]

export const KINDS: Record<InstructionKind, { label: string; description: string }> = {
  procedure: { label: 'Instruction de travail', description: 'Étape par étape, avec photos et vidéos.' },
  lockout: { label: 'Fiche de cadenassage', description: 'Sources d’énergie, points d’isolement, vérification.' },
}

/** Équipements de protection individuelle : clé stable → libellé court. */
export const PPE: Record<string, string> = {
  casque: 'Casque',
  lunettes: 'Lunettes',
  gants: 'Gants',
  'gants-coupure': 'Gants anticoupure',
  'protection-auditive': 'Protection auditive',
  bottes: 'Bottes de sécurité',
  visiere: 'Visière',
  masque: 'Masque',
  harnais: 'Harnais',
  'vetements-ignifuges': 'Vêtements ignifugés',
  dossard: 'Dossard',
  tablier: 'Tablier',
}

export const ENERGY: Record<EnergyType, { label: string; prefix: string; color: string }> = {
  electrique: { label: 'Électrique', prefix: 'E', color: 'bg-yellow-400 text-slate-900' },
  pneumatique: { label: 'Pneumatique', prefix: 'P', color: 'bg-sky-500 text-white' },
  hydraulique: { label: 'Hydraulique', prefix: 'H', color: 'bg-blue-700 text-white' },
  mecanique: { label: 'Mécanique', prefix: 'M', color: 'bg-slate-600 text-white' },
  gravite: { label: 'Gravité', prefix: 'G', color: 'bg-stone-500 text-white' },
  thermique: { label: 'Thermique', prefix: 'T', color: 'bg-red-500 text-white' },
  chimique: { label: 'Chimique', prefix: 'C', color: 'bg-purple-600 text-white' },
  vapeur: { label: 'Vapeur', prefix: 'V', color: 'bg-zinc-400 text-slate-900' },
  eau: { label: 'Eau', prefix: 'W', color: 'bg-cyan-500 text-white' },
  autre: { label: 'Autre', prefix: 'X', color: 'bg-slate-400 text-white' },
}

export const WARNINGS: Record<WarningLevel, { label: string; className: string }> = {
  danger: { label: 'Danger', className: 'bg-gradient-to-br from-[#FF2B5E] to-[#FF6B00] text-white' },
  caution: { label: 'Attention', className: 'bg-gradient-to-br from-[#FFC800] to-[#FF9F00] text-slate-900' },
  info: { label: 'Bon à savoir', className: 'bg-gradient-primary text-white' },
}

export const FEEDBACK_KINDS: Record<FeedbackKind, { label: string; question: string; className: string }> = {
  unclear: { label: 'Pas clair', question: 'Ce n’est pas clair', className: 'from-amber-400 to-orange-500' },
  error: { label: 'Erreur', question: 'Il y a une erreur', className: 'from-violet-500 to-indigo-600' },
  danger: { label: 'Danger', question: 'C’est dangereux', className: 'from-[#FF2B5E] to-[#FF6B00]' },
  idea: { label: 'Idée', question: 'J’ai une meilleure façon', className: 'from-sky-500 to-blue-600' },
  praise: { label: 'Merci', question: 'Ça m’a aidé', className: 'from-emerald-400 to-green-600' },
}

export type Permission = 'none' | 'read' | 'write'
export type Feature = 'instructions' | 'publish' | 'approve' | 'stations' | 'feedback' | 'stats' | 'members' | 'settings'

export const ROLES: Record<MemberRole, { label: string; summary: string; permissions: Record<Feature, Permission> }> = {
  admin: {
    label: 'Administrateur',
    summary: 'Configure l’usine, les postes et les membres ; crée, approuve et publie.',
    permissions: { instructions: 'write', publish: 'write', approve: 'write', stations: 'write', feedback: 'write', stats: 'read', members: 'write', settings: 'write' },
  },
  approver: {
    label: 'Approbateur',
    summary: 'Crée et corrige ; approuve ce que les autres publient.',
    permissions: { instructions: 'write', publish: 'write', approve: 'write', stations: 'read', feedback: 'write', stats: 'read', members: 'none', settings: 'none' },
  },
  author: {
    label: 'Rédacteur',
    summary: 'Crée et corrige des instructions ; les publie, ou demande l’approbation si l’usine l’exige.',
    permissions: { instructions: 'write', publish: 'write', approve: 'none', stations: 'read', feedback: 'write', stats: 'read', members: 'none', settings: 'none' },
  },
  reader: {
    label: 'Lecteur',
    summary: 'Consulte les instructions publiées et signale ce qui n’est pas clair.',
    permissions: { instructions: 'read', publish: 'none', approve: 'none', stations: 'read', feedback: 'read', stats: 'none', members: 'none', settings: 'none' },
  },
}

export const STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'bg-slate-500/90' },
  review: { label: 'À approuver', className: 'bg-amber-500' },
  published: { label: 'Publiée', className: 'bg-emerald-500' },
  archived: { label: 'Archivée', className: 'bg-slate-400' },
}

/**
 * Les langues des opérateurs. `label` : le nom en français, aussi donné à l'IA qui traduit ;
 * `native` : le nom dans la langue, pour le choix au poste ; `common` : les plus demandées dans les
 * usines du Québec, en tête de liste ; `rtl` : s'écrit de droite à gauche.
 */
export interface LanguageInfo {
  label: string
  native: string
  common?: boolean
  rtl?: boolean
}

export const LANGUAGES: Record<string, LanguageInfo> = {
  fr: { label: 'Français', native: 'Français', common: true },
  en: { label: 'Anglais', native: 'English', common: true },
  es: { label: 'Espagnol', native: 'Español', common: true },
  pt: { label: 'Portugais', native: 'Português', common: true },
  ar: { label: 'Arabe', native: 'العربية', common: true, rtl: true },
  ht: { label: 'Créole haïtien', native: 'Kreyòl ayisyen', common: true },
  tl: { label: 'Tagalog', native: 'Tagalog', common: true },
  vi: { label: 'Vietnamien', native: 'Tiếng Việt', common: true },
  zh: { label: 'Chinois', native: '中文', common: true },
  uk: { label: 'Ukrainien', native: 'Українська', common: true },
  pa: { label: 'Pendjabi', native: 'ਪੰਜਾਬੀ', common: true },
  hi: { label: 'Hindi', native: 'हिन्दी', common: true },
  ru: { label: 'Russe', native: 'Русский', common: true },
  ro: { label: 'Roumain', native: 'Română', common: true },
  fa: { label: 'Persan', native: 'فارسی', common: true, rtl: true },
  de: { label: 'Allemand', native: 'Deutsch' },
  am: { label: 'Amharique', native: 'አማርኛ' },
  bn: { label: 'Bengali', native: 'বাংলা' },
  ko: { label: 'Coréen', native: '한국어' },
  el: { label: 'Grec', native: 'Ελληνικά' },
  gu: { label: 'Gujarati', native: 'ગુજરાતી' },
  he: { label: 'Hébreu', native: 'עברית', rtl: true },
  id: { label: 'Indonésien', native: 'Bahasa Indonesia' },
  it: { label: 'Italien', native: 'Italiano' },
  ja: { label: 'Japonais', native: '日本語' },
  km: { label: 'Khmer', native: 'ខ្មែរ' },
  rw: { label: 'Kinyarwanda', native: 'Ikinyarwanda' },
  ln: { label: 'Lingala', native: 'Lingála' },
  nl: { label: 'Néerlandais', native: 'Nederlands' },
  ne: { label: 'Népalais', native: 'नेपाली' },
  pl: { label: 'Polonais', native: 'Polski' },
  so: { label: 'Somali', native: 'Soomaali' },
  sw: { label: 'Swahili', native: 'Kiswahili' },
  ta: { label: 'Tamoul', native: 'தமிழ்' },
  th: { label: 'Thaï', native: 'ไทย' },
  ti: { label: 'Tigrigna', native: 'ትግርኛ' },
  tr: { label: 'Turc', native: 'Türkçe' },
  ur: { label: 'Ourdou', native: 'اردو', rtl: true },
}

/** Le sens d'écriture d'une langue, pour l'attribut `dir`. */
export const textDir = (lang: string): 'rtl' | 'ltr' => (LANGUAGES[lang]?.rtl ? 'rtl' : 'ltr')

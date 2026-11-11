/**
 * Libellés et couleurs du métier, réunis à un seul endroit. Les couleurs vivent ici ; les mots,
 * dans le dictionnaire de la langue de l'outil (`i18n/<langue>/catalog.ts`) : chaque libellé se lit
 * au moment où on l'affiche, dans la langue choisie.
 */
import { getLang, locale, messages } from '@/lib/i18n'
import type { CategoryKey, EnergyType, FeedbackKind, InstructionKind, MemberRole, WarningLevel } from './types'

const words = () => messages().catalog

/** Ajoute à chaque entrée ses libellés, lus dans la langue de l'outil à chaque lecture. */
function withLabels<K extends string, B extends object, L extends object>(base: Record<K, B>, labels: (k: K) => L): Record<K, B & L> {
  const out = {} as Record<K, B & L>
  for (const k of Object.keys(base) as K[]) {
    const entry = { ...base[k] } as B & L
    for (const prop of Object.keys(labels(k))) {
      Object.defineProperty(entry, prop, { get: () => (labels(k) as Record<string, unknown>)[prop], enumerable: true })
    }
    out[k] = entry
  }
  return out
}

export const CATEGORIES: Record<CategoryKey, { label: string; short: string; tile: string; soft: string; text: string }> = withLabels(
  {
    production: { tile: 'from-sky-500 to-blue-600', soft: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', text: 'text-sky-600' },
    maintenance: { tile: 'from-orange-500 to-rose-500', soft: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300', text: 'text-orange-600' },
    qualite: { tile: 'from-violet-500 to-indigo-600', soft: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', text: 'text-violet-600' },
    sst: { tile: 'from-rose-500 to-red-600', soft: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', text: 'text-rose-600' },
    nettoyage: { tile: 'from-teal-400 to-emerald-600', soft: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300', text: 'text-teal-600' },
    changement: { tile: 'from-amber-400 to-orange-500', soft: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300', text: 'text-amber-600' },
    demarrage: { tile: 'from-lime-500 to-green-600', soft: 'bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-300', text: 'text-lime-600' },
    autre: { tile: 'from-slate-500 to-slate-700', soft: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300', text: 'text-slate-600' },
  },
  (k) => words().categories[k],
)

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[]

export const KINDS: Record<InstructionKind, { label: string; description: string }> = withLabels({ procedure: {}, lockout: {} }, (k) => words().kinds[k])

/** Équipements de protection individuelle : clé stable → libellé court. */
export const PPE: Record<string, string> = Object.defineProperties(
  {},
  Object.fromEntries(Object.keys(words().ppe).map((k) => [k, { get: () => words().ppe[k as keyof ReturnType<typeof words>['ppe']], enumerable: true }])),
)

export const ENERGY: Record<EnergyType, { label: string; prefix: string; color: string }> = withLabels(
  {
    electrique: { prefix: 'E', color: 'bg-yellow-400 text-slate-900' },
    pneumatique: { prefix: 'P', color: 'bg-sky-500 text-white' },
    hydraulique: { prefix: 'H', color: 'bg-blue-700 text-white' },
    mecanique: { prefix: 'M', color: 'bg-slate-600 text-white' },
    gravite: { prefix: 'G', color: 'bg-stone-500 text-white' },
    thermique: { prefix: 'T', color: 'bg-red-500 text-white' },
    chimique: { prefix: 'C', color: 'bg-purple-600 text-white' },
    vapeur: { prefix: 'V', color: 'bg-zinc-400 text-slate-900' },
    eau: { prefix: 'W', color: 'bg-cyan-500 text-white' },
    autre: { prefix: 'X', color: 'bg-slate-400 text-white' },
  },
  (k) => ({ label: words().energy[k] }),
)

export const WARNINGS: Record<WarningLevel, { label: string; className: string }> = withLabels(
  {
    danger: { className: 'bg-gradient-to-br from-[#FF2B5E] to-[#FF6B00] text-white' },
    caution: { className: 'bg-gradient-to-br from-[#FFC800] to-[#FF9F00] text-slate-900' },
    info: { className: 'bg-gradient-primary text-white' },
  },
  (k) => ({ label: words().warnings[k] }),
)

export const FEEDBACK_KINDS: Record<FeedbackKind, { label: string; question: string; className: string }> = withLabels(
  {
    unclear: { className: 'from-amber-400 to-orange-500' },
    error: { className: 'from-violet-500 to-indigo-600' },
    danger: { className: 'from-[#FF2B5E] to-[#FF6B00]' },
    idea: { className: 'from-sky-500 to-blue-600' },
    praise: { className: 'from-emerald-400 to-green-600' },
  },
  (k) => words().feedbackKinds[k],
)

export type Permission = 'none' | 'read' | 'write'
export type Feature = 'instructions' | 'publish' | 'approve' | 'stations' | 'feedback' | 'stats' | 'members' | 'settings'

export const ROLES: Record<MemberRole, { label: string; summary: string; permissions: Record<Feature, Permission> }> = withLabels(
  {
    admin: { permissions: { instructions: 'write', publish: 'write', approve: 'write', stations: 'write', feedback: 'write', stats: 'read', members: 'write', settings: 'write' } },
    approver: { permissions: { instructions: 'write', publish: 'write', approve: 'write', stations: 'read', feedback: 'write', stats: 'read', members: 'none', settings: 'none' } },
    author: { permissions: { instructions: 'write', publish: 'write', approve: 'none', stations: 'read', feedback: 'write', stats: 'read', members: 'none', settings: 'none' } },
    reader: { permissions: { instructions: 'read', publish: 'none', approve: 'none', stations: 'read', feedback: 'read', stats: 'none', members: 'none', settings: 'none' } },
  } satisfies Record<MemberRole, { permissions: Record<Feature, Permission> }>,
  (k) => words().roles[k],
)

export const STATUS: Record<string, { label: string; className: string }> = withLabels(
  {
    draft: { className: 'bg-slate-500/90' },
    review: { className: 'bg-amber-500' },
    published: { className: 'bg-emerald-500' },
    archived: { className: 'bg-slate-400' },
  },
  (k) => ({ label: words().status[k] }),
)

/**
 * Les langues des opérateurs. `label` : le nom dans la langue de l'outil (le français est écrit
 * ici ; les autres langues de l'outil le tiennent du navigateur, `Intl.DisplayNames`), aussi donné
 * à l'IA qui traduit ; `native` : le nom dans la langue, pour le choix au poste ; `common` : les plus
 * demandées dans les usines du Québec, en tête de liste ; `rtl` : s'écrit de droite à gauche.
 */
export interface LanguageInfo {
  label: string
  native: string
  common?: boolean
  rtl?: boolean
}

const LANGUAGE_LIST: Record<string, LanguageInfo> = {
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

const displayNames = new Map<string, Intl.DisplayNames | null>()

/** Le nom d'une langue dans la langue de l'outil ; le nom français écrit plus haut à défaut. */
function languageName(code: string, french: string): string {
  const ui = getLang()
  if (ui === 'fr') return french
  if (!displayNames.has(ui)) {
    try {
      displayNames.set(ui, new Intl.DisplayNames([locale()], { type: 'language' }))
    } catch {
      displayNames.set(ui, null)
    }
  }
  const name = displayNames.get(ui)?.of(code)
  return name && name !== code ? name.charAt(0).toLocaleUpperCase(locale()) + name.slice(1) : french
}

export const LANGUAGES: Record<string, LanguageInfo> = Object.fromEntries(
  Object.entries(LANGUAGE_LIST).map(([code, info]) => {
    const entry = { ...info }
    Object.defineProperty(entry, 'label', { get: () => languageName(code, info.label), enumerable: true })
    return [code, entry]
  }),
)

/** Le sens d'écriture d'une langue, pour l'attribut `dir`. */
export const textDir = (lang: string): 'rtl' | 'ltr' => (LANGUAGES[lang]?.rtl ? 'rtl' : 'ltr')

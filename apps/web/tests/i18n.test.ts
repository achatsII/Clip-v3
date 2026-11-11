import { afterEach, describe, expect, it } from 'vitest'
import { en } from '@/lib/i18n/en'
import { fr } from '@/lib/i18n/fr'
import { getLang, locale, messages, setLang } from '@/lib/i18n'
import { CATEGORIES, LANGUAGES, PPE, ROLES, WARNINGS } from '@/lib/model/catalog'
import { THEME_PRESETS } from '@/lib/theme'
import { formatBytes, formatDate, plural, timeAgo } from '@/lib/util/cn'

afterEach(() => setLang('fr'))

/** Les feuilles d'un dictionnaire : chemin → valeur (texte ou fonction). */
function leaves(o: unknown, path = ''): Array<[string, unknown]> {
  if (typeof o === 'string' || typeof o === 'function') return [[path, o]]
  if (Array.isArray(o)) return o.flatMap((v, i) => leaves(v, `${path}[${i}]`))
  if (o && typeof o === 'object') return Object.entries(o).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k))
  return [[path, o]]
}

/** Les noms de plusieurs mots qui ne se traduisent pas (un mot seul peut s'écrire pareil : « Photos », « Version »). */
const SAME_IN_BOTH = /^(App Store|Google Play|Intelligence Industrielle)$/

describe('les dictionnaires', () => {
  it('ont les mêmes clés et les mêmes formes dans chaque langue', () => {
    const f = leaves(fr)
    const e = new Map(leaves(en))
    expect([...e.keys()].sort()).toEqual(f.map(([k]) => k).sort())
    for (const [k, v] of f) expect(typeof e.get(k), k).toBe(typeof v)
    for (const [k, v] of f) if (typeof v === 'function') expect((e.get(k) as (...a: unknown[]) => unknown).length, k).toBe(v.length)
  })

  it('n’ont pas de texte vide', () => {
    for (const [k, v] of [...leaves(fr), ...leaves(en)]) if (typeof v === 'string') expect(v.trim(), k).not.toBe('')
  })

  it('traduisent vraiment : l’anglais n’est pas une copie du français', () => {
    const frMap = new Map(leaves(fr))
    const copies = leaves(en).filter(([k, v]) => typeof v === 'string' && v === frMap.get(k) && /\s/.test(v.trim()) && !SAME_IN_BOTH.test(v))
    expect(copies.map(([k]) => k)).toEqual([])
    // Des accents français dans un texte anglais trahissent une phrase oubliée.
    const accented = leaves(en).filter(([, v]) => typeof v === 'string' && /[àâçéèêëîïôûùœ]/i.test(v) && !/Québec|Français|Intelligence Industrielle/.test(v))
    expect(accented.map(([k, v]) => `${k}: ${v}`)).toEqual([])
  })
})

describe('la langue de l’outil', () => {
  it('se choisit, se garde et se dit à la page', () => {
    expect(getLang()).toBe('fr')
    setLang('en')
    expect(getLang()).toBe('en')
    expect(localStorage.getItem('clip_pref_ui_lang')).toBe('en')
    expect(document.documentElement.lang).toBe('en-CA')
    expect(locale()).toBe('en-CA')
    expect(messages().common.cancel).toBe('Cancel')
    setLang('fr')
    expect(document.documentElement.lang).toBe('fr-CA')
    expect(messages().common.cancel).toBe('Annuler')
  })

  it('traduit les mots du métier au moment où on les lit', () => {
    expect(CATEGORIES.sst.label).toBe('Santé et sécurité')
    expect(WARNINGS.caution.label).toBe('Attention')
    expect(PPE.casque).toBe('Casque')
    expect(ROLES.author.label).toBe('Rédacteur')
    expect(LANGUAGES.es.label).toBe('Espagnol')
    expect(THEME_PRESETS[0].label).toBe('Océan')
    setLang('en')
    expect(CATEGORIES.sst.label).toBe('Health and safety')
    expect(CATEGORIES.sst.tile).toBe('from-rose-500 to-red-600')
    expect(WARNINGS.caution.label).toBe('Caution')
    expect(PPE.casque).toBe('Hard hat')
    expect(Object.keys(PPE)).toContain('gants-coupure')
    expect(ROLES.author.label).toBe('Editor')
    expect(ROLES.author.permissions.instructions).toBe('write')
    expect(LANGUAGES.es.label).toBe('Spanish')
    expect(LANGUAGES.es.native).toBe('Español')
    expect(THEME_PRESETS[0].label).toBe('Ocean')
  })

  it('écrit dates, nombres et tailles dans la langue choisie', () => {
    const iso = '2026-03-05T12:00:00Z'
    expect(formatDate(iso)).toMatch(/mars/)
    expect(plural(1, 'étape')).toBe('1 étape')
    expect(plural(0, 'étape')).toBe('0 étape')
    expect(formatBytes(2.5 * 1024 * 1024)).toBe('2,5 Mo')
    expect(timeAgo(new Date().toISOString())).toBe('à l’instant')
    setLang('en')
    expect(formatDate(iso)).toMatch(/March/)
    expect(plural(0, 'step')).toBe('0 steps')
    expect(plural(1, 'step')).toBe('1 step')
    expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB')
    expect(timeAgo(new Date().toISOString())).toBe('just now')
    expect(timeAgo(new Date(Date.now() - 3 * 3600_000).toISOString())).toBe('3 hours ago')
  })
})

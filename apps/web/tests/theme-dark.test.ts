/**
 * Le mode sombre avec la couleur de l'usine. Le cas vécu le 2026-11-16 : au téléphone, en sombre, les
 * points clés de l'éditeur s'écrivaient en blanc sur un fond bleu très pâle (1,04:1), illisibles. La
 * couleur de l'usine posait son ton pâle directement dans `--primary-soft`, sur la racine : un style
 * posé là bat la règle `:root.dark` de la feuille de style.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { applyBrandColor } from '@/lib/theme'

const css = readFileSync(join(__dirname, '../src/app/globals.css'), 'utf8')
/** Le contenu d'un bloc de la feuille de style, par son sélecteur exact. */
const block = (selector: string) => {
  const at = css.indexOf(`${selector} {`)
  expect(at, `le bloc ${selector}`).toBeGreaterThanOrEqual(0)
  return css.slice(at, css.indexOf('}', at))
}

afterEach(() => {
  document.documentElement.removeAttribute('style')
  document.documentElement.dataset.preset = 'ocean'
})

describe('la couleur de l’usine', () => {
  it('pose son ton pâle à part (--brand-soft) : rien sur la racine ne fige --primary-soft', () => {
    const root = document.documentElement
    root.dataset.preset = 'ocean'
    root.style.setProperty('--primary-soft', '#ffffff') // un reste d'avant
    applyBrandColor('#0a72f5')
    expect(root.style.getPropertyValue('--primary-soft'), 'le mode sombre doit pouvoir le remplacer').toBe('')
    expect(root.style.getPropertyValue('--brand-soft')).toMatch(/^#[0-9a-f]{6}$/)
    expect(root.style.getPropertyValue('--primary-rgb')).toBe('10, 114, 245')
  })

  it('un autre thème que Océan : la couleur de l’usine s’efface, ton pâle compris', () => {
    const root = document.documentElement
    applyBrandColor('#0a72f5')
    root.dataset.preset = 'nature'
    applyBrandColor('#0a72f5')
    expect(root.style.getPropertyValue('--brand-soft')).toBe('')
    expect(root.style.getPropertyValue('--primary')).toBe('')
  })
})

describe('la feuille de style', () => {
  it('en clair, --primary-soft reprend le ton de l’usine, sinon le violet pâle', () => {
    expect(block(':root')).toContain('--primary-soft: var(--brand-soft, #f1eafe);')
  })

  it('en sombre, --primary-soft devient une teinte translucide de la primaire du moment', () => {
    expect(block(':root.dark')).toContain('--primary-soft: rgba(var(--primary-rgb), 0.16);')
  })

  it('en sombre, le gris des textes secondaires s’éclaircit (slate-500 n’a que 3,4:1)', () => {
    expect(block(':root.dark')).toMatch(/--color-slate-500: var\(--color-slate-400/)
  })
})

describe('les écrans', () => {
  /** Tous les fichiers .tsx de src, pour y chercher une classe. */
  function sources(dir = join(__dirname, '../src')): Array<{ file: string; text: string }> {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? sources(join(dir, e.name)) : e.name.endsWith('.tsx') ? [{ file: join(dir, e.name), text: readFileSync(join(dir, e.name), 'utf8') }] : [],
    )
  }

  it('le bleu foncé de la primaire (--primary-strong) ne s’écrit jamais sans sa couleur du mode sombre', () => {
    // Par chaîne de classes, pas par ligne : l'autre branche d'une condition a souvent sa propre
    // couleur sombre, qui ne vaut rien pour celle-ci.
    const literal = /(['"`])((?:(?!\1)[^\n])*?text-\[var\(--primary-strong\)\](?:(?!\1)[^\n])*?)\1/g
    const missing = sources().flatMap(({ file, text }) =>
      [...text.matchAll(literal)].filter((m) => !m[2].includes('dark:text-')).map((m) => `${file.split('/src/')[1]} : ${m[2]}`),
    )
    expect(missing, 'texte bleu foncé illisible sur un fond sombre').toEqual([])
  })
})

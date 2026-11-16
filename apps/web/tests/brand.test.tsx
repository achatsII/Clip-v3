/**
 * La marque de CLIP depuis le 2026-11-16 : le logo 6 (« La pile d'extraits »), pris dans une banque de
 * 10 gardée pour pouvoir changer plus tard, et le violet comme couleur par défaut. Le bleu d'avant
 * reste au choix dans Apparence (thème « Océan »).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LogoMark } from '@/components/Logo'
import { BRAND, brandColorOf, LEGACY_DEFAULT_COLOR } from '@/lib/brand/colors'
import { BRAND_MARK, brandMark, iconSvg, MARKS, markOf } from '@/lib/brand/marks'
import { messagesIn } from '@/lib/i18n'
import { applyBrandColor, THEME_PRESETS } from '@/lib/theme'

const web = join(__dirname, '..')
const read = (path: string) => readFileSync(join(web, path), 'utf8')
const css = read('src/app/globals.css')
const block = (selector: string) => {
  const at = css.indexOf(`${selector} {`)
  expect(at, `le bloc ${selector}`).toBeGreaterThanOrEqual(0)
  return css.slice(at, css.indexOf('}', at))
}

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('style')
  document.documentElement.dataset.preset = 'ocean'
})

describe('la banque des logos', () => {
  it('garde les 10 propositions, numérotées comme sur la planche, chacune dessinée', () => {
    expect(MARKS.map((m) => m.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(new Set(MARKS.map((m) => m.id)).size).toBe(10)
    for (const m of MARKS) expect(m.svg('x').length, m.name).toBeGreaterThan(40)
  })

  it('le logo de l’app est le 6, « La pile d’extraits »', () => {
    expect(BRAND_MARK).toBe('pile')
    expect(markOf().n).toBe(6)
  })

  it('deux logos dans la même page ne se prêtent pas leurs masques', () => {
    const { container } = render(
      <>
        <LogoMark />
        <LogoMark className="h-16 w-16" />
      </>,
    )
    const masks = [...container.querySelectorAll('mask')].map((m) => m.id)
    expect(masks).toHaveLength(2)
    expect(new Set(masks).size).toBe(2)
    expect(container.querySelector('span')?.className).toContain('bg-gradient-primary')
  })

  it('une taille donnée remplace celle par défaut (cn ne fusionne pas les classes)', () => {
    const { container } = render(<LogoMark className="h-16 w-16" />)
    const cls = container.querySelector('span')!.className
    expect(cls).toContain('h-16')
    expect(cls).not.toContain('h-10')
  })

  it('les icônes fixes sont celles du logo choisi, dans la couleur par défaut (sinon : npm run brand-icons)', () => {
    expect(read('public/icon.svg').trim()).toBe(iconSvg({ from: BRAND.from, to: BRAND.to, shape: 'rounded' }))
    expect(brandMark('u')).toContain('mask')
  })
})

describe('le violet par défaut', () => {
  it('la feuille de style et le code ont les mêmes valeurs', () => {
    const root = block(':root')
    expect(root).toContain(`--primary: ${BRAND.primary.toLowerCase()};`)
    expect(root).toContain(`--primary-strong: ${BRAND.strong.toLowerCase()};`)
    expect(root).toContain(`--primary-soft: var(--brand-soft, ${BRAND.soft.toLowerCase()});`)
    expect(root).toContain(`--primary-light: ${BRAND.light.toLowerCase()};`)
    expect(root).toContain(`--primary-rgb: ${BRAND.rgb};`)
    expect(root).toContain(`--gradient-primary: linear-gradient(135deg, ${BRAND.from.toLowerCase()} 0%, ${BRAND.to.toLowerCase()} 100%);`)
  })

  it('en sombre, le violet s’éclaircit pour se lire en texte', () => {
    expect(block(".dark[data-preset='ocean']")).toContain(`--primary: ${BRAND.darkPrimary.toLowerCase()};`)
  })

  it('le bleu d’avant reste au choix : le thème « Océan », juste après le violet', () => {
    expect(THEME_PRESETS.slice(0, 2).map((p) => p.value)).toEqual(['ocean', 'bleu'])
    expect(block("[data-preset='bleu']")).toContain('--primary: #0078ff;')
    expect(block("[data-preset='bleu']")).toContain('--gradient-primary: linear-gradient(135deg, #00c6ff 0%, #0078ff 100%);')
    for (const lang of ['fr', 'en'] as const) {
      const themes = messagesIn(lang).catalog.themes as Record<string, string>
      for (const p of THEME_PRESETS) expect(themes[p.value], `${lang} ${p.value}`).toBeTruthy()
    }
    expect(messagesIn('fr').catalog.themes.bleu).toBe('Océan')
  })

  it('chaque thème a sa teinte de texte pour le mode sombre', () => {
    for (const p of THEME_PRESETS.filter((x) => x.value !== 'ocean')) expect(block(`[data-preset='${p.value}']`), p.value).toContain('--primary-light:')
  })

  it('la coquille mobile a le même violet', () => {
    const theme = read('../mobile/src/ui/theme.ts')
    expect(theme).toContain(`primary: '${BRAND.primary}'`)
    expect(theme).toContain(`gradientPrimary: ['${BRAND.from}', '${BRAND.to}']`)
    expect(read('../mobile/app.json')).not.toContain(LEGACY_DEFAULT_COLOR)
  })
})

describe('la couleur de l’usine', () => {
  it('l’ancien bleu par défaut enregistré tel quel ne compte pas : l’usine suit le violet', () => {
    expect(brandColorOf(LEGACY_DEFAULT_COLOR)).toBeNull()
    expect(brandColorOf('#0078ff')).toBeNull()
    expect(brandColorOf(BRAND.primary)).toBeNull()
    expect(brandColorOf(null)).toBeNull()
    expect(brandColorOf('#E30613')).toBe('#E30613')
  })

  it('appliquée, l’ancien bleu ne pose rien sur la racine ; une vraie couleur, si', () => {
    const root = document.documentElement
    applyBrandColor('#0078FF')
    expect(root.style.getPropertyValue('--primary')).toBe('')
    applyBrandColor('#E30613')
    expect(root.style.getPropertyValue('--primary')).toBe('#E30613')
    expect(root.style.getPropertyValue('--primary-light')).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('les écrans en mode sombre', () => {
  it('le texte teinté suit le thème : plus de bleu ciel codé à côté de --primary-strong', () => {
    const files: string[] = []
    const walk = (dir: string) => {
      for (const e of require('node:fs').readdirSync(dir, { withFileTypes: true }) as Array<{ name: string; isDirectory: () => boolean }>) {
        if (e.isDirectory()) walk(join(dir, e.name))
        else if (e.name.endsWith('.tsx')) files.push(join(dir, e.name))
      }
    }
    walk(join(web, 'src'))
    const literal = /(['"`])((?:(?!\1)[^\n])*?text-\[var\(--primary-strong\)\](?:(?!\1)[^\n])*?)\1/g
    const sky = files.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(literal)].filter((m) => /dark:text-sky-/.test(m[2])).map((m) => `${f.split('/src/')[1]} : ${m[2]}`))
    expect(sky).toEqual([])
  })
})

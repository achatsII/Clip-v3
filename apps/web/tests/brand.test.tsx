/**
 * La marque de CLIP depuis le 2026-11-16 : le logo 6 (« La pile d'extraits »), pris dans une banque de
 * 10 gardée pour pouvoir changer plus tard, et l'indigo comme couleur par défaut (après une heure de
 * violet). Le bleu d'avant reste au choix dans Apparence (thème « Océan »), et le fond reste calme.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LogoMark } from '@/components/Logo'
import { Avatar } from '@/components/ui/Avatar'
import { BRAND, brandColorOf, FORMER_DEFAULT_COLORS, LEGACY_DEFAULT_COLOR } from '@/lib/brand/colors'
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

const hue = (r: number, g: number, b: number) => {
  const [x, y, z] = [r / 255, g / 255, b / 255]
  const max = Math.max(x, y, z)
  const d = max - Math.min(x, y, z)
  if (!d) return 0
  const h = max === x ? ((y - z) / d) % 6 : max === y ? (z - x) / d + 2 : (x - y) / d + 4
  return (h * 60 + 360) % 360
}
const rgbOf = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]

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

describe('l’indigo par défaut', () => {
  it('la feuille de style et le code ont les mêmes valeurs', () => {
    const root = block(':root')
    expect(root).toContain(`--primary: ${BRAND.primary.toLowerCase()};`)
    expect(root).toContain(`--primary-strong: ${BRAND.strong.toLowerCase()};`)
    expect(root).toContain(`--primary-soft: var(--brand-soft, ${BRAND.soft.toLowerCase()});`)
    expect(root).toContain(`--primary-light: ${BRAND.light.toLowerCase()};`)
    expect(root).toContain(`--primary-rgb: ${BRAND.rgb};`)
    expect(root).toContain(`--gradient-primary: linear-gradient(135deg, ${BRAND.from.toLowerCase()} 0%, ${BRAND.to.toLowerCase()} 100%);`)
  })

  it('en sombre, l’indigo s’éclaircit pour se lire en texte', () => {
    expect(block(".dark[data-preset='ocean']")).toContain(`--primary: ${BRAND.darkPrimary.toLowerCase()};`)
  })

  it('le bleu d’avant reste au choix : le thème « Océan », juste après l’indigo', () => {
    expect(THEME_PRESETS.slice(0, 2).map((p) => p.value)).toEqual(['ocean', 'bleu'])
    expect(block("[data-preset='bleu']")).toContain('--primary: #0078ff;')
    expect(block("[data-preset='bleu']")).toContain('--gradient-primary: linear-gradient(135deg, #00c6ff 0%, #0078ff 100%);')
    for (const lang of ['fr', 'en'] as const) {
      const themes = messagesIn(lang).catalog.themes as Record<string, string>
      for (const p of THEME_PRESETS) expect(themes[p.value], `${lang} ${p.value}`).toBeTruthy()
    }
    expect(messagesIn('fr').catalog.themes.bleu).toBe('Océan')
    expect(messagesIn('fr').catalog.themes.ocean).toBe('Indigo')
  })

  it('le fond reste calme : des voiles légers, froids, jamais de rose', () => {
    const orbs = [...block(':root').matchAll(/--orb-\d: rgba\((\d+), (\d+), (\d+), ([\d.]+)\);/g)].map((m) => m.slice(1).map(Number))
    expect(orbs).toHaveLength(3)
    for (const [r, g, b, a] of orbs) {
      expect(a, `rgba(${r}, ${g}, ${b}, ${a})`).toBeLessThanOrEqual(0.12)
      // Du bleu ciel à l'indigo ; le violet et le rose (au-delà de 250°) chargent un grand écran.
      expect(hue(r, g, b), `rgba(${r}, ${g}, ${b})`).toBeGreaterThanOrEqual(190)
      expect(hue(r, g, b), `rgba(${r}, ${g}, ${b})`).toBeLessThanOrEqual(250)
    }
    const halo = read('src/app/(site)/site.css')
    const at = halo.indexOf('.site-halo {')
    expect(Number(/rgba\(var\(--primary-rgb\), ([\d.]+)\)/.exec(halo.slice(at))?.[1])).toBeLessThanOrEqual(0.14)
  })

  it('chaque thème a le même fond calme : des voiles de sa couleur, jamais de rose', () => {
    const orbs = [...css.matchAll(/--orb-\d: rgba\((\d+), (\d+), (\d+), ([\d.]+)\);/g)].map((m) => m.slice(1).map(Number))
    expect(orbs.length).toBe(3 * THEME_PRESETS.length)
    for (const [r, g, b, a] of orbs) {
      expect(a, `rgba(${r}, ${g}, ${b}, ${a})`).toBeLessThanOrEqual(0.12)
      // Du magenta au rose (285° et plus) : c'est ce qui « fait princesse ».
      expect(hue(r, g, b), `rgba(${r}, ${g}, ${b})`).toBeLessThan(285)
    }
  })

  it('les boutons : un dégradé de l’indigo vers le bleu, que l’icône et la coquille reprennent', () => {
    const [from, to] = [hue(...rgbOf(BRAND.from)), hue(...rgbOf(BRAND.to))]
    // Il glisse d'au moins 15° : un seul ton, du pâle au foncé, faisait plat.
    expect(from - to).toBeGreaterThanOrEqual(15)
    // Il part de l'indigo, pas du violet de l'avatar (272°), et finit dans le bleu.
    expect(from).toBeLessThan(260)
    expect(to).toBeGreaterThanOrEqual(215)
    expect(to).toBeLessThanOrEqual(235)
    expect(read('../mobile/src/ui/theme.ts')).toContain(`gradientPrimary: ['${BRAND.from}', '${BRAND.to}']`)
  })

  it('chaque thème a sa teinte de texte pour le mode sombre', () => {
    for (const p of THEME_PRESETS.filter((x) => x.value !== 'ocean')) expect(block(`[data-preset='${p.value}']`), p.value).toContain('--primary-light:')
  })

  it('la coquille mobile a le même indigo', () => {
    const theme = read('../mobile/src/ui/theme.ts')
    expect(theme).toContain(`primary: '${BRAND.primary}'`)
    expect(theme).toContain(`gradientPrimary: ['${BRAND.from}', '${BRAND.to}']`)
    const app = read('../mobile/app.json')
    for (const old of FORMER_DEFAULT_COLORS) expect(app).not.toContain(old)
    expect(read('src/app/manifest.ts')).toContain('theme_color: BRAND.primary')
  })
})

describe('l’avatar', () => {
  it('une personne prend le ton pâle de la couleur, pas un dégradé : ni le logo, ni l’IA', () => {
    const { container } = render(<Avatar name="Mélanie Tremblay" />)
    const el = container.querySelector('span')!
    expect(el.textContent).toBe('MT')
    expect(el.className).toContain('bg-primary-soft')
    expect(el.className).not.toMatch(/bg-gradient/)
    for (const f of ['src/components/shell/AppShell.tsx', 'src/components/settings/MembersTab.tsx', 'src/app/(app)/equipe/page.tsx']) {
      expect(read(f), f).toContain('<Avatar name=')
      expect(read(f), f).not.toMatch(/bg-gradient-[a-z]+[^"]*">\{initials\(/)
    }
  })
})

describe('la couleur de l’usine', () => {
  it('une couleur par défaut enregistrée telle quelle ne compte pas : l’usine suit l’indigo', () => {
    expect(brandColorOf(LEGACY_DEFAULT_COLOR)).toBeNull()
    expect(brandColorOf('#0078ff')).toBeNull()
    expect(brandColorOf(BRAND.primary)).toBeNull()
    // Le violet n'a été la couleur par défaut qu'une heure, mais « Appliquer » a pu l'enregistrer.
    expect(brandColorOf('#7c3aed')).toBeNull()
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

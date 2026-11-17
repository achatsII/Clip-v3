/**
 * Les gabarits du PDF : trois dispositions et l'orientation pour toutes les usines ; avec le logo et
 * les couleurs, le cartouche, le pied de page de chaque page (numéro, version, page) et un gabarit
 * repris d'un exemple de l'usine. « Une page » se réduit pour tenir sur une feuille.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const gate = vi.hoisted(() => vi.fn((ent: string, _f: string, action: () => void) => (ent === 'locked' ? undefined : action())))
vi.mock('@/lib/billing/state', () => ({ useGate: () => gate }))
vi.mock('@/components/billing/Billing', () => ({ LockBadge: () => <span>cadenas</span> }))

import { PrintLayoutPanel } from '@/components/print/PrintLayoutPanel'
import { templateFromExample } from '@/lib/ai/printTemplate'
import type { AiApi } from '@/lib/gateway/ai'
import { emptyContent } from '@/lib/model/repo'
import { buildPrintHtml, type PrintMeta } from '@/lib/pdf/printHtml'
import { DEFAULT_TEMPLATE, MIN_SCALE, nextScale, normalizeTemplate, overflowPages, pageBox, templateOf, withoutBrandKit, type PrintTemplate } from '@/lib/pdf/template'
import { DEFAULT_TOGGLES, FALLBACK_TOGGLES } from '@/lib/toggleDefaults'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const content = emptyContent({ title: 'Remplacer le filtre', steps: [{ id: 'a', title: 'Couper l’alimentation', text: 'Au sectionneur.', keyPoints: [], warning: null, media: [] }] })
const meta = (template?: PrintTemplate, extra: Partial<PrintMeta> = {}): PrintMeta => ({
  branding: { orgName: 'Usine Démo', logoUrl: null, color: null },
  number: 'IT-0042',
  version: 4,
  publishedAt: '2026-11-12T15:00:00.000Z',
  approvedByName: 'M. Tremblay',
  stationNames: ['Pompe P-3'],
  liveUrl: null,
  qrSvg: '<svg id="qr"></svg>',
  showClipMention: false,
  draft: false,
  template,
  ...extra,
})

describe('le gabarit de l’usine', () => {
  it('allumé par le serveur ; le repli ne l’active jamais', () => {
    expect(DEFAULT_TOGGLES.printTemplates).toBe(true)
    expect(FALLBACK_TOGGLES.printTemplates).toBe(false)
  })

  it('rendu sûr : une valeur inconnue reprend celle par défaut ; sans le logo et les couleurs, la disposition et l’orientation seulement', () => {
    expect(templateOf({})).toEqual(DEFAULT_TEMPLATE)
    expect(normalizeTemplate({ layout: 'poster', orientation: 'sideways', fields: { qr: false, number: 'non' }, footer: '  Document   contrôlé ', accent: 'rouge', pageNumbers: false })).toEqual({ layout: 'cards', orientation: 'portrait', fields: { qr: false }, footer: 'Document contrôlé', pageNumbers: false })
    expect(normalizeTemplate({ layout: 'table', orientation: 'landscape', accent: '#c00c00' }).accent).toBe('#C00C00')
    const custom: PrintTemplate = { layout: 'onePage', orientation: 'landscape', fields: { qr: false }, footer: 'Document contrôlé', pageNumbers: false, accent: '#C00C00' }
    expect(withoutBrandKit(custom)).toEqual({ layout: 'onePage', orientation: 'landscape', pageNumbers: true })
  })

  it('la feuille est du papier lettre, avec ses marges ; « Une page » se règle en visant la page, sans descendre sous la moitié', () => {
    expect(pageBox('portrait')).toEqual({ width: 725, height: 950 })
    expect(pageBox('landscape')).toEqual({ width: 965, height: 710 })
    // Comme dans Chromium : 12 étapes en paysage, trop hautes à l'échelle 1, réglées en une passe (676 px pour 710).
    expect(nextScale(1, 1040, 710)).toBe(0.676)
    expect(nextScale(0.682, 676, 710)).toBeNull()
    expect(nextScale(1, 500, 710)).toBeNull()
    expect(nextScale(0.6, 400, 710)).toBe(1)
    expect(nextScale(1, 5000, 710)).toBe(MIN_SCALE)
    expect(overflowPages(MIN_SCALE, 2000, 710)).toBe(3)
    expect(overflowPages(0.8, 700, 710)).toBe(1)
  })
})

describe('le PDF', () => {
  it('sans gabarit : la mise en page d’avant, telle quelle', () => {
    const html = buildPrintHtml(content, meta())
    expect(html).toContain('@page{size:letter;margin:12mm}')
    expect(html).not.toContain('id="sheet"')
  })

  it('le gabarit : l’orientation, le pied de page de chaque page (texte, numéro, version, page), le cartouche choisi et la couleur', () => {
    const tpl: PrintTemplate = { layout: 'table', orientation: 'landscape', fields: { number: false, qr: false }, footer: 'Copie « non » contrôlée </style><b>', pageNumbers: true, accent: '#C00C00' }
    const html = buildPrintHtml(content, meta(tpl))
    expect(html).toContain('@page{size:letter landscape;margin:12mm 12mm 16mm;')
    expect(html).toContain('@bottom-left{content:"Copie « non » contrôlée \\3c /style>\\3c b>"')
    expect(html).toContain('@bottom-right{content:"IT-0042 · Version 4 · Page " counter(page) " de " counter(pages)')
    expect(html).not.toContain('</style><b>')
    expect(html).not.toContain('<b>IT-0042</b>')
    expect(html).not.toContain('id="qr"')
    expect(html).toContain('Approuvée par M. Tremblay')
    expect(html).toContain('.step{display:grid;grid-template-columns:30% 1fr')
    expect(html).toContain('border-bottom:4px solid #C00C00')
    expect(html).toContain('<main id="sheet">')
  })

  it('« Une page » : trois ou quatre colonnes, et la feuille réduite à l’échelle mesurée, toujours pleine largeur', () => {
    const tpl: PrintTemplate = { layout: 'onePage', orientation: 'portrait', pageNumbers: false }
    const html = buildPrintHtml(content, meta(tpl, { scale: 0.8 }))
    expect(html).toContain('grid-template-columns:repeat(3,1fr)')
    expect(html).toContain(`#sheet{width:${Math.floor(725 / 0.8)}px;margin:0 auto;zoom:0.8}`)
    expect(html).not.toContain('@bottom-right')
  })
})

describe('d’après un exemple', () => {
  it('l’IA lit la mise en page ; seul ce qui tient est gardé', async () => {
    const ask = vi.fn(async (_op: string, _body: unknown) => ({ json: { layout: 'table', orientation: 'landscape', number: true, version: true, approvedBy: false, stations: true, duration: false, qr: false, footer: 'Document contrôlé', color: '#1d4ed8' }, text: '', model: 'm', usage: null }))
    const t = await templateFromExample({ ask } as unknown as AiApi, { url: 'https://cdn.test/ex.pdf', mimeType: 'application/pdf', filename: 'ex.pdf' })
    expect(ask.mock.calls[0][0]).toBe('print_template')
    expect((ask.mock.calls[0] as unknown as [string, { files: unknown[] }])[1].files).toEqual([{ url: 'https://cdn.test/ex.pdf', mimeType: 'application/pdf', filename: 'ex.pdf' }])
    expect(t).toEqual({ layout: 'table', orientation: 'landscape', fields: { approvedBy: false, duration: false, qr: false }, footer: 'Document contrôlé', pageNumbers: true, accent: '#1D4ED8' })
  })
})

describe('le panneau « Mise en page »', () => {
  const panel = (over: Partial<Parameters<typeof PrintLayoutPanel>[0]> = {}) => {
    const props = { value: DEFAULT_TEMPLATE, onChange: vi.fn(), brand: 'open' as const, plant: DEFAULT_TEMPLATE, plantColor: '#5B4CF0', canSave: true, saving: false, onSave: vi.fn(), onExample: vi.fn(), readingExample: false, note: null, ...over }
    render(<PrintLayoutPanel {...props} />)
    return props
  }

  it('la disposition et l’orientation se choisissent ; « Enregistrer pour l’usine » paraît quand elle diffère', () => {
    const p = panel()
    expect(screen.getByText('C’est la mise en page de l’usine.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Tableau/ }))
    expect(p.onChange).toHaveBeenCalledWith({ ...DEFAULT_TEMPLATE, layout: 'table' })
    cleanup()
    const q = panel({ value: { ...DEFAULT_TEMPLATE, orientation: 'landscape' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer pour l’usine' }))
    expect(q.onSave).toHaveBeenCalled()
  })

  it('sans le logo et les couleurs, le cartouche est fermé : un toucher ouvre les forfaits, rien ne change', () => {
    const p = panel({ brand: 'locked' })
    fireEvent.click(screen.getByRole('button', { name: 'Code QR' }))
    expect(gate).toHaveBeenCalledWith('locked', 'brand_kit', expect.any(Function))
    expect(p.onChange).not.toHaveBeenCalled()
    expect(screen.getByText('L’en-tête, le pied de page et la couleur viennent avec le logo et les couleurs de l’usine.')).toBeTruthy()
    cleanup()
    const q = panel()
    fireEvent.click(screen.getByRole('button', { name: 'Code QR' }))
    expect(q.onChange).toHaveBeenCalledWith({ ...DEFAULT_TEMPLATE, fields: { qr: false } })
  })
})

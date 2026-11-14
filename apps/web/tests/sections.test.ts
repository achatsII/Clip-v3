import { describe, expect, it } from 'vitest'
import { cleanSections, hasSections, inheritSection, moveStep, placeStep, removeSection, sectionGroups, setSectionRange, settleSection, startSection, startsSection } from '@/lib/model/sections'
import { localized } from '@/lib/model/translation'
import { buildTranslation, contentSegments } from '@/lib/ai/translate'
import type { InstructionContent, Step } from '@/lib/model/types'

const step = (id: string, section?: string): Step => ({ id, title: id, text: '', keyPoints: [], warning: null, media: [], ...(section ? { section } : {}) })
const names = (steps: Step[]) => steps.map((s) => s.section ?? '-').join(',')

describe('les sections', () => {
  const steps = [step('a'), step('b', 'Démontage'), step('c', 'Démontage'), step('d', 'Remontage'), step('e', 'Remontage')]

  it('une étape glissée dans la liste de la fiche rejoint la section où on la dépose ; les autres gardent la leur', () => {
    const order = (list: Step[]) => list.map((s) => s.id).join('')
    // « e » (Remontage) lâchée devant « b » : au début de Démontage.
    const before = placeStep(steps, 4, 1)
    expect(order(before)).toBe('aebcd')
    expect(names(before)).toBe('-,Démontage,Démontage,Démontage,Remontage')
    // Lâchée au-dessus du titre de Démontage : à la fin de ce qui précède (ici, sans section).
    const above = placeStep(steps, 4, 1, true)
    expect(order(above)).toBe('aebcd')
    expect(names(above)).toBe('-,-,Démontage,Démontage,Remontage')
    // Tout en bas : elle prend la section de la dernière étape.
    expect(names(placeStep(steps, 0, 4))).toBe('Démontage,Démontage,Remontage,Remontage,Remontage')
    // Lâchée à sa place, rien ne change (le même tableau : rien à enregistrer)…
    expect(placeStep(steps, 1, 1)).toBe(steps)
    expect(placeStep(steps, 2, 2, true)).toBe(steps)
    // … mais sous le titre de la section suivante, elle y entre.
    expect(names(placeStep(steps, 2, 2))).toBe('-,Démontage,Remontage,Remontage,Remontage')
    // Chaque section reste d'un seul tenant.
    for (const [from, to, end] of [[0, 3, false], [3, 0, false], [1, 4, true], [4, 3, true]] as const) {
      const names2 = sectionGroups(placeStep(steps, from, to, end)).map((g) => g.name)
      expect(new Set(names2).size).toBe(names2.length)
    }
  })

  it('sont les étapes qui se suivent sous le même nom', () => {
    expect(sectionGroups(steps)).toEqual([
      { name: null, start: 0, end: 1 },
      { name: 'Démontage', start: 1, end: 3 },
      { name: 'Remontage', start: 3, end: 5 },
    ])
    expect(hasSections(steps)).toBe(true)
    expect([0, 1, 2, 3, 4].map((i) => startsSection(steps, i))).toEqual([false, true, false, true, false])
  })

  it('s’ouvrent, se renomment et se retirent sans toucher aux autres', () => {
    expect(names(startSection(steps, 2, 'Nettoyage'))).toBe('-,Démontage,Nettoyage,Remontage,Remontage')
    expect(names(setSectionRange(steps, 1, 3, 'Ouverture'))).toBe('-,Ouverture,Ouverture,Remontage,Remontage')
    // Retirée : ses étapes rejoignent la section d'avant (ou n'en ont plus).
    expect(names(removeSection(steps, 3))).toBe('-,Démontage,Démontage,Démontage,Démontage')
    expect(names(removeSection(steps, 1))).toBe('-,-,-,Remontage,Remontage')
  })

  it('un nom effacé le temps d’en taper un autre ne fusionne rien ; vidé pour de bon, la section rejoint celle d’avant', () => {
    const typing = setSectionRange(steps, 3, 5, '')
    expect(names(setSectionRange(typing, 3, 5, 'R'))).toBe('-,Démontage,Démontage,R,R')
    expect(names(settleSection(typing, 3, 5))).toBe('-,Démontage,Démontage,Démontage,Démontage')
    // Un nom gardé : rien ne bouge.
    expect(settleSection(steps, 3, 5)).toBe(steps)
  })

  it('restent à leur place quand une étape bouge, et une étape ajoutée garde celle d’avant', () => {
    const moved = moveStep(steps, 2, 1)
    expect(moved.map((s) => s.id).join('')).toBe('abdce')
    expect(names(moved)).toBe(names(steps))
    expect(inheritSection(step('x'), steps[2]).section).toBe('Démontage')
    expect(inheritSection(step('x'), steps[0]).section).toBeUndefined()
  })

  it('de l’IA : une section unique ne sert à rien, les noms sont nettoyés', () => {
    expect(names(cleanSections([step('a', 'Tout'), step('b', 'Tout')]))).toBe('-,-')
    expect(names(cleanSections([step('a', '  Démontage  '), step('b', 'Remontage')]))).toBe('Démontage,Remontage')
  })

  it('se traduisent avec le reste, chaque nom une seule fois', () => {
    const content = { title: 'T', summary: '', kind: 'procedure', category: 'maintenance', tags: [], ppe: [], tools: [], safety: [], language: 'fr', steps } as unknown as InstructionContent
    const { segments, visuals } = contentSegments(content)
    expect(segments.filter((s) => s.id.startsWith('section:')).map((s) => s.text)).toEqual(['Démontage', 'Remontage'])
    const tr = buildTranslation(
      content,
      { title: 'T', summary: '', safety: [], steps: steps.map((s) => ({ id: s.id, title: s.title, text: '', keyPoints: [], warning: '' })), extras: [{ id: 'section:0', text: 'Disassembly' }, { id: 'section:1', text: 'Reassembly' }] },
      visuals,
    )
    const en = localized({ ...content, translations: { en: tr } }, 'en')
    expect(names(en.steps)).toBe('-,Disassembly,Disassembly,Reassembly,Reassembly')
  })
})

/**
 * Chaque action est une étape, et le média colle à son étape : la consigne le demande à l'IA (rien à
 * changer dans n8n, elle passe telle quelle), et deux étapes qui se suivent ne montrent pas les mêmes
 * secondes de la même vidéo.
 */
import { describe, expect, it } from 'vitest'
import { normalizeInstruction } from '@/lib/ai/normalize'
import { generationSystem, importSystem } from '@/lib/ai/prompts'
import { defaultStandard } from '@/lib/model/repo'
import type { Source } from '@/lib/model/types'

const org = { standard: defaultStandard(), learnings: [] } as never
const video: Source = { id: 'v', kind: 'video', url: 'https://x/v.mp4', durationSec: 120, createdAt: '2026-11-17T10:00:00.000Z' }
const other: Source = { id: 'w', kind: 'video', url: 'https://x/w.mp4', durationSec: 120, createdAt: '2026-11-17T10:00:00.000Z' }
const step = (title: string, media: Array<Record<string, unknown>>) => ({ title, text: '', keyPoints: [], warningLevel: 'none', warningText: '', section: '', media })

describe('chaque action est une étape', () => {
  it('la consigne découpe chaque action, sans plafond, et resserre l’extrait sur son geste ; l’import suit la même règle', () => {
    for (const system of [generationSystem(org, { language: 'fr' }), importSystem(org)]) {
      expect(system).toContain('chaque action est une étape')
      expect(system).toContain('Jamais deux actions dans une étape')
      expect(system).toContain('sans plafond')
      expect(system).toContain('sans montrer l’action suivante')
      expect(system).not.toContain('3 à 20 s')
    }
  })

  it('deux étapes qui se suivent ne montrent pas les mêmes secondes ; d’une autre vidéo ou à rebours, rien ne change', () => {
    const { content } = normalizeInstruction(
      {
        title: 'Changer le filtre',
        steps: [
          step('Ouvrir le capot', [{ source: 'S1', start: 10, end: 25 }]),
          step('Retirer le filtre', [{ source: 'S1', start: 18, end: 30 }]),
          step('Nettoyer le logement', [{ source: 'S2', start: 5, end: 12 }]),
          step('Poser le filtre neuf', [{ source: 'S2', start: 40, end: 50 }]),
          step('Revisser le capot', [{ source: 'S2', start: 30, end: 45 }]),
        ],
      } as never,
      [video, other],
      'fr',
    )
    const clip = (i: number) => content.steps[i].media[0] as { start: number; end: number }
    expect([clip(0).start, clip(0).end]).toEqual([10, 18])
    expect([clip(1).start, clip(1).end]).toEqual([18, 30])
    // Une autre vidéo : rien à raccorder.
    expect([clip(2).start, clip(2).end]).toEqual([5, 12])
    // À rebours (la suivante commence avant) : l'IA a son ordre, on n'y touche pas.
    expect([clip(3).start, clip(3).end]).toEqual([40, 50])
  })
})

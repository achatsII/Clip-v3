import { describe, expect, it } from 'vitest'
import { matchStation, normalizeInstruction, resolveMedia } from '@/lib/ai/normalize'
import type { Source } from '@/lib/model/types'

const now = new Date().toISOString()
const sources: Source[] = [
  { id: 'v', kind: 'video', url: 'https://x/v.mp4', durationSec: 120, createdAt: now },
  { id: 'p', kind: 'photo', url: 'https://x/p.jpg', createdAt: now },
  { id: 'd', kind: 'document', url: 'https://x/d.pdf', pageCount: 4, createdAt: now },
  { id: 'n', kind: 'note', text: 'serrer à 25 N·m', createdAt: now },
]
const byId = new Map(sources.map((s, i) => [`S${i + 1}`, s]))

describe('resolveMedia', () => {
  it('borne un extrait vidéo à la durée réelle', () => {
    const m = resolveMedia({ source: 'S1', start: 110, end: 200 }, byId)
    expect(m).toMatchObject({ kind: 'video', start: 110, end: 120 })
  })
  it('replace un début hors vidéo et donne une fin après le début', () => {
    const m = resolveMedia({ source: 's1', start: 500, end: 2 }, byId)
    expect(m?.kind).toBe('video')
    if (m?.kind === 'video') {
      expect(m.start).toBeLessThan(120)
      expect(m.end).toBeGreaterThan(m.start)
    }
  })
  it('limite un extrait trop long à 45 s', () => {
    const m = resolveMedia({ source: 'S1', start: 0, end: 110 }, byId)
    if (m?.kind === 'video') expect(m.end - m.start).toBeLessThanOrEqual(45)
  })
  it('ramène une page de document dans le document', () => {
    expect(resolveMedia({ source: 'S3', page: 9 }, byId)).toMatchObject({ kind: 'document', page: 4 })
  })
  it('écarte une référence inconnue ou une note', () => {
    expect(resolveMedia({ source: 'S9' }, byId)).toBeNull()
    expect(resolveMedia({ source: 'S4' }, byId)).toBeNull()
  })
})

describe('normalizeInstruction', () => {
  it('rend un contenu sûr : identifiants, mises en garde, EPI connus seulement', () => {
    const { content, stationGuess, questions } = normalizeInstruction(
      {
        title: '  Nettoyer les rails ',
        summary: 'Une fois par mois.',
        kind: 'procedure',
        category: 'nettoyage',
        tags: ['Rails', 'Graisse'],
        station: 'Machine 1234',
        ppe: ['gants', 'cape-magique'],
        tools: ['Chiffon'],
        safety: ['Cadenasser la machine'],
        steps: [
          { title: 'Cadenasser la machine', text: 'Couper et cadenasser le sectionneur.', keyPoints: ['Vérifier l’arrêt'], warningLevel: 'danger', warningText: 'Pièces en mouvement', media: [{ source: 'S1', start: 3, end: 9 }] },
          { title: '', text: '' },
          { title: 'Essuyer', text: 'Essuyer les rails.', warningLevel: 'none', warningText: 'ignoré', media: [{ source: 'S2' }, { source: 'S2' }] },
        ],
        questions: ['Quel solvant ?'],
      },
      sources,
    )
    expect(content.title).toBe('Nettoyer les rails')
    expect(content.ppe).toEqual(['gants'])
    expect(content.tags).toEqual(['rails', 'graisse'])
    expect(content.steps).toHaveLength(2)
    expect(content.steps[0].warning).toEqual({ level: 'danger', text: 'Pièces en mouvement' })
    expect(content.steps[1].warning).toBeNull()
    expect(content.steps[1].media).toHaveLength(1)
    expect(new Set(content.steps.map((s) => s.id)).size).toBe(2)
    expect(stationGuess).toBe('Machine 1234')
    expect(questions).toEqual(['Quel solvant ?'])
  })

  it('ne garde le format cadenassage que si des points d’isolement existent, et relie les étapes', () => {
    const lockout = normalizeInstruction(
      {
        title: 'Cadenasser la presse',
        kind: 'lockout',
        category: 'sst',
        steps: [{ title: 'Ouvrir le sectionneur', text: 'Mettre à OFF.', warningLevel: 'none', media: [], energyTag: 'e1' }],
        lockout: { equipment: 'Presse P-12', energyPoints: [{ tag: 'E1', type: 'electrique', description: '600 V', isolationDevice: 'Sectionneur', location: 'Mur nord', lockingMethod: 'Cadenas', verification: 'Essai de démarrage' }], restartSteps: ['Retirer'] },
      },
      sources,
    )
    expect(lockout.content.kind).toBe('lockout')
    expect(lockout.content.steps[0].energyPointId).toBe(lockout.content.lockout!.energyPoints[0].id)

    const noPoints = normalizeInstruction({ title: 'X', kind: 'lockout', steps: [{ title: 'A', text: 'B' }], lockout: { equipment: 'Y', energyPoints: [] } }, sources)
    expect(noPoints.content.kind).toBe('procedure')
    expect(noPoints.content.lockout).toBeNull()
  })

  it('remplace une catégorie inconnue par production', () => {
    expect(normalizeInstruction({ title: 'X', category: 'magie', steps: [{ title: 'A', text: 'B' }] }, sources).content.category).toBe('production')
  })
})

describe('matchStation', () => {
  const stations = [
    { id: 'a', name: 'Machine 1234', code: 'M-1234' },
    { id: 'b', name: 'Presse hydraulique', code: 'P-12' },
  ]
  it('trouve par code, par nom ou par numéro', () => {
    expect(matchStation('M-1234', stations)).toBe('a')
    expect(matchStation('la machine 1234', stations)).toBe('a')
    expect(matchStation('Presse hydraulique', stations)).toBe('b')
    expect(matchStation('poste inconnu', stations)).toBeNull()
    expect(matchStation(null, stations)).toBeNull()
  })
})

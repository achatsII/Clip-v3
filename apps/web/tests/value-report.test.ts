import { describe, expect, it } from 'vitest'
import type { Doc } from '@/lib/gateway/data'
import type { Feedback, Instruction, Station, UsageEvent } from '@/lib/model/types'
import { buildValueReportHtml, type ValueReport } from '@/lib/pdf/valueReport'
import { adoptionStats, periodFacts, valueOf } from '@/lib/stats/adoption'

const NOW = Date.parse('2026-11-11T15:00:00Z')
const day = (n: number) => new Date(NOW - n * 86400_000).toISOString()
const ev = (type: UsageEvent['type'], at: string, extra: Partial<UsageEvent> = {}): UsageEvent => ({ type, at, source: 'kiosk', ...extra })
const doc = <T,>(id: string, json_data: T): Doc<T> => ({ _id: id, json_data })
const instr = (id: string, over: Partial<Instruction>): Doc<Instruction> => doc(id, { title: id, stationIds: [], publishedVersion: null, createdAt: day(90), updatedAt: day(90), stepCount: 3, ...over } as Instruction)

describe('les chiffres du dossier et de la page Statistiques', () => {
  it('compte les consultations par jour, les réalisations et la médiane', () => {
    const s = adoptionStats(
      [
        ev('view', day(0), { instructionId: 'a' }),
        ev('view', day(0), { instructionId: 'a', source: 'link' }),
        ev('view', day(2), { instructionId: 'b' }),
        ev('view', day(45), { instructionId: 'b' }),
        ev('complete', day(0), { durationSec: 300 }),
        ev('complete', day(1), { durationSec: 120 }),
        ev('complete', day(1), { durationSec: 60 }),
        ev('ai', day(3), { operation: 'generate_m' }),
        ev('ai', day(3), { operation: 'import_s' }),
      ],
      30,
      NOW,
    )
    expect(s.days).toHaveLength(30)
    expect(s.days.at(-1)).toEqual({ date: day(0).slice(0, 10), value: 2 })
    expect(s.views).toBe(4)
    expect(s.completions).toBe(3)
    expect(s.completionRate).toBe(75)
    expect(s.medianDuration).toBe(120)
    expect(s.perInstruction.get('a')).toBe(2)
    expect(s.bySource).toEqual({ kiosk: 3, link: 1, app: 0 })
    expect([s.generations, s.imports]).toEqual([1, 1])
  })

  it('la valeur : le temps gagné à rédiger et à guider, au taux de l’usine', () => {
    expect(valueOf(4, 120, { hoursSavedPerInstruction: 2, minutesSavedPerCompletion: 3, hourlyRate: 45 })).toEqual({ hours: 14, value: 630 })
  })

  it('les faits de la période : créées avec des étapes, jamais consultées, retours, postes couverts', () => {
    const since = day(30)
    const instructions = [
      instr('neuve', { createdAt: day(5) }),
      instr('vide', { createdAt: day(5), stepCount: 0 }),
      instr('vue', { publishedVersion: 2, publishedAt: day(40), stationIds: ['p1'] }),
      instr('oubliee', { publishedVersion: 1, publishedAt: day(20), stationIds: ['p1', 'p2'] }),
      instr('recente', { publishedVersion: 1, publishedAt: day(2) }),
    ]
    const stations = ['p1', 'p2', 'p3'].map((id) => doc<Station>(id, { name: id } as Station))
    const feedback = [doc<Feedback>('f1', { createdAt: day(3), status: 'done' } as Feedback), doc<Feedback>('f2', { createdAt: day(4), status: 'new' } as Feedback), doc<Feedback>('f3', { createdAt: day(60), status: 'new' } as Feedback)]
    const f = periodFacts({ instructions, stations, feedback, perInstruction: new Map([['vue', 7]]), since, now: NOW })
    expect(f.created).toBe(1)
    expect(f.published).toBe(3)
    expect(f.top[0]).toEqual({ id: 'vue', title: 'vue', views: 7 })
    expect(f.unseen).toBe(1)
    expect(f.feedback).toEqual({ total: 2, done: 1, open: 2 })
    expect(f.stations).toEqual({ total: 3, covered: 2 })
  })
})

const report = (over: Partial<ValueReport> = {}): ValueReport => ({
  orgName: 'Usine Laval',
  days: 30,
  periodLabel: 'Du 12 octobre 2026 au 11 novembre 2026',
  generatedOn: '11 novembre 2026',
  views: 1234,
  completions: 456,
  completionRate: 37,
  created: 12,
  published: 40,
  stations: { total: 10, covered: 8 },
  hours: 123,
  value: 5535,
  roi: { hoursSavedPerInstruction: 2, minutesSavedPerCompletion: 3, hourlyRate: 45 },
  top: [{ title: 'Changer la matrice', views: 88 }],
  feedback: { total: 14, done: 11 },
  unseen: 2,
  ...over,
})

// fr-CA sépare les milliers par une espace insécable : on compare le texte à plat.
const build = (r: ValueReport) => buildValueReportHtml(r).replace(/[\u00a0\u202f]/g, ' ')

describe('le dossier pour la direction', () => {
  it('dit la valeur et ses hypothèses, sans proposition ni prix quand on n’en veut pas', () => {
    const html = build(report())
    expect(html).toContain('5 535 $')
    expect(html).toContain('123 heures gagnées')
    expect(html).toContain('45 $ de l’heure')
    expect(html).toContain('Changer la matrice')
    expect(html).not.toContain('Passer au plan')
    expect(html).not.toContain('/ mois')
  })

  it('échappe ce qui vient de l’usine, et refuse une couleur qui sortirait du CSS', () => {
    const html = build(report({ orgName: '<script>alert(1)</script>', top: [{ title: '<img src=x onerror=alert(1)>', views: 3 }], color: 'red;}body{display:none' }))
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('display:none')
    expect(html).toContain('#0078FF')
  })

  it('la proposition : le plan, l’usage d’aujourd’hui, le prix et le rapport à la valeur', () => {
    const proposal = { planName: 'Équipe', pitch: 'Pour un atelier.', lines: ['25 postes', 'Traduction pour les opérateurs'], price: '299 $ / mois', yearly: '2 990 $ / an', usage: ['4 postes sur 5'], ratio: 18.5 }
    const html = build(report({ proposal }))
    expect(html).toContain('Passer au plan Équipe')
    expect(html).toContain('Aujourd’hui : 4 postes sur 5.')
    expect(html).toContain('299 $ / mois')
    expect(html).toContain('18,5 fois le prix mensuel')
  })

  it('dans la coquille, la proposition vient sans prix ; un rapport faible ne s’affiche pas', () => {
    const html = build(report({ proposal: { planName: 'Usine', pitch: '', lines: [], price: null, yearly: null, usage: [], ratio: 1.2 } }))
    expect(html).toContain('Passer au plan Usine')
    expect(html).not.toContain('/ mois')
    expect(html).not.toContain('fois le prix')
  })
})

/**
 * Les tests A/B du site : un bras par visiteur, le témoin sans accord ni test ouvert, le gagnant à tous une
 * fois tranché ; et la mesure de l'essai (l'événement du retour de paiement).
 */
import { describe, expect, it } from 'vitest'
import { checkoutEvent, thanksUrl } from '@/lib/billing/funnel'
import { armOf, assign, EXPERIMENTS, experiencesOf, pickArm, type Experiment } from '@/lib/site/experiments'

const open: Experiment = { id: 'essai', arms: ['a', 'b'], open: true }
const closed: Experiment = { id: 'essai', arms: ['a', 'b'], open: false }

describe('les tests A/B du site', () => {
  it('chaque test a un nom unique et au moins deux bras distincts, le premier étant le témoin', () => {
    const ids = EXPERIMENTS.map((x) => x.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const xp of EXPERIMENTS as readonly Experiment[]) {
      expect(xp.arms.length, xp.id).toBeGreaterThanOrEqual(2)
      expect(new Set(xp.arms).size, xp.id).toBe(xp.arms.length)
      if (xp.winner) expect(xp.arms, xp.id).toContain(xp.winner)
    }
  })

  it('le tirage est à parts égales et reste dans les bras', () => {
    expect(pickArm(open, () => 0)).toBe('a')
    expect(pickArm(open, () => 0.49)).toBe('a')
    expect(pickArm(open, () => 0.5)).toBe('b')
    expect(pickArm(open, () => 0.999999)).toBe('b')
  })

  it('un test ouvert garde le bras tiré ; un nouveau visiteur en tire un', () => {
    expect(assign(open, { essai: 'b' })).toEqual({ arm: 'b', fresh: false })
    expect(assign(open, {}, () => 0.7)).toEqual({ arm: 'b', fresh: true })
    // Un bras qui n'existe plus se tire à nouveau.
    expect(assign(open, { essai: 'z' }, () => 0)).toEqual({ arm: 'a', fresh: true })
  })

  it('fermé : le témoin pour tous, sans tirage ; tranché : le gagnant pour tous', () => {
    expect(assign(closed, { essai: 'b' })).toEqual({ arm: 'a', fresh: false })
    expect(armOf(closed, { essai: 'b' })).toBe('a')
    const won: Experiment = { ...open, winner: 'b' }
    expect(assign(won, {})).toEqual({ arm: 'b', fresh: false })
    expect(armOf(won, { essai: 'a' })).toBe('b')
  })

  it('les événements portent seulement les bras des tests ouverts', () => {
    // Tous les tests du code sont fermés tant que le moteur marketing ne les ouvre pas : rien à porter.
    const stored = Object.fromEntries(EXPERIMENTS.map((x) => [x.id, x.arms[1]]))
    const opened = (EXPERIMENTS as readonly Experiment[]).filter((x) => x.open && !x.winner)
    expect(experiencesOf(stored)).toBe(opened.map((x) => `${x.id}:${stored[x.id]}`).join(','))
    expect(experiencesOf({})).toBe('')
  })

  it('le retour du paiement : l’essai avec carte, ou l’abonnement payé tout de suite', () => {
    expect(checkoutEvent({ plan: 'equipe', interval: 'monthly', trial: true, value: 199, currency: 'CAD' })).toBe('essai_commence')
    expect(checkoutEvent({ plan: 'solo', interval: 'monthly', trial: false, value: 49, currency: 'CAD' })).toBe('abonnement')
  })

  it('le retour d’un paiement réussi porte `merci=1`, d’où que l’on parte', () => {
    expect(thanksUrl('https://kiplo.vercel.app/reglages/abonnement')).toBe('https://kiplo.vercel.app/reglages/abonnement?merci=1')
    // La fenêtre d'une limite : la page où l'on était, avec ses paramètres et son ancre.
    expect(thanksUrl('https://kiplo.vercel.app/postes?vue=liste#p2')).toBe('https://kiplo.vercel.app/postes?vue=liste&merci=1#p2')
    expect(thanksUrl('https://kiplo.vercel.app/x?merci=1')).toBe('https://kiplo.vercel.app/x?merci=1')
  })
})

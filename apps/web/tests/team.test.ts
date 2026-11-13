import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/gateway/client'
import { dataApi, type Doc } from '@/lib/gateway/data'
import { addOperators, IDLE_MS, loadStationSession, orderForStation, parseNames, saveStationSession, verifyCode, type StationSession } from '@/lib/model/operators'
import type { Operator } from '@/lib/model/types'
import { codesSheet } from '@/lib/pdf/codesSheet'
import { mapPool } from '@/lib/util/pool'
import { fakeGateway } from './fakeClient'

const person = (id: string, name: string, stationIds: string[] = []): Doc<Operator> => ({ _id: id, json_data: { name, stationIds, active: true, createdAt: '2026-11-13T00:00:00Z' } })

describe('ajouter l’équipe en collant une liste', () => {
  it('garde un nom par ligne, sans puces, numéros, doublons ni noms déjà là', () => {
    const text = '- Marc Tremblay\n2) Julie  Gagnon\n\n• kevin roy\nKevin Roy\nMarc Tremblay\t\n3. Sarah Côté;Luc Ouellet'
    expect(parseNames(text, ['Sarah Côté'])).toEqual(['Marc Tremblay', 'Julie Gagnon', 'kevin roy', 'Luc Ouellet'])
  })

  it('coupe un nom trop long et s’arrête à 200 personnes', () => {
    expect(parseNames('A'.repeat(120))[0]).toHaveLength(80)
    expect(parseNames(Array.from({ length: 250 }, (_, i) => `Personne ${i}`).join('\n'))).toHaveLength(200)
  })

  it('ajoute ceux qui passent et nomme ceux qui ont échoué', async () => {
    let n = 0
    const gw = fakeGateway((_endpoint, options) => {
      const name = (options.body as { json_data: { name: string } }).json_data.name
      if (name === 'Julie Gagnon') return new ApiError('refus', 500, null)
      return { results: [{ inserted_id: `id${++n}`, json_data: {} }] }
    })
    const { added, failed, error } = await addOperators(dataApi(gw), ['Marc Tremblay', 'Julie Gagnon', 'Kevin Roy'], { shift: 'nuit' })
    expect(added.map((d) => d.json_data.name).sort()).toEqual(['Kevin Roy', 'Marc Tremblay'])
    expect(failed).toEqual(['Julie Gagnon'])
    // La vraie raison du refus remonte, pour que l'écran la dise.
    expect((error as ApiError).message).toBe('refus')
    const first = (gw.calls[0].options.body as { json_data: Operator & { app_identifier: string } }).json_data
    // Sans code au départ ; le code se donne par le serveur, jamais par le navigateur.
    expect(first).toMatchObject({ shift: 'nuit', active: true, stationIds: [], app_identifier: 'clip-v3' })
    expect(first).not.toHaveProperty('pinHash')
  })
})

describe('le travail en parallèle limité', () => {
  it('garde l’ordre des résultats et ne dépasse jamais la limite', async () => {
    let running = 0
    let peak = 0
    const out = await mapPool([30, 5, 20, 1, 10, 2], 2, async (ms, i) => {
      running += 1
      peak = Math.max(peak, running)
      await new Promise((r) => setTimeout(r, ms))
      running -= 1
      return i
    })
    expect(out).toEqual([0, 1, 2, 3, 4, 5])
    expect(peak).toBe(2)
    expect(await mapPool([], 4, async () => 1)).toEqual([])
  })
})

describe('« Qui êtes-vous ? » au poste', () => {
  it('montre d’abord les personnes de ce poste', () => {
    const ops = [person('1', 'Annie', ['p2']), person('2', 'Bruno', ['p1']), person('3', 'Chloé', ['p1', 'p2'])]
    const { mine, others } = orderForStation(ops, 'p1')
    expect(mine.map((o) => o.json_data.name)).toEqual(['Bruno', 'Chloé'])
    expect(others.map((o) => o.json_data.name)).toEqual(['Annie'])
    expect(orderForStation(ops, null).mine).toEqual([])
  })

  it('oublie la personne après 30 minutes sans toucher la tablette, ou à la fin de sa session', () => {
    const now = Date.now()
    const s: StationSession = { session: 'k.b.s', operator: { id: '1', name: 'Marc' }, exp: now + 3600_000, lastActive: now }
    saveStationSession('lien-a', s)
    expect(loadStationSession('lien-a', now + 60_000)?.operator.name).toBe('Marc')
    expect(loadStationSession('lien-a', now + IDLE_MS + 1)).toBeNull()
    // Effacée : même un retour dans le temps ne la ramène pas.
    expect(loadStationSession('lien-a', now)).toBeNull()

    saveStationSession('lien-b', { ...s, exp: now - 1 })
    expect(loadStationSession('lien-b', now)).toBeNull()
    // Une tablette par lien : un autre poste ne la voit pas.
    saveStationSession('lien-c', s)
    expect(loadStationSession('lien-d', now)).toBeNull()
  })
})

describe('la vérification du code, vue de la tablette', () => {
  afterEach(() => vi.unstubAllGlobals())
  const reply = (status: number, body: unknown) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })))

  it('rend une session signée quand le code est bon', async () => {
    reply(200, { session: 's1.x.y', operator: { id: 'a', name: 'Marc' }, exp: 123 })
    const r = await verifyCode('lien', 'a'.repeat(24), '4821')
    expect(r).toMatchObject({ ok: true, session: { session: 's1.x.y', operator: { name: 'Marc' }, exp: 123 } })
  })

  it('dit pourquoi le code est refusé, sans jamais inventer une raison', async () => {
    reply(401, { error: 'wrongPin' })
    expect(await verifyCode('lien', 'a'.repeat(24), '0000')).toEqual({ ok: false, error: 'wrongPin', until: undefined })
    reply(429, { error: 'locked', until: 999 })
    expect(await verifyCode('lien', 'a'.repeat(24), '0000')).toEqual({ ok: false, error: 'locked', until: 999 })
    reply(500, { error: 'quelque chose de neuf' })
    expect((await verifyCode('lien', 'a'.repeat(24), '0000')).ok).toBe(false)
    expect(await verifyCode('lien', 'a'.repeat(24), '0000')).toMatchObject({ error: 'unavailable' })
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('hors ligne'))))
    expect(await verifyCode('lien', 'a'.repeat(24), '0000')).toEqual({ ok: false, error: 'network' })
  })
})

describe('la feuille des codes', () => {
  it('donne un carton par personne et n’exécute rien de ce qu’on a tapé dans un nom', () => {
    const html = codesSheet([{ name: 'Marc <script>alert(1)</script>', pin: '4821' }, { name: 'Julie & Co', pin: '0937' }], { printTitle: 'Codes', printHint: 'À remettre' }, 'fr')
    expect(html.match(/class="card"/g)).toHaveLength(2)
    expect(html).toContain('Marc &lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('Julie &amp; Co')
    expect(html).not.toContain('<script>')
    expect(html).toContain('>4821<')
  })
})

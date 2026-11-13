import { describe, expect, it } from 'vitest'
import { dataApi, type Doc } from '@/lib/gateway/data'
import { buildInbox } from '@/lib/model/inbox'
import { askAdmin } from '@/lib/model/requests'
import type { UpgradeRequest } from '@/lib/model/types'
import { compose } from '@/lib/server/notify'
import { fakeGateway } from './fakeClient'

const req = (id: string, feature: string, byName: string, at: string): Doc<UpgradeRequest> => ({ _id: id, json_data: { app_identifier: 'clip-v3', feature, targetName: 'Équipe', byId: byName.toLowerCase(), byName, at } as UpgradeRequest })
const none = { instructions: [], feedback: [], executions: [], groups: [] }

describe('demander à l’administrateur', () => {
  it('« À voir » : une ligne par fonction, seulement pour qui achète, et elle part quand l’usine a la fonction', () => {
    const requests = [req('r1', 'translations', 'Luc', '2026-11-12T09:00:00Z'), req('r2', 'translations', 'Nathalie', '2026-11-13T09:00:00Z'), req('r3', 'approvals', 'Luc', '2026-11-11T09:00:00Z')]
    const items = buildInbox({ ...none, userId: 'mel', requests, can: { approve: true, feedback: true, buy: true } })
    expect(items.map((i) => [i.kind, i.title, i.who, i.text, i.href])).toEqual([
      ['request', 'Traduction pour les opérateurs', 'Luc, Nathalie', 'Avec Équipe', '/reglages/abonnement'],
      ['request', 'Approbation avant publication', 'Luc', 'Avec Équipe', '/reglages/abonnement'],
    ])
    // Un module demandé : son nom suffit.
    const academy = { ...req('r4', 'academy', 'Luc', '2026-11-13T10:00:00Z'), json_data: { ...req('r4', 'academy', 'Luc', '2026-11-13T10:00:00Z').json_data, targetName: 'Académie' } }
    expect(buildInbox({ ...none, userId: 'mel', requests: [academy], can: { approve: true, feedback: true, buy: true } }).map((i) => [i.title, i.text])).toEqual([['Académie', null]])
    expect(items[0].at).toBe('2026-11-13T09:00:00Z')
    expect(buildInbox({ ...none, userId: 'mel', requests, can: { approve: true, feedback: true, buy: false } })).toEqual([])
    expect(buildInbox({ ...none, userId: 'mel', requests, granted: { translations: true }, can: { approve: true, feedback: true, buy: true } }).map((i) => i.title)).toEqual(['Approbation avant publication'])
  })

  it('une seule demande par personne et par fonction sur 30 jours', async () => {
    const found: Array<Doc<UpgradeRequest>> = []
    const gw = fakeGateway((endpoint, options) => {
      if (endpoint.includes('clip_request/filter')) return { results: found }
      if (options.method === 'POST') return { results: [{ inserted_id: 'r1', json_data: {} }] }
      return { success: true }
    })
    const actor = { id: 'luc', name: 'Luc' }
    const now = Date.parse('2026-11-13T12:00:00Z')
    expect(await askAdmin(dataApi(gw), actor, 'translations', 'Équipe', now)).toEqual({ created: true })
    const inserted = gw.calls.find((c) => c.endpoint === '/api/v1/data/clip_request' && c.options.method === 'POST')!.options.body as { json_data: UpgradeRequest }
    expect(inserted.json_data).toMatchObject({ feature: 'translations', targetName: 'Équipe', byId: 'luc', byName: 'Luc', at: '2026-11-13T12:00:00.000Z' })
    const filter = JSON.stringify(gw.calls.find((c) => c.endpoint.includes('clip_request/filter'))!.options.body)
    expect(filter).toContain('"json_data.at":{"$gte":"2026-10-14T12:00:00.000Z"}')
    found.push(req('r1', 'translations', 'Luc', '2026-11-13T12:00:00Z'))
    const before = gw.calls.length
    expect(await askAdmin(dataApi(gw), actor, 'translations', 'Équipe', now)).toEqual({ created: false })
    expect(gw.calls.slice(before).some((c) => c.endpoint === '/api/v1/data/clip_request' && c.options.method === 'POST')).toBe(false)
  })

  it('l’avis aux administrateurs dit qui, quoi, et ce qui l’ouvrirait, dans leur langue', () => {
    const fr = compose({ kind: 'request', who: 'Luc', text: 'Traduction pour les opérateurs', instruction: 'Équipe', url: 'https://clip/reglages/abonnement' }, 'fr')
    expect(fr.title).toBe('Luc aimerait : Traduction pour les opérateurs')
    expect(fr.body).toBe('Pour l’ouvrir : Équipe. Tout se règle dans Abonnement et crédits.')
    expect(compose({ kind: 'request', who: 'Luc', text: 'Translation', url: 'https://clip' }, 'en').body).toBe('Everything is in Subscription and credits.')
  })
})

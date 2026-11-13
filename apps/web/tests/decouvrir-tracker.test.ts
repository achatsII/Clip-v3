/**
 * Le traceur de l'espace Découvrir : inerte sans visite, des lots de 100 au plus, un lot refusé gardé dans
 * l'onglet et réessayé, abandonné au troisième échec ; un 404 (l'espace n'est plus relié) arrête le suivi.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { endVisit, flush, isTracked, markExit, MAX_TRIES, pendingEvents, startVisit, track, videoProgress } from '@/lib/decouvrir/tracker'

type Sent = { session: string; evenements: Array<{ type: string }> }

function stubFetch(statuses: number[]) {
  const sent: Sent[] = []
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    sent.push(JSON.parse(String(init.body)) as Sent)
    const status = statuses.length > 1 ? statuses.shift()! : statuses[0]
    return new Response(JSON.stringify({ ok: status < 300 }), { status, headers: { 'Content-Type': 'application/json' } })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { sent, fetchMock }
}

beforeEach(() => {
  vi.useFakeTimers()
  sessionStorage.clear()
})
afterEach(() => {
  endVisit()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

describe('le traceur', () => {
  it('ne fait rien tant qu’aucune visite n’a commencé (espace ouvert : jamais)', async () => {
    const { fetchMock } = stubFetch([200])
    track({ type: 'page', chemin: '/decouvrir' })
    await flush()
    expect(pendingEvents()).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
    expect(isTracked()).toBe(false)
  })

  it('envoie la file à la route de Clip, avec l’identifiant de visite, puis la vide', async () => {
    const { sent, fetchMock } = stubFetch([200])
    startVisit()
    track({ type: 'page', chemin: '/decouvrir', libelle: 'Vidéos' })
    track({ type: 'conseiller', libelle: 'ouvre' })
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/decouvrir/suivi')
    expect(sent[0].session).toMatch(/^s_[a-z0-9]{14}$/)
    expect(sent[0].evenements.map((e) => e.type)).toEqual(['page', 'conseiller'])
    expect(pendingEvents()).toEqual([])
    expect(isTracked()).toBe(true)
  })

  it('la sortie porte la durée de la visite, en secondes ; sans visite, rien', async () => {
    const { sent } = stubFetch([200])
    expect(markExit()).toBe(false)
    startVisit()
    vi.advanceTimersByTime(95_000)
    expect(markExit()).toBe(true)
    await flush()
    const sortie = sent.flatMap((b) => b.evenements).find((e) => e.type === 'sortie') as { type: string; sec?: number } | undefined
    expect(sortie?.sec).toBe(95)
  })

  it('un lot refusé (panne) reste dans l’onglet, réessaie, et s’abandonne au troisième échec', async () => {
    const { fetchMock } = stubFetch([503])
    startVisit()
    track({ type: 'page', chemin: '/decouvrir' })
    await flush()
    expect(pendingEvents()).toEqual([{ type: 'page', tries: 1 }])
    await flush()
    expect(pendingEvents()).toEqual([{ type: 'page', tries: 2 }])
    await flush()
    expect(MAX_TRIES).toBe(3)
    expect(pendingEvents()).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('le réseau qui coupe compte comme une panne ; le lot repart ensuite', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))))
    startVisit()
    track({ type: 'page', chemin: '/decouvrir' })
    await flush()
    expect(pendingEvents()).toEqual([{ type: 'page', tries: 1 }])
    const { fetchMock } = stubFetch([200])
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(pendingEvents()).toEqual([])
  })

  it('une forme refusée (422) ne se réessaie pas', async () => {
    stubFetch([422])
    startVisit()
    track({ type: 'page', chemin: '/decouvrir' })
    await flush()
    expect(pendingEvents()).toEqual([])
  })

  it('404 : l’espace n’est plus relié, le suivi s’arrête', async () => {
    stubFetch([404])
    startVisit()
    track({ type: 'page', chemin: '/decouvrir' })
    await flush()
    expect(isTracked()).toBe(false)
    expect(pendingEvents()).toEqual([])
    track({ type: 'page', chemin: '/decouvrir' })
    expect(pendingEvents()).toEqual([])
  })

  it('250 événements partent en trois lots (100, 100, 50)', async () => {
    const { sent } = stubFetch([200])
    startVisit()
    for (let i = 0; i < 250; i++) track({ type: 'page', chemin: '/decouvrir' })
    await flush()
    expect(sent.map((s) => s.evenements.length)).toEqual([100, 100, 50])
  })

  it('une vidéo : un événement toutes les 15 s de lecture, puis « vue » une seule fois à 92 %', async () => {
    const { sent } = stubFetch([200])
    startVisit()
    const v = { id: '00-film', title: 'Clip en 75 secondes', chapters: [{ t: 0 }, { t: 15.4 }, { t: 18.2 }] }
    for (let s = 1; s <= 16; s++) videoProgress(v, s, 75, 1)
    videoProgress(v, 70, 75, 1)
    videoProgress(v, 71, 75, 1)
    await flush()
    const events = sent.flatMap((s) => s.evenements) as Array<{ type: string; sec?: number; pct?: number; chapitre?: string }>
    expect(events.filter((e) => e.type === 'video')).toEqual([expect.objectContaining({ type: 'video', videoId: '00-film', sec: 15, pct: 20, chapitre: 'c01', libelle: 'Clip en 75 secondes' })])
    expect(events.filter((e) => e.type === 'video_fin')).toHaveLength(1)
  })
})

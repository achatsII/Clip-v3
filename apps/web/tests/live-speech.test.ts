import { describe, expect, it, vi } from 'vitest'
import { canReadAloud } from '@/lib/gateway/guest'
import { LiveSpeaker, type AudioSink, type LiveMessage, type LiveSpeakerDeps } from '@/lib/liveSpeech'
import { permissionsFor } from '@/lib/server/scope'

/** Une session en direct factice : on lui fait « parler » en poussant des messages. */
function fakeLive(opts: { fail?: boolean } = {}) {
  const sent: string[] = []
  let push: (m: LiveMessage) => void = () => undefined
  const close = vi.fn()
  const played: string[] = []
  let queued = 0
  const sink: AudioSink = {
    play: (b) => {
      played.push(b)
      queued++
    },
    stop: () => {
      queued = 0
    },
    idle: () => queued === 0,
  }
  const synthSpoken: string[] = []
  const synth = { cancel: vi.fn(), speak: (u: { text: string }) => synthSpoken.push(u.text) } as unknown as SpeechSynthesis
  const deps: LiveSpeakerDeps = {
    connect: vi.fn(async (_ai, onMessage) => {
      if (opts.fail) throw new Error('pas de jeton')
      push = onMessage
      return { session: { send: (t: string) => sent.push(t), close }, sessionId: 's1', model: 'live-model' }
    }),
    sink: () => sink,
    synth: () => synth,
  }
  const ai = { liveUsage: vi.fn(async () => undefined) }
  const audio = (data: string): LiveMessage => ({ serverContent: { modelTurn: { parts: [{ inlineData: { data } }] } } })
  return {
    deps, ai, sent, played, close, synthSpoken, sink,
    say: (...chunks: string[]) => chunks.forEach((c) => push(audio(c))),
    push: (m: LiveMessage) => push(m),
    drain: () => {
      queued = 0
      sink.onIdle?.()
    },
  }
}

describe('lire à voix haute par la voix en direct', () => {
  it('une seule session pour toute l’instruction : chaque étape part tout de suite', async () => {
    const f = fakeLive()
    const s = new LiveSpeaker(f.ai as never, f.deps)
    expect(await s.speak('a', 'Couper l’alimentation.', 'fr')).toBe(true)
    expect(await s.speak('b', 'Cadenasser le sectionneur.', 'fr')).toBe(true)
    expect(f.deps.connect).toHaveBeenCalledTimes(1)
    expect(f.sent).toEqual(['Couper l’alimentation.', 'Cadenasser le sectionneur.'])
  })

  it('le bouton s’allume avec la voix, et s’éteint quand elle a tout dit', async () => {
    const f = fakeLive()
    const s = new LiveSpeaker(f.ai as never, f.deps)
    const states: boolean[] = []
    s.onState = (p) => states.push(p)
    await s.speak('a', 'Étape 1', 'fr')
    states.length = 0
    f.say('AAA', 'BBB')
    f.push({ serverContent: { turnComplete: true } })
    expect(states).toEqual([true])
    f.drain()
    expect(states).toEqual([true, false])
    expect(f.played).toEqual(['AAA', 'BBB'])
  })

  it('la file audio se vide avant que la voix ait fini d’arriver : le bouton s’éteint à la fin, pas avant', async () => {
    const f = fakeLive()
    const s = new LiveSpeaker(f.ai as never, f.deps)
    const states: boolean[] = []
    await s.speak('a', 'Étape 1', 'fr')
    s.onState = (p) => states.push(p)
    f.say('AAA')
    f.drain()
    expect(states).toEqual([true])
    f.push({ serverContent: { turnComplete: true } })
    expect(states).toEqual([true, false])
  })

  it('on passe à l’étape suivante en pleine lecture : la fin de l’ancienne ne joue pas', async () => {
    const f = fakeLive()
    const s = new LiveSpeaker(f.ai as never, f.deps)
    await s.speak('a', 'Étape 1', 'fr')
    f.say('ancien-1')
    await s.speak('b', 'Étape 2', 'fr')
    f.say('ancien-2')
    f.push({ serverContent: { interrupted: true } })
    f.say('nouveau-1')
    expect(f.played).toEqual(['ancien-1', 'nouveau-1'])
  })

  it('sans voix en direct (pas de jeton, réseau), la voix de l’appareil lit quand même', async () => {
    const f = fakeLive({ fail: true })
    const s = new LiveSpeaker(f.ai as never, f.deps)
    const Utterance = vi.fn(function (this: { text: string }, t: string) {
      this.text = t
    })
    vi.stubGlobal('SpeechSynthesisUtterance', Utterance)
    expect(await s.speak('a', 'Vérifier la pression.', 'fr')).toBe(true)
    expect(f.synthSpoken).toEqual(['Vérifier la pression.'])
    vi.unstubAllGlobals()
    const none = new LiveSpeaker(f.ai as never, { ...f.deps, synth: () => undefined })
    expect(await none.speak('a', 'x', 'fr')).toBe(false)
  })

  it('l’instruction quitte l’écran : la session se ferme et son usage est déclaré une fois', async () => {
    const f = fakeLive()
    const s = new LiveSpeaker(f.ai as never, f.deps)
    await s.speak('a', 'Étape 1', 'fr')
    f.push({ usageMetadata: { totalTokenCount: 120 } })
    s.dispose()
    s.dispose()
    expect(f.close).toHaveBeenCalledTimes(1)
    expect(f.ai.liveUsage).toHaveBeenCalledTimes(1)
    expect(f.ai.liveUsage).toHaveBeenCalledWith('s1', 'live-model', { totalTokenCount: 120 })
    expect(await s.speak('b', 'Étape 2', 'fr')).toBe(false)
  })
})

describe('les liens publics lisent à voix haute', () => {
  it('tout lien a la voix en direct ; l’assistant vocal reste réservé au poste qui l’a demandé', () => {
    expect(permissionsFor('instruction', false)).toContain('ai:live')
    expect(permissionsFor('instruction', false)).not.toContain('ai:tts')
    expect(permissionsFor('station', false)).toContain('ai:live')
    expect(permissionsFor('station', false)).not.toContain('assistant:ask')
    expect(permissionsFor('station', true)).toContain('assistant:ask')
    expect(canReadAloud(['ai:live'])).toBe(true)
    expect(canReadAloud(['ai:tts'])).toBe(true)
    expect(canReadAloud(['data:read'])).toBe(false)
  })
})

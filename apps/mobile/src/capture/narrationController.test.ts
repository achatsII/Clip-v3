import type { CapturedMedia } from '../bridge/protocol'
import { narrationController, type NarrationDeps, type RecorderLike } from './narrationController'

/** Un enregistreur d'essai : le temps n'avance que quand il enregistre (les pauses n'y sont pas). */
function fakeRecorder() {
  let recording = false
  let millis = 0
  const r = {
    calls: [] as string[],
    uri: 'file:///cache/rec-1.m4a' as string | null,
    advance(ms: number) {
      if (recording) millis += ms
    },
    record: jest.fn(() => {
      recording = true
      r.calls.push('record')
    }),
    pause: jest.fn(() => {
      recording = false
      r.calls.push('pause')
    }),
    stop: jest.fn(async () => {
      recording = false
      r.calls.push('stop')
    }),
    prepareToRecordAsync: jest.fn(async () => {
      r.calls.push('prepare')
    }),
    getStatus: () => ({ isRecording: recording, durationMillis: millis }),
  }
  return r
}

function deps(over: Partial<NarrationDeps> = {}) {
  const note: CapturedMedia = { localId: 'n1', kind: 'audio', mimeType: 'audio/mp4', fileName: 'note.m4a', sizeBytes: 10, narration: true }
  return {
    getPermission: jest.fn(async () => ({ granted: true, canAskAgain: true })),
    requestPermission: jest.fn(async () => ({ granted: true, canAskAgain: true })),
    audioMode: jest.fn(async () => undefined),
    finalize: jest.fn(async (_uri: string, seconds: number) => ({ ...note, durationSec: seconds })),
    removeFile: jest.fn(),
    remember: jest.fn(),
    onDenied: jest.fn(),
    onFull: jest.fn(),
    log: jest.fn(),
    maxSeconds: 600,
    ...over,
  }
}

describe('parler pendant les photos (coquille)', () => {
  it('s’ouvre avec la caméra, donne l’instant de chaque photo, pauses non comprises, et rend la note', async () => {
    const rec = fakeRecorder()
    const d = deps()
    const ctl = narrationController(rec as RecorderLike, d)
    await ctl.start(true)
    expect(rec.calls).toEqual(['prepare', 'record'])
    rec.advance(4200)
    expect(ctl.mark()).toBe(4.2)
    // Micro fermé : la photo n'a pas d'instant, et le geste est retenu.
    await ctl.toggle()
    expect(d.remember).toHaveBeenLastCalledWith(false)
    rec.advance(10_000)
    expect(ctl.mark()).toBeUndefined()
    await ctl.toggle()
    expect(d.remember).toHaveBeenLastCalledWith(true)
    rec.advance(3000)
    expect(ctl.mark()).toBe(7.2)
    const note = await ctl.finish()
    expect(note).toMatchObject({ narration: true, durationSec: 7.2 })
    expect(d.finalize).toHaveBeenCalledWith('file:///cache/rec-1.m4a', 7.2)
    expect(d.audioMode).toHaveBeenLastCalledWith(false)
  })

  it('fermé la dernière fois sur cet appareil : ne s’ouvre pas tout seul, et s’ouvre d’un toucher', async () => {
    const rec = fakeRecorder()
    const ctl = narrationController(rec as RecorderLike, deps())
    await ctl.start(false)
    expect(rec.record).not.toHaveBeenCalled()
    expect(ctl.mark()).toBeUndefined()
    await ctl.toggle()
    expect(rec.record).toHaveBeenCalledTimes(1)
  })

  it('refusé : rien n’enregistre, et la pastille sait si l’on peut redemander', async () => {
    const rec = fakeRecorder()
    const d = deps({ getPermission: jest.fn(async () => ({ granted: false, canAskAgain: false })) })
    const ctl = narrationController(rec as RecorderLike, d)
    await ctl.start(true)
    expect(d.onDenied).toHaveBeenLastCalledWith({ canAsk: false })
    expect(d.requestPermission).not.toHaveBeenCalled()
    expect(rec.record).not.toHaveBeenCalled()
    expect(await ctl.finish()).toBeNull()
  })

  it('fermé pendant qu’il démarre : il ne se met pas à enregistrer après coup', async () => {
    const rec = fakeRecorder()
    let release!: () => void
    rec.prepareToRecordAsync.mockImplementation(() => new Promise<void>((r) => (release = r)))
    const ctl = narrationController(rec as RecorderLike, deps())
    const starting = ctl.start(true)
    await new Promise((r) => setTimeout(r, 0))
    await ctl.discard()
    release()
    await starting
    expect(rec.record).not.toHaveBeenCalled()
  })

  it('« Supprimer » jette l’enregistrement ; moins d’une seconde ne fait pas de note', async () => {
    const rec = fakeRecorder()
    const d = deps()
    const ctl = narrationController(rec as RecorderLike, d)
    await ctl.start(true)
    rec.advance(5000)
    await ctl.discard()
    expect(d.removeFile).toHaveBeenCalledWith('file:///cache/rec-1.m4a')
    expect(d.finalize).not.toHaveBeenCalled()

    const rec2 = fakeRecorder()
    const d2 = deps()
    const short = narrationController(rec2 as RecorderLike, d2)
    await short.start(true)
    rec2.advance(400)
    expect(await short.finish()).toBeNull()
    expect(d2.removeFile).toHaveBeenCalled()
  })

  it('au plus la durée d’une note vocale : le micro se ferme de lui-même et ne se rouvre plus', async () => {
    const rec = fakeRecorder()
    const d = deps({ maxSeconds: 10 })
    const ctl = narrationController(rec as RecorderLike, d)
    await ctl.start(true)
    rec.advance(10_000)
    ctl.tick(rec.getStatus())
    expect(rec.pause).toHaveBeenCalled()
    expect(d.onFull).toHaveBeenCalled()
    await ctl.toggle()
    expect(rec.record).toHaveBeenCalledTimes(1)
    expect(await ctl.finish()).toMatchObject({ durationSec: 10 })
  })

  it('l’écran qui se ferme sans rendre la note arrête le micro', async () => {
    const rec = fakeRecorder()
    const d = deps()
    const ctl = narrationController(rec as RecorderLike, d)
    await ctl.start(true)
    ctl.close()
    expect(rec.stop).toHaveBeenCalled()
    expect(d.audioMode).toHaveBeenLastCalledWith(false)
    expect(ctl.mark()).toBeUndefined()
  })
})

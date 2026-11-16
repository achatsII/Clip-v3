import { CURRENT_SCHEMA_VERSION, migrateState, type MediaRecord } from './migrations'

let counter = 0
const makeId = () => `id-${++counter}`

const media: MediaRecord = {
  localId: 'm1',
  kind: 'photo',
  mimeType: 'image/jpeg',
  fileName: 'photo.jpg',
  uri: 'file:///doc/clip-media/m1.jpg',
  sizeBytes: 1200,
  createdAt: 1_700_000_000_000,
}

beforeEach(() => {
  counter = 0
})

describe('migrateState', () => {
  it('crée un état neuf quand rien n’est écrit', () => {
    const out = migrateState(null, makeId)
    expect(out).toEqual({
      kind: 'fresh',
      state: { schemaVersion: CURRENT_SCHEMA_VERSION, installId: 'id-1', media: {} },
    })
  })

  it('migre un état sans numéro de version en gardant l’installation et les médias', () => {
    const raw = JSON.stringify({ installId: 'install-ancien', pendingMedia: [media], note: 'gardée' })
    const out = migrateState(raw, makeId)
    expect(out.kind).toBe('migrated')
    expect(out.state).toEqual({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      installId: 'install-ancien',
      media: { m1: media },
      note: 'gardée',
    })
  })

  it('relit tel quel un état à la version courante', () => {
    const state = { schemaVersion: CURRENT_SCHEMA_VERSION, installId: 'x', media: { m1: media } }
    expect(migrateState(JSON.stringify(state), makeId)).toEqual({ kind: 'current', state })
  })

  it('garde les champs inconnus et le numéro d’un état écrit par une version plus récente', () => {
    const state = { schemaVersion: 7, installId: 'x', media: { m1: media }, plusTard: { a: 1 } }
    const out = migrateState(JSON.stringify(state), makeId)
    expect(out).toEqual({ kind: 'newer', version: 7, state })
  })

  it('garde le lien d’une série commentée (l’instant d’une photo, la note de la série)', () => {
    const photo = { ...media, voiceAt: 12.4 }
    const note: MediaRecord = { ...media, localId: 'm2', kind: 'audio', mimeType: 'audio/mp4', fileName: 'note.m4a', narration: true }
    const state = { schemaVersion: CURRENT_SCHEMA_VERSION, installId: 'x', media: { m1: photo, m2: note, m3: { ...media, localId: 'm3', voiceAt: 'tôt' } } }
    const out = migrateState(JSON.stringify(state), makeId)
    expect(out.state.media.m1.voiceAt).toBe(12.4)
    expect(out.state.media.m2.narration).toBe(true)
    // Un instant illisible se perd, pas la photo.
    expect(out.state.media.m3).toEqual({ ...media, localId: 'm3' })
  })

  it('ne perd pas un média utilisable à cause d’une entrée illisible voisine', () => {
    const state = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      installId: 'x',
      media: { m1: media, cassé: { localId: 'cassé' }, autre: 42 },
    }
    const out = migrateState(JSON.stringify(state), makeId)
    expect(Object.keys(out.state.media)).toEqual(['m1'])
  })

  it('signale un état illisible pour que l’appelant le mette de côté, et repart à neuf', () => {
    const out = migrateState('{ ceci n’est pas du json', makeId)
    expect(out.kind).toBe('corrupt')
    if (out.kind === 'corrupt') expect(out.raw).toBe('{ ceci n’est pas du json')
    expect(out.state.media).toEqual({})
  })

  it('donne un identifiant d’installation à un état qui n’en a pas', () => {
    const out = migrateState(JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, media: {} }), makeId)
    expect(out.state.installId).toBe('id-1')
  })
})

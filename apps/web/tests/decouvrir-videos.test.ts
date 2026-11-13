// @vitest-environment node
/**
 * Le catalogue de l'espace Découvrir et les métadonnées publiées : des identifiants fixes au format
 * `NN-slug`, une vidéo sans MP4 qui reste « Bientôt », le film publié conforme au catalogue.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { resolveVideoId, VIDEO_IDS, VIDEO_LEVEL } from '@/lib/decouvrir/catalog'
import { readVideoMetas } from '@/lib/decouvrir/server/videos'
import { chapterIndexAt, chapterKey, parseVideoMeta } from '@/lib/decouvrir/videos'
import { messagesIn } from '@/lib/i18n/core'

const PUBLIC = fileURLToPath(new URL('../public', import.meta.url))
const DIR = path.join(PUBLIC, 'decouvrir', 'videos')
const exists = (p: string) => fs.existsSync(path.join(PUBLIC, p.replace(/^\//, '')))

describe('le catalogue', () => {
  it('a des identifiants uniques, au format NN-slug, dans l’ordre du parcours, chacun avec son niveau', () => {
    expect(new Set(VIDEO_IDS).size).toBe(VIDEO_IDS.length)
    VIDEO_IDS.forEach((id, i) => {
      expect(id).toMatch(/^\d{2}-[a-z0-9-]+$/)
      expect(Number(id.slice(0, 2))).toBe(i)
      expect([1, 2, 3]).toContain(VIDEO_LEVEL[id])
    })
  })

  it('a un titre, un résumé d’une phrase et un « Pour qui » dans chaque langue', () => {
    for (const lang of ['fr', 'en']) {
      const words = messagesIn(lang).decouvrir.videos
      for (const id of VIDEO_IDS) {
        expect(words[id].title.trim(), `${lang} ${id}`).not.toBe('')
        expect(words[id].summary.trim().endsWith('.'), `${lang} ${id}`).toBe(true)
        expect(words[id].forWho.trim()).not.toBe('')
      }
    }
  })

  it('une adresse résout l’identifiant actuel, sinon rien', () => {
    expect(resolveVideoId('00-film')).toBe('00-film')
    expect(resolveVideoId('inconnue')).toBeNull()
    expect(resolveVideoId(null)).toBeNull()
  })
})

describe('les métadonnées publiées', () => {
  it('une vidéo sans MP4 reste « Bientôt » ; un JSON illisible aussi', () => {
    expect(parseVideoMeta('02-capturer', { title: 'x', chapters: [] }, () => true)).toBeNull()
    expect(parseVideoMeta('02-capturer', { mp4: '/decouvrir/videos/absente.mp4' }, () => false)).toBeNull()
    expect(parseVideoMeta('02-capturer', { mp4: 'http://non-securise.test/v.mp4' }, () => true)).toBeNull()
    expect(parseVideoMeta('02-capturer', { mp4: '//ailleurs.test/v.mp4' }, () => true)).toBeNull()
    expect(parseVideoMeta('02-capturer', 'pas un objet', () => true)).toBeNull()
  })

  it('une vidéo publiée garde ses chapitres et sa transcription en ordre ; une affiche absente tombe', () => {
    const m = parseVideoMeta(
      '02-capturer',
      { title: 'Capturer', durationSec: 120, mp4: 'https://stockage.test/v.mp4', poster: '/decouvrir/videos/absente.jpg', chapters: [{ t: 30, title: 'B' }, { t: 0, title: 'A' }, { t: 'x', title: 'C' }], transcript: [{ t: 1, text: 'Bonjour' }, { t: 2, text: '' }] },
      () => false,
    )!
    expect(m.chapters).toEqual([{ t: 0, title: 'A' }, { t: 30, title: 'B' }])
    expect(m.transcript).toEqual([{ t: 1, text: 'Bonjour' }])
    expect(m.poster).toBeUndefined()
    expect(chapterIndexAt(m.chapters, 31)).toBe(1)
    expect(chapterKey(chapterIndexAt(m.chapters, 31))).toBe('c02')
    expect(chapterKey(-1)).toBeUndefined()
  })

  it('chaque fichier publié correspond à une vidéo du catalogue', () => {
    const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json'))
    expect(files.length).toBeGreaterThan(0)
    for (const f of files) expect(VIDEO_IDS as readonly string[], f).toContain(f.replace(/\.json$/, ''))
  })

  it('le film « Clip en 75 secondes » est publié : MP4 du stockage, affiche, sous-titres, chapitres, transcription', () => {
    const metas = readVideoMetas()
    expect(Object.keys(metas)).toEqual(['00-film'])
    const film = metas['00-film']
    expect(film.title).toBe(messagesIn('fr').decouvrir.videos['00-film'].title)
    expect(film.summary).toBe(messagesIn('fr').decouvrir.videos['00-film'].summary)
    expect(film.mp4).toMatch(/^https:\/\/[^/]+\.digitaloceanspaces\.com\/.+\.mp4$/)
    expect(film.poster).toBe('/decouvrir/videos/00-film.jpg')
    expect(film.vtt).toBe('/decouvrir/videos/00-film.vtt')
    expect(exists(film.poster!)).toBe(true)
    expect(film.durationSec).toBeCloseTo(74.97, 1)
    expect(film.chapters).toHaveLength(11)
    expect(film.chapters[0]).toEqual({ t: 0, title: 'Le savoir-faire qui part à la retraite' })
    expect(film.chapters.every((c) => c.t < film.durationSec)).toBe(true)
    expect(film.transcript.length).toBeGreaterThan(10)
    expect(fs.readFileSync(path.join(PUBLIC, film.vtt!), 'utf8').startsWith('WEBVTT')).toBe(true)
  })

  it('aucun MP4 dans le dépôt', () => {
    const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [e.name]))
    expect(walk(path.join(PUBLIC, 'decouvrir')).filter((f) => /\.(mp4|mov|webm)$/i.test(f))).toEqual([])
  })
})

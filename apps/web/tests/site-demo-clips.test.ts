/**
 * La démo du poste montre les gestes en vidéo (les plans du film : cadenas, copeaux, huile, cadenas
 * retiré), pas des images fixes ; la photo reste l'image d'attente.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEMO, DEMO_LANGS } from '@/lib/site/content/demo'
import { photoMotion, SCENE_CLIPS, STEP_CLIPS } from '@/lib/site/media'
import type { PhotoKey } from '@/lib/site/media'

describe('la démo du poste', () => {
  it('les gestes filmés jouent en vidéo dans chaque langue de la démo', () => {
    for (const lang of DEMO_LANGS) expect(DEMO[lang].steps.map((s) => s.clip ?? null), lang).toEqual(['lock', 'brushing', 'oiling', 'unlock', null])
  })

  it('chaque boucle est au stockage, en WebM et en MP4, avec son image d’attente dans le site', () => {
    for (const clip of Object.values(STEP_CLIPS)) {
      expect(clip.webm).toMatch(/^https:\/\/ii-file\.tor1\.digitaloceanspaces\.com\/.+\.webm$/)
      expect(clip.mp4).toMatch(/^https:\/\/ii-file\.tor1\.digitaloceanspaces\.com\/.+\.mp4$/)
      expect(existsSync(join(process.cwd(), 'public', clip.poster))).toBe(true)
    }
  })

  it('les plans du film sans texte (Jacques, l’usine) sont au stockage, avec leur image d’attente', () => {
    for (const clip of Object.values(SCENE_CLIPS)) {
      expect(clip.webm).toMatch(/^https:\/\/ii-file\.tor1\.digitaloceanspaces\.com\/.+\.webm$/)
      expect(clip.mp4).toMatch(/^https:\/\/ii-file\.tor1\.digitaloceanspaces\.com\/.+\.mp4$/)
      expect(existsSync(join(process.cwd(), 'public', clip.poster))).toBe(true)
    }
  })

  it('une photo d’un geste filmé se montre en mouvement ; une photo sans plan reste une photo', () => {
    const moving: PhotoKey[] = ['lock', 'brushing', 'oiling', 'expert', 'plant', 'filming', 'tablet']
    for (const photo of moving) expect(photoMotion(photo, 'fr'), photo).not.toBeNull()
    expect(photoMotion('binder', 'fr')).toBeNull()
    expect(photoMotion('panel', 'fr')).toBeNull()
    // Le poste et la capture viennent du film de la page : l'interface parle sa langue.
    expect(photoMotion('tablet', 'fr')?.mp4).not.toBe(photoMotion('tablet', 'de')?.mp4)
  })
})

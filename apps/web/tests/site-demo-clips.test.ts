/**
 * La démo du poste montre les gestes en vidéo (les plans du film : cadenas, copeaux, huile, cadenas
 * retiré), pas des images fixes ; la photo reste l'image d'attente.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEMO, DEMO_LANGS } from '@/lib/site/content/demo'
import { STEP_CLIPS } from '@/lib/site/media'

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
})

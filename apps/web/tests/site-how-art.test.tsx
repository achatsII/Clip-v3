/**
 * « Comment ça marche » : trois illustrations propres au site, pas des extraits du film (il est déjà
 * dans la page). Elles parlent la langue du site, se décrivent aux lecteurs d'écran et, sans animation
 * possible (jsdom, mouvement réduit, pas de script), elles sont complètes.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { HowArt, type HowArtKind } from '@/components/site/HowArt'
import { SITE_DICTS } from '@/lib/site/content'
import { LOOPS } from '@/lib/site/media'

afterEach(cleanup)

const KINDS: HowArtKind[] = ['capture', 'generate', 'deploy']

describe('les illustrations de « Comment ça marche »', () => {
  for (const lang of ['fr', 'en'] as const) {
    it(`se décrivent et montrent leurs mots en ${lang}, complètes sans animation`, () => {
      const how = SITE_DICTS[lang].home.how
      KINDS.forEach((kind, i) => {
        render(<HowArt kind={kind} t={how.art} label={how.steps[i]!.alt} />)
        const art = screen.getByRole('img', { name: how.steps[i]!.alt })
        const words = { capture: [how.art.capture.film, ...how.art.capture.sources], generate: [how.art.generate.title, ...how.art.generate.steps], deploy: [how.art.deploy.station, ...how.art.deploy.list, how.art.deploy.noLogin] }[kind]
        for (const w of words) expect(art.textContent).toContain(w)
        // Rien n'attend une animation : aucune pièce n'est cachée par un style posé d'avance.
        for (const el of art.querySelectorAll<HTMLElement>('[data-at]:not([data-fx])')) expect(el.style.opacity).toBe('')
        cleanup()
      })
    })
  }

  it('chaque temps a ses mots dans les deux langues, et le film n’y est plus découpé', () => {
    for (const lang of ['fr', 'en'] as const) {
      const art = SITE_DICTS[lang].home.how.art
      expect(art.capture.sources).toHaveLength(4)
      expect(art.generate.steps).toHaveLength(3)
      expect(art.deploy.list).toHaveLength(3)
    }
    expect(Object.keys(LOOPS)).not.toContain('generate')
  })
})

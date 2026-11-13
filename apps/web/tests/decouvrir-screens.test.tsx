/**
 * Les écrans de l'espace Découvrir : les sous-titres offerts mais éteints au départ (une piste sans
 * `default`), la transcription repliée, les vidéos pas tournées en « Bientôt » sans lien, l'entrée avec le
 * courriel prérempli et le message exact d'un accès terminé.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VideoMeta } from '@/lib/decouvrir/videos'

const search = { value: '' }
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search.value),
  usePathname: () => '/decouvrir',
}))

const { LibraryView } = await import('@/components/decouvrir/Library')
const { DecouvrirLogin } = await import('@/components/decouvrir/Login')
const { VideoPlayer } = await import('@/components/decouvrir/VideoPlayer')
const { AccessContext } = await import('@/lib/decouvrir/access')

afterEach(() => {
  cleanup()
  search.value = ''
})

const film: VideoMeta = {
  id: '00-film',
  title: 'Clip en 75 secondes',
  summary: 'Capturer le savoir-faire d’un expert.',
  durationSec: 74.97,
  chapters: [
    { t: 0, title: 'Le savoir-faire qui part à la retraite' },
    { t: 15.4, title: 'Voici Clip' },
  ],
  transcript: [{ t: 0.63, text: 'Jacques connaît sa machine mieux que personne.' }],
  mp4: 'https://stockage.test/clip-film.mp4',
  poster: '/decouvrir/videos/00-film.jpg',
  vtt: '/decouvrir/videos/00-film.vtt',
}

describe('le lecteur', () => {
  it('offre les sous-titres, éteints au départ, et replie la transcription', () => {
    render(<VideoPlayer id="00-film" meta={film} next={null} onNext={() => undefined} autoplay={false} />)
    const track = document.querySelector('video track')!
    expect(track.getAttribute('kind')).toBe('subtitles')
    expect(track.getAttribute('srclang')).toBe('fr')
    expect(track.hasAttribute('default')).toBe(false)
    expect(document.querySelector('video')!.getAttribute('preload')).toBe('metadata')
    expect(document.querySelector('details')!.open).toBe(false)
    expect(screen.getByRole('heading', { name: 'Clip en 75 secondes' })).toBeTruthy()
    expect(screen.getByText('Pour : Tout le monde')).toBeTruthy()
    // Le premier chapitre est celui qu'on regarde ; pas de vidéo suivante sans autre vidéo tournée.
    expect(screen.getByRole('button', { name: /Le savoir-faire qui part à la retraite/ }).getAttribute('aria-current')).toBe('true')
    expect(screen.queryByRole('button', { name: /Vidéo suivante/ })).toBeNull()
  })
})

describe('la bibliothèque', () => {
  it('montre la vidéo tournée, et les autres en « Bientôt », sans lien mort', () => {
    render(<LibraryView metas={{ '00-film': film }} />)
    const soon = document.querySelectorAll('[aria-disabled="true"]')
    expect(soon).toHaveLength(11)
    for (const card of soon) {
      expect(card.closest('a, button')).toBeNull()
      expect(card.textContent).toContain('Bientôt')
    }
    expect(screen.getByRole('button', { name: /Clip en 75 secondes/ })).toBeTruthy()
    // Une seule action primaire : parler au conseiller.
    expect(screen.getByRole('link', { name: /Parler au conseiller/ }).getAttribute('href')).toBe('/decouvrir/conseiller')
  })

  it('sans vidéo publiée : « Les vidéos arrivent », avec le conseiller', () => {
    render(<LibraryView metas={{}} />)
    expect(screen.getByText('Les vidéos arrivent')).toBeTruthy()
  })
})

describe('l’écran d’entrée', () => {
  const linked = (ui: React.ReactNode) => <AccessContext.Provider value={{ mode: 'sandboxes', clients: false }}>{ui}</AccessContext.Provider>

  it('préremplit le courriel, annonce le suivi, et a une seule action', () => {
    search.value = 'courriel=prospect%40exemple.test'
    render(linked(<DecouvrirLogin />))
    expect((screen.getByLabelText('Courriel') as HTMLInputElement).value).toBe('prospect@exemple.test')
    expect(screen.getByText('Ce que vous regardez et demandez ici est enregistré pour mieux vous servir.')).toBeTruthy()
    expect(screen.getByText('L’accès reçu d’Intelligence Industrielle.')).toBeTruthy()
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Entrer'])
  })

  it('dit pourquoi l’accès est fermé, mot pour mot', () => {
    search.value = `raison=expire&fin=${Date.UTC(2026, 11, 13, 5, 0, 0)}`
    render(linked(<DecouvrirLogin />))
    expect(screen.getByRole('alert').textContent).toBe('Votre accès a pris fin le 12 décembre. Votre contact chez Intelligence Industrielle peut le prolonger.')
  })

  it('interrupteur éteint : pas d’entrée, un chemin vers les vidéos', () => {
    render(<DecouvrirLogin />)
    expect(screen.queryByLabelText('Mot de passe')).toBeNull()
    expect(screen.getByRole('link', { name: /Voir les vidéos/ }).getAttribute('href')).toBe('/decouvrir')
  })
})

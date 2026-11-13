import { describe, expect, it } from 'vitest'
import { fitMediaHeight, MEDIA_MAX_SHARE, MEDIA_MIN_SHARE, VIDEO_BAR } from '@/lib/media/fit'
import { knownRatio, ratioKeys, reportRatio } from '@/lib/media/ratio'
import type { StepMedia } from '@/lib/model/types'

// Un téléphone tenu droit : 390 px de large, 600 px entre l'en-tête et les boutons du bas.
const phone = { width: 390, avail: 600 }

describe('au téléphone, le média à sa juste hauteur', () => {
  it('une photo couchée prend toute la largeur, sans bandes noires, quand le texte tient', () => {
    // 16:9 sur 390 px : 219 px, bien moins que la moitié de l'écran d'avant.
    expect(fitMediaHeight({ ...phone, ratio: 16 / 9, text: 250 })).toBe(219)
  })

  it('une photo en hauteur ne dépasse pas un peu plus de la moitié de la place', () => {
    expect(fitMediaHeight({ ...phone, ratio: 3 / 4, text: 100 })).toBe(Math.round(600 * MEDIA_MAX_SHARE))
  })

  it('un texte long : la photo cède la place pour qu’il se lise sans défiler, jamais sous un peu plus du tiers', () => {
    // 600 − 340 = 260 : la photo en hauteur rapetisse juste assez.
    expect(fitMediaHeight({ ...phone, ratio: 3 / 4, text: 340 })).toBe(260)
    // Plus long encore : elle s'arrête au plancher, et le texte défile.
    expect(fitMediaHeight({ ...phone, ratio: 3 / 4, text: 520 })).toBe(Math.round(600 * MEDIA_MIN_SHARE))
  })

  it('une vidéo garde toute sa largeur et la bande de ses commandes, même quand le texte est long', () => {
    const full = Math.round(390 / (16 / 9) + VIDEO_BAR)
    expect(fitMediaHeight({ ...phone, ratio: 16 / 9, text: 100, video: true })).toBe(full)
    expect(fitMediaHeight({ ...phone, ratio: 16 / 9, text: 520, video: true })).toBe(full)
  })

  it('des proportions inconnues (un schéma, une image pas encore chargée) : la plus grande part, cédée au texte au besoin', () => {
    expect(fitMediaHeight({ ...phone, ratio: null, text: 100 })).toBe(Math.round(600 * MEDIA_MAX_SHARE))
    expect(fitMediaHeight({ ...phone, ratio: null, text: 330 })).toBe(270)
  })
})

describe('les proportions apprises en affichant', () => {
  it('se retiennent par adresse ; une valeur absurde est ignorée', () => {
    reportRatio('https://m/a.jpg', 4 / 3)
    expect(knownRatio('https://m/a.jpg')).toBeCloseTo(1.333, 3)
    reportRatio('https://m/b.jpg', 0)
    reportRatio('https://m/c.jpg', Number.NaN)
    expect(knownRatio('https://m/b.jpg')).toBeNull()
    expect(knownRatio('https://m/c.jpg')).toBeNull()
  })

  it('se cherchent là où le média s’affiche vraiment : la vidéo des étapes si elle sert, sinon l’originale, puis son image d’attente', () => {
    const video: StepMedia = { kind: 'video', url: 'https://m/v.mp4', start: 2, end: 6, posterUrl: 'https://m/p.jpg', clip: { url: 'https://m/reel.mp4', at: 0, src: 'https://m/v.mp4', start: 2, end: 6 } }
    expect(ratioKeys(video, true)).toEqual(['https://m/reel.mp4', 'https://m/p.jpg'])
    expect(ratioKeys(video, false)).toEqual(['https://m/v.mp4', 'https://m/p.jpg'])
    expect(ratioKeys({ kind: 'image', url: 'https://m/i.jpg' }, true)).toEqual(['https://m/i.jpg'])
    expect(ratioKeys({ kind: 'document', url: 'https://m/d.pdf', pageImageUrl: 'https://m/d-1.png' }, true)).toEqual(['https://m/d-1.png'])
    expect(ratioKeys({ kind: 'html', url: '', html: '<svg/>' }, true)).toEqual([])
    expect(ratioKeys(undefined, true)).toEqual([])
  })
})

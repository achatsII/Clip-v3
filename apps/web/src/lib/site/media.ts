/**
 * Les médias du site. Les vidéos vivent dans le stockage public de la passerelle (jamais de MP4 dans
 * git) ; les affiches, les sous-titres et les photos sont dans `public/site`. Les photos sont des
 * images illustratives générées : jamais présentées comme des clients.
 */

const STORE = 'https://ii-file.tor1.digitaloceanspaces.com/mcp-octopus/82167b0c-8d5c-4acf-97ea-bf0dc294cb8a/clip-site/video'

export type LoopKey = 'hero' | 'capture' | 'generate' | 'edit' | 'modernize' | 'deploy' | 'station' | 'export'

export interface LoopVideo {
  webm: string
  mp4: string
  poster: string
  /** Durée en secondes (la boucle repart toute seule). */
  seconds: number
}

/** Les boucles muettes (1280 × 720) : le héros, puis une par fonction. */
export const LOOPS: Record<LoopKey, LoopVideo> = {
  hero: {
    webm: `${STORE}/clip-boucle-produit_1794841634108_a7b40935-0918-4e10-ba0e-0ca88b17e046.webm`,
    mp4: `${STORE}/clip-boucle-produit_1794841634108_a902f9ae-8756-479e-9da7-427d232868dd.mp4`,
    poster: '/site/video/clip-boucle-produit.jpg',
    seconds: 15.8,
  },
  capture: {
    webm: `${STORE}/boucle-capturer_1794841634108_6d54f654-90f2-45c3-b9c3-d0551e392b29.webm`,
    mp4: `${STORE}/boucle-capturer_1794841634108_74bfdc12-fb18-4a88-811d-10e783d00c27.mp4`,
    poster: '/site/video/boucle-capturer.jpg',
    seconds: 11.9,
  },
  generate: {
    webm: `${STORE}/boucle-generer_1794841634108_cf28c8b4-04e9-4d4e-bad6-a1c18cff46e8.webm`,
    mp4: `${STORE}/boucle-generer_1794841634108_31746a9a-ff5a-4168-8df7-9ca287bf5180.mp4`,
    poster: '/site/video/boucle-generer.jpg',
    seconds: 9.7,
  },
  edit: {
    webm: `${STORE}/boucle-retoucher_1794841634108_a18856f6-bfb8-4bf3-8f13-dfddf99d355d.webm`,
    mp4: `${STORE}/boucle-retoucher_1794841634108_1204dd6a-308b-40b0-a6a3-446df715feaa.mp4`,
    poster: '/site/video/boucle-retoucher.jpg',
    seconds: 5.4,
  },
  modernize: {
    webm: `${STORE}/boucle-moderniser_1794841634108_a23f61c9-756e-486d-9bf2-6eb7a3f3e0c2.webm`,
    mp4: `${STORE}/boucle-moderniser_1794841634108_a9c42b76-96df-4c32-b17c-8456f5171234.mp4`,
    poster: '/site/video/boucle-moderniser.jpg',
    seconds: 6.1,
  },
  deploy: {
    webm: `${STORE}/boucle-deployer_1794841634108_8237fe77-6f34-40ec-8a9c-678e928a41d6.webm`,
    mp4: `${STORE}/boucle-deployer_1794841634108_6af6ba2f-bbd2-4c7c-9caf-ec3163e3d769.mp4`,
    poster: '/site/video/boucle-deployer.jpg',
    seconds: 6.2,
  },
  station: {
    webm: `${STORE}/boucle-poste_1794841634108_f04e867c-991a-48f4-ac79-d421e9e62c03.webm`,
    mp4: `${STORE}/boucle-poste_1794841634108_87fbbcb1-1aea-4992-bd78-56052c15eea5.mp4`,
    poster: '/site/video/boucle-poste.jpg',
    seconds: 5.8,
  },
  export: {
    webm: `${STORE}/boucle-exporter_1794841634108_0c73db62-3abe-4948-996b-f6b7f8d6abdc.webm`,
    mp4: `${STORE}/boucle-exporter_1794841634108_f639da25-edb0-4ee3-bd71-d2fed5cf313f.mp4`,
    poster: '/site/video/boucle-exporter.jpg',
    seconds: 3.3,
  },
}

/** Le film (1 min 15 s, narration en français) : avec le son et les sous-titres. */
export const FILM = {
  mp4_1080: `${STORE}/clip-film-1080_1794841634107_e182fb31-f128-4f36-8b07-f96fd962af8e.mp4`,
  mp4_720: `${STORE}/clip-film-720_1794841634107_8e6255e1-4312-4211-9a77-72a987883cc9.mp4`,
  poster: '/site/video/clip-film.jpg',
  subtitles: { fr: '/site/video/clip-film.fr.vtt', en: '/site/video/clip-film.en.vtt' },
  /** ISO 8601, pour les données structurées. */
  duration: 'PT1M15S',
  uploadDate: '2026-11-16',
  width: 1920,
  height: 1080,
} as const

export type PhotoKey = 'expert' | 'filming' | 'tablet' | 'plant' | 'lock' | 'binder' | 'panel' | 'brushing' | 'oiling'

export interface Photo {
  src: string
  width: number
  height: number
}

export const PHOTOS: Record<PhotoKey, Photo> = {
  expert: { src: '/site/photos/expert-machine.webp', width: 1600, height: 905 },
  filming: { src: '/site/photos/filmer.webp', width: 1600, height: 905 },
  tablet: { src: '/site/photos/poste-tablette.webp', width: 1600, height: 905 },
  plant: { src: '/site/photos/usine-large.webp', width: 1920, height: 1086 },
  lock: { src: '/site/photos/cadenas.webp', width: 1280, height: 724 },
  binder: { src: '/site/photos/cartable.webp', width: 1280, height: 724 },
  panel: { src: '/site/photos/panneau.webp', width: 1280, height: 724 },
  brushing: { src: '/site/photos/rails-brosse.webp', width: 1280, height: 724 },
  oiling: { src: '/site/photos/rails-huile.webp', width: 1280, height: 724 },
}

/** Le logo d'Intelligence Industrielle : texte clair (fonds sombres) ou foncé (fonds clairs). */
export const II_LOGO = { onDark: '/site/ii-logo.svg', onLight: '/site/ii-logo-ink.svg', width: 897, height: 276 } as const

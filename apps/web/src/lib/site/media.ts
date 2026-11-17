/**
 * Les médias du site. Les vidéos vivent dans le stockage public de la passerelle (jamais de MP4 dans
 * git) ; les affiches, les sous-titres et les photos sont dans `public/site`. Les photos sont des
 * images illustratives générées : jamais présentées comme des clients.
 */

const STORE = 'https://ii-file.tor1.digitaloceanspaces.com/mcp-octopus/82167b0c-8d5c-4acf-97ea-bf0dc294cb8a/clip-site/video'

export type LoopKey = 'hero' | 'capture' | 'edit' | 'modernize' | 'deploy' | 'station' | 'export'

export interface LoopVideo {
  webm: string
  mp4: string
  poster: string
  /** Durée en secondes (la boucle repart toute seule). */
  seconds: number
}

/**
 * Les boucles muettes (1280 × 720), des extraits du film : le héros, puis une par fonction. « Comment ça
 * marche » a ses propres illustrations (`HowArt`) : le film est déjà dans la page.
 */
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

/** Les gestes de la démo du poste, en boucles muettes de 5 s tirées des plans du film (motion/plan.json). */
export type ClipKey = 'lock' | 'brushing' | 'oiling' | 'unlock'

export const STEP_CLIPS: Record<ClipKey, LoopVideo> = {
  lock: {
    webm: `${STORE}/etape-cadenas_1794935724020_064c2930-0374-4da7-9694-9353d14c4c2b.webm`,
    mp4: `${STORE}/etape-cadenas_1794935724020_455240b9-ca70-49de-aafb-9a32d3d4d3c6.mp4`,
    poster: '/site/video/etape-cadenas.webp',
    seconds: 5,
  },
  brushing: {
    webm: `${STORE}/etape-copeaux_1794935724020_80ab6c99-2254-4297-b5a3-a96066a20ef3.webm`,
    mp4: `${STORE}/etape-copeaux_1794935724020_05768407-7056-40d2-b809-9b42b3984886.mp4`,
    poster: '/site/video/etape-copeaux.webp',
    seconds: 5,
  },
  oiling: {
    webm: `${STORE}/etape-huile_1794935724020_aef2b74c-5bad-4785-8727-e569f87b9926.webm`,
    mp4: `${STORE}/etape-huile_1794935724020_11e16189-f3ba-4bff-9c24-967a5d00fd3c.mp4`,
    poster: '/site/video/etape-huile.webp',
    seconds: 5,
  },
  // Le plan du cadenas, à l'envers : on le retire.
  unlock: {
    webm: `${STORE}/etape-retrait_1794935724020_7a17e538-bdec-419a-850e-ddd3653de3c0.webm`,
    mp4: `${STORE}/etape-retrait_1794935724020_bd2020ac-b1aa-4335-abe7-f0523cd7c41b.mp4`,
    poster: '/site/video/etape-retrait.webp',
    seconds: 5,
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

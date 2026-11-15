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
    webm: `${STORE}/clip-boucle-produit_1794606644127_7389c659-c79c-4aeb-93dc-53caef83f256.webm`,
    mp4: `${STORE}/clip-boucle-produit_1794606644127_056ba8a8-7788-4638-8d07-802474717570.mp4`,
    poster: '/site/video/clip-boucle-produit.jpg',
    seconds: 15.9,
  },
  capture: {
    webm: `${STORE}/boucle-capturer_1794606822816_011275ba-7eff-4298-a2d6-91308351fac9.webm`,
    mp4: `${STORE}/boucle-capturer_1794606822816_1977bb20-3a31-408d-8faa-e1beebe8ee6f.mp4`,
    poster: '/site/video/boucle-capturer.jpg',
    seconds: 11.7,
  },
  generate: {
    webm: `${STORE}/boucle-generer_1794606822816_923f647c-3833-4972-a771-9b3cb2c257a8.webm`,
    mp4: `${STORE}/boucle-generer_1794606822816_153863cd-d1b0-4463-9267-91488d6a56ac.mp4`,
    poster: '/site/video/boucle-generer.jpg',
    seconds: 9.7,
  },
  edit: {
    webm: `${STORE}/boucle-retoucher_1794606822816_0eec4aff-4479-4b42-9e26-b5d2a97aec06.webm`,
    mp4: `${STORE}/boucle-retoucher_1794606822816_3c653af1-39e1-4c28-ade7-9c8cba89b439.mp4`,
    poster: '/site/video/boucle-retoucher.jpg',
    seconds: 5.3,
  },
  modernize: {
    webm: `${STORE}/boucle-moderniser_1794606822816_b5501df5-44b8-42ef-afab-5fb1c8c924a2.webm`,
    mp4: `${STORE}/boucle-moderniser_1794606822816_29e9daac-e6bb-429a-8614-e2b60083a7bd.mp4`,
    poster: '/site/video/boucle-moderniser.jpg',
    seconds: 6.1,
  },
  deploy: {
    webm: `${STORE}/boucle-deployer_1794606822816_45b27ce6-9e25-4738-8a0d-0f928da751ae.webm`,
    mp4: `${STORE}/boucle-deployer_1794606822816_5fb374e0-c767-4a2e-a207-4f119a680272.mp4`,
    poster: '/site/video/boucle-deployer.jpg',
    seconds: 6.2,
  },
  station: {
    webm: `${STORE}/boucle-poste_1794606822816_a4de0b47-caa4-4480-a02b-04636b4224e1.webm`,
    mp4: `${STORE}/boucle-poste_1794606822816_d9a4d882-a081-45fa-81f2-19dbc5782f40.mp4`,
    poster: '/site/video/boucle-poste.jpg',
    seconds: 5.7,
  },
  export: {
    webm: `${STORE}/boucle-exporter_1794606822816_637a8264-e1c8-4d7c-993a-c8a02fb85ce8.webm`,
    mp4: `${STORE}/boucle-exporter_1794606822816_8c96fc45-7352-4e0d-91e3-5d6a067bd82b.mp4`,
    poster: '/site/video/boucle-exporter.jpg',
    seconds: 3.3,
  },
}

/** Le film (1 min 15 s, narration en français) : avec le son et les sous-titres. */
export const FILM = {
  mp4_1080: `${STORE}/clip-film-1080_1794606644127_b6279f68-ebd7-426c-bd2f-be7d3664dd6b.mp4`,
  mp4_720: `${STORE}/clip-film-720_1794606644127_9ce99ef9-b08c-4096-a681-68e570b01688.mp4`,
  poster: '/site/video/clip-film.jpg',
  subtitles: { fr: '/site/video/clip-film.fr.vtt', en: '/site/video/clip-film.en.vtt' },
  /** ISO 8601, pour les données structurées. */
  duration: 'PT1M15S',
  uploadDate: '2026-11-13',
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

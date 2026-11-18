/**
 * Les médias du site. Les vidéos vivent dans le stockage public de la passerelle (jamais de MP4 dans
 * git) ; les affiches, les sous-titres et les photos sont dans `public/site`. Les photos sont des
 * images illustratives générées : jamais présentées comme des clients.
 *
 * Deux films, un par voix : le français pour la page française, l'anglais pour les dix-sept autres, avec
 * les sous-titres dans la langue de la page (`filmFor`). Les boucles muettes viennent du film de la page
 * (`loopsFor`) : leur interface parle la même langue que sa voix.
 */
import { SITE_LANGS, type SiteLang } from './lang'

const STORE = 'https://ii-file.tor1.digitaloceanspaces.com/mcp-octopus/82167b0c-8d5c-4acf-97ea-bf0dc294cb8a/clip-site/video'
/** Le film anglais et ses boucles (envoyés le 2026-11-18, même stockage, autre dossier d'envoi). */
const STORE_EN = 'https://ii-file.tor1.digitaloceanspaces.com/mcp-octopus/8c7d2142-22a5-4a71-805e-c5088981d6d0/clip-site/video'

/** La langue de la voix d'un film. */
export type FilmLang = 'fr' | 'en'

/** Le film d'une page : la voix française en français, l'anglaise partout ailleurs. */
export const filmLangOf = (lang: SiteLang): FilmLang => (lang === 'fr' ? 'fr' : 'en')

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
 * marche » a ses propres illustrations (`HowArt`) : le film est déjà dans la page. Chaque boucle est une
 * scène du film, ou quelques scènes d'affilée (motion/plan.json et motion/en/plan.json).
 */
const LOOPS_FR: Record<LoopKey, LoopVideo> = {
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

/** Les mêmes scènes, tirées du film anglais : l'interface y est en anglais. */
const LOOPS_EN: Record<LoopKey, LoopVideo> = {
  hero: {
    webm: `${STORE_EN}/clip-boucle-produit-en_1795002310139_10827926-7be3-476c-b71d-c9c21f04825a.webm`,
    mp4: `${STORE_EN}/clip-boucle-produit-en_1795002310137_31cc129b-6c0d-4c4e-82f2-56c401e6d896.mp4`,
    poster: '/site/video/en/clip-boucle-produit.jpg',
    seconds: 16.3,
  },
  capture: {
    webm: `${STORE_EN}/boucle-capturer-en_1795002310142_33e7c64b-4ecf-4d06-97b3-62f9991d5459.webm`,
    mp4: `${STORE_EN}/boucle-capturer-en_1795002310140_65ee0a05-23d6-415d-9039-e77f6f84027d.mp4`,
    poster: '/site/video/en/boucle-capturer.jpg',
    seconds: 10.6,
  },
  edit: {
    webm: `${STORE_EN}/boucle-retoucher-en_1795002310146_b9b65e36-9c7e-4381-ae07-e6661e8998c0.webm`,
    mp4: `${STORE_EN}/boucle-retoucher-en_1795002310144_26a3c6e8-9aaf-40fe-a77c-aad7eac474e6.mp4`,
    poster: '/site/video/en/boucle-retoucher.jpg',
    seconds: 5.3,
  },
  modernize: {
    webm: `${STORE_EN}/boucle-moderniser-en_1795002310149_d2904a4a-8c61-47de-a051-03f66acd8e8a.webm`,
    mp4: `${STORE_EN}/boucle-moderniser-en_1795002310147_9278db4d-900e-4735-ace6-440db8ce6334.mp4`,
    poster: '/site/video/en/boucle-moderniser.jpg',
    seconds: 6.2,
  },
  deploy: {
    webm: `${STORE_EN}/boucle-deployer-en_1795002310153_34536cf2-f908-42a8-bf53-97670333c876.webm`,
    mp4: `${STORE_EN}/boucle-deployer-en_1795002310151_9a2faf27-83b1-4a98-b71c-b7d6c89b517c.mp4`,
    poster: '/site/video/en/boucle-deployer.jpg',
    seconds: 6.7,
  },
  station: {
    webm: `${STORE_EN}/boucle-poste-en_1795002310155_2c8f015d-7aa0-404a-9204-15c75b910293.webm`,
    mp4: `${STORE_EN}/boucle-poste-en_1795002310154_8b0206b6-8dce-4666-8d84-1d6a4eb4cba1.mp4`,
    poster: '/site/video/en/boucle-poste.jpg',
    seconds: 5.5,
  },
  export: {
    webm: `${STORE_EN}/boucle-exporter-en_1795002310158_eb69edd2-ea78-47fc-8df9-6b932adac7c0.webm`,
    mp4: `${STORE_EN}/boucle-exporter-en_1795002310156_746a5ada-e11a-4ac8-9e09-fb99cb95c8fb.mp4`,
    poster: '/site/video/en/boucle-exporter.jpg',
    seconds: 3.2,
  },
}

export const LOOPS: Record<FilmLang, Record<LoopKey, LoopVideo>> = { fr: LOOPS_FR, en: LOOPS_EN }

/** Les boucles de la page : celles de son film. */
export const loopsFor = (lang: SiteLang): Record<LoopKey, LoopVideo> => LOOPS[filmLangOf(lang)]

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

/**
 * Les plans du film sans texte (Jacques qui explique, l'allée de l'usine), en boucles muettes de 4,4 s qui
 * se rejoignent en fondu : ils remplacent les photos du même plan (`photoMotion`).
 */
export type SceneKey = 'expert' | 'plant'

export const SCENE_CLIPS: Record<SceneKey, LoopVideo> = {
  expert: {
    webm: `${STORE_EN}/plan-expert_1795003375007_9b98619c-4ea1-4ccc-97df-b42e6bb35463.webm`,
    mp4: `${STORE_EN}/plan-expert_1795003375005_bb25216f-a0a1-4c03-a9ba-13890ad85c7b.mp4`,
    poster: '/site/video/plan-expert.jpg',
    seconds: 4.4,
  },
  plant: {
    webm: `${STORE_EN}/plan-usine_1795003375010_575ca3cc-93e8-4384-97b0-d3e739b818ba.webm`,
    mp4: `${STORE_EN}/plan-usine_1795003375008_42d26f74-5d2f-48a1-b3d3-4502d96045a9.mp4`,
    poster: '/site/video/plan-usine.jpg',
    seconds: 4.4,
  },
}

/**
 * Le plan du film qui montre la même chose qu'une photo, en mouvement : le geste (cadenas, copeaux,
 * huile), le poste et la capture (les boucles du film de la page), Jacques et l'usine. Sans plan : la photo.
 */
export function photoMotion(photo: PhotoKey, lang: SiteLang): LoopVideo | null {
  switch (photo) {
    case 'lock':
    case 'brushing':
    case 'oiling':
      return STEP_CLIPS[photo]
    case 'expert':
    case 'plant':
      return SCENE_CLIPS[photo]
    case 'filming':
      return loopsFor(lang).capture
    case 'tablet':
      return loopsFor(lang).station
    default:
      return null
  }
}

/** Un film du site (1 min 15 s) : avec le son et les sous-titres. */
export interface Film {
  /** La langue de la voix. */
  voice: FilmLang
  mp4_1080: string
  mp4_720: string
  poster: string
  /** Les sous-titres, par langue (WebVTT dans `public/site/video`). */
  subtitles: Partial<Record<SiteLang, string>>
  /** ISO 8601, pour les données structurées. */
  duration: string
  /** En secondes, pour le plan du site. */
  seconds: number
  uploadDate: string
  width: number
  height: number
}

export const FILMS: Record<FilmLang, Film> = {
  fr: {
    voice: 'fr',
    mp4_1080: `${STORE}/clip-film-1080_1794841634107_e182fb31-f128-4f36-8b07-f96fd962af8e.mp4`,
    mp4_720: `${STORE}/clip-film-720_1794841634107_8e6255e1-4312-4211-9a77-72a987883cc9.mp4`,
    poster: '/site/video/clip-film.jpg',
    subtitles: { fr: '/site/video/clip-film.fr.vtt', en: '/site/video/clip-film.en.vtt' },
    duration: 'PT1M15S',
    seconds: 75,
    uploadDate: '2026-11-16',
    width: 1920,
    height: 1080,
  },
  // La voix anglaise, l'interface en anglais ; des sous-titres dans chacune des dix-sept langues qui le montrent.
  en: {
    voice: 'en',
    mp4_1080: `${STORE_EN}/clip-film-en-1080_1795002310133_9cee7c54-d5ba-4ac5-9153-2c543a72b966.mp4`,
    mp4_720: `${STORE_EN}/clip-film-en-720_1795002310135_1ee25622-4443-4cb7-b9db-1dbc5c3c75dc.mp4`,
    poster: '/site/video/en/clip-film.jpg',
    subtitles: Object.fromEntries(SITE_LANGS.filter((l) => filmLangOf(l) === 'en').map((l) => [l, `/site/video/en/clip-film.${l}.vtt`])),
    duration: 'PT1M15S',
    seconds: 75,
    uploadDate: '2026-11-18',
    width: 1920,
    height: 1080,
  },
}

/** Le film de la page. */
export const filmFor = (lang: SiteLang): Film => FILMS[filmLangOf(lang)]

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

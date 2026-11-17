/**
 * Les guides du site : des pages qui répondent à ce que les gens cherchent (« comment rédiger une
 * instruction de travail », « modèle », « former un nouvel opérateur »…), dans les dix-huit langues.
 * D'abord utiles par elles-mêmes ; le produit n'y paraît qu'à la fin (`cta`), sous le jeton `Clip`
 * que `brandText` remplace par le nom de la marque.
 */

/** Les guides, dans l'ordre de la page qui les liste. */
export const GUIDES = ['write', 'template', 'video', 'sopVsWi', 'onboarding', 'skillsMatrix'] as const
export type GuideKey = (typeof GUIDES)[number]

export interface GuideSection {
  /** Le titre de la section (H2). */
  heading: string
  paragraphs: string[]
  /** Une liste après les paragraphes : numérotée pour des étapes, à puces sinon. */
  list?: { ordered?: boolean; items: string[] }
}

export interface GuideText {
  /** L'expression que les gens cherchent dans cette langue : un repère de rédaction, jamais affiché. */
  keyword: string
  /** Le titre de la page et du résultat de recherche (60 caractères au plus). */
  title: string
  /** La description du résultat de recherche (130 à 160 caractères ; 60 à 120 en chinois, japonais, coréen). */
  description: string
  /** Le titre affiché en haut de la page (H1). */
  h1: string
  /** Le chapeau : deux ou trois phrases qui répondent tout de suite à la question. */
  lead: string
  /** Le temps de lecture, en minutes. */
  minutes: number
  sections: GuideSection[]
  /** Les questions fréquentes (affichées, et en données structurées FAQPage). */
  faq: Array<{ q: string; a: string }>
  /** L'encart de fin : ce que Clip change à la méthode du guide. */
  cta: { title: string; text: string }
}

export interface GuidesDict {
  /** La page qui liste les guides. */
  index: { title: string; description: string; h1: string; lead: string }
  /** Les mots communs aux pages des guides. */
  ui: {
    /** « Guides » : le menu, le fil d'Ariane. */
    guides: string
    readingTime: (minutes: number) => string
    /** « Mis à jour le 17 novembre 2026 » (la date arrive déjà écrite dans la langue). */
    updated: (date: string) => string
    contents: string
    faq: string
    related: string
  }
  guides: Record<GuideKey, GuideText>
}

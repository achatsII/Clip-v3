/** Feature toggles : noms, valeurs servies par défaut, et valeurs de repli sans serveur. */
export type ToggleName = 'nativeCapture' | 'voiceAssistant' | 'tvCast' | 'bulkImport' | 'aiIllustration' | 'translations' | 'valueReport' | 'storePurchases' | 'liveEditing' | 'draftHistory' | 'previewAgent' | 'stepReel' | 'sections' | 'aiConsent' | 'deleteAccount' | 'renewal' | 'operators' | 'records'

/** Valeurs servies par `GET /api/config` quand `CLIP_TOGGLES` ne dit rien. */
export const DEFAULT_TOGGLES: Record<ToggleName, boolean> = {
  nativeCapture: true,
  voiceAssistant: true,
  tvCast: true,
  bulkImport: true,
  aiIllustration: true,
  translations: true,
  valueReport: true,
  // L'achat dans le magasin, dans l'app : la coquille ne l'annonce que si ce toggle est allumé.
  storePurchases: true,
  // L'édition en direct entre appareils (temps réel) : l'éditeur ouvert ailleurs suit les changements.
  liveEditing: true,
  // Annuler, rétablir, et les points de retour du brouillon enregistrés dans la base.
  draftHistory: true,
  // L'assistant d'édition en bulle dans l'aperçu.
  previewAgent: true,
  // Les vidéos au poste : un seul lecteur d'une étape à l'autre (rien ne se recharge), et la vidéo
  // des étapes, montée après la publication sans la retenir (peu de données).
  stepReel: true,
  // Les sections d'une longue instruction (« Démontage », « Remontage ») et le sommaire au poste.
  sections: true,
  // Exigences d'Apple : l'accord avant le premier envoi à l'IA, et supprimer son compte dans l'app.
  aiConsent: true,
  deleteAccount: true,
  // La relecture périodique des instructions publiées (« à revoir dans 1 an »).
  renewal: true,
  // Qui travaille au poste : l'équipe (sans compte), son code à 4 chiffres, et « Qui êtes-vous ? » à la tablette.
  operators: true,
  // Les relevés d'une étape (mesure, oui ou non, choix, texte, photo) et le registre du travail fait.
  records: true,
}

/** Serveur injoignable : seulement le comportement de base, aucune fonction nouvelle. */
export const FALLBACK_TOGGLES: Record<ToggleName, boolean> = {
  nativeCapture: true,
  voiceAssistant: false,
  tvCast: false,
  bulkImport: false,
  aiIllustration: false,
  translations: false,
  valueReport: false,
  storePurchases: false,
  liveEditing: false,
  draftHistory: false,
  previewAgent: false,
  stepReel: false,
  sections: false,
  aiConsent: false,
  deleteAccount: false,
  renewal: false,
  operators: false,
  records: false,
}

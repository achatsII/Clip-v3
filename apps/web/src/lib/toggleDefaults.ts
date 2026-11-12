/** Feature toggles : noms, valeurs servies par défaut, et valeurs de repli sans serveur. */
export type ToggleName = 'nativeCapture' | 'voiceAssistant' | 'tvCast' | 'bulkImport' | 'aiIllustration' | 'translations' | 'valueReport' | 'storePurchases' | 'liveEditing' | 'draftHistory' | 'previewAgent' | 'stepReel'

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
}

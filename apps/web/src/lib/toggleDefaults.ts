/** Feature toggles : noms, valeurs servies par défaut, et valeurs de repli sans serveur. */
export type ToggleName = 'nativeCapture' | 'voiceAssistant' | 'tvCast' | 'bulkImport' | 'aiIllustration' | 'translations' | 'valueReport' | 'storePurchases' | 'liveEditing'

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
}

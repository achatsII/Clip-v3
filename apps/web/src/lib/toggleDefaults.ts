/** Feature toggles : noms, valeurs servies par défaut, et valeurs de repli sans serveur. */
export type ToggleName = 'nativeCapture' | 'voiceAssistant' | 'tvCast' | 'bulkImport' | 'aiIllustration' | 'translations' | 'valueReport' | 'storePurchases' | 'liveEditing' | 'draftHistory' | 'previewAgent' | 'stepReel' | 'sections' | 'aiConsent' | 'deleteAccount' | 'renewal' | 'operators' | 'records' | 'multiApproval' | 'notify' | 'training' | 'sharedBlocks' | 'salesAdvisor' | 'academy' | 'recordsPlus' | 'billingPreview' | 'billingPreviewApp' | 'reports' | 'editorViews' | 'phoneReader' | 'serverGeneration' | 'resumableUpload'

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
  // L'approbation à plusieurs : chaque groupe (Qualité, chef d'atelier…) signe, publication à la dernière signature.
  multiApproval: true,
  // Avertir les bonnes personnes : « À voir » dans l'app, courriel et notification sur le téléphone.
  notify: true,
  // La formation : des questions par l'IA, la validation au poste et la matrice de compétences.
  training: true,
  // Les blocs communs : des étapes rédigées une fois, réutilisées dans plusieurs instructions.
  sharedBlocks: true,
  // Le conseiller d'achat : de temps en temps, l'offre qui sert l'usine (accueil seulement), et la
  // demande à l'administrateur quand on ne peut pas acheter soi-même.
  salesAdvisor: true,
  // Les modules en option, montrés et vendus seulement une fois bâtis : l'Académie (bâtie), les Relevés avancés.
  academy: true,
  recordsPlus: true,
  // L'aperçu de la facturation : tant que le catalogue n'est pas publié, les plans, les modules,
  // les cadenas et les offres se montrent quand même (web), sans rien acheter ni débiter.
  billingPreview: true,
  // Le même aperçu dans l'app mobile, sans aucun prix ni achat d'ailleurs (règles d'Apple et de Google).
  // À couper (CLIP_TOGGLES) avant une soumission aux magasins tant que la vraie facturation n'y est pas.
  billingPreviewApp: true,
  // Les rapports : un répertoire de modèles prêts (temps, qui a fait quoi, écarts, formation…), et
  // l'IA qui commente des chiffres déjà calculés.
  reports: true,
  // Les façons de modifier une instruction : « Comme au poste » ou « Fiche » (la liste des étapes et
  // tous les outils de chacune), retenue sur l'appareil, et l'Aperçu en un geste dans l'en-tête.
  editorViews: true,
  // La lecture au téléphone : le média à ses vraies proportions, qui laisse au texte la place qu'il
  // lui faut ; côte à côte quand on tourne le téléphone ; « Tout sur une page » depuis le sommaire.
  phoneReader: true,
  // La génération au serveur (Job_start, branche clip-v3 dans n8n) : le réglage de l'usine paraît,
  // et une fois choisi, on peut fermer l'app pendant que l'IA écrit l'instruction.
  serverGeneration: true,
  // L'envoi par morceaux des gros fichiers (TUS, directement à la Gateway) : un morceau raté se
  // renvoie seul, un réseau coupé s'attend, et « Réessayer » reprend où l'envoi s'était arrêté.
  resumableUpload: true,
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
  multiApproval: false,
  notify: false,
  training: false,
  sharedBlocks: false,
  salesAdvisor: false,
  academy: false,
  recordsPlus: false,
  billingPreview: false,
  billingPreviewApp: false,
  reports: false,
  editorViews: false,
  phoneReader: false,
  serverGeneration: false,
  resumableUpload: false,
}
